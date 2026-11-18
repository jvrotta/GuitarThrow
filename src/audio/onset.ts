import { freqToMidi } from '../music';
import type { PitchFrame } from './analyzer';

/** A note the player actually played: one per attack (or per clear pitch change, for legato). */
export interface NotePlayed {
  /** Seconds (analyzer clock) of the attack. */
  time: number;
  /** Rounded MIDI number. */
  midi: number;
  freq: number;
}

export interface OnsetOptions {
  /** Rise of the hop level (dB) over the quietest of the last `lookback` hops that counts as an attack. */
  riseDb: number;
  /** Same, for the high-frequency (transient) level. */
  hfRiseDb: number;
  lookback: number;
  /** Consecutive frames with the same note needed to confirm it. */
  stable: number;
  /** Frames after an attack during which a new attack is ignored. */
  refractory: number;
  /** Frames to wait for a stable pitch after an attack before giving up. */
  timeout: number;
}

export const DEFAULT_ONSET: OnsetOptions = { riseDb: 5, hfRiseDb: 9, lookback: 8, stable: 3, refractory: 8, timeout: 30 };

/**
 * Turns the ~90 Hz PitchFrame stream into discrete NotePlayed events.
 * - Attack: hop level jumps ≥ riseDb, or transient (HF) level ≥ hfRiseDb, above the recent minimum
 *   → wait for `stable` frames of one note → emit. Hop-level (11 ms) cues catch fast repeated notes
 *   that the 43 ms window level smooths away.
 * - Legato: without an attack, a different note held stable for 2×`stable` frames also emits.
 * A note that keeps ringing never emits twice: repeating a note needs a new attack.
 */
export class NoteDetector {
  private hops: number[] = [];
  private hfs: number[] = [];
  private sinceOnset = Infinity;
  private pendingAt: number | null = null;
  private run: { midi: number; count: number; freq: number } | null = null;
  private lastMidi: number | null = null;

  constructor(
    private readonly emit: (n: NotePlayed) => void,
    private readonly o: OnsetOptions = DEFAULT_ONSET,
  ) {}

  /** Feed one frame; returns true when a new attack starts on this frame. */
  push(f: PitchFrame): boolean {
    const rise = (hist: number[], v: number) => {
      const min = hist.length ? Math.min(...hist) : v;
      hist.push(v);
      if (hist.length > this.o.lookback) hist.shift();
      return v - min;
    };
    const hopRise = rise(this.hops, f.hopDb); // both histories must update every frame
    const hfRise = rise(this.hfs, f.hfDb);
    const attack = hopRise >= this.o.riseDb || hfRise >= this.o.hfRiseDb;
    this.sinceOnset++;

    const isNew = attack && this.sinceOnset > this.o.refractory && f.hopDb > -60;
    if (isNew) {
      this.sinceOnset = 0;
      this.pendingAt = f.time;
      this.run = null;
    }

    if (f.freq === null) {
      this.run = null;
      if (this.pendingAt !== null && this.sinceOnset > this.o.timeout) this.pendingAt = null;
      if (f.db < -50) this.lastMidi = null; // silence: the next note is new even if equal
      return isNew;
    }

    const midi = Math.round(freqToMidi(f.freq));
    this.run = this.run && this.run.midi === midi ? { ...this.run, count: this.run.count + 1 } : { midi, count: 1, freq: f.freq };

    if (this.pendingAt !== null) {
      if (this.run.count >= this.o.stable) {
        this.fire(this.pendingAt, midi, f.freq);
        this.pendingAt = null;
      } else if (this.sinceOnset > this.o.timeout) {
        this.pendingAt = null;
      }
    } else if (this.lastMidi !== null && midi !== this.lastMidi && this.run.count >= this.o.stable * 2) {
      this.fire(f.time, midi, f.freq);
    }
    return isNew;
  }

  private fire(time: number, midi: number, freq: number) {
    this.lastMidi = midi;
    this.emit({ time, midi, freq });
  }
}
