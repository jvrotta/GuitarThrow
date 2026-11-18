import { describe, expect, it } from 'vitest';
import { PlayAlongSession, starsFor, WaitSession } from '../src/engine';
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

describe('WaitSession', () => {
  it('counts in one bar, then holds on the target until it is played', () => {
    const s = new WaitSession(song);
    expect(s.position).toBe(-4);
    s.tick(3);
    expect(s.position).toBe(-1);
    s.tick(10);
    expect(s.position).toBe(0);
    expect(s.waiting).toBe(true);
  });

  it('never advances on a wrong note; precision counts first tries only', () => {
    const s = new WaitSession(song);
    s.tick(4);
    expect(s.hit()).toEqual({ kind: 'hit', index: 0, firstTry: true });
    expect(s.wrong()).toMatchObject({ kind: 'wrong', index: 1, expected: [64] });
    expect(s.target).toBe(1);
    expect(s.combo).toBe(0);
    expect(s.hit()).toEqual({ kind: 'hit', index: 1, firstTry: false });
    s.hit();
    expect(s.status).toEqual(['hit', 'miss', 'hit', 'pending']);
    expect(s.accuracy).toBeCloseTo(2 / 3);
  });

  it('the cursor follows a player faster than the tempo, and finishes at the end', () => {
    const s = new WaitSession(song);
    s.tick(4);
    s.hit();
    s.hit();
    expect(s.position).toBe(1);
    s.hit();
    s.hit();
    expect(s.done).toBe(true);
    expect(s.finished).toBe(false);
    s.tick(100);
    expect(s.finished).toBe(true);
    expect(s.bestCombo).toBe(4);
  });

  it('ignores notes early in the count-in; two-bar count-in', () => {
    expect(new WaitSession(song).hit().kind).toBe('ignored');
    expect(new WaitSession(song, 2).position).toBe(-8);
  });

  it('seek resets from the chosen note on; restart resets all', () => {
    const s = new WaitSession(song);
    s.tick(4);
    s.hit();
    s.hit();
    s.hit();
    s.seek(1);
    expect(s.target).toBe(1);
    expect(s.status).toEqual(['hit', 'pending', 'pending', 'pending']);
    s.restart();
    expect(s.status.every((x) => x === 'pending')).toBe(true);
    expect(s.position).toBe(-4);
  });

  it('loops A–B: after the last note before B it goes back to A with a count-in', () => {
    const s = new WaitSession(song);
    s.setLoop({ a: 0, b: 2 });
    s.tick(4);
    s.hit();
    s.hit();
    expect(s.targetEvent).toBeUndefined();
    s.tick(5);
    expect(s.laps).toBe(1);
    expect(s.target).toBe(0);
    expect(s.position).toBeLessThan(0);
    expect(s.status.slice(0, 2)).toEqual(['pending', 'pending']);
    expect(s.finished).toBe(false);
  });

  it('stars: 60/80/95%', () => {
    expect([0.5, 0.6, 0.8, 0.95].map(starsFor)).toEqual([0, 1, 2, 3]);
  });
});

describe('PlayAlongSession', () => {
  it('never waits: notes not played in time become misses', () => {
    const s = new PlayAlongSession(song);
    s.tick(4 + 1.5); // beat 1.5: note 0 is past its window + decision time (0.61 s), note 1 not yet
    expect(s.status[0]).toBe('miss');
    expect(s.status[1]).toBe('pending');
  });

  it('judges timing from the attack: Perfeito ≤ 80 ms, Bom ≤ 160 ms, otherwise off', () => {
    const s = new PlayAlongSession(song);
    s.tick(4.3);
    expect(s.candidates()).toEqual([0]);
    expect(s.hit(0, 0.05)).toEqual({ kind: 'hit', index: 0, timing: 'perfect', offsetMs: 50 });
    s.tick(1);
    expect(s.hit(1, 0.88)).toEqual({ kind: 'hit', index: 1, timing: 'good', offsetMs: -120 });
    expect(s.hit(2, 2.3)).toEqual({ kind: 'off', index: 2, offsetMs: 300 });
    expect(s.status.slice(0, 3)).toEqual(['hit', 'hit', 'pending']);
    expect(s.combo).toBe(2);
  });

  it('a note can be hit only once; finishes after the last window', () => {
    const s = new PlayAlongSession(song);
    s.tick(4);
    s.hit(0, 0);
    expect(s.hit(0, 0).kind).toBe('ignored');
    s.tick(20);
    expect(s.finished).toBe(true);
    expect(s.accuracy).toBeCloseTo(1 / 4);
  });

  it('speed stretches the windows in beats', () => {
    const s = new PlayAlongSession(song);
    s.speed = 0.5; // 2 s per beat: 0.05 beat = 100 ms
    expect(s.hit(0, 0.05)).toMatchObject({ timing: 'good', offsetMs: 100 });
  });

  it('loop replays the region and clears its results', () => {
    const s = new PlayAlongSession(song);
    s.setLoop({ a: 0, b: 4 });
    s.tick(4);
    s.hit(0, 0);
    s.tick(4.1);
    expect(s.laps).toBe(1);
    expect(s.status.slice(0, 3)).toEqual(['pending', 'pending', 'pending']);
    expect(s.status[3]).toBe('pending'); // outside the loop: never judged
  });
});
