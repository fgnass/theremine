import { useEffect, useRef } from "preact/hooks";
import { currentFrequency, currentNote } from "../state/appState";
import { synthParams } from "../store";
import "./NoteDial.css";

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const STEP_DEG = 11; // angular spacing between adjacent semitones on the drum
const RADIUS = 240; // cylinder radius (px) in the 3D scene
const EASE = 0.2; // glide factor toward the target pitch each frame

function freqToMidi(f) {
  return 69 + 12 * Math.log2(f / 440);
}

export function NoteDial() {
  const drumRef = useRef(null);
  const rootRef = useRef(null);
  const displayed = useRef(60);
  const target = useRef(60);

  // Notes span the configured pitch range (+ a little margin). Recomputed only
  // when the range changes, so the drum is otherwise rotated purely via the ref.
  const minMidi = Math.floor(freqToMidi(Math.max(20, synthParams.pitchMin.value))) - 2;
  const maxMidi = Math.ceil(freqToMidi(Math.max(40, synthParams.pitchMax.value))) + 2;
  const notes = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    notes.push({ midi: m, name: NAMES[((m % 12) + 12) % 12] });
  }

  useEffect(() => {
    const initial = currentFrequency.value > 0 ? freqToMidi(currentFrequency.value) : 60;
    displayed.current = Math.min(maxMidi, Math.max(minMidi, initial));
    target.current = displayed.current;

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const f = currentFrequency.value;
      const playing = f > 0;
      if (playing) {
        target.current = Math.min(maxMidi, Math.max(minMidi, freqToMidi(f)));
      }
      displayed.current += (target.current - displayed.current) * EASE;

      const drum = drumRef.current;
      if (drum) {
        const angle = (displayed.current - minMidi) * STEP_DEG;
        drum.style.transform = `translateZ(${-RADIUS}px) rotateY(${-angle}deg)`;
      }
      const root = rootRef.current;
      if (root) root.classList.toggle("note-dial--playing", playing);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [minMidi, maxMidi]);

  return (
    <div ref={rootRef} class="note-dial">
      <div class="note-dial__bezel">
        <div class="note-dial__viewport">
        <div ref={drumRef} class="note-dial__drum">
          {notes.map((n) => (
            <span
              key={n.midi}
              class="note-dial__note"
              style={{
                transform: `translate(-50%, -50%) rotateY(${(n.midi - minMidi) * STEP_DEG}deg) translateZ(${RADIUS}px)`,
              }}
            >
              {n.name}
            </span>
          ))}
        </div>
        <div class="note-dial__center" />
        <div class="note-dial__fog" />
        <div class="note-dial__glass" />
        <div class="note-dial__pointer" />
        </div>
      </div>
      <span class="sr-only" role="status" aria-live="polite">
        {currentNote.value}
      </span>
    </div>
  );
}
