import "./style.css";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="theremin" data-role="surface">
    <header class="theremin__header">
      <img src="/logo.svg" alt="Theremine logo" class="theremin__logo" />
      <p class="theremin__tagline">A theremin in your pocket</p>
    </header>
    <section class="theremin__content">
      <div class="theremin__instructions">
        <p class="theremin__status" data-role="status"></p>
        <div class="theremin__mapping" data-role="mapping"></div>
        <button class="mapping-button" type="button" data-action="open-mapping">
          Adjust mapping
        </button>
      </div>
      <div class="theremin__scale">
        <div class="scale" role="img" aria-label="Playable note range">
          <div class="scale__bar">
            <div class="scale__indicator" data-role="scale-indicator">--</div>
          </div>
          <div class="scale__ticks" data-role="scale-labels"></div>
        </div>
      </div>
      <button class="theremin__start" data-action="start" type="button">
        Tap to start
      </button>
    </section>
    <video class="theremin__video" playsinline muted autoplay></video>
    <div class="mapping-modal" data-role="mapping-modal" hidden>
      <div class="mapping-modal__backdrop" data-action="close-mapping"></div>
      <div
        class="mapping-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapping-modal-title"
      >
        <header class="mapping-modal__header">
          <h2 id="mapping-modal-title">Mapping</h2>
          <button
            type="button"
            class="mapping-modal__close"
            data-action="close-mapping"
            aria-label="Close mapping modal"
          >
            ×
          </button>
        </header>
        <div class="mapping-modal__body">
          <div class="mapping-field">
            <span class="mapping-field__label">Scale</span>
            <select data-role="scale-select">
              <option value="chromatic">Chromatic (all notes)</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="pentatonic">Pentatonic</option>
              <option value="blues">Blues</option>
            </select>
          </div>
          <div class="mapping-field">
            <span class="mapping-field__label">Pitch Source</span>
            <div class="mapping-field__controls">
              <select data-mapping-source="pitch">
                <option value="z">Distance</option>
                <option value="x">Horizontal</option>
                <option value="y">Vertical</option>
                <option value="pinch">Pinch</option>
                <option value="curl">Curl</option>
                <option value="none">Off</option>
              </select>
              <label class="mapping-field__invert">
                <input type="checkbox" data-mapping-invert="pitch" />
                <span>Invert</span>
              </label>
            </div>
          </div>
          <div class="mapping-field">
            <span class="mapping-field__label">Volume Source</span>
            <div class="mapping-field__controls">
              <select data-mapping-source="volume">
                <option value="curl">Curl</option>
                <option value="z">Distance</option>
                <option value="x">Horizontal</option>
                <option value="y">Vertical</option>
                <option value="pinch">Pinch</option>
                <option value="none">Off</option>
              </select>
              <label class="mapping-field__invert">
                <input type="checkbox" data-mapping-invert="volume" />
                <span>Invert</span>
              </label>
            </div>
          </div>
          <div class="mapping-field">
            <span class="mapping-field__label">Filter Source</span>
            <div class="mapping-field__controls">
              <select data-mapping-source="filter">
                <option value="y">Vertical</option>
                <option value="x">Horizontal</option>
                <option value="z">Distance</option>
                <option value="pinch">Pinch</option>
                <option value="curl">Curl</option>
                <option value="none">Off</option>
              </select>
              <label class="mapping-field__invert">
                <input type="checkbox" data-mapping-invert="filter" />
                <span>Invert</span>
              </label>
            </div>
          </div>
        </div>
        <footer class="mapping-modal__footer">
          <button type="button" class="mapping-modal__done" data-action="close-mapping">
            Done
          </button>
        </footer>
      </div>
    </div>
  </main>
