// Bump CACHE_NAME on every release that changes precached files so the
// activate handler can purge the stale cache.
const CACHE_NAME = "theremin-v2";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// Install event - cache initial resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigations / HTML: network-first so a new deploy is picked up immediately,
//   falling back to cache when offline.
// - Other GET requests (hashed JS/CSS, model, wasm): cache-first for speed and
//   offline support; hashed filenames make stale responses a non-issue.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response);
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        cachePut(request, response);
        return response;
      });
    })
  );
});

function cachePut(request, response) {
  // Only cache complete, same-origin responses.
  if (!response || response.status !== 200 || response.type !== "basic") {
    return;
  }
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}
