import { describe, expect, it } from 'vitest';
import { centsOff, freqToMidi, midiToName, readTuning, stringFretToMidi, stringLabels } from '../src/music';

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

describe('readTuning', () => {
  const f = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

  it('measures against the nearest open string, not the nearest note', () => {
    // Low E tuned 80 cents flat: still string 6, -80 cents (not "D# +20").
    const r = readTuning(f(40 - 0.8));
    expect(r.string).toBe(6);
    expect(r.cents).toBeCloseTo(-80, 0);
  });

  it('honors a locked string and folds octave errors', () => {
    expect(readTuning(f(45.1), 5).cents).toBeCloseTo(10, 0);
    // Detector reports the octave above A2: still ~0 cents against string 5.
    expect(readTuning(f(57.05), 5).cents).toBeCloseTo(5, 0);
    expect(readTuning(f(50), 6).string).toBe(6);
  });

  it('labels strings 1..6', () => {
    expect(stringLabels()).toEqual(['Mi', 'Si', 'Sol', 'Ré', 'Lá', 'Mi']);
  });
});