`;

const videoEl = app.querySelector("video");
let pointerEl = document.querySelector(".theremin__pointer");
if (!pointerEl) {
  pointerEl = document.createElement("div");
  pointerEl.className = "theremin__pointer";
  document.body.appendChild(pointerEl);
}
const statusEl = app.querySelector('[data-role="status"]');
const startButton = app.querySelector('[data-action="start"]');
const surfaceEl = app.querySelector('[data-role="surface"]');
const mappingDisplayEl = app.querySelector('[data-role="mapping"]');
const mappingModal = app.querySelector('[data-role="mapping-modal"]');
const openMappingButton = app.querySelector('[data-action="open-mapping"]');
const closeMappingButtons = app.querySelectorAll('[data-action="close-mapping"]');
const scaleSelect = mappingModal?.querySelector('[data-role="scale-select"]');
if (mappingModal) {
  mappingModal.setAttribute("aria-hidden", "true");
}
const defaultInstructions =
  "Lay your phone flat on the table.\nTouch the screen and allow camera access.\nHover your hand to play.";

updateStatus(defaultInstructions);

let isStarting = false;

const readout = {
  pitch: app.querySelector('[data-field="pitch"]'),
  distance: app.querySelector('[data-field="distance"]'),
  volume: app.querySelector('[data-field="volume"]'),
  filter: app.querySelector('[data-field="filter"]'),
};
const inputReadout = {
  x: app.querySelector('[data-field="input-x"]'),
  y: app.querySelector('[data-field="input-y"]'),
  z: app.querySelector('[data-field="input-z"]'),
  pinch: app.querySelector('[data-field="input-pinch"]'),
  curl: app.querySelector('[data-field="input-curl"]'),
};
const mappingControls = {
  sources: {},
  invert: {},
};
app.querySelectorAll("[data-mapping-source]").forEach((control) => {
  mappingControls.sources[control.dataset.mappingSource] = control;
});
mappingModal
  ?.querySelectorAll("[data-mapping-invert]")
  .forEach((control) => {
    mappingControls.invert[control.dataset.mappingInvert] = control;
  });
const mappingKeys = ["pitch", "volume", "filter"];
const paramControls = {};
app.querySelectorAll("[data-param]").forEach((control) => {
  paramControls[control.dataset.param] = control;
});
const scaleLabelsEl = app.querySelector('[data-role="scale-labels"]');
const scaleIndicatorEl = app.querySelector('[data-role="scale-indicator"]');
const mappingLabels = {
  pitch: "Pitch",
  volume: "Volume",
  filter: "Filter",
};
const sourceDescriptions = {
  none: { label: "Off" },
  z: {
    label: "Distance (close → far)",
    invert: "Distance (far → close)",
  },
  x: {
    label: "Horizontal (left → right)",
    invert: "Horizontal (right → left)",
  },
  y: {
    label: "Vertical (down → up)",
    invert: "Vertical (up → down)",
  },
  pinch: {
    label: "Pinch (open → closed)",
    invert: "Pinch (closed → open)",
  },
  curl: {
    label: "Curl (straight → curled)",
    invert: "Curl (curled → straight)",
  },
};
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
let synth;
let handLandmarker;
let running = false;
let lastFrameTime = -1;
let frameCounter = 0;
let activeScaleTick = null;
const state = {
  areaRange: { min: 0.04, max: 0.24 },
  depthRange: { min: Infinity, max: -Infinity },
  depthRangeLocked: false,
  pinchRange: { min: Infinity, max: -Infinity },
  mappingSources: {
    pitch: "z",
    volume: "curl",
    filter: "y",
  },
  mappingInvert: {
    pitch: false,
    volume: false,
    filter: false,
  },
  scale: "chromatic",
  synthParams: {
    pitchMin: 150,
    pitchMax: 600,
    waveform: "sine",
    volumeMax: 0.8,
    filterBase: 0.5,
    filterMod: 0.7,
    filterQ: 0.3,
    vibratoRate: 5,
    vibratoDepth: 0.25,
    muteThreshold: 0.2,
  },
};

const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const FIST_THRESHOLD = 0.09;
const FRAME_SKIP = 1;
let visionFilesetPromise;

buildScale();
updateScaleIndicator(0, "--");

if (startButton) {
  startButton.addEventListener("click", handleStart);
  startButton.addEventListener("pointerdown", handleStart);
}

const handleInteractionStart = (event) => {
  if (running || isStarting) return;
  if (event.target instanceof HTMLElement && event.target.closest("button")) {
    return;
  }
  console.log("Surface interaction", { type: event.type });
  event.preventDefault();
  event.stopPropagation();
  handleStart(event);
};

surfaceEl?.addEventListener("pointerdown", handleInteractionStart);

if (openMappingButton && mappingModal) {
  openMappingButton.addEventListener("click", () => {
    openMappingModal();
  });
  closeMappingButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeMappingModal();
    });
  });
  mappingModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.action === "close-mapping") {
      closeMappingModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mappingModal?.hidden) {
    closeMappingModal();
  }
});

for (const key of mappingKeys) {
  const select = mappingControls.sources[key];
  const invertCheckbox = mappingControls.invert[key];
  if (select) {
    select.value = state.mappingSources[key] ?? "none";
    select.addEventListener("change", () => {
      updateMappingSource(key, select.value);
      renderMapping();
    });
  }
  if (invertCheckbox) {
    invertCheckbox.checked = Boolean(state.mappingInvert[key]);
    invertCheckbox.addEventListener("change", () => {
      if (state.mappingSources[key] === "none") {
        invertCheckbox.checked = false;
        state.mappingInvert[key] = false;
        renderMapping();
        return;
      }
      state.mappingInvert[key] = invertCheckbox.checked;
      renderMapping();
    });
  }
}

if (scaleSelect) {
  scaleSelect.value = state.scale;
  scaleSelect.addEventListener("change", () => {
    const next = scaleSelect.value;
    if (!SCALE_DEFINITIONS[next]) return;
    state.scale = next;
    buildScale();
    updateScaleIndicator(0, "--");
    renderMapping();
  });
}

renderMapping();

Object.entries(paramControls).forEach(([key, control]) => {
  if (!control) return;
  applyParamValue(key, control.value);
  const handler = () => applyParamValue(key, control.value);
  control.addEventListener("input", handler);
  control.addEventListener("change", handler);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && synth) {
    synth.setActive(false);
  }
});

async function handleStart(event) {
  event?.preventDefault();
  if (running || isStarting) return;

  isStarting = true;
  console.log("handleStart", { fromEvent: Boolean(event), type: event?.type });
  if (startButton) {
    startButton.disabled = true;
  }
  updateStatus("Requesting camera ...");

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
    console.log("Camera granted", {
      tracks: stream.getTracks().map((track) => ({
        kind: track.kind,
        state: track.readyState,
      })),
    });

    videoEl.srcObject = stream;
    videoEl.play();
    videoEl.addEventListener(
      "loadedmetadata",
      () => {
        // Mirror the feed for a selfie-style experience.
        videoEl.style.transform = "scaleX(-1)";
      },
      { once: true }
    );

    synth = synth ?? new ThereminSynth();
    await synth.resume();
    console.log("Synth resumed");

    synth.setWaveform(state.synthParams.waveform);
    synth.setFilterNormalized(
      state.synthParams.filterBase,
      state.synthParams.filterQ
    );
    synth.setVibrato(state.synthParams.vibratoRate, 0);

    if (!handLandmarker) {
      updateStatus("Loading hand tracker ...");
      handLandmarker = await loadHandLandmarker();
    }
    updateStatus("Move your hand into view to play.");
    console.log("Hand landmarker ready");

    running = true;
    if (pointerEl) {
      pointerEl.dataset.ready = "true";
    }
    toggleStartButton(false);
    console.log("Theremin running");
    requestAnimationFrame(processFrame);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    updateStatus(
      `Unable to access camera: ${message}\n\n${defaultInstructions}`
    );
    toggleStartButton(true);
    console.log("handleStart failed", { message });
  } finally {
    if (!running && startButton) {
      startButton.disabled = false;
    }
    isStarting = false;
    console.log("handleStart complete", { running });
  }
}

function toggleStartButton(visible) {
  if (!startButton) return;
  startButton.hidden = !visible;
  if (visible) {
    startButton.disabled = false;
  }
}

function openMappingModal() {
  if (!mappingModal) return;
  mappingModal.hidden = false;
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  mappingModal.setAttribute("aria-hidden", "false");
  const firstControl = mappingModal.querySelector(
    "[data-mapping-source], [data-role='scale-select']"
  );
  if (firstControl instanceof HTMLElement) {
    firstControl.focus({ preventScroll: true });
  }
}

function closeMappingModal() {
  if (!mappingModal) return;
  mappingModal.hidden = true;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  mappingModal.setAttribute("aria-hidden", "true");
  openMappingButton?.focus({ preventScroll: true });
}

function applyParamValue(param, rawValue) {
  const params = state.synthParams;
  switch (param) {
    case "pitch-min": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.pitchMin = clamp(candidate, 40, params.pitchMax - 20);
      if (params.pitchMax <= params.pitchMin) {
        params.pitchMax = params.pitchMin + 20;
        if (paramControls["pitch-max"]) {
          paramControls["pitch-max"].value = String(
            Math.round(params.pitchMax)
          );
        }
      }
      if (paramControls["pitch-min"]) {
        paramControls["pitch-min"].value = String(Math.round(params.pitchMin));
      }
      buildScale();
      break;
    }
    case "pitch-max": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.pitchMax = clamp(candidate, params.pitchMin + 20, 4000);
      if (paramControls["pitch-max"]) {
        paramControls["pitch-max"].value = String(Math.round(params.pitchMax));
      }
      buildScale();
      break;
    }
    case "waveform": {
      params.waveform = String(rawValue);
      if (synth) {
        synth.setWaveform(params.waveform);
      }
      break;
    }
    case "volume-max": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.volumeMax = clamp(candidate, 0, 1);
      break;
    }
    case "filter-base": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.filterBase = clamp(candidate, 0, 1);
      break;
    }
    case "filter-mod": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.filterMod = clamp(candidate, 0, 1);
      break;
    }
    case "filter-q": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      const normalized = clamp(candidate, 0, 1);
      params.filterQ = 0.5 + normalized * 8.5;
      break;
    }
    case "vibrato-rate": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.vibratoRate = clamp(candidate, 0, 12);
      break;
    }
    case "vibrato-depth": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.vibratoDepth = clamp(candidate, 0, 1);
      break;
    }
    case "mute-threshold": {
      const candidate = Number(rawValue);
      if (!Number.isFinite(candidate)) break;
      params.muteThreshold = clamp(candidate, 0, 1);
      break;
    }
  }
}

async function loadHandLandmarker() {
  try {
    const filesetResolver = await loadVisionFileset();

    return await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "/mediapipe/hand_landmarker.task",
      },
      runningMode: "LIVESTREAM",
      numHands: 1,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.1,
    });
  } catch (err) {
    console.error("Failed to load MediaPipe HandLandmarker", err);
    updateStatus(
      "Hand tracking unavailable. Install assets again or refresh the page."
    );
    throw err;
  }
}

async function loadVisionFileset() {
  visionFilesetPromise =
    visionFilesetPromise ?? FilesetResolver.forVisionTasks("/mediapipe");
  return visionFilesetPromise;
}

function processFrame(now) {
  if (!running || !handLandmarker) {
    requestAnimationFrame(processFrame);
    return;
  }

  if (videoEl.readyState < 2) {
    requestAnimationFrame(processFrame);
    return;
  }

  if (lastFrameTime === now) {
    requestAnimationFrame(processFrame);
    return;
  }

  lastFrameTime = now;

  frameCounter = (frameCounter + 1) % (FRAME_SKIP + 1);
  if (frameCounter !== 0) {
    requestAnimationFrame(processFrame);
    return;
  }

  const results = handLandmarker.detectForVideo(videoEl, now);
  if (results.landmarks?.length) {
    handleHand(results.landmarks[0], now);
  } else {
    handleNoHand();
  }

  requestAnimationFrame(processFrame);
}

function handleHand(landmarks, timestamp) {
  if (!synth) return;

  const extrema = getExtrema(landmarks);
  const area = Math.max(
    0,
    (extrema.maxX - extrema.minX) * (extrema.maxY - extrema.minY)
  );
  updateAreaRange(area);
  const areaNormalized = normalize(
    area,
    state.areaRange.min,
    state.areaRange.max
  );

  const depth = getPalmDepthMetric(landmarks);
  updateDepthRange(depth);

  const sourceRange = state.depthRange;

  let depthNormalized = 0;
  if (
    Number.isFinite(sourceRange.min) &&
    Number.isFinite(sourceRange.max) &&
    sourceRange.max !== sourceRange.min
  ) {
    depthNormalized = normalize(depth, sourceRange.min, sourceRange.max);
  }

  const centerX = (extrema.maxX + extrema.minX) / 2;
  const centerY = (extrema.maxY + extrema.minY) / 2;

  const displayX = 1 - centerX; // mirror for UI

  const distanceNormalized = clamp(1 - depthNormalized, 0, 1);
  const handSpan = Math.max(extrema.maxX - extrema.minX, 0.0001);
  const metrics = computeMetrics({
    x: displayX,
    y: centerY,
    z: distanceNormalized,
    landmarks,
    handSpan,
  });

  updatePointer(displayX, centerY, areaNormalized, distanceNormalized);

  const outputs = applyMappings(metrics);

  updateReadout({
    pitch: `${outputs.frequency.toFixed(1)} Hz`,
    distance: formatDistance(distanceNormalized),
    volume: outputs.volumeRaw,
    filter: outputs.filterNormalized,
  });

  updateInputReadout(metrics);

  const scalePosition = normalize(
    outputs.frequency,
    state.synthParams.pitchMin,
    state.synthParams.pitchMax
  );
  updateScaleIndicator(clamp(scalePosition, 0, 1), outputs.noteName);
}

function handleNoHand() {
  synth?.setActive(false);
  if (pointerEl) {
    pointerEl.style.opacity = "0";
  }
  updateReadout({
    pitch: "--",
    distance: "--",
    volume: "--",
    filter: "--",
  });
  updateInputReadout();
  updateScaleIndicator(0, "--");
}

function updatePointer(x, y, area, closeness) {
  if (!pointerEl) return;
  pointerEl.style.opacity = "1";
  pointerEl.style.setProperty("--x", `${(x * 100).toFixed(2)}%`);
  pointerEl.style.setProperty("--y", `${(y * 100).toFixed(2)}%`);
  const areaClamped = clamp(area ?? 0, 0, 1);
  const size = 0.6 + areaClamped * 1.8;
  pointerEl.style.setProperty("--scale", size.toFixed(2));
  const closenessClamped = clamp(closeness ?? 0, 0, 1);
  const blur = 14 + closenessClamped * 40;
  pointerEl.style.setProperty("--blur", blur.toFixed(1));
}

function computeMetrics({ x, y, z, landmarks, handSpan }) {
  const pinchDistance = getPinchDistance(landmarks);
  const span =
    handSpan && handSpan > 0 ? handSpan : getHandSpanMetric(landmarks);
  const pinchRatio = span > 0 ? pinchDistance / span : pinchDistance;
  const pinch = normalizePinch(pinchRatio);
  const curl = computeCurl(landmarks);
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    z: clamp(z, 0, 1),
    pinch,
    curl,
  };
}

function applyMappings(metrics) {
  if (!synth) {
    return {
      frequency: state.synthParams.pitchMin,
      noteName: midiToNoteName(frequencyToMidi(state.synthParams.pitchMin)),
      volume: 0,
      volumeNormalized: 0,
      filterNormalized: state.synthParams.filterBase,
      pitchMetric: metrics.z ?? 0,
    };
  }

  const {
    pitchMin,
    pitchMax,
    volumeMax,
    filterBase,
    filterMod,
    filterQ,
  } = state.synthParams;

  const pitchValue = resolveMappingValue("pitch", metrics, metrics.z ?? 0.5);
  let frequency = mapDistanceToFrequency(pitchValue);
  const quantized = quantizeFrequencyToScale(frequency);
  frequency = quantized.frequency;
  const noteName = quantized.noteName;

  const volumeSource = resolveMappingValue("volume", metrics, 1);
  const volumeNormalizedRaw = clamp(volumeSource, 0, 1);
  const volume = volumeNormalizedRaw * volumeMax;

  const filterSource = resolveMappingValue("filter", metrics, 0);
  const filterNormalized = clamp(filterBase + filterSource * filterMod, 0, 1);

  synth.setActive(volume > 0.0001);
  synth.setFrequency(frequency);
  synth.setVolume(volume);
  synth.setFilterNormalized(filterNormalized, filterQ);
  synth.setVibrato(state.synthParams.vibratoRate, 0);

  return {
    frequency,
    noteName,
    volume,
    volumeNormalized: volumeNormalizedRaw,
    volumeRaw: volumeNormalizedRaw,
    filterNormalized,
    pitchMetric: pitchValue,
  };
}

function getActiveScaleOffsets() {
  const scale = SCALE_DEFINITIONS[state.scale] ?? SCALE_DEFINITIONS.chromatic;
  return scale.offsets ?? SCALE_DEFINITIONS.chromatic.offsets;
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

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function quantizeFrequencyToScale(frequency) {
  const midi = frequencyToMidi(frequency);
  if (state.scale === "chromatic") {
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

function resolveMappingValue(target, metrics, fallback) {
  const source = state.mappingSources[target] ?? "none";
  const invert = Boolean(state.mappingInvert?.[target]);
  let value = fallback;
  if (source && source !== "none") {
    const candidate = metrics[source];
    if (candidate != null) {
      value = candidate;
    }
  }
  const clamped = clamp(value, 0, 1);
  return invert ? 1 - clamped : clamped;
}

function updateMappingSource(target, source) {
  const sanitized = source || "none";
  state.mappingSources[target] = sanitized;
  if (sanitized === "none") {
    if (state.mappingInvert[target] != null) {
      state.mappingInvert[target] = false;
    }
    const invertCheckbox = mappingControls.invert[target];
    if (invertCheckbox) {
      invertCheckbox.checked = false;
    }
    renderMapping();
    return;
  }
  if (state.mappingInvert[target] == null) {
    state.mappingInvert[target] = false;
  }
  for (const key of mappingKeys) {
    if (key === target) continue;
    if (state.mappingSources[key] === sanitized) {
      state.mappingSources[key] = "none";
      if (state.mappingInvert[key] != null) {
        state.mappingInvert[key] = false;
      }
      const select = mappingControls.sources[key];
      if (select) {
        select.value = "none";
      }
      const invertCheckbox = mappingControls.invert[key];
      if (invertCheckbox) {
        invertCheckbox.checked = false;
      }
    }
  }
  renderMapping();
}

function renderMapping() {
  if (!mappingDisplayEl) return;
  const sections = [];
  const scaleDef =
    SCALE_DEFINITIONS[state.scale] ?? SCALE_DEFINITIONS.chromatic;
  sections.push(
    `<div class="mapping__item"><span class="mapping__label">Scale</span><span class="mapping__value">${
      scaleDef.label || "Chromatic"
    }</span></div>`
  );
  for (const key of mappingKeys) {
    const label = mappingLabels[key] ?? key;
    const source = state.mappingSources[key] ?? "none";
    const invert = Boolean(state.mappingInvert?.[key]);
    sections.push(
      `<div class="mapping__item"><span class="mapping__label">${label}</span><span class="mapping__value">${formatMappingSource(
        source,
        invert
      )}</span></div>`
    );
  }
  mappingDisplayEl.innerHTML = sections.join("");
}

function formatMappingSource(source, invert) {
  const desc = sourceDescriptions[source] ?? sourceDescriptions.none;
  if (!desc) return source;
  if (invert && desc.invert) return desc.invert;
  return desc.label ?? source;
}

function updateAreaRange(sample) {
  const smoothing = 0.05;
  state.areaRange.min = lerp(
    state.areaRange.min,
    Math.min(state.areaRange.min, sample),
    smoothing
  );
  state.areaRange.max = lerp(
    state.areaRange.max,
    Math.max(state.areaRange.max, sample),
    smoothing
  );
  if (state.areaRange.max - state.areaRange.min < 0.02) {
    state.areaRange.max = state.areaRange.min + 0.02;
  }
}

function updateDepthRange(sample) {
  if (state.depthRangeLocked) return;
  const smoothing = 0.04;
  const minSample = Math.min(state.depthRange.min, sample);
  const maxSample = Math.max(state.depthRange.max, sample);
  state.depthRange.min = Number.isFinite(state.depthRange.min)
    ? lerp(state.depthRange.min, minSample, smoothing)
    : sample;
  state.depthRange.max = Number.isFinite(state.depthRange.max)
    ? lerp(state.depthRange.max, maxSample, smoothing)
    : sample;
  if (
    Number.isFinite(state.depthRange.min) &&
    Number.isFinite(state.depthRange.max)
  ) {
    if (state.depthRange.max - state.depthRange.min < 0.01) {
      state.depthRange.max = state.depthRange.min + 0.01;
    }
  }
}

function updatePinchRange(sample) {
  const smoothing = 0.12;
  const minSample = Math.min(state.pinchRange.min, sample);
  const maxSample = Math.max(state.pinchRange.max, sample);
  state.pinchRange.min = Number.isFinite(state.pinchRange.min)
    ? lerp(state.pinchRange.min, minSample, smoothing)
    : sample;
  state.pinchRange.max = Number.isFinite(state.pinchRange.max)
    ? lerp(state.pinchRange.max, maxSample, smoothing)
    : sample;
  if (
    Number.isFinite(state.pinchRange.min) &&
    Number.isFinite(state.pinchRange.max)
  ) {
    if (state.pinchRange.max - state.pinchRange.min < 0.01) {
      state.pinchRange.max = state.pinchRange.min + 0.01;
    }
  }
}

function mapDistanceToFrequency(norm) {
  const clamped = clamp(norm, 0, 1);
  const { pitchMin, pitchMax } = state.synthParams;
  const safeMin = Math.max(20, Math.min(pitchMin, pitchMax - 10));
  const safeMax = Math.max(safeMin + 10, pitchMax);
  const span = Math.log2(safeMax / safeMin);
  return Number.isFinite(span)
    ? safeMin * Math.pow(2, clamped * span)
    : safeMin;
}

function normalizePinch(ratio) {
  updatePinchRange(ratio);
  const { min, max } = state.pinchRange;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  const normalized = 1 - normalize(ratio, min, max);
  return clamp(normalized, 0, 1);
}

function getPinchDistance(landmarks) {
  const thumbTip = landmarks?.[4];
  const indexTip = landmarks?.[8];
  if (!thumbTip || !indexTip) return 0;
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const dz = (thumbTip.z ?? 0) - (indexTip.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

function getHandSpanMetric(landmarks) {
  const indexBase = landmarks?.[5];
  const pinkyBase = landmarks?.[17];
  if (!indexBase || !pinkyBase) return 0;
  const dx = indexBase.x - pinkyBase.x;
  const dy = indexBase.y - pinkyBase.y;
  const dz = (indexBase.z ?? 0) - (pinkyBase.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

function computeCurl(landmarks) {
  if (!landmarks) return 0;
  const fingers = [
    { mcp: 5, pip: 6, tip: 8 },
    { mcp: 9, pip: 10, tip: 12 },
    { mcp: 13, pip: 14, tip: 16 },
    { mcp: 17, pip: 18, tip: 20 },
  ];
  let sum = 0;
  let count = 0;

  for (const finger of fingers) {
    const mcp = landmarks[finger.mcp];
    const pip = landmarks[finger.pip];
    const tip = landmarks[finger.tip];
    if (!mcp || !pip || !tip) continue;

    const v1 = normalizeVector(subtract(pip, mcp));
    const v2 = normalizeVector(subtract(tip, pip));
    const dot = clamp(dotProduct(v1, v2), -1, 1);
    const extension = (dot + 1) / 2; // 1 when straight, 0 when folded back
    const curl = clamp(1 - extension, 0, 1);
    sum += curl;
    count += 1;
  }

  return count ? clamp(sum / count, 0, 1) : 0;
}

function subtract(a, b) {
  return {
    x: (a?.x ?? 0) - (b?.x ?? 0),
    y: (a?.y ?? 0) - (b?.y ?? 0),
    z: (a?.z ?? 0) - (b?.z ?? 0),
  };
}

function normalizeVector(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

function dotProduct(a, b) {
  return (
    (a.x ?? 0) * (b.x ?? 0) + (a.y ?? 0) * (b.y ?? 0) + (a.z ?? 0) * (b.z ?? 0)
  );
}

function updateInputReadout(metrics) {
  if (!inputReadout) return;
  if (!metrics) {
    Object.values(inputReadout).forEach((el) => {
      if (el) el.textContent = "--";
    });
    return;
  }
  if (inputReadout.x) inputReadout.x.textContent = formatDecimal(metrics.x);
  if (inputReadout.y) inputReadout.y.textContent = formatDecimal(metrics.y);
  if (inputReadout.z) inputReadout.z.textContent = formatDecimal(metrics.z);
  if (inputReadout.pinch)
    inputReadout.pinch.textContent = formatDecimal(metrics.pinch);
  if (inputReadout.curl)
    inputReadout.curl.textContent = formatDecimal(metrics.curl);
}

function updateReadout(fields = {}) {
  if ("pitch" in fields && readout.pitch) {
    readout.pitch.textContent = String(fields.pitch);
  }
  if ("distance" in fields && readout.distance) {
    readout.distance.textContent = String(fields.distance);
  }
  if ("volume" in fields && readout.volume) {
    const value = fields.volume;
    readout.volume.textContent =
      typeof value === "number" ? formatPercent(value) : String(value);
  }
  if ("filter" in fields && readout.filter) {
    const value = fields.filter;
    readout.filter.textContent =
      typeof value === "number" ? formatPercent(value) : String(value);
  }
}

function updateStatus(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
}

function updateScaleIndicator(position, note) {
  if (!scaleIndicatorEl) return;
  scaleIndicatorEl.style.setProperty(
    "--position",
    `${(position * 100).toFixed(2)}%`
  );
  const label = note ?? "--";
  scaleIndicatorEl.textContent = label;
  if (!scaleLabelsEl) return;
  if (activeScaleTick) {
    activeScaleTick.classList.remove("scale__tick--active");
    activeScaleTick = null;
  }
  if (label === "--") return;
  const tick = Array.from(scaleLabelsEl.children).find(
    (child) => child.dataset.note === label
  );
  if (tick) {
    tick.classList.add("scale__tick--active");
    activeScaleTick = tick;
  }
}

function buildScale() {
  if (!scaleLabelsEl) return;
  scaleLabelsEl.innerHTML = "";
  activeScaleTick = null;
  const minMidi = Math.round(frequencyToMidi(state.synthParams.pitchMin));
  const maxMidi = Math.round(frequencyToMidi(state.synthParams.pitchMax));
  const offsets = getActiveScaleOffsets();
  const offsetSet = new Set(offsets.map((value) => ((value % 12) + 12) % 12));
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const { name, pitchClass, base, octave } = decomposeMidi(midi);
    if (!offsetSet.has(pitchClass)) continue;
    const position = normalize(midi, minMidi, maxMidi);
    const tick = document.createElement("div");
    tick.className = "scale__tick";
    tick.style.setProperty("--position", `${(position * 100).toFixed(2)}%`);
    tick.dataset.note = name;
    tick.textContent = pitchClass === 0 ? `${base}${octave}` : base;
    scaleLabelsEl.append(tick);
  }
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToNoteName(midi) {
  const { name } = decomposeMidi(midi);
  return name;
}

function decomposeMidi(midi) {
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
  const base = pitchClassNames[pitchClass];
  const name = `${base}${octave}`;
  return {
    name,
    pitchClass,
    base,
    octave,
    isNatural: NATURAL_PITCH_CLASSES.has(pitchClass),
  };
}

function getPalmDepthMetric(landmarks) {
  if (!landmarks?.length) return 0;
  const wrist = landmarks[0];
  const bases = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  let sum = 0;
  for (const joint of bases) {
    const dx = joint.x - wrist.x;
    const dy = joint.y - wrist.y;
    sum += Math.hypot(dx, dy);
  }
  return bases.length ? sum / bases.length : 0;
}

function getFingerSpreadMetric(landmarks) {
  const wrist = landmarks[0];
  const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  let sum = 0;
  for (const tip of tips) {
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    sum += Math.hypot(dx, dy);
  }
  return sum / tips.length;
}

function isFist(spread) {
  return spread < FIST_THRESHOLD;
}

function formatDecimal(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  const clamped = clamp(value, 0, 1);
  return `${Math.round(clamped * 100)}%`;
}

function formatDistance(normalized) {
  const clamped = clamp(normalized, 0, 1);
  const cm = lerp(60, 8, clamped);
  return `${cm.toFixed(0)} cm (est)`;
}

function getExtrema(landmarks) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  return { minX, maxX, minY, maxY };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value, min, max) {
  const range = max - min;
  if (range <= 0) return 0;
  const norm = (value - min) / range;
  return clamp(norm, 0, 1);
}

class ThereminSynth {
  constructor() {
    this.context = new AudioContext();
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = 0;

    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2500;
    this.filter.Q.value = 0.8;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = "sine";
    this.oscillator.frequency.value = 440;

    this.lfo = this.context.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 5;

    this.lfoGain = this.context.createGain();
    this.lfoGain.gain.value = 0;

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.oscillator.frequency);

    this.oscillator.connect(this.filter);
    this.filter.connect(this.outputGain);

    this.outputGain.connect(this.context.destination);

    this.oscillator.start();
    this.lfo.start();

    this.active = false;
    this.targetVolume = 0;
    this.waveform = "sine";
  }

  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  setActive(active) {
    this.active = active;
    this.applyVolume();
  }

  setFrequency(frequency) {
    const now = this.context.currentTime;
    this.oscillator.frequency.cancelScheduledValues(now);
    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.05);
  }

  setVolume(value) {
    this.targetVolume = clamp(value, 0, 1);
    this.applyVolume();
  }

  setVibrato(rate, depth) {
    const now = this.context.currentTime;
    this.lfo.frequency.cancelScheduledValues(now);
    this.lfo.frequency.setTargetAtTime(rate, now, 0.1);
    this.lfoGain.gain.cancelScheduledValues(now);
    this.lfoGain.gain.setTargetAtTime(depth, now, 0.1);
  }

  setWaveform(type) {
    if (!type || this.waveform === type) return;
    try {
      this.oscillator.type = type;
      this.waveform = type;
    } catch (err) {
      console.warn("Unsupported waveform", type, err);
    }
  }

  setFilterNormalized(amount, resonance) {
    const now = this.context.currentTime;
    const normalized = clamp(amount, 0, 1);
    const minFreq = 300;
    const maxFreq = 8000;
    const freq = minFreq + normalized * (maxFreq - minFreq);
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setTargetAtTime(freq, now, 0.08);
    if (typeof resonance === "number" && Number.isFinite(resonance)) {
      this.filter.Q.setTargetAtTime(resonance, now, 0.1);
    }
  }

  applyVolume() {
    const now = this.context.currentTime;
    const target = this.active ? this.targetVolume : 0;
    this.outputGain.gain.cancelScheduledValues(now);
    this.outputGain.gain.setTargetAtTime(target, now, 0.08);
  }
}

window.addEventListener("beforeunload", () => {
  if (videoEl.srcObject) {
    const tracks = videoEl.srcObject.getTracks?.() ?? [];
    tracks.forEach((track) => track.stop());
  }
});
