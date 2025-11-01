import './style.css'
import { FilesetResolver, HandLandmarker, GestureRecognizer } from '@mediapipe/tasks-vision'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="app">
    <header class="app__header">
      <h1>Theremine Lab</h1>
      <p class="app__tagline">Explore how hand metrics translate into sound. Start capture, observe the readings, and experiment with the mappings.</p>
      <div class="app__actions">
        <button class="button button--primary" data-action="start">Start Capture</button>
        <button class="button" data-action="calibrate" disabled>Calibrate Range</button>
      </div>
    </header>
    <section class="lab">
      <div class="lab__preview">
        <div class="preview" data-role="preview">
          <div class="preview__video-wrapper">
            <video class="preview__video" playsinline muted autoplay></video>
            <div class="preview__pointer" data-role="pointer"></div>
            <div class="preview__overlay">
              <div class="preview__status" data-role="status">Tap Start Capture to activate the camera.</div>
            </div>
          </div>
        </div>
        <section class="metrics" aria-live="polite">
          <h2 class="panel__title">Output</h2>
          <div class="metrics__grid">
            <div class="metrics__item"><span class="label">Pitch</span><span data-field="pitch">--</span></div>
            <div class="metrics__item"><span class="label">Note</span><span data-field="note">--</span></div>
            <div class="metrics__item"><span class="label">Distance</span><span data-field="distance">--</span></div>
            <div class="metrics__item"><span class="label">Volume</span><span data-field="volume">--</span></div>
            <div class="metrics__item"><span class="label">Filter</span><span data-field="filter">--</span></div>
            <div class="metrics__item"><span class="label">Vibrato</span><span data-field="vibrato">--</span></div>
            <div class="metrics__item"><span class="label">Mute</span><span data-field="mute">--</span></div>
          </div>
          <h2 class="panel__title">Input</h2>
          <div class="metrics__grid metrics__grid--inputs">
            <div class="metrics__item"><span class="label">X</span><span data-field="input-x">--</span></div>
            <div class="metrics__item"><span class="label">Y</span><span data-field="input-y">--</span></div>
            <div class="metrics__item"><span class="label">Z</span><span data-field="input-z">--</span></div>
            <div class="metrics__item"><span class="label">Pinch</span><span data-field="input-pinch">--</span></div>
            <div class="metrics__item"><span class="label">Curl</span><span data-field="input-curl">--</span></div>
          </div>
        </section>
      </div>
      <div class="lab__controls">
        <section class="panel">
          <h2 class="panel__title">Mapping</h2>
          <div class="form-grid">
            <label class="form-field"><span class="form-label">Pitch Source</span>
              <div class="form-field__row">
                <select data-mapping-source="pitch">
                  <option value="z">Distance (Z)</option>
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="pinch">Pinch</option>
                  <option value="curl">Curl</option>
                  <option value="none">None</option>
                </select>
                <label class="form-toggle"><input type="checkbox" data-mapping-invert="pitch"><span>Invert</span></label>
              </div>
            </label>
            <label class="form-field"><span class="form-label">Volume Source</span>
              <div class="form-field__row">
                <select data-mapping-source="volume">
                  <option value="curl" selected>Curl</option>
                  <option value="z">Distance (Z)</option>
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="pinch">Pinch</option>
                  <option value="none">None</option>
                </select>
                <label class="form-toggle"><input type="checkbox" data-mapping-invert="volume"><span>Invert</span></label>
              </div>
            </label>
            <label class="form-field"><span class="form-label">Filter Source</span>
              <div class="form-field__row">
                <select data-mapping-source="filter">
                  <option value="y">Y</option>
                  <option value="x">X</option>
                  <option value="z">Distance (Z)</option>
                  <option value="pinch">Pinch</option>
                  <option value="curl">Curl</option>
                  <option value="none">None</option>
                </select>
                <label class="form-toggle"><input type="checkbox" data-mapping-invert="filter"><span>Invert</span></label>
              </div>
            </label>
            <label class="form-field"><span class="form-label">Vibrato Source</span>
              <div class="form-field__row">
                <select data-mapping-source="vibrato">
                  <option value="pinch">Pinch</option>
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Distance (Z)</option>
                  <option value="curl">Curl</option>
                  <option value="none">None</option>
                </select>
                <label class="form-toggle"><input type="checkbox" data-mapping-invert="vibrato"><span>Invert</span></label>
              </div>
            </label>
            <label class="form-field"><span class="form-label">Mute Source</span>
              <div class="form-field__row">
                <select data-mapping-source="mute">
                  <option value="none" selected>None</option>
                  <option value="pinch">Pinch</option>
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Distance (Z)</option>
                  <option value="curl">Curl</option>
                </select>
                <label class="form-toggle"><input type="checkbox" data-mapping-invert="mute"><span>Invert</span></label>
              </div>
            </label>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel__title">Synth</h2>
          <div class="form-grid">
            <label class="form-field"><span class="form-label">Pitch Min (Hz)</span>
              <input type="number" min="40" max="2000" step="10" value="150" data-param="pitch-min">
            </label>
            <label class="form-field"><span class="form-label">Pitch Max (Hz)</span>
              <input type="number" min="80" max="4000" step="10" value="600" data-param="pitch-max">
            </label>
            <label class="form-field"><span class="form-label">Waveform</span>
              <select data-param="waveform">
                <option value="sine" selected>Sine</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Saw</option>
                <option value="square">Square</option>
              </select>
            </label>
            <label class="form-field"><span class="form-label">Volume Max</span>
              <input type="range" min="0" max="1" step="0.05" value="0.8" data-param="volume-max">
            </label>
            <label class="form-field"><span class="form-label">Filter Cutoff</span>
              <input type="range" min="0" max="1" step="0.01" value="0.5" data-param="filter-base">
            </label>
            <label class="form-field"><span class="form-label">Filter Mod</span>
              <input type="range" min="0" max="1" step="0.01" value="0.7" data-param="filter-mod">
            </label>
            <label class="form-field"><span class="form-label">Resonance</span>
              <input type="range" min="0" max="1" step="0.01" value="0.3" data-param="filter-q">
            </label>
            <label class="form-field"><span class="form-label">Vibrato Rate (Hz)</span>
              <input type="range" min="0" max="12" step="0.1" value="5" data-param="vibrato-rate">
            </label>
            <label class="form-field"><span class="form-label">Vibrato Depth</span>
              <input type="range" min="0" max="1" step="0.01" value="0.25" data-param="vibrato-depth">
            </label>
            <label class="form-field"><span class="form-label">Mute Threshold</span>
              <input type="range" min="0" max="1" step="0.01" value="0.2" data-param="mute-threshold">
            </label>
          </div>
        </section>
      </div>
    </section>
    <aside class="calibration" id="calibration-panel" data-role="calibration-panel" hidden>
      <div class="calibration__card">
        <div class="calibration__header">
          <h2>Calibration</h2>
          <button class="icon-button" data-action="close-calibration" aria-label="Close calibration panel">&times;</button>
        </div>
        <div class="preview calibration__preview" data-role="preview">
          <div class="preview__video-wrapper">
            <video class="preview__video" playsinline muted autoplay></video>
            <div class="preview__pointer" data-role="pointer"></div>
          </div>
        </div>
        <div class="calibration__actions">
          <button class="button" data-action="calibrate" disabled>Calibrate Range</button>
          <p class="calibration__hint">Make a fist at your near and far positions to set the range.</p>
        </div>
      </div>
    </aside>
  </main>
