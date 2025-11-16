import { useEffect } from "preact/hooks";
import { mappingSources, mappingInvert, scale } from "../store";
import { ControlPanel } from "./ControlPanel";

const SCALES = [
  { value: "chromatic", label: "Chromatic (all notes)" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "pentatonic", label: "Pentatonic" },
  { value: "blues", label: "Blues" },
];

const HANDS = [
  { value: "any", label: "Any Hand" },
  { value: "left", label: "Left Hand" },
  { value: "right", label: "Right Hand" },
  { value: "none", label: "Off" },
];

const AXES = [
  { value: "X", label: "Horizontal" },
  { value: "Y", label: "Vertical" },
  { value: "Z", label: "Distance" },
];

function MappingField({ label, target }) {
  const handValue = mappingSources[target].hand.value;
  const axisValue = mappingSources[target].axis.value;
  const invertValue = mappingInvert[target].value;

  const handleHandChange = (e) => {
    const newHand = e.target.value;
    mappingSources[target].hand.value = newHand;

    // Reset invert if set to "none"
    if (newHand === "none") {
      mappingInvert[target].value = false;
    }
  };

  const handleAxisChange = (e) => {
    mappingSources[target].axis.value = e.target.value;
  };

  const handleInvertChange = (e) => {
    mappingInvert[target].value = e.target.checked;
  };

  const isDisabled = handValue === "none";

  return (
    <div class="mapping-field">
      <span class="mapping-field__label">{label}</span>
      <div class="mapping-field__controls">
        <select
          value={handValue}
          onChange={handleHandChange}
          class="mapping-field__select"
        >
          {HANDS.map((hand) => (
            <option key={hand.value} value={hand.value}>
              {hand.label}
            </option>
          ))}
        </select>
        <select
          value={axisValue}
          onChange={handleAxisChange}
          disabled={isDisabled}
          class="mapping-field__select"
        >
          {AXES.map((axis) => (
            <option key={axis.value} value={axis.value}>
              {axis.label}
            </option>
          ))}
        </select>
        <label class="mapping-field__invert">
          <input
            type="checkbox"
            checked={invertValue}
            onChange={handleInvertChange}
            disabled={isDisabled}
          />
          <span>Invert</span>
        </label>
      </div>
    </div>
  );
}

export function SettingsModal({ open, onClose }) {
  useEffect(() => {
    if (open) {
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
    } else {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div class="mapping-modal">
      <div class="mapping-modal__backdrop" onClick={onClose} />
      <div class="mapping-modal__dialog" role="dialog" aria-modal="true">
        <header class="mapping-modal__header">
          <h2>Settings</h2>
          <button
            type="button"
            class="mapping-modal__close"
            onClick={onClose}
            aria-label="Close settings modal"
          >
            ×
          </button>
        </header>

        <div class="mapping-modal__body">
          <div class="mapping-field">
            <span class="mapping-field__label">Scale</span>
            <select
              value={scale.value}
              onChange={(e) => (scale.value = e.target.value)}
            >
              {SCALES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <MappingField label="Pitch" target="pitch" />
          <MappingField label="Volume" target="volume" />
          <MappingField label="Cutoff" target="cutoff" />
          <MappingField label="Resonance" target="resonance" />

          <div class="mapping-modal__divider" />

          <ControlPanel />
        </div>

        <footer class="mapping-modal__footer">
          <button type="button" class="mapping-modal__done" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
