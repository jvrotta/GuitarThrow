import { describe, expect, it } from 'vitest';
import type { Song } from '../src/music';
import { perform, playAlong } from './perform';

const shelves = Object.values(import.meta.glob<Song>('../content/build/*.json', { eager: true, import: 'default' })).filter(
  (s) => s.kind === 'song',
);

/**
 * Every song (all shelves) must be playable as written: a clean, on-time performance (synthetic, phone-mic
 * colored) is heard note by note in Play-along. Play-along covers recognition of every event; Wait mode
 * on fixed audio would cascade after one miss (a real player plays the note again).
 * Known gap (ROADMAP): a low note or power chord struck again while it still rings can be missed
 * once in a while — hence ≥ 95 % and not 100 %, until real recordings say how the iPhone behaves.
 */
describe.each(shelves)('$id', (song) => {
  it('Play-along: ≥ 95 % of the events heard, almost all Perfeito', () => {
    const s = playAlong(song, perform(song));
    const hits = s.status.filter((x) => x === 'hit').length;
    expect(hits / song.events.length).toBeGreaterThanOrEqual(0.95);
    expect(s.timing.filter((t) => t === 'perfect').length / hits).toBeGreaterThan(0.9);
  });
});

it.each(['rock', 'metal', 'tradicional'])('has %s pieces at every level band', (genre) => {
  const levels = shelves.filter((s) => s.genre === genre).map((s) => s.level);
  expect(levels.some((l) => l <= 2) && levels.some((l) => l === 3) && levels.some((l) => l >= 4)).toBe(true);
});
