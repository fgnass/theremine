import { useEffect, useRef } from "preact/hooks";
import { trackingFrame, effectiveValues, mappingSources, mappingInvert } from "../store";
import { drawHand, drawPitchGuide, getFarthestFingertip } from "../lib/hand-overlay";
import "./CameraModal.css";

export function CameraModal({ open, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const video = document.querySelector(".theremin__video");
    let raf;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!canvas || !video || !video.videoWidth) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);

      const frame = trackingFrame.value;

      // Mirror the video + skeleton so it reads like a selfie.
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      frame.landmarks.forEach((lm) => {
        drawHand(ctx, lm, w, h, getFarthestFingertip(lm));
      });
      ctx.restore();

      // Overlays in normal orientation.
      drawPitchGuide(
        ctx,
        w,
        h,
        mappingSources.pitch.axis.value,
        mappingInvert.pitch.value,
        effectiveValues.pitch.value
      );
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  const frame = trackingFrame.value;
  const labels = (frame.handedness ?? [])
    .map((h) => h?.[0]?.categoryName)
    .filter(Boolean);
  const status =
    labels.length === 0
      ? "Show your hand to the camera"
      : labels.length > 1
      ? "✋ Both hands tracked"
      : `✋ ${labels[0]} hand tracked`;

  return (
    <div class="mapping-modal camera-modal">
      <div class="mapping-modal__backdrop" onClick={onClose} />
      <div class="mapping-modal__dialog camera-modal__dialog" role="dialog" aria-modal="true">
        <header class="mapping-modal__header">
          <h2>Camera & tracking</h2>
          <button
            type="button"
            class="mapping-modal__close"
            onClick={onClose}
            aria-label="Close camera view"
          >
            ×
          </button>
        </header>

        <div class="camera-modal__body">
          <div class="camera-modal__stage">
            <canvas ref={canvasRef} class="camera-modal__canvas" />
          </div>
          <p class="camera-modal__status" role="status" aria-live="polite">
            {status}
          </p>
          <p class="camera-modal__hint">
            The glowing dot is the fingertip driving pitch. Keep your hand inside
            the frame and well lit for steady tracking.
          </p>
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