`

const videoEl = app.querySelector('video')
const pointerEl = app.querySelector('[data-role="pointer"]')
const statusEl = app.querySelector('[data-role="status"]')
const startButton = app.querySelector('[data-action="start"]')
const calibrateButton = app.querySelector('[data-action="calibrate"]')
const calibrationPanel = app.querySelector('[data-role="calibration-panel"]')
const closeCalibrationButton = app.querySelector('[data-action="close-calibration"]')
const readout = {
  pitch: app.querySelector('[data-field="pitch"]'),
  note: app.querySelector('[data-field="note"]'),
  distance: app.querySelector('[data-field="distance"]'),
  volume: app.querySelector('[data-field="volume"]'),
  filter: app.querySelector('[data-field="filter"]'),
  vibrato: app.querySelector('[data-field="vibrato"]'),
  mute: app.querySelector('[data-field="mute"]'),
}
const inputReadout = {
  x: app.querySelector('[data-field="input-x"]'),
  y: app.querySelector('[data-field="input-y"]'),
  z: app.querySelector('[data-field="input-z"]'),
  pinch: app.querySelector('[data-field="input-pinch"]'),
  curl: app.querySelector('[data-field="input-curl"]'),
}
const mappingControls = {
  sources: {},
  invert: {},
}
app.querySelectorAll('[data-mapping-source]').forEach(control => {
  mappingControls.sources[control.dataset.mappingSource] = control
})
app.querySelectorAll('[data-mapping-invert]').forEach(control => {
  mappingControls.invert[control.dataset.mappingInvert] = control
})
const mappingKeys = ['pitch', 'volume', 'filter', 'vibrato', 'mute']
const paramControls = {}
app.querySelectorAll('[data-param]').forEach(control => {
  paramControls[control.dataset.param] = control
})
const scaleLabelsEl = app.querySelector('[data-role="scale-labels"]')
const scaleIndicatorEl = app.querySelector('[data-role="scale-indicator"]')

let synth
let handLandmarker
let gestureRecognizer
let running = false
let lastFrameTime = -1
let calibrationPanelOpen = false
let frameCounter = 0
const state = {
  areaRange: { min: 0.04, max: 0.24 },
  depthRange: { min: Infinity, max: -Infinity },
  depthRangeLocked: false,
  pinchRange: { min: Infinity, max: -Infinity },
  mappingSources: {
    pitch: 'z',
    volume: 'curl',
    filter: 'y',
    vibrato: 'pinch',
    mute: 'none',
  },
  mappingInvert: {
    pitch: false,
    volume: false,
    filter: false,
    vibrato: false,
    mute: false,
  },
  synthParams: {
    pitchMin: 150,
    pitchMax: 600,
    waveform: 'sine',
    volumeMax: 0.8,
    filterBase: 0.5,
    filterMod: 0.7,
    filterQ: 0.3,
    vibratoRate: 5,
    vibratoDepth: 0.25,
    muteThreshold: 0.2,
  },
  calibration: {
    active: false,
    minDepth: Infinity,
    maxDepth: -Infinity,
    lastCapture: 0,
    captures: 0,
    lastWasFist: false,
    lastPrompt: 0,
  },
}

const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11])
const FIST_THRESHOLD = 0.09
const MIN_CALIBRATION_SPAN = 0.004
const FRAME_SKIP = 1
let lastGestureCategories = []
let visionFilesetPromise
let lastGestureTimestamp = 0
const GESTURE_INTERVAL_MS = 120

buildScale()
updateScaleIndicator(0, '--')

startButton.addEventListener('click', handleStart)
calibrateButton.addEventListener('click', triggerCalibration)
if (closeCalibrationButton) {
  closeCalibrationButton.addEventListener('click', () => {
    setCalibrationPanelOpen(false)
  })
}

// Ensure the calibration overlay stays tucked away until requested.
setCalibrationPanelOpen(false)

for (const key of mappingKeys) {
  const select = mappingControls.sources[key]
  const invertCheckbox = mappingControls.invert[key]
  if (select) {
    select.value = state.mappingSources[key] ?? 'none'
    select.addEventListener('change', () => {
      updateMappingSource(key, select.value)
    })
  }
  if (invertCheckbox) {
    invertCheckbox.checked = Boolean(state.mappingInvert[key])
    invertCheckbox.addEventListener('change', () => {
      state.mappingInvert[key] = invertCheckbox.checked
    })
  }
}

Object.entries(paramControls).forEach(([key, control]) => {
  if (!control) return
  applyParamValue(key, control.value)
  const handler = () => applyParamValue(key, control.value)
  control.addEventListener('input', handler)
  control.addEventListener('change', handler)
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && synth) {
    synth.setActive(false)
  }
})

async function handleStart() {
  startButton.disabled = true
  updateStatus('Requesting camera ...')

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640, max: 960 },
        height: { ideal: 360, max: 540 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    })

    videoEl.srcObject = stream
    videoEl.play()
    videoEl.addEventListener('loadedmetadata', () => {
      // Mirror the feed for a selfie-style experience.
      videoEl.style.transform = 'scaleX(-1)'
    }, { once: true })

    app.querySelectorAll('.preview__video').forEach(video => {
      if (video === videoEl) return
      video.srcObject = stream
      video.play().catch(() => {})
      video.style.transform = 'scaleX(-1)'
    })

    synth = synth ?? new ThereminSynth()
    await synth.resume()

    synth.setWaveform(state.synthParams.waveform)
    synth.setFilterNormalized(state.synthParams.filterBase, state.synthParams.filterQ)
    synth.setVibrato(state.synthParams.vibratoRate, 0)

    updateStatus('Loading hand tracker ...')
    handLandmarker = handLandmarker ?? await loadHandLandmarker()
    gestureRecognizer = gestureRecognizer ?? await loadGestureRecognizer()
    updateStatus('Move your hand into view to start playing.')

    running = true
    pointerEl.dataset.ready = 'true'
    calibrateButton.disabled = false
    toggleStartButton(false)
    requestAnimationFrame(processFrame)
  } catch (error) {
    console.error(error)
    updateStatus(`Unable to access camera: ${error.message}`)
    toggleStartButton(true)
    startButton.disabled = false
  }
}

function setCalibrationPanelOpen(open) {
  calibrationPanelOpen = open
  if (!calibrationPanel) return
  if (open) {
    calibrationPanel.removeAttribute('hidden')
  } else {
    calibrationPanel.setAttribute('hidden', '')
  }
}

function toggleStartButton(visible) {
  if (!startButton) return
  startButton.hidden = !visible
}

function applyParamValue(param, rawValue) {
  const params = state.synthParams
  switch (param) {
    case 'pitch-min': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.pitchMin = clamp(candidate, 40, params.pitchMax - 20)
      if (params.pitchMax <= params.pitchMin) {
        params.pitchMax = params.pitchMin + 20
        if (paramControls['pitch-max']) {
          paramControls['pitch-max'].value = String(Math.round(params.pitchMax))
        }
      }
      if (paramControls['pitch-min']) {
        paramControls['pitch-min'].value = String(Math.round(params.pitchMin))
      }
      buildScale()
      break
    }
    case 'pitch-max': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.pitchMax = clamp(candidate, params.pitchMin + 20, 4000)
      if (paramControls['pitch-max']) {
        paramControls['pitch-max'].value = String(Math.round(params.pitchMax))
      }
      buildScale()
      break
    }
    case 'waveform': {
      params.waveform = String(rawValue)
      if (synth) {
        synth.setWaveform(params.waveform)
      }
      break
    }
    case 'volume-max': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.volumeMax = clamp(candidate, 0, 1)
      break
    }
    case 'filter-base': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.filterBase = clamp(candidate, 0, 1)
      break
    }
    case 'filter-mod': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.filterMod = clamp(candidate, 0, 1)
      break
    }
    case 'filter-q': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      const normalized = clamp(candidate, 0, 1)
      params.filterQ = 0.5 + normalized * 8.5
      break
    }
    case 'vibrato-rate': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.vibratoRate = clamp(candidate, 0, 12)
      break
    }
    case 'vibrato-depth': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.vibratoDepth = clamp(candidate, 0, 1)
      break
    }
    case 'mute-threshold': {
      const candidate = Number(rawValue)
      if (!Number.isFinite(candidate)) break
      params.muteThreshold = clamp(candidate, 0, 1)
      break
    }
  }
}

async function loadHandLandmarker() {
  try {
    const filesetResolver = await loadVisionFileset()

    return await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: '/mediapipe/hand_landmarker.task',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    })
  } catch (err) {
    console.error('Failed to load MediaPipe HandLandmarker', err)
    updateStatus('Hand tracking unavailable. Install assets again or refresh the page.')
    throw err
  }
}

async function loadGestureRecognizer() {
  try {
    const filesetResolver = await loadVisionFileset()

    return await GestureRecognizer.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: '/mediapipe/gesture_recognizer.task',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    })
  } catch (err) {
    console.error('Failed to load MediaPipe GestureRecognizer', err)
    updateStatus('Gesture recognition unavailable. Check assets and reload.')
    throw err
  }
}

async function loadVisionFileset() {
  visionFilesetPromise = visionFilesetPromise ?? FilesetResolver.forVisionTasks('/mediapipe')
  return visionFilesetPromise
}

function processFrame(now) {
  if (!running || !handLandmarker) {
    requestAnimationFrame(processFrame)
    return
  }

  if (videoEl.readyState < 2) {
    requestAnimationFrame(processFrame)
    return
  }

  if (lastFrameTime === now) {
    requestAnimationFrame(processFrame)
    return
  }

  lastFrameTime = now

  frameCounter = (frameCounter + 1) % (FRAME_SKIP + 1)
  if (frameCounter !== 0) {
    requestAnimationFrame(processFrame)
    return
  }

  const results = handLandmarker.detectForVideo(videoEl, now)
  if (results.landmarks?.length) {
    handleHand(results.landmarks[0], now)
  } else {
    handleNoHand()
  }

  requestAnimationFrame(processFrame)
}

function handleHand(landmarks, timestamp) {
  if (!synth) return

  const extrema = getExtrema(landmarks)
  const area = Math.max(0, (extrema.maxX - extrema.minX) * (extrema.maxY - extrema.minY))
  updateAreaRange(area)
  const areaNormalized = normalize(area, state.areaRange.min, state.areaRange.max)

  const depth = getPalmDepthMetric(landmarks)
  if (!state.calibration.active) {
    updateDepthRange(depth)
  }
  const spread = getFingerSpreadMetric(landmarks)
  collectCalibrationSample(depth, spread)

  if (state.calibration.active && gestureRecognizer && (timestamp - lastGestureTimestamp >= GESTURE_INTERVAL_MS || timestamp < lastGestureTimestamp)) {
    try {
      lastGestureTimestamp = timestamp
      const recognition = gestureRecognizer.recognizeForVideo(videoEl, timestamp)
      lastGestureCategories = recognition?.gestures?.[0] ?? []
    } catch (err) {
      console.warn('Gesture recognition error', err)
      lastGestureCategories = []
    }
  }

  const sourceRange = state.calibration.active && state.calibration.captures >= 2
    ? { min: state.calibration.minDepth, max: state.calibration.maxDepth }
    : state.depthRange

  let depthNormalized = 0
  if (Number.isFinite(sourceRange.min) && Number.isFinite(sourceRange.max) && sourceRange.max !== sourceRange.min) {
    depthNormalized = normalize(depth, sourceRange.min, sourceRange.max)
  }

  const centerX = (extrema.maxX + extrema.minX) / 2
  const centerY = (extrema.maxY + extrema.minY) / 2

  const displayX = 1 - centerX // mirror for UI

  const distanceNormalized = clamp(1 - depthNormalized, 0, 1)
  const handSpan = Math.max(extrema.maxX - extrema.minX, 0.0001)
  const metrics = computeMetrics({
    x: displayX,
    y: centerY,
    z: distanceNormalized,
    landmarks,
    handSpan,
  })

  updatePointer(displayX, centerY, areaNormalized)

  const outputs = applyMappings(metrics)

  synth.setActive(!outputs.muted)

  updateReadout({
    pitch: `${outputs.frequency.toFixed(1)} Hz`,
    note: outputs.noteName,
    distance: formatDistance(distanceNormalized),
    volume: outputs.volumeRaw,
    filter: outputs.filterNormalized,
    vibrato: outputs.vibratoNormalized,
    mute: outputs.muteNormalized,
  })

  updateInputReadout(metrics)

  const scalePosition = normalize(outputs.frequency, state.synthParams.pitchMin, state.synthParams.pitchMax)
  updateScaleIndicator(clamp(scalePosition, 0, 1), outputs.noteName)
}

function handleNoHand() {
  synth?.setActive(false)
  pointerEl.style.opacity = '0'
  updateReadout({ pitch: '--', distance: '--', note: '--', volume: '--', filter: '--', vibrato: '--', mute: '--' })
  updateInputReadout()
  updateScaleIndicator(0, '--')
  lastGestureCategories = []
}

function updatePointer(x, y, distance) {
  pointerEl.style.opacity = '1'
  pointerEl.style.setProperty('--x', `${(x * 100).toFixed(2)}%`)
  pointerEl.style.setProperty('--y', `${(y * 100).toFixed(2)}%`)
  const hue = 210 - distance * 160
  pointerEl.style.setProperty('--hue', hue.toFixed(1))
  pointerEl.style.setProperty('--scale', (0.6 + distance * 0.8).toFixed(2))
}

function computeMetrics({ x, y, z, landmarks, handSpan }) {
  const pinchDistance = getPinchDistance(landmarks)
  const span = handSpan && handSpan > 0 ? handSpan : getHandSpanMetric(landmarks)
  const pinchRatio = span > 0 ? pinchDistance / span : pinchDistance
  const pinch = normalizePinch(pinchRatio)
  const curl = computeCurl(landmarks)
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    z: clamp(z, 0, 1),
    pinch,
    curl,
  }
}

function applyMappings(metrics) {
  if (!synth) {
    return {
      frequency: state.synthParams.pitchMin,
      noteName: midiToNoteName(frequencyToMidi(state.synthParams.pitchMin)),
      volume: 0,
      volumeNormalized: 0,
      filterNormalized: state.synthParams.filterBase,
      vibratoDepth: 0,
      vibratoNormalized: 0,
      pitchMetric: metrics.z ?? 0,
    }
  }

  const {
    pitchMin,
    pitchMax,
    volumeMax,
    filterBase,
    filterMod,
    filterQ,
    vibratoRate,
    vibratoDepth,
  } = state.synthParams

  const pitchValue = resolveMappingValue('pitch', metrics, metrics.z ?? 0.5)
  const frequency = mapDistanceToFrequency(pitchValue)
  const noteName = midiToNoteName(frequencyToMidi(frequency))

  const volumeSource = resolveMappingValue('volume', metrics, 1)
  const volumeNormalizedRaw = clamp(volumeSource, 0, 1)

  const muteSource = resolveMappingValue('mute', metrics, 0)
  const muteNormalized = clamp(muteSource, 0, 1)
  const muted = (state.mappingSources.mute !== 'none') && muteNormalized >= state.synthParams.muteThreshold

  const volumeNormalized = muted ? 0 : volumeNormalizedRaw
  const volume = volumeNormalized * volumeMax

  const filterSource = resolveMappingValue('filter', metrics, 0)
  const filterNormalized = clamp(filterBase + filterSource * filterMod, 0, 1)

  const vibratoSource = resolveMappingValue('vibrato', metrics, 0)
  const vibratoNormalized = clamp(vibratoSource, 0, 1)
  const vibratoAmount = vibratoNormalized * vibratoDepth

  synth.setFrequency(frequency)
  synth.setVolume(volume)
  synth.setFilterNormalized(filterNormalized, filterQ)
  synth.setVibrato(vibratoRate, vibratoAmount)

  return {
    frequency,
    noteName,
    volume,
    volumeNormalized,
    volumeRaw: volumeNormalizedRaw,
    filterNormalized,
    vibratoDepth: vibratoAmount,
    vibratoNormalized: vibratoDepth > 0 ? vibratoAmount / vibratoDepth : vibratoNormalized,
    pitchMetric: pitchValue,
    muteNormalized,
    muted,
  }
}

function resolveMappingValue(target, metrics, fallback) {
  const source = state.mappingSources[target] ?? 'none'
  const invert = Boolean(state.mappingInvert[target])
  let value = fallback
  if (source && source !== 'none') {
    const candidate = metrics[source]
    if (candidate != null) {
      value = candidate
    }
  }
  const clamped = clamp(value, 0, 1)
  return invert ? 1 - clamped : clamped
}

function updateMappingSource(target, source) {
  const sanitized = source || 'none'
  state.mappingSources[target] = sanitized
  if (sanitized === 'none') return
  for (const key of mappingKeys) {
    if (key === target) continue
    if (state.mappingSources[key] === sanitized) {
      state.mappingSources[key] = 'none'
      const select = mappingControls.sources[key]
      if (select) {
        select.value = 'none'
      }
    }
  }
}

function updateAreaRange(sample) {
  const smoothing = 0.05
  state.areaRange.min = lerp(state.areaRange.min, Math.min(state.areaRange.min, sample), smoothing)
  state.areaRange.max = lerp(state.areaRange.max, Math.max(state.areaRange.max, sample), smoothing)
  if (state.areaRange.max - state.areaRange.min < 0.02) {
    state.areaRange.max = state.areaRange.min + 0.02
  }
}

function updateDepthRange(sample) {
  if (state.depthRangeLocked) return
  const smoothing = 0.04
  const minSample = Math.min(state.depthRange.min, sample)
  const maxSample = Math.max(state.depthRange.max, sample)
  state.depthRange.min = Number.isFinite(state.depthRange.min)
    ? lerp(state.depthRange.min, minSample, smoothing)
    : sample
  state.depthRange.max = Number.isFinite(state.depthRange.max)
    ? lerp(state.depthRange.max, maxSample, smoothing)
    : sample
  if (Number.isFinite(state.depthRange.min) && Number.isFinite(state.depthRange.max)) {
    if (state.depthRange.max - state.depthRange.min < 0.01) {
      state.depthRange.max = state.depthRange.min + 0.01
    }
  }
}

function updatePinchRange(sample) {
  const smoothing = 0.12
  const minSample = Math.min(state.pinchRange.min, sample)
  const maxSample = Math.max(state.pinchRange.max, sample)
  state.pinchRange.min = Number.isFinite(state.pinchRange.min)
    ? lerp(state.pinchRange.min, minSample, smoothing)
    : sample
  state.pinchRange.max = Number.isFinite(state.pinchRange.max)
    ? lerp(state.pinchRange.max, maxSample, smoothing)
    : sample
  if (Number.isFinite(state.pinchRange.min) && Number.isFinite(state.pinchRange.max)) {
    if (state.pinchRange.max - state.pinchRange.min < 0.01) {
      state.pinchRange.max = state.pinchRange.min + 0.01
    }
  }
}

function mapDistanceToFrequency(norm) {
  const clamped = clamp(norm, 0, 1)
  const { pitchMin, pitchMax } = state.synthParams
  const safeMin = Math.max(20, Math.min(pitchMin, pitchMax - 10))
  const safeMax = Math.max(safeMin + 10, pitchMax)
  const span = Math.log2(safeMax / safeMin)
  return Number.isFinite(span) ? safeMin * Math.pow(2, clamped * span) : safeMin
}

function normalizePinch(ratio) {
  updatePinchRange(ratio)
  const { min, max } = state.pinchRange
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0
  const normalized = 1 - normalize(ratio, min, max)
  return clamp(normalized, 0, 1)
}

function getPinchDistance(landmarks) {
  const thumbTip = landmarks?.[4]
  const indexTip = landmarks?.[8]
  if (!thumbTip || !indexTip) return 0
  const dx = thumbTip.x - indexTip.x
  const dy = thumbTip.y - indexTip.y
  const dz = (thumbTip.z ?? 0) - (indexTip.z ?? 0)
  return Math.hypot(dx, dy, dz)
}

function getHandSpanMetric(landmarks) {
  const indexBase = landmarks?.[5]
  const pinkyBase = landmarks?.[17]
  if (!indexBase || !pinkyBase) return 0
  const dx = indexBase.x - pinkyBase.x
  const dy = indexBase.y - pinkyBase.y
  const dz = (indexBase.z ?? 0) - (pinkyBase.z ?? 0)
  return Math.hypot(dx, dy, dz)
}

function computeCurl(landmarks) {
  if (!landmarks) return 0
  const fingers = [
    { mcp: 5, pip: 6, tip: 8 },
    { mcp: 9, pip: 10, tip: 12 },
    { mcp: 13, pip: 14, tip: 16 },
    { mcp: 17, pip: 18, tip: 20 },
  ]
  let sum = 0
  let count = 0

  for (const finger of fingers) {
    const mcp = landmarks[finger.mcp]
    const pip = landmarks[finger.pip]
    const tip = landmarks[finger.tip]
    if (!mcp || !pip || !tip) continue

    const v1 = normalizeVector(subtract(pip, mcp))
    const v2 = normalizeVector(subtract(tip, pip))
    const dot = clamp(dotProduct(v1, v2), -1, 1)
    const extension = (dot + 1) / 2 // 1 when straight, 0 when folded back
    const curl = clamp(1 - extension, 0, 1)
    sum += curl
    count += 1
  }

  return count ? clamp(sum / count, 0, 1) : 0
}

function subtract(a, b) {
  return {
    x: (a?.x ?? 0) - (b?.x ?? 0),
    y: (a?.y ?? 0) - (b?.y ?? 0),
    z: (a?.z ?? 0) - (b?.z ?? 0),
  }
}

function normalizeVector(v) {
  const length = Math.hypot(v.x, v.y, v.z)
  if (length === 0) {
    return { x: 0, y: 0, z: 0 }
  }
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  }
}

function dotProduct(a, b) {
  return (a.x ?? 0) * (b.x ?? 0) + (a.y ?? 0) * (b.y ?? 0) + (a.z ?? 0) * (b.z ?? 0)
}

function updateInputReadout(metrics) {
  if (!inputReadout) return
  if (!metrics) {
    Object.values(inputReadout).forEach(el => {
      if (el) el.textContent = '--'
    })
    return
  }
  if (inputReadout.x) inputReadout.x.textContent = formatDecimal(metrics.x)
  if (inputReadout.y) inputReadout.y.textContent = formatDecimal(metrics.y)
  if (inputReadout.z) inputReadout.z.textContent = formatDecimal(metrics.z)
  if (inputReadout.pinch) inputReadout.pinch.textContent = formatDecimal(metrics.pinch)
  if (inputReadout.curl) inputReadout.curl.textContent = formatDecimal(metrics.curl)
}

function updateReadout(fields = {}) {
  if ('pitch' in fields && readout.pitch) {
    readout.pitch.textContent = String(fields.pitch)
  }
  if ('note' in fields && readout.note) {
    readout.note.textContent = String(fields.note)
  }
  if ('distance' in fields && readout.distance) {
    readout.distance.textContent = String(fields.distance)
  }
  if ('volume' in fields && readout.volume) {
    const value = fields.volume
    readout.volume.textContent = typeof value === 'number' ? formatPercent(value) : String(value)
  }
  if ('filter' in fields && readout.filter) {
    const value = fields.filter
    readout.filter.textContent = typeof value === 'number' ? formatPercent(value) : String(value)
  }
  if ('vibrato' in fields && readout.vibrato) {
    const value = fields.vibrato
    readout.vibrato.textContent = typeof value === 'number' ? formatPercent(value) : String(value)
  }
  if ('mute' in fields && readout.mute) {
    const value = fields.mute
    readout.mute.textContent = typeof value === 'number' ? formatPercent(value) : String(value)
  }
}

function updateStatus(message) {
  statusEl.textContent = message
}

function updateScaleIndicator(position, note) {
  if (!scaleIndicatorEl) return
  scaleIndicatorEl.style.setProperty('--position', `${(position * 100).toFixed(2)}%`)
  scaleIndicatorEl.textContent = note
}

function triggerCalibration() {
  if (state.calibration.active) {
    finishCalibration({ force: true })
    return
  }
  setCalibrationPanelOpen(true)
  state.calibration = {
    active: true,
    minDepth: Infinity,
    maxDepth: -Infinity,
    lastCapture: 0,
    captures: 0,
    lastWasFist: false,
    lastPrompt: performance.now(),
  }
  state.depthRangeLocked = false
  calibrateButton.textContent = 'Finish Calibration'
  updateStatus('Calibration on: move to one extreme and make a fist to capture. Repeat for the other extreme.')
}

function collectCalibrationSample(depth, spread) {
  if (!state.calibration.active) return
  const now = performance.now()
  const fist = isFist(spread) || hasGestureFist(lastGestureCategories)

  if (fist) {
    if (!state.calibration.lastWasFist && now - state.calibration.lastCapture >= 600) {
      state.calibration.lastCapture = now
      state.calibration.captures += 1
      state.calibration.minDepth = Math.min(state.calibration.minDepth, depth)
      state.calibration.maxDepth = Math.max(state.calibration.maxDepth, depth)

      const span = state.calibration.maxDepth - state.calibration.minDepth
      if (state.calibration.captures === 1) {
        updateStatus(`Captured one extreme (scale ${depth.toFixed(3)}). Move to the other end and make another fist.`)
        state.calibration.lastPrompt = now
      } else if (span < MIN_CALIBRATION_SPAN) {
        updateStatus(`Extremes too similar (Δ ${span.toFixed(3)}). Reach farther before making the next fist.`)
        state.calibration.lastPrompt = now
      } else {
        finishCalibration({ force: false, message: 'Calibration saved! Hover to play.' })
        return
      }
    }
    state.calibration.lastWasFist = true
  } else {
    state.calibration.lastWasFist = false
    if (now - state.calibration.lastPrompt > 1600) {
      const detected = formatGestureCategories(lastGestureCategories)
      const gestureHint = detected ? ` Detected: ${detected}` : ' Gesture not detected.'
      if (state.calibration.captures === 0) {
        updateStatus(`Make a fist at one extreme to capture the first point.${gestureHint}`)
      } else {
        updateStatus(`Make a fist at the other extreme to finish calibration.${gestureHint}`)
      }
      state.calibration.lastPrompt = now
    }
  }
}

function finishCalibration({ force = false, message } = {}) {
  const { minDepth, maxDepth, active } = state.calibration
  if (!active && !force) return

  const span = maxDepth - minDepth
  let finalMessage = message ?? 'Calibration cancelled. Using previous range.'
  if (span > MIN_CALIBRATION_SPAN && Number.isFinite(span)) {
    state.depthRange.min = minDepth
    state.depthRange.max = maxDepth
    state.depthRangeLocked = true
    finalMessage = message ?? 'Calibration complete. Hover to play!'
  }

  state.calibration = {
    active: false,
    minDepth: Infinity,
    maxDepth: -Infinity,
    lastCapture: 0,
    captures: 0,
    lastWasFist: false,
    lastPrompt: 0,
  }
  calibrateButton.disabled = false
  calibrateButton.textContent = 'Calibrate Range'
  updateStatus(finalMessage)
  if (!state.calibration.active) {
    setCalibrationPanelOpen(false)
  }
}

function buildScale() {
  if (!scaleLabelsEl) return
  scaleLabelsEl.innerHTML = ''
  const minMidi = Math.round(frequencyToMidi(state.synthParams.pitchMin))
  const maxMidi = Math.round(frequencyToMidi(state.synthParams.pitchMax))
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const { name, isNatural } = decomposeMidi(midi)
    if (!isNatural) continue
    const position = normalize(midi, minMidi, maxMidi)
    const tick = document.createElement('div')
    tick.className = 'scale__tick'
    tick.style.setProperty('--position', `${(position * 100).toFixed(2)}%`)
    tick.textContent = name
    scaleLabelsEl.append(tick)
  }
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440)
}

function midiToNoteName(midi) {
  const { name } = decomposeMidi(midi)
  return name
}

function decomposeMidi(midi) {
  const pitchClassNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const rounded = Math.round(midi)
  const pitchClass = ((rounded % 12) + 12) % 12
  const octave = Math.floor(rounded / 12) - 1
  const name = `${pitchClassNames[pitchClass]}${octave}`
  return { name, isNatural: NATURAL_PITCH_CLASSES.has(pitchClass) }
}

function getPalmDepthMetric(landmarks) {
  if (!landmarks?.length) return 0
  const wrist = landmarks[0]
  const bases = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]]
  let sum = 0
  for (const joint of bases) {
    const dx = joint.x - wrist.x
    const dy = joint.y - wrist.y
    sum += Math.hypot(dx, dy)
  }
  return bases.length ? sum / bases.length : 0
}

function getFingerSpreadMetric(landmarks) {
  const wrist = landmarks[0]
  const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]]
  let sum = 0
  for (const tip of tips) {
    const dx = tip.x - wrist.x
    const dy = tip.y - wrist.y
    sum += Math.hypot(dx, dy)
  }
  return sum / tips.length
}

function isFist(spread) {
  return spread < FIST_THRESHOLD
}

function formatDecimal(value) {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '--'
  const clamped = clamp(value, 0, 1)
  return `${Math.round(clamped * 100)}%`
}

function formatDistance(normalized) {
  const clamped = clamp(normalized, 0, 1)
  const cm = lerp(60, 8, clamped)
  return `${cm.toFixed(0)} cm (est)`
}

function hasGestureFist(categories) {
  if (!categories || categories.length === 0) return false
  return categories.some(cat => {
    const name = cat.categoryName?.toLowerCase()
    return name?.includes('fist') && (cat.score ?? 0) > 0.3
  })
}

function formatGestureCategories(categories) {
  if (!categories || categories.length === 0) return ''
  return categories
    .filter(cat => (cat.score ?? 0) > 0.1)
    .map(cat => `${cat.categoryName || '—'} ${(cat.score * 100).toFixed(0)}%`)
    .join(', ')
}

function getExtrema(landmarks) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { minX, maxX, minY, maxY }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalize(value, min, max) {
  const range = max - min
  if (range <= 0) return 0
  const norm = (value - min) / range
  return clamp(norm, 0, 1)
}

class ThereminSynth {
  constructor() {
    this.context = new AudioContext()
    this.outputGain = this.context.createGain()
    this.outputGain.gain.value = 0

    this.filter = this.context.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 2500
    this.filter.Q.value = 0.8

    this.oscillator = this.context.createOscillator()
    this.oscillator.type = 'sine'
    this.oscillator.frequency.value = 440

    this.lfo = this.context.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = 5

    this.lfoGain = this.context.createGain()
    this.lfoGain.gain.value = 0

    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.oscillator.frequency)

    this.oscillator.connect(this.filter)
    this.filter.connect(this.outputGain)

    this.outputGain.connect(this.context.destination)

    this.oscillator.start()
    this.lfo.start()

    this.active = false
    this.targetVolume = 0
    this.waveform = 'sine'
  }

  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  setActive(active) {
    this.active = active
    this.applyVolume()
  }

  setFrequency(frequency) {
    const now = this.context.currentTime
    this.oscillator.frequency.cancelScheduledValues(now)
    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.05)
  }

  setVolume(value) {
    this.targetVolume = clamp(value, 0, 1)
    this.applyVolume()
  }

  setVibrato(rate, depth) {
    const now = this.context.currentTime
    this.lfo.frequency.cancelScheduledValues(now)
    this.lfo.frequency.setTargetAtTime(rate, now, 0.1)
    this.lfoGain.gain.cancelScheduledValues(now)
    this.lfoGain.gain.setTargetAtTime(depth, now, 0.1)
  }

  setWaveform(type) {
    if (!type || this.waveform === type) return
    try {
      this.oscillator.type = type
      this.waveform = type
    } catch (err) {
      console.warn('Unsupported waveform', type, err)
    }
  }

  setFilterNormalized(amount, resonance) {
    const now = this.context.currentTime
    const normalized = clamp(amount, 0, 1)
    const minFreq = 300
    const maxFreq = 8000
    const freq = minFreq + normalized * (maxFreq - minFreq)
    this.filter.frequency.cancelScheduledValues(now)
    this.filter.frequency.setTargetAtTime(freq, now, 0.08)
    if (typeof resonance === 'number' && Number.isFinite(resonance)) {
      this.filter.Q.setTargetAtTime(resonance, now, 0.1)
    }
  }

  applyVolume() {
    const now = this.context.currentTime
    const target = this.active ? this.targetVolume : 0
    this.outputGain.gain.cancelScheduledValues(now)
    this.outputGain.gain.setTargetAtTime(target, now, 0.08)
  }
}

window.addEventListener('beforeunload', () => {
  if (videoEl.srcObject) {
    const tracks = videoEl.srcObject.getTracks?.() ?? []
    tracks.forEach(track => track.stop())
  }
})
