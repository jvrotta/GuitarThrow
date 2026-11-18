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
  /** Level of the whole analysis window (smooth). */
  db: number;
  /** Level of just the newest hop (~11 ms) — reacts fast to attacks. */
  hopDb: number;
  /** Peak level of the hop's first difference over 128-sample blocks: HF content, spikes on pick/finger clicks. */
  hfDb: number;
  /**
   * The last HISTORY samples, oldest first (for target-note checks with finer frequency resolution).
   * Shared buffer: valid only until the next push().
   */
  samples: Float32Array;
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

const toDb = (x: number) => 20 * Math.log10(x || 1e-12);
const HF_BLOCK = 128;
/** Samples kept for target checks (~170 ms at 48 kHz): resolves semitones on the low strings. */
export const HISTORY = 8192;

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
  private readonly hist = new Float32Array(HISTORY);
  private readonly detector: PitchDetector<Float32Array>;
  private filled = 0;
  private samples = 0;
  private prevSample = 0;

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
    const h = Math.min(chunk.length, HISTORY);
    this.hist.copyWithin(0, h);
    this.hist.set(chunk.subarray(chunk.length - h), HISTORY - h);
    this.filled = Math.min(this.win.length, this.filled + n);
    this.samples += chunk.length;
    if (this.filled < this.win.length) {
      this.prevSample = chunk[chunk.length - 1] ?? 0;
      return null;
    }

    // Hop level, and the loudest 128-sample sub-block of the first difference (≈ HF content): a short
    // pick click is concentrated there instead of being diluted over the whole hop.
    let hop = 0;
    let hfPeak = 0;
    for (let s = 0; s < chunk.length; s += HF_BLOCK) {
      let hf = 0;
      const end = Math.min(chunk.length, s + HF_BLOCK);
      for (let i = s; i < end; i++) {
        const x = chunk[i]!;
        hop += x * x;
        hf += (x - this.prevSample) ** 2;
        this.prevSample = x;
      }
      hfPeak = Math.max(hfPeak, hf / (end - s));
    }
    const hopDb = toDb(Math.sqrt(hop / chunk.length));
    const hfDb = toDb(Math.sqrt(hfPeak));

    const r = rms(this.win);
    const db = toDb(r);
    const [rawFreq, clarity] = this.detector.findPitch(this.win, this.sampleRate);
    const o = this.opts;
    const ok = db >= o.minDb && clarity >= o.minClarity && rawFreq >= o.minFreq && rawFreq <= o.maxFreq;
    return { time: this.samples / this.sampleRate, freq: ok ? rawFreq : null, clarity, rawFreq, rms: r, db, hopDb, hfDb, samples: this.hist };
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
