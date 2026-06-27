import { useEffect, useRef } from "preact/hooks";
import "./WaveformKnob.css";

const OPTIONS = [
  {
    value: "sine",
    label: "Sine",
    angle: -150,
    path: "M22 28c-4 0-5.586-5.652-7.266-11.625C13.52 12.055 12 6.668 10 6.668c-4.52 0-4.668 9.238-4.668 9.332H2.668c0-.492.078-12 7.332-12 4 0 5.613 5.668 7.293 11.652 1.148 4.082 2.707 9.68 4.707 9.68 4.586 0 4.707-9.238 4.707-9.332h2.668c0 .492-.082 12-7.375 12Z",
  },
  {
    value: "triangle",
    label: "Triangle",
    angle: -90,
    path: "m29.332 16-6.664 13.332L9.465 8.055 5.652 16H2.668L9.332 2.668l13.203 21.277L26.348 16Z",
  },
  {
    value: "sawtooth",
    label: "Saw",
    angle: -30,
    path: "M14.668 29.332V9.105l-12 12.227v-3.773L17.332 2.668v20.227l12-12.227v3.773Z",
  },
  {
    value: "square",
    label: "Square",
    angle: 30,
    path: "M2.668 2.668V16h2.664V5.332h9.336v24h14.664V16h-2.664v10.668h-9.336v-24Z",
  },
];

const START_DEG = -150;
const ICON_RADIUS = 42; // expressed in svg viewBox units (0-100)
const ICON_SIZE = 9; // final icon size in viewBox units
const ICON_BASE_SCALE = ICON_SIZE / 32; // original icons are 32x32

export function WaveformKnob({ value, onChange, label }) {
  const knobRef = useRef(null);
  const positionRef = useRef(0);
  const indexRef = useRef(0);
  const lastYRef = useRef(0);
  const draggingRef = useRef(false);

  const optionIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === value)
  );
  const activeIndex = optionIndex >= 0 ? optionIndex : 0;
  const maxIndex = Math.max(OPTIONS.length - 1, 0);
  const normalized = maxIndex > 0 ? activeIndex / maxIndex : 0;
  const activeLabel = OPTIONS[activeIndex]?.label ?? OPTIONS[0].label;

  useEffect(() => {
    positionRef.current = normalized;
    indexRef.current = activeIndex;
  }, [normalized, activeIndex]);

  const handlePointerDown = (event) => {
    draggingRef.current = true;
    lastYRef.current = event.clientY;
    knobRef.current?.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const updateFromNormalized = (norm) => {
    const clamped = Math.min(Math.max(norm, 0), 1);
    positionRef.current = clamped;
    const nextIndex = maxIndex > 0 ? Math.round(clamped * maxIndex) : 0;
    if (nextIndex !== indexRef.current) {
      indexRef.current = nextIndex;
      onChange?.(OPTIONS[nextIndex].value);
    }
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    const dy = event.clientY - lastYRef.current;
    lastYRef.current = event.clientY;
    const delta = -dy / 200;
    updateFromNormalized(positionRef.current + delta);
  };

  const handlePointerUp = (event) => {
    draggingRef.current = false;
    knobRef.current?.releasePointerCapture(event.pointerId);
  };

  const handlePointerCancel = () => {
    draggingRef.current = false;
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(
      Math.max(indexRef.current + direction, 0),
      maxIndex
    );
    if (nextIndex !== indexRef.current) {
      indexRef.current = nextIndex;
      positionRef.current = maxIndex > 0 ? nextIndex / maxIndex : 0;
      onChange?.(OPTIONS[nextIndex]?.value ?? OPTIONS[0].value);
    }
  };

  const activeAngle = OPTIONS[activeIndex]?.angle ?? START_DEG;
  const rotationDeg = activeAngle + 90;

  return (
    <div class="waveform-knob">
      <div class="waveform-knob__dial">
        <div
          ref={knobRef}
          class="waveform-knob__interactive"
          aria-label={label}
          aria-description={`Current waveform: ${activeLabel}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onWheel={handleWheel}
        >
          <svg class="waveform-knob__icons" viewBox="0 0 100 100" aria-hidden="true">
            {OPTIONS.map((option, index) => {
              const angleDeg = option.angle ?? START_DEG;
              const angleRad = (angleDeg * Math.PI) / 180;
              const x = 50 + Math.cos(angleRad) * ICON_RADIUS;
              const y = 50 + Math.sin(angleRad) * ICON_RADIUS;
              const scale = ICON_BASE_SCALE * (index === activeIndex ? 1.1 : 1);
              const offset = 16 * scale;
              return (
                <g
                  key={option.value}
                  transform={`translate(${x} ${y})`}
                  class={index === activeIndex ? "waveform-knob__icon waveform-knob__icon--active" : "waveform-knob__icon"}
                >
                  <g transform={`translate(${-offset} ${-offset}) scale(${scale})`}>
                    <path d={option.path} fill="currentColor" />
                  </g>
                </g>
              );
            })}
          </svg>
          <div class="waveform-knob__body">
            <div
              class="waveform-knob__indicator"
              style={{
                transform: `translate(-50%, -50%) rotate(${rotationDeg}deg) translate(0, calc(var(--waveform-knob-size) * -0.36))`,
              }}
            />
          </div>
        </div>
      </div>
      {label && <div class="waveform-knob__label">{label}</div>}
    </div>
  );
}
