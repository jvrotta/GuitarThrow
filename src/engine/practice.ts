import type { SongEvent } from '../music';
import { Session } from './session';

export type PlayOutcome =
  | { kind: 'hit'; index: number; firstTry: boolean }
  | { kind: 'wrong'; index: number; expected: number[] }
  | { kind: 'ignored' };

/**
 * Wait mode: the target is the first pending event; the clock runs at the song tempo but stops on the
 * target until it is played right, so no note is ever skipped. Right/wrong comes from the audio judge
 * (hit() / wrong()). Accuracy counts first tries; a target that needed retries ends as `miss`.
 */
export class WaitSession extends Session {
  readonly mode = 'wait' as const;
  /** Wrong attempts per event. */
  readonly tries: number[];
  target = 0;

  constructor(song: ConstructorParameters<typeof Session>[0], countInBars = 1) {
    super(song, countInBars);
    this.tries = song.events.map(() => 0);
  }

  /** Last event of the run (the loop end, or the song end). */
  private get end(): number {
    return this.loop ? this.firstAt(this.loop.b) : this.song.events.length;
  }

  get done(): boolean {
    return this.target >= this.end;
  }

  get finished(): boolean {
    return !this.loop && this.done && this.position >= this.song.length;
  }

  get targetEvent(): SongEvent | undefined {
    return this.target < this.end ? this.song.events[this.target] : undefined;
  }

  /** Is the clock holding on the target, waiting for the player? */
  get waiting(): boolean {
    const t = this.targetEvent;
    return t !== undefined && this.position >= t.beat;
  }

  tick(dt: number): void {
    const next = this.position + dt / this.spb;
    const t = this.targetEvent;
    this.position = t ? Math.min(next, Math.max(this.position, t.beat)) : Math.min(next, this.loop?.b ?? this.song.length);
    if (this.wrapLoop()) {
      this.target = this.firstAt(this.loop!.a);
      this.tries.fill(0, this.target, this.end);
    }
  }

  /** The judge heard the target. */
  hit(): PlayOutcome {
    const t = this.targetEvent;
    if (!t || this.position < -this.countIn / 2) return { kind: 'ignored' }; // ignore noise early in the count-in
    const index = this.target;
    const firstTry = this.tries[index] === 0;
    this.judge(index, firstTry);
    this.target++;
    // Played ahead of the cursor: the cursor jumps to the note, so it follows a player faster than the tempo.
    this.position = Math.max(this.position, t.beat);
    return { kind: 'hit', index, firstTry };
  }

  /** The judge heard another note (or an incomplete chord). Never advances. */
  wrong(): PlayOutcome {
    const t = this.targetEvent;
    if (!t || this.position < -this.countIn / 2) return { kind: 'ignored' };
    this.tries[this.target]!++;
    this.combo = 0;
    return { kind: 'wrong', index: this.target, expected: t.notes.map((n) => n.midi) };
  }

  override seek(beat: number): void {
    super.seek(beat);
    this.target = this.firstAt(beat);
    this.tries.fill(0, this.target);
    this.position = Math.min(beat, this.song.events[this.target]?.beat ?? this.song.length);
  }

  override restart(): void {
    super.restart();
    this.tries.fill(0);
    this.target = this.firstAt(this.loop?.a ?? 0);
  }
}
