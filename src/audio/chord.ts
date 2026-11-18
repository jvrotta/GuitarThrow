import { midiToFreq } from '../music';
import type { NoteEvidence } from './harmonic';

export interface ChordOptions {
  /** Share of the new energy the chord notes must explain together, above chance (HarmonicScorer.coverage). */
  coverage: number;
  maxCents: number;
  /** Consecutive frames the chord must be heard. */
  steady: number;
}

/** The closest attempt at a chord during one attack: which of its notes were not heard. */
export interface ChordAttempt {
  group: number;
  present: number;
  missing: number[];
}

const PARTIALS = 10;
const MAX_HZ = 5000;
const SHARED_CENTS = 35;

/**
 * Per chord note, the partials no other chord note has (the G of a C chord is the C's 3rd partial, so
 * only its own partials prove it was played). Notes with none — octave doubles — cannot be checked.
 */
export function ownPartials(group: readonly number[]): Map<number, number> {
  const own = new Map<number, number>();
  for (const m of group) {
    let mask = 0;
    for (let k = 1; k <= PARTIALS; k++) {
      const f = k * midiToFreq(m);
      // Compare with every partial of the other notes up to MAX_HZ (an octave double's partials are all shared).
      const shared = group.some((n) => {
        const fn = midiToFreq(n);
        return n !== m && Array.from({ length: Math.floor(MAX_HZ / fn) }, (_, j) => (j + 1) * fn).some((g) => Math.abs(1200 * Math.log2(f / g)) < SHARED_CENTS);
      });
      if (!shared) mask |= 1 << (k - 1);
    }
    if (mask) own.set(m, mask);
  }
  return own;
}

/**
 * Chord targets (groups of ≥ 2 notes). A strum is accepted when every checkable note — all but one for
 * 4+ of them, since a beginner often misses a string — shows one of its own partials in the new sound,
 * and the chord notes together explain most of that new energy (`coverage`), for `steady` frames.
 */
export class ChordTracker {
  private runs: number[] = [];
  private keys: string[] = [];
  private own: Map<number, number>[] = [];
  /** Best attempt since the last reset (for "faltou Sol" feedback). */
  best: ChordAttempt | null = null;

  setGroups(groups: readonly (readonly number[])[]): void {
    // Play-along: the candidate list changes while a strum is being decided (the next note comes into
    // the window). A chord still in the list keeps its run of steady frames, so it is not reset mid-decision.
    const key = (g: readonly number[]) => g.join(',');
    const run = new Map(this.keys.map((k, i) => [k, this.runs[i] ?? 0]));
    const best = this.best && this.keys[this.best.group];
    this.keys = groups.map(key);
    this.own = groups.map((g) => (g.length > 1 ? ownPartials(g) : new Map()));
    this.runs = this.keys.map((k) => run.get(k) ?? 0);
    const b = best ? this.keys.indexOf(best) : -1;
    this.best = b >= 0 && this.best ? { ...this.best, group: b } : null;
  }

  reset(): void {
    this.runs = [];
    this.best = null;
  }

  /** Returns the index of a chord group heard steadily, or -1. */
  update(
    ev: readonly NoteEvidence[],
    lo: number,
    groups: readonly (readonly number[])[],
    coverage: (midis: readonly number[]) => number,
    o: ChordOptions,
  ): number {
    groups.forEach((g, i) => {
      const own = this.own[i];
      if (g.length < 2 || !own) return;
      const checkable = g.filter((m) => own.has(m));
      const present = checkable.filter((m) => {
        const e = ev[m - lo];
        return !!e && (e.mask & own.get(m)!) !== 0 && Math.abs(e.cents) <= o.maxCents;
      });
      const need = checkable.length <= 3 ? checkable.length : checkable.length - 1;
      const cov = coverage(g);
      this.runs[i] = present.length >= need && cov >= o.coverage ? (this.runs[i] ?? 0) + 1 : 0;
      if (present.length >= 1 && cov >= o.coverage && (!this.best || present.length > this.best.present)) {
        this.best = { group: i, present: present.length, missing: checkable.filter((m) => !present.includes(m)) };
      }
    });
    return this.runs.findIndex((r) => r >= o.steady);
  }
}
