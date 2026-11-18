import { PitchDetector } from 'pitchy';

export interface PitchFrame {
  /** Seconds, on the analyzer's own sample clock. */
  time: number;
  /** Detected fundamental in Hz, or null (silence, noise or out of range). */
  freq: number | null;
  /** MPM clarity 0..1 (how periodic the signal is). */
  clarity: number;
  /** Raw estimate even when rejected — for the debug panel. */
  rawFreq: number;
  rms: number;
  db: number;
}

export interface AnalyzerOptions {
  windowSize: number;
  minFreq: number;
  maxFreq: number;
  minClarity: number;
  minDb: number;
}

/** Guitar range: E2 (82 Hz) with margin, up to ~fret 20 on string 1. */
export const DEFAULT_ANALYZER: AnalyzerOptions = {
  windowSize: 2048,
  minFreq: 70,
  maxFreq: 1400,
  minClarity: 0.9,
  minDb: -55,
};

export function rms(buf: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i]! * buf[i]!;
  return Math.sqrt(s / buf.length);
}

/**
 * Sliding-window pitch analysis. Feed chunks (the hop) with push(); each push analyzes
 * the latest `windowSize` samples. Pure: no Web Audio, so it runs in tests.
 */
export class FrameAnalyzer {
  private readonly win: Float32Array;
  private readonly detector: PitchDetector<Float32Array>;
  private filled = 0;
  private samples = 0;

  constructor(
    readonly sampleRate: number,
    readonly opts: AnalyzerOptions = DEFAULT_ANALYZER,
  ) {
    this.win = new Float32Array(opts.windowSize);
    // pitchy's clarityThreshold is MPM's peak-picking constant k (default 0.9), not a reject
    // threshold: left as is. Rejection happens below with opts.minClarity.
    this.detector = PitchDetector.forFloat32Array(opts.windowSize);
  }

  push(chunk: Float32Array): PitchFrame | null {
    const n = Math.min(chunk.length, this.win.length);
    this.win.copyWithin(0, n);
    this.win.set(chunk.subarray(chunk.length - n), this.win.length - n);
    this.filled = Math.min(this.win.length, this.filled + n);
    this.samples += chunk.length;
    if (this.filled < this.win.length) return null;

    const r = rms(this.win);
    const db = 20 * Math.log10(r || 1e-12);
    const [rawFreq, clarity] = this.detector.findPitch(this.win, this.sampleRate);
    const o = this.opts;
    const ok = db >= o.minDb && clarity >= o.minClarity && rawFreq >= o.minFreq && rawFreq <= o.maxFreq;
    return { time: this.samples / this.sampleRate, freq: ok ? rawFreq : null, clarity, rawFreq, rms: r, db };
  }
}

/** Median of the last n valid values — steadies the tuner display. Resets on silence. */
export class MedianSmoother {
  private vals: number[] = [];
  constructor(private readonly n = 5) {}

  push(v: number | null): number | null {
    if (v === null) {
      this.vals = [];
      return null;
    }
    this.vals.push(v);
    if (this.vals.length > this.n) this.vals.shift();
    const sorted = [...this.vals].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  }
}
