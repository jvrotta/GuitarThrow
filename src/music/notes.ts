const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Standard tuning, string 6 (low E) to string 1 (high E), as MIDI numbers. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Fractional MIDI number for a frequency (e.g. 82.41 Hz -> 40.0). */
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** "E2", "A#3"... */
export function midiToName(midi: number): string {
  const m = Math.round(midi);
  return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** Deviation in cents from the nearest semitone, in [-50, 50). */
export function centsOff(freq: number): number {
  const m = freqToMidi(freq);
  return (m - Math.round(m)) * 100;
}

/** string: 1 (high E) .. 6 (low E); fret: 0 = open. */
export function stringFretToMidi(string: number, fret: number, tuning: readonly number[] = STANDARD_TUNING): number {
  const open = tuning[tuning.length - string];
  if (open === undefined) throw new RangeError(`invalid string ${string}`);
  return open + fret;
}
