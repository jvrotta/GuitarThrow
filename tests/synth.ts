import { midiToFreq } from '../src/music';

/**
 * Realistic-ish test audio: Karplus–Strong plucked strings (many partials, pick position, inharmonic
 * pluck noise), a phone-mic high-pass, room noise, and non-musical sounds (claps, knocks, speech).
 */
export const SR = 48000;

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
}

export const silence = (seconds: number) => new Float32Array(Math.round(seconds * SR));

export interface PluckOptions {
  gain?: number;
  /** Seconds to decay 60 dB. */
  t60?: number;
  /** Seconds when the string is muted (re-plucked or damped). */
  end?: number;
  /** 0..1, how bright the attack is (pick vs thumb). */
  bright?: number;
  /** Cents off pitch (an out-of-tune string). */
  cents?: number;
}

export function pluck(out: Float32Array, midi: number, start: number, o: PluckOptions = {}) {
  const { gain = 0.25, t60 = 4, end = Infinity, bright = 0.5, cents = 0 } = o;
  const f = midiToFreq(midi) * 2 ** (cents / 1200);
  const delay = SR / f - 0.5; // the averaging filter adds half a sample
  const N = Math.floor(delay);
  const C = (1 - (delay - N)) / (1 + (delay - N)); // allpass for the fractional part
  const rho = 10 ** (-3 / (f * t60));
  const i0 = Math.round(start * SR);
  const len = Math.min(out.length - i0, Math.round((Math.min(end, 60) - start) * SR));
  if (len <= 0) return;
  const r = rng(midi * 131 + i0);
  const exc = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) exc[i] = lp = bright * r() + (1 - bright) * lp;
  const pos = Math.max(1, Math.round(N * 0.18)); // plucked near the bridge
  for (let i = N - 1; i >= pos; i--) exc[i]! -= exc[i - pos]!;
  let peak = 0;
  for (const v of exc) peak = Math.max(peak, Math.abs(v));
  const y = new Float32Array(len);
  const ap = new Float32Array(len);
  let prevY = 0;
  let prevAvg = 0;
  let prevAp = 0;
  for (let n = 0; n < len; n++) {
    const fb = n >= N ? ap[n - N]! : 0;
    y[n] = (n < N ? exc[n]! / peak : 0) + rho * fb;
    const avg = 0.5 * (y[n]! + prevY);
    ap[n] = C * avg + prevAvg - C * prevAp;
    prevY = y[n]!;
    prevAvg = avg;
    prevAp = ap[n]!;
  }
  const fade = Math.round(0.01 * SR);
  for (let n = 0; n < len; n++) {
    const g = end < Infinity && n > len - fade ? (len - n) / fade : 1;
    out[i0 + n]! += gain * g * y[n]!;
  }
}

/** Phone mic: weak below ~120 Hz (2nd-order high-pass). */
export function phoneMic(x: Float32Array, cutoff = 120) {
  const w = (2 * Math.PI * cutoff) / SR;
  const alpha = Math.sin(w) / (2 * 0.707);
  const c = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i]!;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    x[i] = y0;
  }
  return x;
}

/** Pink-ish room noise (fan, street) at `gain` RMS-ish. */
export function roomNoise(x: Float32Array, gain = 0.0015, seed = 9) {
  const r = rng(seed);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = r();
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    x[i]! += gain * (b0 + b1 + b2 + w * 0.1848);
  }
  return x;
}

export function clap(x: Float32Array, t: number, gain = 0.4) {
  const r = rng(Math.round(t * 1000) + 5);
  const i0 = Math.round(t * SR);
  let prev = 0;
  for (let n = 0; n < 0.04 * SR && i0 + n < x.length; n++) {
    const w = r();
    x[i0 + n]! += gain * Math.exp(-n / SR / 0.006) * (w - prev); // bright burst
    prev = w;
  }
}

/** Knuckle on a table or the guitar body: a damped low resonance plus a click. */
export function knock(x: Float32Array, t: number, gain = 0.3, freq = 170) {
  const r = rng(Math.round(t * 1000) + 11);
  const i0 = Math.round(t * SR);
  for (let n = 0; n < 0.15 * SR && i0 + n < x.length; n++) {
    const s = n / SR;
    x[i0 + n]! += gain * (Math.exp(-s / 0.025) * Math.sin(2 * Math.PI * freq * s) + (s < 0.002 ? 0.5 * r() : 0));
  }
}

/** Talking near the phone: voiced syllables with a moving pitch around `f0`. */
export function speech(x: Float32Array, t0: number, seconds: number, gain = 0.08, f0 = 130) {
  const i0 = Math.round(t0 * SR);
  let phase = 0;
  for (let n = 0; n < seconds * SR && i0 + n < x.length; n++) {
    const t = n / SR;
    const f = f0 * (1 + 0.18 * Math.sin(2 * Math.PI * 1.3 * t) + 0.08 * Math.sin(2 * Math.PI * 3.1 * t + 1));
    phase += (2 * Math.PI * f) / SR;
    const env = Math.max(0, Math.sin(2 * Math.PI * 2.2 * t)) ** 0.6; // syllables
    let s = 0;
    for (let k = 1; k * f < 3500; k++) {
      const fk = k * f;
      const formant = Math.exp(-(((fk - 650) / 250) ** 2)) + 0.6 * Math.exp(-(((fk - 1150) / 300) ** 2)) + 0.15;
      s += (formant / k) * Math.sin(k * phase);
    }
    x[i0 + n]! += gain * env * s;
  }
}

/** Strum: low to high strings, `spread` seconds apart (a down-stroke). */
export function strum(x: Float32Array, midis: readonly number[], start: number, o: PluckOptions & { spread?: number } = {}) {
  const { spread = 0.012, ...p } = o;
  midis.forEach((m, i) => pluck(x, m, start + i * spread, { gain: 0.12, ...p }));
}

/** Open-position voicings, low to high. */
export const CHORDS: Record<string, number[]> = {
  Em: [40, 47, 52, 55, 59, 64],
  Am: [45, 52, 57, 60, 64],
  C: [48, 52, 55, 60, 64],
  G: [43, 47, 50, 55, 59, 67],
  D: [50, 57, 62, 66],
};
