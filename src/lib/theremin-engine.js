import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { effect } from "@preact/signals";
import { ThereminSynth } from "./theremin-synth";
import {
  synthParams,
  mappingSources,
  mappingInvert,
  scale,
  ranges,
  effectiveValues,
} from "../store";
import { clamp, normalize, lerp } from "./math-utils";

const DEFAULT_STATUS_MESSAGE =
  "Lay your phone flat on the table.\nTouch the screen and allow camera access.\nHover your hand to play.";
// Process every (FRAME_SKIP + 1)th camera frame. 1 => detect on every other
// frame (~15fps on a 30fps stream) to save battery; set to 0 for full rate.
const FRAME_SKIP = 1;
const SCALE_DEFINITIONS = {
  chromatic: {
    label: "Chromatic (all notes)",
    offsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  major: {
    label: "Major",
    offsets: [0, 2, 4, 5, 7, 9, 11],
  },
  minor: {
    label: "Minor",
    offsets: [0, 2, 3, 5, 7, 8, 10],
  },
  pentatonic: {
    label: "Pentatonic",
    offsets: [0, 2, 4, 7, 9],
  },
  blues: {
    label: "Blues",
    offsets: [0, 3, 5, 6, 7, 10],
  },
};

let visionFilesetPromise;

/**
 * ThereminEngine - Manages MediaPipe hand tracking and audio synthesis
 */
export class ThereminEngine {
  constructor(videoElement, callbacks = {}) {
    this.videoEl = videoElement;
    this.callbacks = callbacks;

    this.synth = null;
    this.handLandmarker = null;
    this.running = false;
    this.lastFrameTime = -1;
    this.frameCounter = 0;

    // State persistence for smooth tracking loss
    this.lastValidState = null;
    this.noHandsFrameCount = 0;
    this.fadeOutThreshold = 60; // ~2 seconds at 30fps
    this.primaryHandLabel = null;

    this.boundProcessFrame = this.processFrame.bind(this);
    this.visibilityHandler = this.handleVisibilityChange.bind(this);

    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.setupSynthEffects();
    this.resetPointer();
  }

  setupSynthEffects() {
    // Only setup effects for parameters NOT controlled by hand tracking
    // (waveform and vibrato are not mappable to hands).
    // Disposers are torn down in cleanup() to avoid leaking subscriptions.
    this.disposers = [
      effect(() => {
        const waveform = synthParams.waveform.value;
        if (this.synth) {
          this.synth.setWaveform(waveform);
        }
      }),
      effect(() => {
        if (this.synth) {
          this.synth.setVibrato(
            synthParams.vibratoRate.value,
            synthParams.vibratoDepth.value
          );
        }
      }),
    ];

    // Note: Filter and volume are controlled via applyMappings,
    // which uses the knob values as fallback when mapping is "off"
  }

  async start() {
    if (this.running) return;

    this.callbacks.onStatusChange?.("Requesting camera ...");

    this.resetTrackingState();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, max: 960 },
          height: { ideal: 360, max: 540 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      await this.attachStream(stream);

      this.synth = this.synth ?? new ThereminSynth();
      await this.synth.resume();
      this.initializeSynthState();

      if (!this.handLandmarker) {
        this.callbacks.onStatusChange?.("Loading hand tracker ...");
        this.handLandmarker = await loadHandLandmarker();
      }

      this.running = true;
      this.callbacks.onStatusChange?.("Move your hand into view to play.");
      requestAnimationFrame(this.boundProcessFrame);
    } catch (error) {
      this.cleanupStream();
      this.running = false;
      const message =
        error instanceof Error ? error.message : String(error ?? "Unknown error");
      this.callbacks.onStatusChange?.(
        `Unable to access camera: ${message}\n\n${DEFAULT_STATUS_MESSAGE}`
      );
      throw error;
    }
  }

  async attachStream(stream) {
    this.videoEl.srcObject = stream;
    this.videoEl.muted = true;
    const metadataReady = new Promise((resolve) => {
      if (this.videoEl.readyState >= 1) {
        resolve();
        return;
      }
      this.videoEl.addEventListener("loadedmetadata", resolve, { once: true });
    });
    await Promise.all([this.videoEl.play(), metadataReady]);
    this.videoEl.style.transform = "scaleX(-1)";

    // Auto-detect best axis for pitch based on camera orientation
    this.autoConfigurePitchAxis();
  }

  autoConfigurePitchAxis() {
    const width = this.videoEl.videoWidth;
    const height = this.videoEl.videoHeight;

    // Use the wider axis for better control range
    if (width > height) {
      // Landscape: use horizontal (X) axis
      mappingSources.pitch.axis.value = "X";
    } else {
      // Portrait: use vertical (Y) axis
      mappingSources.pitch.axis.value = "Y";
    }
  }

  initializeSynthState() {
    if (!this.synth) return;

    // Force set waveform (bypass the cache check)
    this.synth.waveform = null;
    this.synth.setWaveform(synthParams.waveform.value);

    this.synth.setFilterNormalized(
      synthParams.filterBase.value,
      0.5 + synthParams.filterQ.value * 8.5
    );
    this.synth.setVibrato(
      synthParams.vibratoRate.value,
      synthParams.vibratoDepth.value
    );
    this.synth.setActive(false);
  }

  resetTrackingState() {
    this.lastFrameTime = -1;
    this.frameCounter = 0;
    this.lastValidState = null;
    this.noHandsFrameCount = 0;
    this.primaryHandLabel = null;
    resetRanges();
    this.resetPointer();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.synth?.setActive(false);
    }
  }

  processFrame(now) {
    if (!this.running || !this.handLandmarker) {
      requestAnimationFrame(this.boundProcessFrame);
      return;
    }

    if (this.videoEl.readyState < 2 || this.lastFrameTime === now) {
      requestAnimationFrame(this.boundProcessFrame);
      return;
    }

    this.lastFrameTime = now;

    this.frameCounter = (this.frameCounter + 1) % (FRAME_SKIP + 1);
    if (this.frameCounter !== 0) {
      requestAnimationFrame(this.boundProcessFrame);
      return;
    }

    const results = this.handLandmarker.detectForVideo(this.videoEl, now);
    if (results.landmarks?.length) {
      this.noHandsFrameCount = 0; // Reset counter when hands detected
      this.handleHands(results.landmarks, results.handedness);
    } else {
      this.noHandsFrameCount++;
      this.handleNoHand();
    }

    requestAnimationFrame(this.boundProcessFrame);
  }

  handleHands(handsLandmarks, handedness) {
    if (!this.synth) return;

    // Identify left and right hands
    let leftHand = null;
    let rightHand = null;

    handsLandmarks.forEach((landmarks, idx) => {
      const label = handedness?.[idx]?.[0]?.categoryName;
      if (label === "Left") {
        leftHand = landmarks;
      } else if (label === "Right") {
        rightHand = landmarks;
      }
    });

    this.primaryHandLabel = resolvePrimaryHandLabel(this.primaryHandLabel, {
      leftHand,
      rightHand,
      handedness,
    });

    // computeMetrics extracts the farthest fingertip and updates the depth
    // range once per hand; pointers are derived from the same metrics so we
    // don't recompute the fingertip or double-feed the depth smoother.
    const metrics = computeMetrics({
      leftHand,
      rightHand,
      primaryHandLabel: this.primaryHandLabel,
    });

    this.updatePointer(
      buildPointer(metrics, "left"),
      buildPointer(metrics, "right")
    );

    const outputs = applyMappings(metrics, this.synth);

    // Store last valid state
    this.lastValidState = outputs;

    this.callbacks.onNoteChange?.(outputs.noteName, outputs.frequency, outputs);
  }

  handleNoHand() {
    if (this.noHandsFrameCount === 1) {
      this.primaryHandLabel = null;
    }
    // If we have recent valid state, keep playing with fade
    if (this.lastValidState && this.noHandsFrameCount < this.fadeOutThreshold) {
      // Calculate fade factor (1.0 at start, 0.0 at threshold)
      const fadeFactor = 1.0 - (this.noHandsFrameCount / this.fadeOutThreshold);

      // Apply fade to volume
      const fadedVolume = this.lastValidState.volume * fadeFactor;

      if (this.synth) {
        this.synth.setActive(fadedVolume > 0.0001);
        this.synth.setFrequency(this.lastValidState.frequency);
        this.synth.setVolume(fadedVolume);
        this.synth.setFilterNormalized(
          this.lastValidState.cutoffNormalized,
          0.5 + this.lastValidState.resonanceNormalized * 8.5
        );
      }

      // Update visuals with faded values
      effectiveValues.volume.value = this.lastValidState.volumeNormalized * fadeFactor;
      effectiveValues.cutoff.value = this.lastValidState.cutoffNormalized;
      effectiveValues.resonance.value = this.lastValidState.resonanceNormalized;

      this.callbacks.onNoteChange?.(
        this.lastValidState.noteName,
        this.lastValidState.frequency,
        {
          ...this.lastValidState,
          volume: fadedVolume,
          volumeNormalized: this.lastValidState.volumeNormalized * fadeFactor,
        }
      );
    } else {
      // No recent state or past threshold - stop playing
      this.synth?.setActive(false);
      this.lastValidState = null;

      // Set filter to base values when no hands
      if (this.synth) {
        const q = 0.5 + synthParams.filterQ.value * 8.5;
        this.synth.setFilterNormalized(synthParams.filterBase.value, q);
      }

      this.callbacks.onNoteChange?.("--", 0, {
        frequency: 0,
        volume: 0,
        volumeNormalized: 0,
        cutoffNormalized: synthParams.filterBase.value,
        resonanceNormalized: synthParams.filterQ.value,
        noteName: "--",
      });
    }

    this.updatePointer({ visible: false }, null);
  }

  updatePointer(state1, state2) {
    const next1 = state1 ? {
      x: state1.x ?? 0.5,
      y: state1.y ?? 0.5,
      area: clamp(state1.area ?? 0, 0, 1),
      closeness: clamp(state1.closeness ?? 0, 0, 1),
      visible: Boolean(state1.visible),
    } : {
      x: 0.5,
      y: 0.5,
      area: 0,
      closeness: 0,
      visible: false,
    };

    const next2 = state2 ? {
      x: state2.x ?? 0.5,
      y: state2.y ?? 0.5,
      area: clamp(state2.area ?? 0, 0, 1),
      closeness: clamp(state2.closeness ?? 0, 0, 1),
      visible: Boolean(state2.visible),
    } : null;

    this.callbacks.onPointerUpdate?.(next1, next2);
  }

  resetPointer() {
    this.updatePointer({ visible: false, x: 0.5, y: 0.5, area: 0, closeness: 0 }, null);
  }

  cleanupStream() {
    const stream = this.videoEl?.srcObject;
    if (stream?.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  cleanup() {
    this.running = false;
    this.cleanupStream();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.disposers?.forEach((dispose) => dispose());
    this.disposers = [];
    this.synth?.setActive(false);
    this.primaryHandLabel = null;
  }
}

async function loadHandLandmarker() {
  try {
    const filesetResolver = await loadVisionFileset();
    return await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "/mediapipe/hand_landmarker.task",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.1,
    });
  } catch (error) {
    console.error("Failed to load MediaPipe HandLandmarker", error);
    throw error;
  }
}

