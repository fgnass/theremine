import { useRef } from "preact/hooks";
import "./Knob.css";

const TICK_MARKS = Array.from({ length: 12 }, (_, index) => index * 30)
  .filter((deg) => deg !== 90) // keep gap at bottom
  .map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const cx = 50;
    const cy = 50;
    const rOuter = 48;
    const rInner = 38;
    return {
      key: deg,
      x1: cx + Math.cos(rad) * rInner,
      y1: cy + Math.sin(rad) * rInner,
      x2: cx + Math.cos(rad) * rOuter,
      y2: cy + Math.sin(rad) * rOuter,
    };
  });

/**
 * Skeuomorphic Moog-style Knob component
 * @param {Object} props
 * @param {string} props.label - Label displayed below the knob
 * @param {number} props.value - Current value (0-1 normalized)
 * @param {Function} props.onChange - Callback when value changes
 * @param {number} [props.min=0] - Minimum value
 * @param {number} [props.max=1] - Maximum value
 */
export function Knob({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
}) {
  const knobRef = useRef(null);
  const lastYRef = useRef(0);
  const draggingRef = useRef(false);

  // Constants for knob rotation mapping
  const START_DEG = 300; // align 0% exactly to FIRST tick at 300°
  const END_DEG = 240;   // align 100% exactly to last tick (240°)
  const SWEEP_DEG = ((END_DEG - START_DEG + 360) % 360) || 360; // 300° sweep

  // Normalize value to 0-1 range
  const normalized = (value - min) / (max - min);

  // Calculate rotation angle
  const getRotationDeg = (norm) => {
    const v = norm <= 0.0001 ? 0 : (norm >= 0.9999 ? 1 : norm);
    const userDeg = (START_DEG + SWEEP_DEG * v + 360) % 360;
    return userDeg - 90; // CSS rotation offset
  };

  // Handle pointer events
  const handlePointerDown = (e) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    knobRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - lastYRef.current;
    lastYRef.current = e.clientY;

    const delta = -dy / 200;
    const newNormalized = Math.min(1, Math.max(0, normalized + delta));
    const newValue = min + newNormalized * (max - min);
    onChange(newValue);
  };

  const handlePointerUp = (e) => {
    draggingRef.current = false;
    knobRef.current?.releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = () => {
    draggingRef.current = false;
  };

  const stepBy = (deltaNorm) => {
    const newNormalized = Math.min(1, Math.max(0, normalized + deltaNorm));
    onChange(min + newNormalized * (max - min));
  };

  // Handle wheel events
  const handleWheel = (e) => {
    e.preventDefault();
    stepBy((e.deltaY > 0 ? -1 : 1) * 0.02);
  };

  // Keyboard support for the slider role (arrows adjust, Shift = coarse)
  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        stepBy(e.shiftKey ? 0.1 : 0.02);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        stepBy(e.shiftKey ? -0.1 : -0.02);
        break;
      case "Home":
        onChange(min);
        break;
      case "End":
        onChange(max);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const rotationDeg = getRotationDeg(normalized);
  const ariaValue = Number(value.toFixed(2));
  return (
    <div class="knob-container">
      <div
        ref={knobRef}
        class="knob"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabindex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={ariaValue}
      >
        <div class="knob__ticks">
          <svg class="knob__ticks-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {TICK_MARKS.map(({ key, x1, y1, x2, y2 }) => (
              <line
                key={key}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0,0,0,0.9)"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        <div class="knob__body">
          <div
            class="knob__indicator"
            style={{ transform: `translate(-50%, -50%) rotate(${rotationDeg}deg) translate(0, calc(var(--knob-size) * -0.36))` }}
          />
        </div>
      </div>
      {label && (
        <div class="knob__label-group">
          <div class="knob__label">{label}</div>
        </div>
      )}
    </div>
  );
}
