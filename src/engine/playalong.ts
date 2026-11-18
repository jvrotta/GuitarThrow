import { Session } from './session';

export type Timing = 'perfect' | 'good';

/** Timing windows (seconds, either side of the note): Perfeito ≤ 80 ms, Bom ≤ 160 ms. */
export const WINDOW = { perfect: 0.08, good: 0.16 };
/** Seconds the audio judge may take to decide after an attack (analysis window + steady frames). */
export const DECISION = 0.45;

export type TimedOutcome =
  | { kind: 'hit'; index: number; timing: Timing; offsetMs: number }
  /** Right note, outside the window: told apart so the UI can say "adiantado/atrasado". */
  | { kind: 'off'; index: number; offsetMs: number }
  | { kind: 'ignored' };

/**
 * Play-along: the clock runs at tempo × speed and never waits. Each note must be played within the
 * timing window; when its window (plus the judge's decision time) has passed unplayed, it is a miss.
 * Hits come with the attack's position in beats, so timing is measured from the attack, not from
 * when the judge decided.
 */
export class PlayAlongSession extends Session {
  readonly mode = 'play' as const;
  readonly timing: (Timing | null)[];

  constructor(song: ConstructorParameters<typeof Session>[0], countInBars = 1) {
    super(song, countInBars);
    this.timing = song.events.map(() => null);
  }

  get finished(): boolean {
    return !this.loop && this.position >= this.song.length && this.status.every((s) => s !== 'pending');
  }

  tick(dt: number): void {
    this.position += dt / this.spb;
    const late = (WINDOW.good + DECISION) / this.spb;
    this.song.events.forEach((e, i) => {
      if (this.status[i] === 'pending' && this.position - e.beat > late && (!this.loop || e.beat < this.loop.b)) this.judge(i, false);
    });
    if (this.wrapLoop()) this.timing.fill(null);
    if (!this.loop) this.position = Math.min(this.position, this.song.length + late + 1);
  }

  /** Pending events the player may be playing around now (targets for the audio judge). */
  candidates(): number[] {
    const before = (WINDOW.good + DECISION) / this.spb;
    const after = WINDOW.good / this.spb;
    const out: number[] = [];
    this.song.events.forEach((e, i) => {
      const d = e.beat - this.position;
      if (this.status[i] === 'pending' && d >= -before && d <= after) out.push(i);
    });
    return out;
  }

  /** The judge heard event `index`, attacked at `beat`. */
  hit(index: number, beat: number): TimedOutcome {
    const e = this.song.events[index];
    if (!e || this.status[index] !== 'pending') return { kind: 'ignored' };
    const offset = (beat - e.beat) * this.spb;
    const offsetMs = Math.round(offset * 1000);
    if (Math.abs(offset) > WINDOW.good) return { kind: 'off', index, offsetMs };
    const timing: Timing = Math.abs(offset) <= WINDOW.perfect ? 'perfect' : 'good';
    this.judge(index, true);
    this.timing[index] = timing;
    return { kind: 'hit', index, timing, offsetMs };
  }

  override seek(beat: number): void {
    super.seek(beat);
    this.timing.fill(null, this.firstAt(beat));
  }

  override restart(): void {
    super.restart();
    this.timing.fill(null);
  }
}
