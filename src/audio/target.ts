import { midiToFreq } from '../music';

/** How strongly one expected note is present in a block of audio. */
export interface Salience {
  /** Power at the note's first partials, dB (relative scale; compare over time). */
  db: number;
  /** Share of the block's energy that sits on those partials (≈1 for a lone clean note). */
  frac: number;
  /** Ratio to the stronger semitone neighbour (> 1 = this note, not the one beside it). */
  dominance: number;
}

const PARTIALS = 6;
const MAX_PARTIAL_HZ = 5000;
const hannCache = new Map<number, Float32Array>();

function hann(n: number): Float32Array {
  let w = hannCache.get(n);
  if (!w) {
    w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    hannCache.set(n, w);
  }
  return w;
}

/** Hann-windowed Goertzel power at `freq` over the last `n` samples of `buf`. */
function goertzel(buf: Float32Array, n: number, sampleRate: number, freq: number, w: Float32Array): number {
  const c = 2 * Math.cos((2 * Math.PI * freq) / sampleRate);
  const off = buf.length - n;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const s0 = buf[off + i]! * w[i]! + c * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}

function partialPower(buf: Float32Array, n: number, sr: number, midi: number, w: Float32Array): number {
  const f0 = midiToFreq(midi);
  let p = 0;
  for (let k = 1; k <= PARTIALS && k * f0 < MAX_PARTIAL_HZ; k++) p += goertzel(buf, n, sr, k * f0, w);
  return p;
}

/**
 * Salience of `midi` in the newest samples. Low notes use the longest block (finer frequency
 * resolution); higher ones a shorter block (reacts faster). Unlike the pitch tracker, this still
 * works when an earlier string keeps ringing under the new note.
 */
export function noteSalience(buf: Float32Array, sampleRate: number, midi: number): Salience {
  const n = Math.min(buf.length, midi < 52 ? 8192 : 4096);
  if (n < 1024) return { db: -240, frac: 0, dominance: 0 };
  const w = hann(n);
  const off = buf.length - n;
  let ew = 0;
  for (let i = 0; i < n; i++) ew += (buf[off + i]! * w[i]!) ** 2;
  const p = partialPower(buf, n, sampleRate, midi, w);
  const nb = Math.max(partialPower(buf, n, sampleRate, midi - 1, w), partialPower(buf, n, sampleRate, midi + 1, w));
  // A sinusoid gives |X|² ≈ (N/3)·Σ(x·w)² with a Hann window → normalise so one clean note ≈ 1.
  return {
    db: 10 * Math.log10(p + 1e-20),
    frac: ew > 0 ? (3 * p) / (n * ew) : 0,
    dominance: p / (nb + 1e-20),
  };
}