async function loadVisionFileset() {
  visionFilesetPromise =
    visionFilesetPromise ?? FilesetResolver.forVisionTasks("/mediapipe");
  return visionFilesetPromise;
}

function resetRanges() {
  ranges.depthRange.min = Infinity;
  ranges.depthRange.max = -Infinity;
}

function buildPointer(metrics, hand) {
  const x = metrics[`${hand}Hand_tipX`];
  if (x == null) return null;
  return {
    x,
    y: metrics[`${hand}Hand_tipY`],
    area: 0.5,
    closeness: metrics[`${hand}Hand_tipZ`],
    visible: true,
  };
}

function computeMetrics({ leftHand, rightHand, primaryHandLabel }) {
  const metrics = {};

  const leftMetrics = extractHandMetrics(leftHand);
  if (leftMetrics) {
    metrics.leftHand_tipX = leftMetrics.x;
    metrics.leftHand_tipY = leftMetrics.y;
    metrics.leftHand_tipZ = leftMetrics.z;
  }

  const rightMetrics = extractHandMetrics(rightHand);
  if (rightMetrics) {
    metrics.rightHand_tipX = rightMetrics.x;
    metrics.rightHand_tipY = rightMetrics.y;
    metrics.rightHand_tipZ = rightMetrics.z;
  }

  if (primaryHandLabel === "Left" && leftMetrics) {
    assignPrimaryMetrics(metrics, leftMetrics);
  } else if (primaryHandLabel === "Right" && rightMetrics) {
    assignPrimaryMetrics(metrics, rightMetrics);
  } else if (!metrics.primaryHand_tipX) {
    if (leftMetrics) {
      assignPrimaryMetrics(metrics, leftMetrics);
    } else if (rightMetrics) {
      assignPrimaryMetrics(metrics, rightMetrics);
    }
  }

  return metrics;
}

