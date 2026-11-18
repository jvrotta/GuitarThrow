import { STANDARD_TUNING, freqToMidi, midiToSolfege, nearestString } from './notes';

export interface TuningReading {
  /** Target string, 1 (high E) .. 6 (low E). */
  string: number;
  /** MIDI number of that open string. */
  targetMidi: number;
  /** Deviation from the open string in cents, octave-folded into [-600, 600). */
  cents: number;
}

/**
 * Measures a frequency against an open string — the locked one, or the nearest one.
 * Measuring against the string (not the nearest semitone) keeps a badly detuned string
 * from showing up as a different note; octave folding absorbs harmonic (octave) errors.
 */
export function readTuning(
  freq: number,
  lockedString: number | null = null,
  tuning: readonly number[] = STANDARD_TUNING,
): TuningReading {
  const midi = freqToMidi(freq);
  const string = lockedString ?? nearestString(midi, tuning);
  const targetMidi = tuning[tuning.length - string]!;
  let cents = (midi - targetMidi) * 100;
  cents -= 1200 * Math.round(cents / 1200);
  return { string, targetMidi, cents };
}

/** |cents| below this counts as in tune. */
export const IN_TUNE_CENTS = 5;

/** Labels for strings 1..6 in standard tuning: Mi, Si, Sol, Ré, Lá, Mi. */
export function stringLabels(tuning: readonly number[] = STANDARD_TUNING): string[] {
  return [...tuning].reverse().map(midiToSolfege);
}
