import { describe, expect, it } from 'vitest';
import * as alphaTab from '@coderline/alphatab';
import { Transport } from '../src/engine';
import { catalog, firstEventAfter, loadSong } from '../src/music';
import { scoreToSong } from '../src/music/alphatab';

alphaTab.Logger.logLevel = alphaTab.LogLevel.None;

describe('scoreToSong', () => {
  const tex = String.raw`\title "T"
\tempo 90
\ts 4 4
:4 0.6 3.5 (0.1 1.2).8 3.2.8 r.4 | 1.2.2{d} 3.1.4`;
  const song = scoreToSong(alphaTab.importer.ScoreLoader.loadAlphaTex(tex), {
    id: 't',
    kind: 'exercise',
    level: 1,
    source: 'teste',
  });

  it('keeps tab string numbering (1 = high E) and MIDI', () => {
    expect(song.events[0]!.notes).toEqual([{ string: 6, fret: 0, midi: 40, finger: 0 }]);
    expect(song.events[1]!.notes).toEqual([{ string: 5, fret: 3, midi: 48, finger: 3 }]);
    expect(song.events[2]!.notes.map((n) => n.string)).toEqual([1, 2]);
    expect(song.tuning).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('keeps explicit fingering ({lf 2} = index) and deduces the rest', () => {
    const s = scoreToSong(alphaTab.importer.ScoreLoader.loadAlphaTex(':4 3.5{lf 2} 4.5 6.5'), { id: 'f', kind: 'exercise', level: 1, source: 't' });
    expect(s.events.map((e) => e.notes[0]!.finger)).toEqual([1, 2, 4]);
  });

  it('uses absolute beats across bars and skips rests', () => {
    expect(song.events.map((e) => [e.beat, e.dur])).toEqual([
      [0, 1],
      [1, 1],
      [2, 0.5],
      [2.5, 0.5],
      [4, 3],
      [7, 1],
    ]);
    expect(song.bars).toEqual([0, 4]);
    expect(song.length).toBe(8);
    expect(song.tempo).toBe(90);
  });
});

describe('built-in content', () => {
  it('every catalog entry loads and matches its song', async () => {
    expect(catalog.length).toBeGreaterThan(0);
    for (const entry of catalog) {
      const song = await loadSong(entry.id);
      expect(song.title).toBe(entry.title);
      expect(song.events.length).toBe(entry.notes);
      for (let i = 1; i < song.events.length; i++) expect(song.events[i]!.beat).toBeGreaterThan(song.events[i - 1]!.beat);
    }
  });
});

describe('firstEventAfter', () => {
  const ev = [0, 1, 2, 3].map((beat) => ({ beat, dur: 1, notes: [] }));
  it('finds the event sounding at or after a beat', () => {
    expect(firstEventAfter(ev, 0)).toBe(0);
    expect(firstEventAfter(ev, 1.5)).toBe(1);
    expect(firstEventAfter(ev, 9)).toBe(4);
  });
});

describe('Transport', () => {
  it('advances at tempo × speed and re-anchors on changes', () => {
    let t = 0;
    const tr = new Transport(120, () => t);
    tr.play();
    t = 1;
    expect(tr.position()).toBe(2);
    tr.setSpeed(0.5);
    t = 2;
    expect(tr.position()).toBe(3);
    tr.pause();
    t = 10;
    expect(tr.position()).toBe(3);
    tr.seek(0);
    tr.play();
    t = 11;
    expect(tr.position()).toBe(1);
  });
});