function applyMappings(metrics, synth) {
  if (!synth) {
    return {
      frequency: synthParams.pitchMin.value,
      noteName: "--",
      volume: 0,
      volumeNormalized: 0,
      cutoffNormalized: synthParams.filterBase.value,
      resonanceNormalized: synthParams.filterQ.value,
      pitchMetric: 0.5,
    };
  }

  const pitchMin = synthParams.pitchMin.value;
  const pitchMax = synthParams.pitchMax.value;
  const volumeMax = synthParams.volumeMax.value;
  const filterBase = synthParams.filterBase.value;
  const filterQ = synthParams.filterQ.value;
  const vibratoRate = synthParams.vibratoRate.value;
  const vibratoDepth = synthParams.vibratoDepth.value;

  const pitchValue = resolveMappingValue("pitch", metrics, 0.5);
  const mappedFrequency = mapDistanceToFrequency(pitchValue, pitchMin, pitchMax);
  const quantized = quantizeFrequencyToScale(mappedFrequency);
  const frequency = quantized.frequency;
  const noteName = quantized.noteName;

  const volumeSource = resolveMappingValue("volume", metrics, 1);
  const rawVolumeNormalized = clamp(volumeSource, 0, 1);
  // Mute below the threshold so the gap between hand and camera can silence
  // the note (only meaningful when volume is mapped to a hand axis).
  const muteThreshold = synthParams.muteThreshold.value;
  const volumeNormalized =
    rawVolumeNormalized <= muteThreshold ? 0 : rawVolumeNormalized;
  const volume = volumeNormalized * volumeMax;

  // resolveMappingValue falls back to the knob value when the mapping is "off",
  // so the hand-vs-knob choice is handled there.
  const cutoffSource = resolveMappingValue("cutoff", metrics, filterBase);
  const cutoffNormalized = clamp(cutoffSource, 0, 1);

  const resonanceSource = resolveMappingValue("resonance", metrics, filterQ);
  const resonanceNormalized = clamp(resonanceSource, 0, 1);
  const resonanceQ = 0.5 + resonanceNormalized * 8.5;

  synth.setActive(volume > 0.0001);
  synth.setFrequency(frequency);
  synth.setVolume(volume);
  synth.setFilterNormalized(cutoffNormalized, resonanceQ);
  synth.setVibrato(vibratoRate, vibratoDepth);

  // Update effective values for visual feedback
  effectiveValues.volume.value = volumeNormalized;
  effectiveValues.cutoff.value = cutoffNormalized;
  effectiveValues.resonance.value = resonanceNormalized;

  return {
    frequency,
    noteName,
    volume,
    volumeNormalized,
    cutoffNormalized,
    resonanceNormalized,
    pitchMetric: pitchValue,
  };
}

