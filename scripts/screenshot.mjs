/**
 * Portfolio screenshot generator.
 *
 * Spins up the Vite dev server and captures the app at an iPhone-class viewport
 * scaled 2× → exactly 780 × 1688. Produces two shots into public/ so they can
 * be hot-linked from the portfolio (../gnass.buzz/projects):
 *
 *   public/screenshot-main.png      the running play area (knobs), no hand shadow
 *   public/screenshot-settings.png  the settings modal
 *
 * Both use the app's `?screenshot` mode (see src/App.jsx), which flips the UI
 * into its running state without starting the camera/hand tracker.
 *
 * Re-run any time the UI changes:  npm run screenshot
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "public");

// Target output is 780 × 1688. We render at half that on a high-DPI viewport so
// text/SVG render crisply, then capture at the native device pixels.
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2; // 390×844 @2x = 780×1688

const PORT = 5180;
// The dev server runs over HTTPS (basicSsl plugin), so use https + a self-signed
// cert that Playwright is told to ignore.
const BASE = `https://127.0.0.1:${PORT}/`;

// Cap any wait so a regression can't hang the run.
const WAIT_TIMEOUT_MS = 30_000;

function startServer() {
  const child = spawn(
    "npx",
    ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("Vite did not start in time")), 30_000);
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (/Local:.*http/.test(String(chunk))) {
        clearTimeout(timer);
        res(child);
      }
    });
    child.on("exit", (code) => rej(new Error(`Vite exited early (code ${code})`)));
  });
}

/** Capture one shot on its own page, then dispose it. */
async function capture(context, { name, url, ready }) {
  const page = await context.newPage();
  try {
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    // Fonts swap in async; wait so text isn't captured mid-fallback.
    await page.evaluate(() => document.fonts.ready);
    await ready(page);
    const out = resolve(outDir, `${name}.png`);
    await page.screenshot({ path: out });
    console.log(`Saved ${out} (${VIEWPORT.width * SCALE} × ${VIEWPORT.height * SCALE})`);
  } finally {
    await page.close();
  }
}

async function main() {
  const shots = [
    {
      name: "screenshot-main",
      url: `${BASE}?screenshot`,
      // Running play area: wait for the live knobs to mount.
      ready: (page) =>
        page.waitForSelector(".live-controls", { timeout: WAIT_TIMEOUT_MS }),
    },
    {
      name: "screenshot-settings",
      url: `${BASE}?screenshot=settings`,
      // Settings modal open.
      ready: (page) =>
        page.waitForSelector(".mapping-modal__dialog", { timeout: WAIT_TIMEOUT_MS }),
    },
  ];

  await mkdir(outDir, { recursive: true });

  console.log("Starting Vite…");
  const server = await startServer();

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    for (const shot of shots) {
      await capture(context, shot);
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
