/**
 * Math utility functions
 */

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalize(value, min, max) {
  const range = max - min;
  if (range <= 0) return 0;
  const norm = (value - min) / range;
  return clamp(norm, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function subtract(a, b) {
  return {
    x: (a?.x ?? 0) - (b?.x ?? 0),
    y: (a?.y ?? 0) - (b?.y ?? 0),
    z: (a?.z ?? 0) - (b?.z ?? 0),
  };
}

export function normalizeVector(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

export function dotProduct(a, b) {
  return (
    (a.x ?? 0) * (b.x ?? 0) + (a.y ?? 0) * (b.y ?? 0) + (a.z ?? 0) * (b.z ?? 0)
  );
}

export function getExtrema(landmarks) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  return { minX, maxX, minY, maxY };
}
