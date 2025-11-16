import { synthParams } from "../store";
import "./ControlPanel.css";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div class="control-panel__slider">
      <label class="control-panel__slider-label">
        <span>{label}</span>
        <span class="control-panel__slider-value">
          {typeof value === 'number' ? value.toFixed(max > 10 ? 0 : 2) : value}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onChange(parseFloat(e.target.value))}
        class="control-panel__slider-input"
      />
    </div>
  );
}

export function ControlPanel() {
  return (
    <div class="control-panel">
      <div class="control-panel__section">
        <h3 class="control-panel__title">Pitch Range</h3>
        <Slider
          label="Min"
          value={synthParams.pitchMin.value}
          min={40}
          max={2000}
          step={10}
          onChange={(v) => {
            const newMin = Math.min(v, synthParams.pitchMax.value - 20);
            synthParams.pitchMin.value = newMin;
          }}
        />
        <Slider
          label="Max"
          value={synthParams.pitchMax.value}
          min={100}
          max={4000}
          step={10}
          onChange={(v) => {
            const newMax = Math.max(v, synthParams.pitchMin.value + 20);
            synthParams.pitchMax.value = newMax;
          }}
        />
      </div>

      <div class="control-panel__section">
        <h3 class="control-panel__title">Filter</h3>
        <Slider
          label="Cutoff"
          value={synthParams.filterBase.value}
          min={0}
          max={1}
          onChange={(v) => (synthParams.filterBase.value = v)}
        />
        <Slider
          label="Resonance"
          value={synthParams.filterQ.value}
          min={0}
          max={1}
          onChange={(v) => (synthParams.filterQ.value = v)}
        />
      </div>

      <div class="control-panel__section">
        <h3 class="control-panel__title">Vibrato</h3>
        <Slider
          label="Rate"
          value={synthParams.vibratoRate.value}
          min={0}
          max={12}
          step={0.1}
          onChange={(v) => (synthParams.vibratoRate.value = v)}
        />
        <Slider
          label="Depth"
          value={synthParams.vibratoDepth.value}
          min={0}
          max={1}
          onChange={(v) => (synthParams.vibratoDepth.value = v)}
        />
      </div>

      <div class="control-panel__section">
        <h3 class="control-panel__title">Envelope</h3>
        <Slider
          label="Max Volume"
          value={synthParams.volumeMax.value}
          min={0}
          max={1}
          onChange={(v) => (synthParams.volumeMax.value = v)}
        />
        <Slider
          label="Mute Threshold"
          value={synthParams.muteThreshold.value}
          min={0}
          max={1}
          onChange={(v) => (synthParams.muteThreshold.value = v)}
        />
      </div>
    </div>
  );
}
