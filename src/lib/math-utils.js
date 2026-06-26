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
