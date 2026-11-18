import type { Song, SongEvent } from '../music';

/** Result of one event once judged. Wait mode: `hit` = right on the first try, `miss` = needed retries. */
export type EventStatus = 'pending' | 'hit' | 'miss';

export type PlayOutcome =
  | { kind: 'hit'; index: number; firstTry: boolean }
  | { kind: 'wrong'; index: number; expected: number[] }
  | { kind: 'ignored' };

/** 1–3 stars from accuracy (0..1): ≥ 60% = 1, ≥ 80% = 2, ≥ 95% = 3. */
export function starsFor(accuracy: number): number {
  return accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
}

/** A played note matches a target note on the same pitch class an octave away too (pitch trackers slip octaves). */
export function matches(event: SongEvent, midi: number): boolean {
  // M3: for chords any chord note counts; M4 replaces this with chroma matching.
  return event.notes.some((n) => n.midi === midi || Math.abs(n.midi - midi) === 12);
}

/**
 * Wait-mode practice session: the target is the first pending event; the clock runs at the song tempo
 * but stops on the target until it is played right, so no note is ever skipped.
 * Starts one bar before beat 0 (count-in). Pure: time is pushed in by `tick(dt)`.
 */
export class PracticeSession {
  readonly status: EventStatus[];
  /** Wrong attempts per event. */
  readonly tries: number[];
  target = 0;
  combo = 0;
  bestCombo = 0;
  /** Current position in beats (negative during the count-in). */
  position: number;
  speed = 1;

  constructor(readonly song: Song) {
    this.status = song.events.map(() => 'pending');
    this.tries = song.events.map(() => 0);
    this.position = -this.barBeats;
  }

  /** Beats in one bar (quarter-note beats). */
  get barBeats(): number {
    const [n, d] = this.song.timeSig;
    return (n * 4) / d;
  }

  get done(): boolean {
    return this.target >= this.song.events.length;
  }

  /** Finished and the cursor reached the end. */
  get finished(): boolean {
    return this.done && this.position >= this.song.length;
  }

  get targetEvent(): SongEvent | undefined {
    return this.song.events[this.target];
  }

  /** Is the clock holding on the target, waiting for the player? */
  get waiting(): boolean {
    const t = this.targetEvent;
    return t !== undefined && this.position >= t.beat;
  }

  /** First-try hits over judged events (1 when nothing judged yet). */
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

  /** Advance the clock by `dt` seconds of real time. */
  tick(dt: number): void {
    const next = this.position + (dt * this.song.tempo * this.speed) / 60;
    const t = this.targetEvent;
    this.position = t ? Math.min(next, Math.max(this.position, t.beat)) : Math.min(next, this.song.length);
  }

  /** Feed a detected note. */
  play(midi: number): PlayOutcome {
    const t = this.targetEvent;
    if (!t || this.position < -this.barBeats / 2) return { kind: 'ignored' }; // ignore noise early in the count-in
    const index = this.target;
    if (!matches(t, midi)) {
      this.tries[index]!++;
      this.combo = 0;
      return { kind: 'wrong', index, expected: t.notes.map((n) => n.midi) };
    }
    const firstTry = this.tries[index] === 0;
    this.status[index] = firstTry ? 'hit' : 'miss';
    this.combo = firstTry ? this.combo + 1 : 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.target++;
    // Played ahead of the cursor: the cursor jumps to the note, so it follows a player faster than the tempo.
    this.position = Math.max(this.position, t.beat);
    return { kind: 'hit', index, firstTry };
  }

  /** Jump to the event at or after `beat` (minimap); everything from there on is pending again. */
  seek(beat: number): void {
    const events = this.song.events;
    let i = events.findIndex((e) => e.beat >= beat - 1e-6);
    if (i < 0) i = events.length;
    for (let k = i; k < events.length; k++) {
      this.status[k] = 'pending';
      this.tries[k] = 0;
    }
    this.target = i;
    this.combo = 0;
    this.position = Math.min(beat, events[i]?.beat ?? this.song.length);
  }

  restart(): void {
    this.seek(0);
    this.status.fill('pending');
    this.tries.fill(0);
    this.bestCombo = 0;
    this.position = -this.barBeats;
  }
}
