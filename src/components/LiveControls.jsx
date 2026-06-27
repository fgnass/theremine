import { Knob } from "./Knob";
import { synthParams, mappingSources, effectiveValues } from "../store";
import "./LiveControls.css";
import { WaveformKnob } from "./WaveformKnob";
import { NoteDial } from "./NoteDial";

export function LiveControls() {
  // Determine which values to show based on mapping
  const volumeMapped = mappingSources.volume.hand.value !== "none";
  const cutoffMapped = mappingSources.cutoff.hand.value !== "none";
  const resonanceMapped = mappingSources.resonance.hand.value !== "none";

  const volumeValue = volumeMapped ? effectiveValues.volume.value : synthParams.volumeMax.value;
  const cutoffValue = cutoffMapped ? effectiveValues.cutoff.value : synthParams.filterBase.value;
  const resonanceValue = resonanceMapped ? effectiveValues.resonance.value : synthParams.filterQ.value;

  return (
    <div class="live-controls">
      <Knob
        label="Volume"
        value={volumeValue}
        min={0}
        max={1}
        onChange={(v) => (synthParams.volumeMax.value = v)}
      />
      <WaveformKnob
        label="Waveform"
        value={synthParams.waveform.value}
        onChange={(next) => (synthParams.waveform.value = next)}
      />
      <Knob
        label="Cutoff"
        value={cutoffValue}
        min={0}
        max={1}
        onChange={(v) => (synthParams.filterBase.value = v)}
      />
      <Knob
        label="Resonance"
        value={resonanceValue}
        min={0}
        max={1}
        onChange={(v) => (synthParams.filterQ.value = v)}
      />
      <div class="live-controls__readout">
        <NoteDial />
      </div>
    </div>
  );
}
