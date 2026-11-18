import type { Song, SongEvent } from '../music';

/** Result of one event once judged. Wait mode: `hit` = right on the first try, `miss` = needed retries. */
export type EventStatus = 'pending' | 'hit' | 'miss';
export type Mode = 'wait' | 'play';

/** 1–3 stars from accuracy (0..1): ≥ 60% = 1, ≥ 80% = 2, ≥ 95% = 3. */
export function starsFor(accuracy: number): number {
  return accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
}

/** A loop region in beats: reaching `b` jumps back to `a` (after a count-in). */
export interface Loop {
  a: number;
  b: number;
}

/**
 * What both practice modes share: per-event status, combo, accuracy, a clock in beats that starts with
 * a count-in (negative positions), seek/restart and an A–B loop. Pure: time is pushed in by tick(dt).
 */
export abstract class Session {
  abstract readonly mode: Mode;
  readonly status: EventStatus[];
  combo = 0;
  bestCombo = 0;
  /** Current position in beats (negative during the count-in). */
  position: number;
  speed = 1;
  loop: Loop | null = null;
  /** Times the loop wrapped (the UI clears its popups then). */
  laps = 0;

  constructor(
    readonly song: Song,
    readonly countInBars = 1,
  ) {
    this.status = song.events.map(() => 'pending');
    this.position = -this.countIn;
  }

  /** Beats in one bar (quarter-note beats). */
  get barBeats(): number {
    const [n, d] = this.song.timeSig;
    return (n * 4) / d;
  }

  get countIn(): number {
    return this.barBeats * this.countInBars;
  }

  /** Seconds per beat at the current speed. */
  get spb(): number {
    return 60 / (this.song.tempo * this.speed);
  }

  /** Judged-right events over judged events (1 when nothing judged yet). */
  get accuracy(): number {
    let judged = 0;
    let hits = 0;
    for (const s of this.status) {
      if (s === 'pending') continue;
      judged++;
      if (s === 'hit') hits++;
    }
    return judged ? hits / judged : 1;
  }

  /** The song (or the loop) is over. */
  abstract get finished(): boolean;

  /** Advance the clock by `dt` seconds of real time. */
  abstract tick(dt: number): void;

  /** Jump to `beat`; events from there on are pending again. */
  seek(beat: number): void {
    this.resetFrom(this.firstAt(beat));
    this.position = beat;
    this.combo = 0;
  }

  restart(): void {
    this.resetFrom(0);
    this.combo = 0;
    this.bestCombo = 0;
    this.position = (this.loop?.a ?? 0) - this.countIn;
  }

  /** Loop over [a, b) (snapped to bars by the caller) or clear it with null. */
  setLoop(loop: Loop | null): void {
    this.loop = loop && loop.b > loop.a ? loop : null;
  }

  protected firstAt(beat: number): number {
    const i = this.song.events.findIndex((e) => e.beat >= beat - 1e-6);
    return i < 0 ? this.song.events.length : i;
  }

  protected resetFrom(index: number, until = this.song.events.length): void {
    for (let k = index; k < until; k++) this.status[k] = 'pending';
  }

  protected judge(index: number, ok: boolean): void {
    this.status[index] = ok ? 'hit' : 'miss';
    this.combo = ok ? this.combo + 1 : 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
  }

  /** Called by tick(): at the loop end, go back to A with a count-in and replay the region. */
  protected wrapLoop(): boolean {
    const l = this.loop;
    if (!l || this.position < l.b) return false;
    this.resetFrom(this.firstAt(l.a), this.firstAt(l.b));
    this.position = l.a - this.countIn;
    this.laps++;
    return true;
  }

  get events(): readonly SongEvent[] {
    return this.song.events;
  }
}
