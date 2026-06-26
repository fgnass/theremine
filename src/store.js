import { signal } from "@preact/signals";

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
  volume: signal(0.8),
  cutoff: signal(0.5),
  resonance: signal(0.3),
};

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
