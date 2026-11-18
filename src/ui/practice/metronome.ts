/**
 * Metronome on the mic's AudioContext. Clicks are short band-passed noise bursts: no pitch, so the
 * note judge ignores them when the mic hears the speaker (same as a knock). Scheduled ~120 ms ahead.
 */
export class Metronome {
  private readonly burst: AudioBuffer;
  /** Next beat to schedule. */
  private next = Number.NaN;

  constructor(private readonly ctx: AudioContext) {
    const n = Math.round(ctx.sampleRate * 0.03);
    this.burst = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.burst.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n / 6));
  }

  /** One click at `at` (AudioContext seconds); the first beat of a bar is brighter and louder. */
  click(at: number, accent: boolean, volume: number): void {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.burst;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = accent ? 3400 : 2300;
    band.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.value = volume * (accent ? 6 : 4);
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start(Math.max(ctx.currentTime, at));
  }

  /**
   * Called every animation frame while the clock runs: `pos` = position in beats now, `spb` = seconds
   * per beat. Schedules the whole beats about to come for which `audible(beat)` is true.
   */
  schedule(pos: number, spb: number, barBeats: number, volume: number, audible: (beat: number) => boolean): void {
    // First call, or the clock jumped (seek, loop, restart): start again from the next beat.
    if (!(this.next >= pos - 0.05 && this.next <= pos + 1.05)) this.next = Math.ceil(pos - 0.05);
    const out = (this.ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
    while (this.next <= pos + 0.12 / spb) {
      const b = this.next++;
      if (!audible(b)) continue;
      const accent = ((b % barBeats) + barBeats) % barBeats === 0;
      this.click(this.ctx.currentTime + (b - pos) * spb - out, accent, volume);
    }
  }

  reset(): void {
    this.next = Number.NaN;
  }
}
