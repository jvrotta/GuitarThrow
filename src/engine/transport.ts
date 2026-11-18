/**
 * Musical clock: converts elapsed time into a position in beats at tempo × speed.
 * Pause/seek/speed changes re-anchor the clock so the position never jumps.
 * The time source is injectable (seconds) for tests; M5 will feed it AudioContext.currentTime.
 */
export class Transport {
  private anchorBeat = 0;
  private anchorTime = 0;
  private playing = false;
  private _speed = 1;

  constructor(
    public tempo: number,
    private readonly now: () => number = () => performance.now() / 1000,
  ) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  get speed(): number {
    return this._speed;
  }

  position(): number {
    if (!this.playing) return this.anchorBeat;
    return this.anchorBeat + ((this.now() - this.anchorTime) * this.tempo * this._speed) / 60;
  }

  play(): void {
    if (this.playing) return;
    this.anchorTime = this.now();
    this.playing = true;
  }

  pause(): void {
    this.anchorBeat = this.position();
    this.playing = false;
  }

  seek(beat: number): void {
    this.anchorBeat = beat;
    this.anchorTime = this.now();
  }

  setSpeed(speed: number): void {
    this.anchorBeat = this.position();
    this.anchorTime = this.now();
    this._speed = speed;
  }
}
