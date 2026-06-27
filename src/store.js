import { signal, effect, batch } from "@preact/signals";

// Synth parameter signals (base values set by knobs)
export const synthParams = {
  pitchMin: signal(150),
  pitchMax: signal(600),
  waveform: signal("sine"),
  volumeMax: signal(0.8),
  filterBase: signal(0.5),
  filterQ: signal(0.3), // normalized 0-1 (actual Q: 0.5-9)
  vibratoRate: signal(5),
  vibratoDepth: signal(0.25),
  muteThreshold: signal(0.2),
};

// Effective values (including camera input) - for visual feedback
export const effectiveValues = {
  pitch: signal(0.5), // normalized 0-1 pitch input along the mapped axis
  volume: signal(0.8),
  cutoff: signal(0.5),
  resonance: signal(0.3),
};

// Latest raw hand-tracking result, published by the engine for the camera
// preview overlay. `landmarks` is an array of 21-point hand arrays (normalized
// coordinates); `handedness` mirrors MediaPipe's per-hand classification.
export const trackingFrame = signal({ landmarks: [], handedness: [] });

// Mapping state signals - now split into hand and axis
export const mappingSources = {
  pitch: { hand: signal("any"), axis: signal("X") }, // Will auto-detect best axis
  volume: { hand: signal("none"), axis: signal("Z") },
  cutoff: { hand: signal("none"), axis: signal("X") },
  resonance: { hand: signal("none"), axis: signal("Y") },
};

export const mappingInvert = {
  pitch: signal(false),
  volume: signal(false),
  cutoff: signal(false),
  resonance: signal(false),
};

export const scale = signal("chromatic");

// Range tracking (regular objects since they're internal to the engine)
export const ranges = {
  depthRange: { min: Infinity, max: -Infinity },
  depthRangeLocked: false,
};

// ---------------------------------------------------------------------------
// Persistence: hydrate the user's tuning from localStorage on load and save it
// back whenever it changes, so settings survive a reload. Only deliberate,
// user-set values are persisted — effectiveValues and ranges are runtime-only.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "theremine:settings:v1";

// The persistable signals, flattened into a single map of dot-paths so we can
// serialize and restore generically.
const persistedSignals = {
  scale,
  ...Object.fromEntries(
    Object.entries(synthParams).map(([key, sig]) => [`synthParams.${key}`, sig])
  ),
  ...Object.entries(mappingSources).flatMap(([key, { hand, axis }]) => [
    [`mappingSources.${key}.hand`, hand],
    [`mappingSources.${key}.axis`, axis],
  ]),
  ...Object.fromEntries(
    Object.entries(mappingInvert).map(([key, sig]) => [
      `mappingInvert.${key}`,
      sig,
    ])
  ),
};

// Read the current configuration as a flat dot-path snapshot. Shared by
// persistence and the preset system.
export function captureSettings() {
  const snapshot = {};
  for (const [path, sig] of Object.entries(persistedSignals)) {
    snapshot[path] = sig.value;
  }
  return snapshot;
}

// Apply a (possibly partial) dot-path snapshot to the live signals. Unknown
// keys are ignored; absent keys are left untouched.
export function applySettings(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  batch(() => {
    for (const [path, sig] of Object.entries(persistedSignals)) {
      if (path in snapshot) sig.value = snapshot[path];
    }
  });
}

// The app's built-in defaults, captured before any hydration runs. Presets use
// this as a base so they only need to declare what they override.
export const FACTORY_DEFAULTS = captureSettings();

// True once hydration restores a previously saved configuration. The engine
// uses this to skip its first-run pitch-axis auto-detection for returning
// users, so it doesn't clobber a deliberately chosen axis.
export const hadStoredSettings = signal(false);

function hydrateFromStorage() {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    stored = null;
  }
  if (!stored || typeof stored !== "object") return;
  applySettings(stored);
  hadStoredSettings.value = true;
}

function setupPersistence() {
  if (typeof localStorage === "undefined") return;
  hydrateFromStorage();
  // A single effect that touches every persisted signal re-runs on any change.
  effect(() => {
    const snapshot = captureSettings();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage full or unavailable (e.g. private mode) — ignore.
    }
  });
}

setupPersistence();