function resolveMappingValue(target, metrics, fallback) {
  const mapping = mappingSources[target];
  if (!mapping) return fallback;

  const hand = mapping.hand?.value ?? "none";
  const axis = mapping.axis?.value ?? "X";
  const invert = Boolean(mappingInvert[target]?.value);

  let value = fallback;

  if (hand === "none") {
    // Mapping is off, use fallback
    value = fallback;
  } else if (hand === "any") {
    const primaryKey = `primaryHand_tip${axis}`;
    const leftKey = `leftHand_tip${axis}`;
    const rightKey = `rightHand_tip${axis}`;

    if (metrics[primaryKey] != null) {
      value = metrics[primaryKey];
    } else if (metrics[leftKey] != null) {
      value = metrics[leftKey];
    } else if (metrics[rightKey] != null) {
      value = metrics[rightKey];
    } else {
      value = fallback;
    }
  } else {
    // Specific hand (left or right)
    const key = `${hand}Hand_tip${axis}`;
    const candidate = metrics[key];
    if (candidate != null) {
      value = candidate;
    } else {
      value = fallback;
    }
  }

  const clamped = clamp(value, 0, 1);
  return invert ? 1 - clamped : clamped;
}

function resolvePrimaryHandLabel(currentLabel, { leftHand, rightHand, handedness }) {
  const leftPresent = Boolean(leftHand);
  const rightPresent = Boolean(rightHand);

  if (!leftPresent && !rightPresent) {
    return null;
  }

  if (currentLabel === "Left" && leftPresent) {
    return "Left";
  }

  if (currentLabel === "Right" && rightPresent) {
    return "Right";
  }

  if (leftPresent && !rightPresent) {
    return "Left";
  }

  if (rightPresent && !leftPresent) {
    return "Right";
  }

  const firstLabel = handedness?.[0]?.[0]?.categoryName;
  if (firstLabel === "Left" || firstLabel === "Right") {
    return firstLabel;
  }

  return currentLabel ?? "Left";
}

function extractHandMetrics(landmarks) {
  if (!landmarks) return null;
  const tip = getFarthestFingertip(landmarks);
  if (!tip) return null;

  const tipZ = tip.z ?? 0;
  updateDepthRange(tipZ);
  const depthRange = ranges.depthRange;
  let depthNormalized = 0;
  if (
    Number.isFinite(depthRange.min) &&
    Number.isFinite(depthRange.max) &&
    depthRange.max !== depthRange.min
  ) {
    depthNormalized = normalize(tipZ, depthRange.min, depthRange.max);
  }

  const distanceNormalized = clamp(1 - depthNormalized, 0, 1);

  return {
    x: clamp(1 - tip.x, 0, 1),
    y: clamp(tip.y, 0, 1),
    z: distanceNormalized,
  };
}

