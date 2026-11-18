import { midiToFreq } from '../music';

/** How well one candidate note explains a spectrum of *new* energy (after minus before an attack). */
export interface NoteEvidence {
  midi: number;
  /**
   * New energy the note explains minus what it leaves unexplained in its own range (0.5·f0 to
   * the last partial). A harmonic mistaken for the note (octave/fifth above) or noise leaves
   * much unexplained → low or negative.
   */
  score: number;
  /** Prominent partials (clear peaks above noise and their surroundings) among the first six. */
  partials: number;
  /** Partials needed: 3, or fewer for the highest notes (few partials below MAX_HZ). */
  needed: number;
  /** Share of the new energy in the note's range that sits on its partials (low for claps, noise). */
  harmonicity: number;
  /** Odd partials present; without them this is really the octave above. */
  odd: boolean;
  /** Pitch measured on the prominent partials, cents from the nominal note (steady for a string, gliding for a voice). */
  cents: number;
}

export interface ScoreOptions {
  /** Partial power over the background noise floor (power ratio). */
  snr: number;
  /** Partial peak over the mean of its neighbouring bins (power ratio). */
  prominence: number;
  /** Odd/even partial power ratio below which a candidate is the octave above in disguise. */
  octave: number;
}

const PARTIALS = 10;
const MAX_HZ = 5000;
const TOL_CENTS = 35; // out-of-tune strings and inharmonicity
const RING = [2, 6]; // neighbour bins for prominence, beyond the partial window

interface Span {
  k: number;
  c: number;
  lo: number;
  hi: number;
}
interface Candidate {
  midi: number;
  f: number;
  partials: Span[];
  lo: number;
  hi: number;
  needed: number;
}

/** Candidate notes lo..hi (MIDI) scored against power spectra of size n (bins n/2+1). */
export class HarmonicScorer {
  readonly lo: number;
  private readonly hz: number;
  private readonly cands: Candidate[] = [];
  private readonly floor: Float32Array;
  private readonly bands: [number, number][] = [];
  private readonly sum: Float64Array;

  constructor(sampleRate: number, n: number, lo = 40, hi = 88) {
    this.lo = lo;
    const bins = n / 2 + 1;
    const hz = (this.hz = sampleRate / n);
    const span = (f: number, k: number): Span => {
      const c = f / hz;
      const w = Math.max(1, c * (2 ** (TOL_CENTS / 1200) - 1));
      return { k, c: Math.round(c), lo: Math.max(1, Math.floor(c - w)), hi: Math.min(bins - 2, Math.ceil(c + w)) };
    };
    for (let m = lo; m <= hi; m++) {
      const f = midiToFreq(m);
      const partials: Span[] = [];
      for (let k = 1; k <= PARTIALS && k * f < Math.min(MAX_HZ, sampleRate / 2.2); k++) partials.push(span(k * f, k));
      const top = partials[partials.length - 1]!;
      const needed = Math.min(3, partials.filter((p) => p.k <= 6).length);
      this.cands.push({ midi: m, f, partials, lo: Math.max(1, Math.floor((0.5 * f) / hz)), hi: top.hi + 1, needed });
    }
    // Noise-floor bands: ≥12 bins and ≥ half an octave wide.
    for (let b = Math.floor(45 / hz); b < bins - 1; ) {
      const e = Math.min(bins - 1, Math.max(b + 12, Math.round(b * Math.SQRT2)));
      this.bands.push([b, e]);
      b = e;
    }
    this.floor = new Float32Array(bins);
    this.sum = new Float64Array(bins + 1);
  }

  /** Background level per bin: the quieter quarter of each band of `ref` (a spectrum before the attack). */
  setFloor(ref: Float32Array): void {
    for (const [b, e] of this.bands) {
      const v = ref.slice(b, e).sort();
      const q = v[Math.floor(v.length / 4)] ?? 0;
      this.floor.fill(q, b, e);
    }
  }

  /** Evidence for every candidate (index = midi − lo). */
  evaluate(d: Float32Array, o: ScoreOptions): NoteEvidence[] {
    const sum = this.sum;
    for (let i = 0; i < d.length && i < sum.length - 1; i++) sum[i + 1] = sum[i]! + d[i]!;
    const range = (a: number, b: number) => sum[Math.min(b + 1, sum.length - 1)]! - sum[Math.max(0, a)]!;
    const ln = (v: number) => Math.log(v + 1e-30);
    return this.cands.map((c) => {
      let energy = 0, odd = 0, even = 0, partials = 0, last = 0, fw = 0, w = 0;
      for (const s of c.partials) {
        let at = s.lo;
        for (let i = s.lo + 1; i <= s.hi; i++) if (d[i]! > d[at]!) at = i;
        const p = d[at]!;
        const ring = (range(s.lo - RING[1]!, s.lo - RING[0]!) + range(s.hi + RING[0]!, s.hi + RING[1]!)) / (2 * (RING[1]! - RING[0]! + 1));
        if (s.k <= 6 && p >= o.snr * this.floor[s.c]! && p >= o.prominence * ring) {
          partials++;
          // Parabolic peak on log power → partial frequency → implied fundamental.
          const a = ln(d[at - 1]!), b = ln(p), e = ln(d[at + 1]!);
          const den = a - 2 * b + e;
          const delta = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - e)) / den)) : 0;
          fw += p * (((at + delta) * this.hz) / s.k);
          w += p;
        }
        energy += range(Math.max(last + 1, s.lo - 1), s.hi + 1); // windows of low notes may touch
        last = s.hi + 1;
        if (s.k % 2) odd += p;
        else even += p;
      }
      const total = Math.max(energy, range(c.lo, c.hi));
      return {
        midi: c.midi,
        score: 2 * energy - total,
        partials,
        needed: c.needed,
        harmonicity: total > 0 ? energy / total : 0,
        odd: odd >= o.octave * even,
        cents: w > 0 ? 1200 * Math.log2(fw / w / c.f) : 0,
      };
    });
  }
}
