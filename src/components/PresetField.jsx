import { useState } from "preact/hooks";
import {
  BUILTIN_PRESETS,
  customPresets,
  applyPreset,
  saveCurrentAsPreset,
  deleteCustomPreset,
} from "../presets";

export function PresetField() {
  const [name, setName] = useState("");

  const custom = customPresets.value;

  const handleLoad = (e) => {
    const id = e.target.value;
    if (!id) return;
    const found =
      BUILTIN_PRESETS.find((p) => p.id === id) ||
      custom.find((p) => p.id === id);
    if (found) applyPreset(found.settings);
    // Reset to the placeholder so the same preset can be re-applied later.
    e.target.value = "";
  };

  const handleSave = () => {
    if (!name.trim()) return;
    saveCurrentAsPreset(name);
    setName("");
  };

  return (
    <div class="mapping-field preset-field">
      <span class="mapping-field__label">Preset</span>

      <select class="preset-field__select" value="" onChange={handleLoad}>
        <option value="" disabled>
          Load a preset…
        </option>
        <optgroup label="Built in">
          {BUILTIN_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.description ? `${p.name} — ${p.description}` : p.name}
            </option>
          ))}
        </optgroup>
        {custom.length > 0 && (
          <optgroup label="My presets">
            {custom.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div class="preset-field__save">
        <input
          type="text"
          class="preset-field__input"
          placeholder="Save current setup as…"
          value={name}
          onInput={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          type="button"
          class="preset-field__save-button"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          Save
        </button>
      </div>

      {custom.length > 0 && (
        <ul class="preset-field__list">
          {custom.map((p) => (
            <li key={p.id} class="preset-field__chip">
              <span>{p.name}</span>
              <button
                type="button"
                class="preset-field__delete"
                aria-label={`Delete preset ${p.name}`}
                onClick={() => deleteCustomPreset(p.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
