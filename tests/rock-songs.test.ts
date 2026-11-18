import { describe, expect, it } from 'vitest';
import type { Song } from '../src/music';
import { perform, playAlong } from './perform';

const rock = Object.values(import.meta.glob<Song>('../content/build/rock-*.json', { eager: true, import: 'default' }));

/**
 * Every rock piece must be playable as written: a clean, on-time performance (synthetic, phone-mic
 * colored) is heard note by note in Play-along. Play-along covers recognition of every event; Wait mode
 * on fixed audio would cascade after one miss (a real player plays the note again).
 * Known gap (ROADMAP): a low note or power chord struck again while it still rings can be missed
 * once in a while — hence ≥ 95 % and not 100 %, until real recordings say how the iPhone behaves.
 */
describe.each(rock)('$id', (song) => {
  it('Play-along: ≥ 95 % of the events heard, almost all Perfeito', () => {
    const s = playAlong(song, perform(song));
    const hits = s.status.filter((x) => x === 'hit').length;
    expect(hits / song.events.length).toBeGreaterThanOrEqual(0.95);
    expect(s.timing.filter((t) => t === 'perfect').length / hits).toBeGreaterThan(0.9);
  });
});

it('has rock pieces at every level band', () => {
  const levels = rock.map((s) => s.level);
  expect(levels.some((l) => l <= 2) && levels.some((l) => l === 3) && levels.some((l) => l >= 4)).toBe(true);
});
