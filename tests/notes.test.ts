import { describe, expect, it } from 'vitest';
import { centsOff, freqToMidi, midiToName, stringFretToMidi } from '../src/music';

describe('note utilities', () => {
  it('maps open strings in standard tuning', () => {
    expect(midiToName(stringFretToMidi(6, 0))).toBe('E2');
    expect(midiToName(stringFretToMidi(5, 0))).toBe('A2');
    expect(midiToName(stringFretToMidi(1, 0))).toBe('E4');
    expect(midiToName(stringFretToMidi(2, 1))).toBe('C4');
  });

  it('converts frequency to MIDI and cents', () => {
    expect(freqToMidi(440)).toBeCloseTo(69);
    expect(freqToMidi(82.41)).toBeCloseTo(40, 2);
    expect(centsOff(440 * 2 ** (10 / 1200))).toBeCloseTo(10);
  });

  it('rejects invalid strings', () => {
    expect(() => stringFretToMidi(7, 0)).toThrow(RangeError);
  });
});
