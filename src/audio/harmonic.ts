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
  /** Bit k−1 set = partial k (1..10) is prominent and within PARTIAL_CENTS of where it should be. */
  mask: number;
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
const PARTIAL_CENTS = 25; // chords: a neighbour note's partial 30 cents away must not count

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
  private d: Float32Array | null = null;

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
    this.d = d;
    const sum = this.sum;
    for (let i = 0; i < d.length && i < sum.length - 1; i++) sum[i + 1] = sum[i]! + d[i]!;
    const range = (a: number, b: number) => sum[Math.min(b + 1, sum.length - 1)]! - sum[Math.max(0, a)]!;
    const ln = (v: number) => Math.log(v + 1e-30);
    return this.cands.map((c) => {
      let energy = 0, odd = 0, even = 0, partials = 0, mask = 0, last = 0, fw = 0, w = 0;
      for (const s of c.partials) {
        let at = s.lo;
        for (let i = s.lo + 1; i <= s.hi; i++) if (d[i]! > d[at]!) at = i;
        const p = d[at]!;
        // Neighbourhood level: the quieter side, so a neighbour note's peak on one side does not hide this one.
        const ring = Math.min(range(s.lo - RING[1]!, s.lo - RING[0]!), range(s.hi + RING[0]!, s.hi + RING[1]!)) / (RING[1]! - RING[0]! + 1);
        if (p >= o.snr * this.floor[s.c]! && p >= o.prominence * ring) {
          // Parabolic peak on log power → partial frequency → implied fundamental.
          const a = ln(d[at - 1]!), b = ln(p), e = ln(d[at + 1]!);
          const den = a - 2 * b + e;
          const delta = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - e)) / den)) : 0;
          const f0 = ((at + delta) * this.hz) / s.k;
          if (Math.abs(1200 * Math.log2(f0 / c.f)) <= PARTIAL_CENTS) mask |= 1 << (s.k - 1);
          if (s.k <= 6) {
            partials++;
            fw += p * f0;
            w += p;
          }
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
        mask,
        needed: c.needed,
        harmonicity: total > 0 ? energy / total : 0,
        odd: odd >= o.octave * even,
        cents: w > 0 ? 1200 * Math.log2(fw / w / c.f) : 0,
      };
    });
  }

  /**
   * Chords: share of the new energy (last evaluate) between half the lowest note and the top partial of the
   * highest that sits on the partials of `midis` together, above what flat noise would give (0 = chance,
   * 1 = all). A strummed chord ≈ 1; claps ≈ 0; another chord leaves part out.
   */
  coverage(midis: readonly number[]): number {
    const cs = midis.map((m) => this.cands[m - this.lo]).filter((c): c is Candidate => !!c);
    if (!this.d || cs.length === 0) return 0;
    const spans = cs.flatMap((c) => c.partials.map((p) => [p.lo - 1, p.hi + 1] as const)).sort((a, b) => a[0] - b[0]);
    const sum = this.sum;
    const range = (a: number, b: number) => sum[Math.min(b + 1, sum.length - 1)]! - sum[Math.max(0, a)]!;
    let energy = 0;
    let bins = 0;
    let end = -1;
    for (const [a, b] of spans) {
      if (b <= end) continue;
      energy += range(Math.max(a, end + 1), b);
      bins += b - Math.max(a, end + 1) + 1;
      end = b;
    }
    const lo = Math.min(...cs.map((c) => c.lo));
    const hi = Math.max(...cs.map((c) => c.hi));
    const total = range(lo, hi);
    // Many notes × many partials cover a lot of bins: flat noise would "explain" that share by chance.
    const chance = Math.min(0.95, bins / (hi - lo + 1));
    return total > 0 ? Math.max(0, (energy / total - chance) / (1 - chance)) : 0;
  }
}
