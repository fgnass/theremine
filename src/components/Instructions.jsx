export function Instructions({ status, onStart, disabled }) {
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
          Tap to start
        </button>
      </div>
    </section>
  );
}
