// Pure hand-geometry + canvas-drawing helpers for the camera preview overlay.
// Kept free of signals/MediaPipe imports so they can be unit-tested or rendered
// in isolation.

// MediaPipe hand model: pairs of landmark indices that form the skeleton.
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17], // pinky + palm
];

const SKELETON = "rgba(255, 255, 255, 0.88)";
const JOINT = "rgba(36, 29, 11, 0.85)";
const ACTIVE = "#ffce4a";
const LOW = "rgba(36, 29, 11, 0.18)";
const HIGH = "rgba(214, 138, 28, 0.95)";

// The fingertip farthest from the wrist — this is the point the engine tracks
// for pitch, so the overlay highlights it.
export function getFarthestFingertip(landmarks) {
  if (!landmarks) return null;
  const wrist = landmarks[0];
  if (!wrist) return null;

  const fingertips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  let maxDistance = -1;
  let farthestTip = null;
  for (const tip of fingertips) {
    if (!tip) continue;
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    const dz = (tip.z ?? 0) - (wrist.z ?? 0);
    const distance = Math.hypot(dx, dy, dz);
    if (distance > maxDistance) {
      maxDistance = distance;
      farthestTip = tip;
    }
  }
  return farthestTip;
}

export function drawHand(ctx, lm, w, h, active) {
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeStyle = SKELETON;
  ctx.lineCap = "round";
  for (const [a, b] of HAND_CONNECTIONS) {
    const p = lm[a];
    const q = lm[b];
    if (!p || !q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * w, p.y * h);
    ctx.lineTo(q.x * w, q.y * h);
    ctx.stroke();
  }
  const r = Math.max(2, w * 0.008);
  ctx.fillStyle = JOINT;
  for (const pt of lm) {
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (active) {
    ctx.save();
    ctx.shadowColor = ACTIVE;
    ctx.shadowBlur = w * 0.04;
    ctx.fillStyle = ACTIVE;
    ctx.beginPath();
    ctx.arc(active.x * w, active.y * h, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// A pitch range guide drawn along whichever axis pitch is mapped to, with a
// marker at the current normalized pitch position. Coordinates are kept in sync
// with the mirrored video so the marker sits under the player's hand.
export function drawPitchGuide(ctx, w, h, axis, invert, p) {
  // p=0 is the lowest note, p=1 the highest. frac is the geometric position
  // (matching the mirrored video) where this value lands.
  const frac = invert ? 1 - p : p;
  const lowAtStart = !invert; // start = left (horizontal) / top (vertical)
  const pad = w * 0.03;
  const thick = Math.max(8, w * 0.022);
  const font = Math.round(w * 0.033);

  ctx.save();
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";

  if (axis === "X") {
    const y = pad + thick / 2;
    const x0 = pad;
    const x1 = w - pad;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, lowAtStart ? LOW : HIGH);
    grad.addColorStop(1, lowAtStart ? HIGH : LOW);
    roundedBar(ctx, x0, pad, x1 - x0, thick, grad);
    marker(ctx, x0 + (x1 - x0) * frac, pad + thick / 2, thick);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(lowAtStart ? "low" : "high", x0 + 6, y);
    ctx.textAlign = "right";
    ctx.fillText(lowAtStart ? "high" : "low", x1 - 6, y);
  } else {
    // Vertical guide on the left edge for Y (vertical) and Z (distance).
    const x = pad + thick / 2;
    const y0 = pad + font * 1.6;
    const y1 = h - pad - font * 1.6;
    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, lowAtStart ? LOW : HIGH);
    grad.addColorStop(1, lowAtStart ? HIGH : LOW);
    roundedBar(ctx, pad, y0, thick, y1 - y0, grad);
    marker(ctx, x, y0 + (y1 - y0) * frac, thick);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.fillText(lowAtStart ? "low" : "high", x, y0 - font);
    ctx.fillText(lowAtStart ? "high" : "low", x, y1 + font);
  }
  ctx.restore();
}

function roundedBar(ctx, x, y, w, h, fill) {
  const r = Math.min(w, h) / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function marker(ctx, cx, cy, thick) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(36,29,11,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, thick * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
