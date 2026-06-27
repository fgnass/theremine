export function Instructions({ status, onStart, disabled, failed }) {
  const label = disabled ? "Starting…" : failed ? "Try again" : "Tap to start";
  return (
    <section class="theremin__content">
      <div class="theremin__instructions">
        <p class="theremin__status">{status}</p>
        <button
          class="theremin__start"
          onClick={onStart}
          disabled={disabled}
          type="button"
        >
          {label}
        </button>
      </div>
    </section>
  );
}
