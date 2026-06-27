import { signal } from "@preact/signals";
import { FACTORY_DEFAULTS, captureSettings, applySettings } from "./store";

// Flatten a nested authoring object ({ synthParams: { waveform: "saw" } }) into
// the dot-path form used by the store snapshot ({ "synthParams.waveform": ... }).
function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

// Build a full settings snapshot: factory defaults with the preset's overrides
// applied, so every preset is deterministic regardless of what was set before.
function preset(id, name, description, overrides) {
  return {
    id,
    name,
    description,
    settings: { ...FACTORY_DEFAULTS, ...flatten(overrides) },
  };
}

export const BUILTIN_PRESETS = [
  preset("classic", "Classic theremin", "Two hands: pitch + volume", {
    scale: "chromatic",
    synthParams: {
      waveform: "sine",
      pitchMin: 130,
      pitchMax: 1050,
      filterBase: 0.7,
      filterQ: 0.2,
      vibratoRate: 5.5,
      vibratoDepth: 0.18,
      muteThreshold: 0.05,
    },
    mappingSources: {
      pitch: { hand: "right", axis: "X" },
      volume: { hand: "left", axis: "Z" },
      cutoff: { hand: "none", axis: "X" },
      resonance: { hand: "none", axis: "Y" },
    },
  }),
  preset("lead", "Pentatonic lead", "One hand, always in key", {
    scale: "pentatonic",
    synthParams: {
      waveform: "sawtooth",
      pitchMin: 200,
      pitchMax: 900,
      filterBase: 0.55,
      filterQ: 0.45,
      vibratoRate: 6,
      vibratoDepth: 0.12,
      muteThreshold: 0.1,
    },
    mappingSources: {
      pitch: { hand: "any", axis: "X" },
      volume: { hand: "any", axis: "Z" },
      cutoff: { hand: "none", axis: "X" },
      resonance: { hand: "none", axis: "Y" },
    },
  }),
  preset("pad", "Ambient pad", "Soft, slow, one hand", {
    scale: "major",
    synthParams: {
      waveform: "triangle",
      pitchMin: 110,
      pitchMax: 520,
      filterBase: 0.35,
      filterQ: 0.25,
      vibratoRate: 2.5,
      vibratoDepth: 0.3,
      muteThreshold: 0.08,
    },
    mappingSources: {
      pitch: { hand: "any", axis: "X" },
      volume: { hand: "any", axis: "Z" },
      cutoff: { hand: "any", axis: "Y" },
      resonance: { hand: "none", axis: "Y" },
    },
  }),
  preset("simple", "Simple (pitch only)", "Just move your hand to play", {
    scale: "chromatic",
    mappingSources: {
      pitch: { hand: "any", axis: "X" },
      volume: { hand: "none", axis: "Z" },
      cutoff: { hand: "none", axis: "X" },
      resonance: { hand: "none", axis: "Y" },
    },
  }),
];

// ---------------------------------------------------------------------------
// Custom (user-saved) presets, persisted separately from the live settings.
// ---------------------------------------------------------------------------

const CUSTOM_KEY = "theremine:presets:v1";

function loadCustom() {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCustom(list) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable — keep the in-memory list only.
  }
}

export const customPresets = signal(loadCustom());

export function applyPreset(settings) {
  applySettings(settings);
}

// Save the current live settings under a name. Reuses an existing custom preset
// with the same (case-insensitive) name instead of creating a duplicate.
export function saveCurrentAsPreset(rawName) {
  const name = rawName.trim();
  if (!name) return null;

  const settings = captureSettings();
  const existing = customPresets.value.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  let next;
  let saved;
  if (existing) {
    saved = { ...existing, settings };
    next = customPresets.value.map((p) => (p.id === existing.id ? saved : p));
  } else {
    saved = { id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`, name, settings };
    next = [...customPresets.value, saved];
  }

  customPresets.value = next;
  persistCustom(next);
  return saved;
}

export function deleteCustomPreset(id) {
  const next = customPresets.value.filter((p) => p.id !== id);
  customPresets.value = next;
  persistCustom(next);
}
