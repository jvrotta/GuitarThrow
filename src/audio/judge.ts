import type { PitchFrame } from './analyzer';
import { DEFAULT_ONSET, NoteDetector, type NotePlayed, type OnsetOptions } from './onset';
import { noteSalience } from './target';

export type Judgement =
  | { kind: 'hit'; time: number }
  | { kind: 'wrong'; time: number; midi: number }
  /** Any note the pitch tracker confirmed (for "♪ Mi" feedback), right or wrong. */
  | { kind: 'heard'; time: number; midi: number };

export interface JudgeOptions {
  /** Frames after an attack in which the target may be confirmed (~270 ms). */
  window: number;
  /** Target partials must hold this share of the energy… */
  minFrac: number;
  /** …and beat the semitone neighbours by this ratio… */
  minDominance: number;
  /** …for this many consecutive frames. */
  confirm: number;
  /** Without a detected attack, a rise of the target's own partials this large (dB) also counts. */
  fluxDb: number;
  /** Frames a wrong note waits before being reported (≥ window: the low-string check needs ~170 ms of audio). */
  wrongDelay: number;
}

export const DEFAULT_JUDGE: JudgeOptions = { window: 25, minFrac: 0.2, minDominance: 2, confirm: 2, fluxDb: 9, wrongDelay: 27 };
const FLUX_LOOKBACK = 10;

const sameClass = (a: number, b: number) => a === b || Math.abs(a - b) === 12;

/**
 * Wait-mode listener: knows the expected note(s) and decides hit / wrong from the frame stream.
 * - Hit: after an attack, the target's partials dominate (works with earlier strings still ringing),
 *   or the pitch tracker confirms the target note. One attack can produce at most one hit, so a
 *   repeated note always needs a new attack.
 * - Wrong: right after an attack the pitch tracker confirmed another note and the target did not show
 *   up shortly after (pitch changes without an attack never count as wrong).
 */
export class WaitJudge {
  private readonly det: NoteDetector;
  private key: number | null = null;
  private target: number[] = [];
  private windowLeft = 0;
  private consumed = true;
  private okRun = 0;
  private hist: number[] = [];
  private wrong: { n: NotePlayed; left: number } | null = null;
  private attackTime = -1;

  constructor(
    private readonly sampleRate: number,
    private readonly emit: (j: Judgement) => void,
    private readonly o: JudgeOptions = DEFAULT_JUDGE,
    onset: OnsetOptions = DEFAULT_ONSET,
  ) {
    this.det = new NoteDetector((n) => this.onNote(n), onset);
  }

  /** Expected notes; `key` identifies the target (e.g. event index) so the same target is not reset. */
  setTarget(key: number | null, midis: readonly number[]): void {
    if (key === this.key) return;
    this.key = key;
    this.target = [...midis];
    this.hist = [];
    this.okRun = 0;
  }

  push(f: PitchFrame): void {
    if (this.det.push(f)) {
      this.attackTime = f.time;
      this.windowLeft = this.o.window;
      this.consumed = false;
      this.okRun = 0;
    }
    if (this.target.length && f.samples.length) this.checkTarget(f);
    if (this.windowLeft > 0) this.windowLeft--;
    if (this.wrong && --this.wrong.left <= 0) {
      this.emit({ kind: 'wrong', time: this.wrong.n.time, midi: this.wrong.n.midi });
      this.wrong = null;
    }
  }

  private checkTarget(f: PitchFrame) {
    let best = { db: -240, frac: 0, dominance: 0 };
    for (const m of this.target) {
      const s = noteSalience(f.samples, this.sampleRate, m);
      if (s.frac * Math.min(s.dominance, 10) > best.frac * Math.min(best.dominance, 10)) best = s;
    }
    const min = this.hist.length ? Math.min(...this.hist) : best.db;
    this.hist.push(best.db);
    if (this.hist.length > FLUX_LOOKBACK) this.hist.shift();
    const fresh = (this.windowLeft > 0 && !this.consumed) || best.db - min >= this.o.fluxDb;
    const ok = fresh && best.frac >= this.o.minFrac && best.dominance >= this.o.minDominance;
    this.okRun = ok ? this.okRun + 1 : 0;
    if (this.okRun >= this.o.confirm) this.hit(f.time);
  }

  private onNote(n: NotePlayed) {
    this.emit({ kind: 'heard', time: n.time, midi: n.midi });
    // A note from the current attack counts once. A pitch change without an attack can be a legato
    // hit, but never a wrong note: with strings ringing together the tracker may hop between them.
    const fromAttack = n.time === this.attackTime;
    if (fromAttack && this.consumed) return;
    if (this.target.some((m) => sameClass(m, n.midi))) this.hit(n.time);
    else if (fromAttack) this.wrong = { n, left: this.o.wrongDelay };
  }

  private hit(time: number) {
    this.consumed = true;
    this.windowLeft = 0;
    this.okRun = 0;
    this.wrong = null;
    // Restart the flux reference: a note that keeps ringing must not hit the next (equal) target.
    this.hist = this.hist.map(() => Math.max(...this.hist));
    this.emit({ kind: 'hit', time });
  }
}
