import { describe, expect, it } from 'vitest';
import { parseTextTab, placeNote } from '../src/music';

const TAB = `
Riff de exemplo
e|-------0-----|---------------|
B|-----1---1---|-----0---------|
G|---2-------2-|---2---2-------|
D|-2-----------|-2-------------|
A|-------------|---------------|
E|-------------|---------3-----|

e|-0-----------|
B|-1-----------|
G|-0-----------|
D|-2-----------|
A|-3-----------|
E|-------------|
`;

describe('text tab import', () => {
  it('reads columns as notes, chords in one column, high e first', () => {
    const s = parseTextTab(TAB, { id: 'x', title: 'Riff' });
    const ev = s.events.map((e) => e.notes.map((n) => `${n.string}:${n.fret}`).join(' '));
    expect(ev.slice(0, 4)).toEqual(['4:2', '3:2', '2:1', '1:0']);
    expect(ev[ev.length - 1]).toBe('1:0 2:1 3:0 4:2 5:3');
    expect(s.events[0]!.notes[0]!.midi).toBe(52);
    expect(s.events.every((e, i) => i === 0 || e.beat > s.events[i - 1]!.beat)).toBe(true);
    expect(s.length % 4).toBe(0);
  });

  it('two-digit frets and a clear error when there is no tab', () => {
    const s = parseTextTab('e|--12--10--|\nB|----------|\nG|----------|\nD|----------|\nA|----------|\nE|----------|', { id: 'y', title: 'T' });
    expect(s.events.map((e) => e.notes[0]!.fret)).toEqual([12, 10]);
    expect(() => parseTextTab('só texto', { id: 'z', title: 'T' })).toThrow(/6 linhas/);
  });

  it('places notes without tablature in first position', () => {
    expect(placeNote(64)).toEqual({ string: 1, fret: 0 });
    expect(placeNote(62)).toEqual({ string: 2, fret: 3 });
    expect(placeNote(76).fret).toBe(12);
    expect(placeNote(30).fret).toBe(-1);
  });
});
