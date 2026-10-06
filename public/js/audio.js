// Audio-Engine: pentatonische Tonleiter, vier Klangfarben ("Stimmen") je
// Körperart, ein leiser Drone-Teppich, ein einfaches Feedback-Delay als
// Hallraum, dazu kurze UI-Klicks/Erfolgs-Jingles.

export const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function noteName(m) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return names[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

export function yToMidi(y, height) {
  const t = 1 - Math.max(0, Math.min(1, y / height));
  return SCALE[Math.round(t * (SCALE.length - 1))];
}

export const VOICES = [
  { hue: 42, type: "triangle", filterMul: 7, detune: 0 },
  { hue: 196, type: "sine", filterMul: 10, detune: 0 },
  { hue: 266, type: "sawtooth", filterMul: 3.2, detune: -6 },
  { hue: 18, type: "triangle", filterMul: 5, detune: 8 },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.dry = null;
    this.wet = null;
    this.drone = null;
    this.rain = null;
    this.on = false;
    this.volume = 0.5; // 0..1, vom Nutzer einstellbar
  }

  _ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(this.ctx.destination);

      this.dry = this.ctx.createGain();
      this.dry.gain.value = 0.8;
      this.dry.connect(this.master);

      const verb = this._buildReverb();
      this.wet = verb.input;
      verb.output.connect(this.master);
    } catch (e) {
      this.ctx = null;
    }
  }

  _buildReverb() {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const output = ctx.createGain();
    output.gain.value = 0.6;
    [0.29, 0.37, 0.43].forEach((t) => {
      const delay = ctx.createDelay(1.2);
      delay.delayTime.value = t;
      const fb = ctx.createGain();
      fb.gain.value = 0.37;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2100;
      input.connect(delay);
      delay.connect(lp);
      lp.connect(fb);
      fb.connect(delay);
      lp.connect(output);
    });
    return { input, output };
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.on && this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  setOn(on) {
    this.on = on;
    if (on) {
      this._ensure();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.4);
      this._startDrone();
    } else if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      this._stopDrone();
    }
  }

  _startDrone() {
    if (!this.ctx || this.drone) return;
    const root = 45; // A2
    const fifth = 52; // E3
    this.drone = [root, fifth].map((midi, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = midiToFreq(midi);
      osc.detune.value = i === 1 ? 4 : -4;
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(this.dry);
      g.connect(this.wet);
      osc.start();
      g.gain.setTargetAtTime(i === 0 ? 0.05 : 0.03, this.ctx.currentTime, 3);
      return { osc, gain: g };
    });
  }

  _stopDrone() {
    if (!this.drone) return;
    this.drone.forEach((v) => {
      v.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 1.2);
      v.osc.stop(this.ctx.currentTime + 3);
    });
    this.drone = null;
  }

  setRain(on) {
    if (!this.ctx) return;
    if (on) this._startRain();
    else this._stopRain();
  }

  _startRain() {
    if (!this.ctx || this.rain) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3400;
    band.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    noise.connect(band);
    band.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.wet);
    noise.start();
    gain.gain.setTargetAtTime(0.045, this.ctx.currentTime, 2.5);
    this.rain = { noise, gain };
  }

  _stopRain() {
    if (!this.rain) return;
    const { noise, gain } = this.rain;
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 1);
    noise.stop(this.ctx.currentTime + 2.2);
    this.rain = null;
  }

  pluck(midi, velocity, voiceIdx = 0) {
    if (!this.on || !this.ctx) return;
    const voice = VOICES[voiceIdx % VOICES.length];
    const t0 = this.ctx.currentTime;
    const freq = midiToFreq(midi);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    osc.type = voice.type;
    osc.frequency.value = freq;
    osc.detune.value = voice.detune;
    filt.type = "lowpass";
    filt.frequency.value = freq * voice.filterMul;
    filt.Q.value = 0.4;
    const peak = Math.max(0.05, Math.min(0.5, velocity)) * 0.55;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.wet);
    osc.start(t0);
    osc.stop(t0 + 1.7);
  }

  _blip(freq, duration, type, gainPeak) {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak || 0.2, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.dry);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  uiHover() {
    this._blip(880, 0.08, "sine", 0.05);
  }

  uiClick() {
    this._blip(660, 0.12, "triangle", 0.12);
  }

  catchPing() {
    this._blip(1320, 0.18, "sine", 0.22);
  }

  wrongBuzz() {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.4);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    osc.connect(gain);
    gain.connect(this.dry);
    osc.start(t0);
    osc.stop(t0 + 0.5);
  }

  success() {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    [0, 4, 7, 12].forEach((semi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = midiToFreq(69 + semi);
      const start = t0 + i * 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      osc.connect(gain);
      gain.connect(this.dry);
      gain.connect(this.wet);
      osc.start(start);
      osc.stop(start + 1.2);
    });
  }

  achievement() {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    [69, 76, 81].forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = midiToFreq(midi);
      const start = t0 + i * 0.1;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);
      osc.connect(gain);
      gain.connect(this.dry);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  }
}
