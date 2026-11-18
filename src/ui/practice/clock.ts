/**
 * Maps the analyzer clock (seconds of mic audio received) to performance.now() seconds. Frames arrive
 * with a variable delay; the smallest delay seen is the best estimate, allowed to creep up slowly so a
 * drift between the audio and the page clocks is followed.
 */
export class ClockMap {
  private offset = Number.POSITIVE_INFINITY;

  observe(audioTime: number, now = performance.now() / 1000): void {
    const d = now - audioTime;
    this.offset = d < this.offset ? d : this.offset + 2e-5;
  }

  /** Page time (s) of an analyzer time, minus the calibrated latency. */
  toPage(audioTime: number, latencyMs = 0): number {
    return audioTime + this.offset - latencyMs / 1000;
  }
}
