# Theremine

A hand-tracking theremin synthesizer that runs entirely in your browser.

Wave your hand over your phone's camera to play. No instrument, no MIDI controller, no installation — just your hand, the camera, and the Web Audio API.

**Play it now:** [theremine.gnass.buzz](https://theremine.gnass.buzz)

## How it works

Theremine uses [MediaPipe](https://developers.google.com/mediapipe) hand tracking to detect the position, orientation, and pinch of your hand(s) in the camera feed. Those movements are mapped onto synthesizer parameters in real time and rendered with the Web Audio API — no audio ever leaves your device.

The classic setup: lay your phone flat on the table, allow camera access, and hover your hand above it. By default, horizontal hand position controls pitch and the distance from the camera controls other parameters.

## Features

- **Hand-tracked control** — pitch, volume, filter cutoff, and resonance can each be mapped to a hand (left/right/any), an axis (X/Y/Z), with optional inversion.
- **Subtractive synth** — oscillator (sine / square / sawtooth / triangle) into a low-pass filter, with an LFO for vibrato.
- **Scales** — chromatic, major, minor, pentatonic, and blues, for quantized or free pitch.
- **Adjustable parameters** — pitch range, volume, filter base/mod/Q, vibrato rate/depth, and mute threshold.
- **PWA** — installable, works offline via a service worker, and keeps the screen awake while playing.

## Development

Requires [Node.js](https://nodejs.org/) and built with [Vite](https://vitejs.dev/) + [Preact](https://preactjs.com/).

```bash
npm install
npm run dev      # start the dev server (HTTPS, required for camera access)
npm run build    # build for production into dist/
npm run preview  # preview the production build
```

The dev server runs over HTTPS (via `@vitejs/plugin-basic-ssl`) because camera access requires a secure context. Open the app on a phone on the same network to try it with a real camera.

## Tech stack

- [Preact](https://preactjs.com/) + [@preact/signals](https://preactjs.com/guide/v10/signals/) for the UI and state
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) for hand tracking
- Web Audio API for synthesis
- [Vite](https://vitejs.dev/) for the build

## License

[MIT](./LICENSE) © Felix Gnass
