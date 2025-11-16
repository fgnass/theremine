import { signal, computed, effect } from "@preact/signals";

// Synth parameter signals (base values set by knobs)
export const synthParams = {
  pitchMin: signal(150),
  pitchMax: signal(600),
  waveform: signal("sine"),
  volumeMax: signal(0.8),
  filterBase: signal(0.5),
  filterMod: signal(0.7),
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

// Range tracking (these can stay as regular objects since they're internal)
export const ranges = {
  areaRange: { min: 0.04, max: 0.24 },
  depthRange: { min: Infinity, max: -Infinity },
  depthRangeLocked: false,
  pinchRange: { min: Infinity, max: -Infinity },
};

// Helper to get current synth params as plain object (for backward compatibility)
export const getSynthParams = () => ({
  pitchMin: synthParams.pitchMin.value,
  pitchMax: synthParams.pitchMax.value,
  waveform: synthParams.waveform.value,
  volumeMax: synthParams.volumeMax.value,
  filterBase: synthParams.filterBase.value,
  filterMod: synthParams.filterMod.value,
  filterQ: synthParams.filterQ.value,
  vibratoRate: synthParams.vibratoRate.value,
  vibratoDepth: synthParams.vibratoDepth.value,
  muteThreshold: synthParams.muteThreshold.value,
});

// Helper to get mapping sources as plain object
export const getMappingSources = () => ({
  pitch: mappingSources.pitch.value,
  volume: mappingSources.volume.value,
  cutoff: mappingSources.cutoff.value,
  resonance: mappingSources.resonance.value,
});

// Helper to get mapping invert as plain object
export const getMappingInvert = () => ({
  pitch: mappingInvert.pitch.value,
  volume: mappingInvert.volume.value,
  cutoff: mappingInvert.cutoff.value,
  resonance: mappingInvert.resonance.value,
});

// Setup effects to sync signals with synth (will be called from main.js)
export function setupSynthEffects(synth, buildScale) {
  // Waveform changes
  effect(() => {
    if (synth) {
      synth.setWaveform(synthParams.waveform.value);
    }
  });

  // Filter base and Q changes
  effect(() => {
    if (synth) {
      synth.setFilterNormalized(synthParams.filterBase.value, synthParams.filterQ.value);
    }
  });

  // Pitch range changes rebuild scale
  effect(() => {
    const min = synthParams.pitchMin.value;
    const max = synthParams.pitchMax.value;
    if (buildScale) {
      buildScale();
    }
  });

  // Vibrato (handled in applyMappings, but we could add effect here)
}