function assignPrimaryMetrics(target, metrics) {
  target.primaryHand_tipX = metrics.x;
  target.primaryHand_tipY = metrics.y;
  target.primaryHand_tipZ = metrics.z;
}

function mapDistanceToFrequency(norm, min, max) {
  const clamped = clamp(norm, 0, 1);
  const safeMin = Math.max(20, Math.min(min, max - 10));
  const safeMax = Math.max(safeMin + 10, max);
  const span = Math.log2(safeMax / safeMin);
  return Number.isFinite(span)
    ? safeMin * Math.pow(2, clamped * span)
    : safeMin;
}

function quantizeFrequencyToScale(frequency) {
  const midi = frequencyToMidi(frequency);
  if (scale.value === "chromatic") {
    const roundedMidi = Math.round(midi);
    return {
      frequency,
      midi: roundedMidi,
      noteName: midiToNoteName(roundedMidi),
    };
  }
  const snappedMidi = snapMidiToScale(midi);
  const snappedFrequency = midiToFrequency(snappedMidi);
  const noteName = midiToNoteName(snappedMidi);
  return { frequency: snappedFrequency, midi: snappedMidi, noteName };
}

function snapMidiToScale(midi) {
  const offsets = getActiveScaleOffsets();
  if (!offsets || offsets.length >= 12) {
    return Math.round(midi);
  }
  const offsetSet = new Set(offsets.map((value) => ((value % 12) + 12) % 12));
  let bestMidi = Math.round(midi);
  let bestDistance = Number.POSITIVE_INFINITY;
  const base = Math.round(midi);
  for (let delta = -24; delta <= 24; delta++) {
    const candidate = base + delta;
    const pitchClass = ((candidate % 12) + 12) % 12;
    if (!offsetSet.has(pitchClass)) continue;
    const distance = Math.abs(candidate - midi);
    if (
      distance < bestDistance ||
      (distance === bestDistance && candidate > bestMidi)
    ) {
      bestDistance = distance;
      bestMidi = candidate;
      if (distance === 0) break;
    }
  }
  return bestMidi;
}

function getActiveScaleOffsets() {
  const current = SCALE_DEFINITIONS[scale.value] ?? SCALE_DEFINITIONS.chromatic;
  return current.offsets ?? SCALE_DEFINITIONS.chromatic.offsets;
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteName(midi) {
  const pitchClassNames = [
    "C",
    "C♯",
    "D",
    "D♯",
    "E",
    "F",
    "F♯",
    "G",
    "G♯",
    "A",
    "A♯",
    "B",
  ];
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${pitchClassNames[pitchClass]}${octave}`;
}

function getFarthestFingertip(landmarks) {
  if (!landmarks) return null;

  const wrist = landmarks[0];
  if (!wrist) return null;

  const fingertips = [
    landmarks[4],
    landmarks[8],
    landmarks[12],
    landmarks[16],
    landmarks[20],
  ];

  let maxDistance = -1;
  let farthestTip = null;

  for (const tip of fingertips) {
    if (!tip) continue;
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    const dz = (tip.z ?? 0) - (wrist.z ?? 0);
    const distance = Math.hypot(dx, dy, dz);
    if (distance > maxDistance) {
      maxDistance = distance;
      farthestTip = tip;
    }
  }

  return farthestTip;
}

function updateDepthRange(sample) {
  if (ranges.depthRangeLocked) return;
  const smoothing = 0.04;
  const minSample = Math.min(ranges.depthRange.min, sample);
  const maxSample = Math.max(ranges.depthRange.max, sample);
  ranges.depthRange.min = Number.isFinite(ranges.depthRange.min)
    ? lerp(ranges.depthRange.min, minSample, smoothing)
    : sample;
  ranges.depthRange.max = Number.isFinite(ranges.depthRange.max)
    ? lerp(ranges.depthRange.max, maxSample, smoothing)
    : sample;
  if (
    Number.isFinite(ranges.depthRange.min) &&
    Number.isFinite(ranges.depthRange.max) &&
    ranges.depthRange.max - ranges.depthRange.min < 0.01
  ) {
    ranges.depthRange.max = ranges.depthRange.min + 0.01;
  }
}

export { DEFAULT_STATUS_MESSAGE };
