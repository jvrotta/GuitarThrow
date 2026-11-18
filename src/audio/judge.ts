import type { PitchFrame } from './analyzer';
import { ChordTracker } from './chord';
import { PowerSpectrum, windowFill } from './fft';
import { HarmonicScorer, type NoteEvidence, type ScoreOptions } from './harmonic';
import { DEFAULT_ONSET, NoteDetector, type OnsetOptions } from './onset';

/** Expected notes: one group per event — a single note, or a chord (all notes together). */
export type TargetGroups = readonly (readonly number[])[];

export type Judgement =
  /** `group` = index in the targets, `midi` = its (lowest) note, `time` = attack time (analyzer clock). */
  | { kind: 'hit'; group: number; midi: number; time: number }
  /** Another note won; for a chord, `missing` lists the chord notes that were not heard. */
  | { kind: 'wrong'; time: number; midi: number; missing?: number[] }
  /** The note an attack produced, right or wrong (for "♪ Mi" feedback). */
  | { kind: 'heard'; time: number; midi: number };

export interface JudgeOptions extends ScoreOptions {
  /** Frames after an attack that are examined (~320 ms; the 8192-sample window needs ~100 ms to fill). */
  window: number;
  /** Consecutive frames a note must hold its pitch (within `drift`) to count. */
  steady: number;
  /** Minimum harmonicity of a note (share of new energy on its partials). */
  harmonicity: number;
  /** The target must score at least this share of the best candidate (octave ties, chords). */
  rival: number;
  /** Steady frames a different note must win before an attack counts as a wrong note… */
  votes: number;
  /** …with its pitch varying at most this much (cents) over those frames. */
  voteSpread: number;
  /** Max pitch change between frames (cents): a string holds its pitch, a voice glides. */
  drift: number;
  /** Max distance from the nominal note (cents); beyond that, tune the guitar. */
  maxCents: number;
  /** Chords: share of the new energy their notes must explain together, above chance. */
  coverage: number;
}

export const DEFAULT_JUDGE: JudgeOptions = {
  window: 30,
  steady: 3,
  snr: 10,
  prominence: 4,
  octave: 0.12,
  harmonicity: 0.6,
  rival: 0.7,
  votes: 4,
  voteSpread: 10,
  drift: 5,
  maxCents: 25,
  coverage: 0.5,
};

/** Plucks rise within a few ms: a short lookback ignores slow swells such as speech syllables. */
export const JUDGE_ONSET: OnsetOptions = { ...DEFAULT_ONSET, lookback: 3, riseDb: 6 };

const N = 8192;
const REF_FRAMES = 3;

const fill = windowFill(N);

/**
 * Wait-mode listener: knows the expected note(s) and turns the frame stream into hit / wrong.
 * Each attack (onset.ts) freezes the spectrum just before it; the following frames look only at the
 * energy that is *new* since then, so strings still ringing do not count. That new energy must be a
 * real note — several prominent partials, aligned, clearly above the background — so claps, knocks
 * and speech are ignored, and a fifth or an octave does not pass for the target.
 * One attack gives at most one hit; it is a wrong note only if another note clearly won.
 */
export class WaitJudge {
  private readonly det: NoteDetector;
  private readonly spec = new PowerSpectrum(N);
  private readonly scorer: HarmonicScorer;
  private readonly past: Float32Array[] = [];
  private readonly ref = new Float32Array(N / 2 + 1);
  private readonly cur = new Float32Array(N / 2 + 1);
  private readonly diff = new Float32Array(N / 2 + 1);
  private key: number | null = null;
  private groups: number[][] = [];
  private readonly chords = new ChordTracker();
  private since = Infinity;
  private attackTime = -Infinity;
  /** Previous attack and the window share it filled in the reference: its note may still be growing. */
  private prevTime = -Infinity;
  private prevFill = 1;
  /** Note decided by the previous attack: within one window length it may still be entering. */
  private last: { midi: number; time: number } | null = null;
  private consumed = true;
  /** Per candidate: consecutive frames holding its pitch, and that pitch (cents). */
  private track = new Map<number, { run: number; cents: number }>();
  /** Per candidate: frames it won while steady, and the pitch range over them. */
  private votes = new Map<number, { n: number; lo: number; hi: number }>();

  constructor(
    private readonly sampleRate: number,
    private readonly emit: (j: Judgement) => void,
    private readonly o: JudgeOptions = DEFAULT_JUDGE,
    onset: OnsetOptions = JUDGE_ONSET,
  ) {
    this.det = new NoteDetector(() => {}, onset);
    this.scorer = new HarmonicScorer(sampleRate, N);
  }

  /** One expected event (a note or a chord); `key` identifies it so the same target is not reset. */
  setTarget(key: number | null, midis: readonly number[]): void {
    this.setTargets(key, midis.length ? [midis] : []);
  }

