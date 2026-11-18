import { describe, expect, it } from 'vitest';
import { PracticeSession, starsFor } from '../src/engine';
import type { Song } from '../src/music';

const note = (midi: number) => ({ string: 1, fret: 0, midi, finger: 0 });
const song: Song = {
  id: 't', title: 'T', kind: 'exercise', level: 1, source: 't', tempo: 60,
  timeSig: [4, 4], tuning: [40, 45, 50, 55, 59, 64], bars: [0, 4], length: 8,
  events: [
    { beat: 0, dur: 1, notes: [note(64)] },
    { beat: 1, dur: 1, notes: [note(64)] },
    { beat: 2, dur: 1, notes: [note(65)] },
    { beat: 4, dur: 2, notes: [note(48), note(52), note(55)] },
  ],
};

describe('PracticeSession (wait mode)', () => {
  it('counts in one bar, then holds on the target until it is played', () => {
    const s = new PracticeSession(song);
    expect(s.position).toBe(-4);
    s.tick(3);
    expect(s.position).toBe(-1);
    s.tick(10);
    expect(s.position).toBe(0);
    expect(s.waiting).toBe(true);
  });

  it('never advances on a wrong note; precision counts first tries only', () => {
    const s = new PracticeSession(song);
    s.tick(4);
    expect(s.play(64)).toEqual({ kind: 'hit', index: 0, firstTry: true });
    expect(s.play(60)).toMatchObject({ kind: 'wrong', index: 1 });
    expect(s.target).toBe(1);
    expect(s.combo).toBe(0);
    expect(s.play(76)).toEqual({ kind: 'hit', index: 1, firstTry: false }); // octave slip accepted
    s.play(65);
    expect(s.status).toEqual(['hit', 'miss', 'hit', 'pending']);
    expect(s.accuracy).toBeCloseTo(2 / 3);
  });

  it('a repeated note needs two plays, and the cursor follows a fast player', () => {
    const s = new PracticeSession(song);
    s.tick(4);
    s.play(64);
    s.play(64);
    expect(s.target).toBe(2);
    expect(s.position).toBe(1);
  });

  it('accepts any chord note (M3) and finishes at the end of the song', () => {
    const s = new PracticeSession(song);
    s.tick(4);
    [64, 64, 65, 52].forEach((m) => s.play(m));
    expect(s.done).toBe(true);
    expect(s.finished).toBe(false);
    s.tick(100);
    expect(s.finished).toBe(true);
    expect(s.bestCombo).toBe(4);
  });

  it('ignores notes early in the count-in', () => {
    const s = new PracticeSession(song);
    expect(s.play(64).kind).toBe('ignored');
  });

  it('seek resets from the chosen note on; restart resets all', () => {
    const s = new PracticeSession(song);
    s.tick(4);
    [64, 64, 65].forEach((m) => s.play(m));
    s.seek(1);
    expect(s.target).toBe(1);
    expect(s.status).toEqual(['hit', 'pending', 'pending', 'pending']);
    s.restart();
    expect(s.status.every((x) => x === 'pending')).toBe(true);
    expect(s.position).toBe(-4);
  });

  it('stars: 60/80/95%', () => {
    expect([0.5, 0.6, 0.8, 0.95].map(starsFor)).toEqual([0, 1, 2, 3]);
  });
});
