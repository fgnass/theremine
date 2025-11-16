/**
 * ThereminSynth - Web Audio API synthesizer
 */
export class ThereminSynth {
  constructor() {
    this.context = new AudioContext();
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = 0;

    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2500;
    this.filter.Q.value = 0.8;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = "sine";
    this.oscillator.frequency.value = 440;

    this.lfo = this.context.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 5;

    this.lfoGain = this.context.createGain();
    this.lfoGain.gain.value = 0;

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.oscillator.frequency);

    this.oscillator.connect(this.filter);
    this.filter.connect(this.outputGain);

    this.outputGain.connect(this.context.destination);

    this.oscillator.start();
    this.lfo.start();

    this.active = false;
    this.targetVolume = 0;
    this.waveform = "sine";
  }

  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  setActive(active) {
    this.active = active;
    this.applyVolume();
  }

  setFrequency(frequency) {
    const now = this.context.currentTime;
    this.oscillator.frequency.cancelScheduledValues(now);
    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.05);
  }

  setVolume(value) {
    this.targetVolume = Math.min(Math.max(value, 0), 1);
    this.applyVolume();
  }

  setVibrato(rate, depth) {
    const now = this.context.currentTime;
    this.lfo.frequency.cancelScheduledValues(now);
    this.lfo.frequency.setTargetAtTime(rate, now, 0.1);
    this.lfoGain.gain.cancelScheduledValues(now);
    this.lfoGain.gain.setTargetAtTime(depth, now, 0.1);
  }

  setWaveform(type) {
    if (!type || this.waveform === type) return;

    try {
      // Save current frequency
      const currentFreq = this.oscillator.frequency.value;

      // Disconnect and stop old oscillator
      this.oscillator.disconnect();
      this.oscillator.stop();

      // Create new oscillator with new waveform
      this.oscillator = this.context.createOscillator();
      this.oscillator.type = type;
      this.oscillator.frequency.value = currentFreq;

      // Reconnect to audio graph
      this.lfoGain.disconnect();
      this.lfoGain.connect(this.oscillator.frequency);
      this.oscillator.connect(this.filter);

      // Start new oscillator
      this.oscillator.start();

      this.waveform = type;
    } catch (err) {
      console.error("Error changing waveform", type, err);
    }
  }

  setFilterNormalized(amount, resonance) {
    const now = this.context.currentTime;
    const normalized = Math.min(Math.max(amount, 0), 1);
    const minFreq = 300;
    const maxFreq = 8000;
    const freq = minFreq + normalized * (maxFreq - minFreq);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setTargetAtTime(freq, now, 0.015); // Faster response

    if (typeof resonance === "number" && Number.isFinite(resonance)) {
      this.filter.Q.cancelScheduledValues(now);
      this.filter.Q.setTargetAtTime(resonance, now, 0.015); // Faster response
    }
  }

  applyVolume() {
    const now = this.context.currentTime;
    const target = this.active ? this.targetVolume : 0;
    this.outputGain.gain.cancelScheduledValues(now);
    this.outputGain.gain.setTargetAtTime(target, now, 0.08);
  }
}
