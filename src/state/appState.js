import { signal } from "@preact/signals";
import { DEFAULT_STATUS_MESSAGE } from "../lib/theremin-engine";

export const isRunning = signal(false);
export const isStarting = signal(false);
export const startFailed = signal(false);
export const statusMessage = signal(DEFAULT_STATUS_MESSAGE);
export const currentNote = signal("--");
export const currentFrequency = signal(0);
export const settingsOpen = signal(false);
export const cameraModalOpen = signal(false);
export const pointerState = signal({
  x: 0.5,
  y: 0.5,
  area: 0,
  closeness: 0,
  visible: false,
});
export const pointerState2 = signal({
  x: 0.5,
  y: 0.5,
  area: 0,
  closeness: 0,
  visible: false,
});