  /** Several candidate events at once (Play-along: everything near the cursor). */
  setTargets(key: number | null, groups: TargetGroups): void {
    if (key === this.key) return;
    this.key = key;
    this.groups = groups.map((g) => [...new Set(g)].sort((a, b) => a - b));
    this.chords.setGroups(this.groups);
  }

  push(f: PitchFrame): void {
    const attack = this.det.push(f);
    if (f.samples.length < N) return;
    if (attack && this.past.length) {
      this.finish();
      this.ref.fill(0);
      for (const p of this.past) for (let i = 0; i < p.length; i++) if (p[i]! > this.ref[i]!) this.ref[i] = p[i]!;
      this.scorer.setFloor(this.ref);
      this.since = 0;
      this.prevTime = this.attackTime;
      this.prevFill = fill((f.time - this.prevTime) * this.sampleRate - 512);
      this.attackTime = f.time;
      this.consumed = false;
      this.votes.clear();
      this.track.clear();
      this.chords.reset();
    }
    this.spec.compute(f.samples, this.cur);
    if (!this.consumed && this.since >= 1) this.examine(f.time);
    this.remember();
    if (++this.since > this.o.window) this.finish();
  }

  private examine(time: number) {
    const { cur, ref, diff, o } = this;
    // An attack < 170 ms after the previous one: that note is still entering the window and grows
    // by itself. Scale the reference by that growth so it is not mistaken for new sound.
    const grow = this.prevFill < 1 ? fill((time - this.prevTime) * this.sampleRate) / Math.max(0.05, this.prevFill) : 1;
    for (let i = 0; i < diff.length; i++) diff[i] = Math.max(0, cur[i]! - grow * ref[i]!);
    const ev = this.scorer.evaluate(diff, o);
    const echo = this.last && this.attackTime - this.last.time < N / this.sampleRate ? this.last.midi : null;
    const track = new Map<number, { run: number; cents: number }>();
    for (const e of ev) {
      if (e.midi === echo || e.partials < e.needed || e.harmonicity < o.harmonicity || !e.odd || e.score <= 0) continue;
      if (Math.abs(e.cents) > o.maxCents) continue;
      const before = this.track.get(e.midi);
      track.set(e.midi, { run: before && Math.abs(e.cents - before.cents) <= o.drift ? before.run + 1 : 1, cents: e.cents });
    }
    this.track = track;
    const steady = (e: NoteEvidence | undefined): e is NoteEvidence => !!e && (track.get(e.midi)?.run ?? 0) >= o.steady;
    let best: NoteEvidence | null = null;
    for (const e of ev) if (steady(e) && (!best || e.score > best.score)) best = e;
    if (best) {
      const v = this.votes.get(best.midi) ?? { n: 0, lo: best.cents, hi: best.cents };
      this.votes.set(best.midi, { n: v.n + 1, lo: Math.min(v.lo, best.cents), hi: Math.max(v.hi, best.cents) });
      const b = best;
      const single = this.groups.findIndex((g) => g.length === 1 && steady(ev[g[0]! - this.scorer.lo]) && ev[g[0]! - this.scorer.lo]!.score >= o.rival * b.score);
      if (single >= 0) return this.hit(single);
    }
    const chord = this.chords.update(ev, this.scorer.lo, this.groups, (m) => this.scorer.coverage(m), o);
    if (chord >= 0) this.hit(chord);
  }

  private hit(group: number) {
    const midi = this.groups[group]![0]!;
    this.consumed = true;
    this.last = { midi, time: this.attackTime };
    this.emit({ kind: 'hit', group, midi, time: this.attackTime });
    this.emit({ kind: 'heard', time: this.attackTime, midi });
  }

  /** Closes the current attack: if another note clearly won, it was a wrong note. */
  private finish() {
    if (this.consumed) return;
    this.consumed = true;
    let top: [number, { n: number; lo: number; hi: number }] | null = null;
    for (const v of this.votes) if (!top || v[1].n > top[1].n) top = v;
    const clear = top && top[1].n >= this.o.votes && top[1].hi - top[1].lo <= this.o.voteSpread;
    const all = this.groups.flat();
    const chord = this.chords.best?.missing.length ? this.chords.best : null;
    const time = this.attackTime;
    if (clear) {
      const midi = top![0];
      this.last = { midi, time };
      this.emit({ kind: 'heard', time, midi });
      if (all.length && (!all.includes(midi) || chord)) this.emit({ kind: 'wrong', time, midi, ...(chord ? { missing: chord.missing } : {}) });
    } else if (chord) {
      const midi = this.groups[chord.group]!.find((m) => !chord.missing.includes(m))!;
      this.emit({ kind: 'wrong', time, midi, missing: chord.missing });
    }
  }

  private remember() {
    const slot = this.past.length < REF_FRAMES ? new Float32Array(this.cur.length) : this.past.shift()!;
    slot.set(this.cur);
    this.past.push(slot);
  }
}
