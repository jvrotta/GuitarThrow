import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, WaitJudge } from '../src/audio';
import { PlayAlongSession, type TimedOutcome } from '../src/engine';
import type { Song } from '../src/music';
import { CHORDS, phoneMic, pluck, roomNoise, silence, SR, strum } from './synth';

const TEMPO = 80;
const SPB = 60 / TEMPO;
/** 8 quarter notes on open strings, then a G chord. */
const MIDIS = [40, 45, 50, 55, 59, 64, 59, 55];
const song: Song = {
  id: 't',
  title: 't',
  kind: 'exercise',
  level: 1,
  source: '',
  tempo: TEMPO,
  timeSig: [4, 4],
  tuning: [40, 45, 50, 55, 59, 64],
  bars: [0, 4, 8],
  length: 12,
  events: [
    ...MIDIS.map((midi, i) => ({ beat: i, dur: 1, notes: [{ string: 1, fret: 0, midi }] })),
    { beat: 8, dur: 4, notes: CHORDS.G!.map((midi) => ({ string: 1, fret: 0, midi })) },
  ],
};

/**
 * The Play-along path as the screen runs it (useJudge): candidates → WaitJudge.setTargets, attack time
 * → position in beats → PlayAlongSession.hit. Here audio time is the page clock (no latency).
 * `shift` moves each note (seconds), `skip` leaves notes out.
 */
function play(shift: (i: number) => number, skip: number[] = []) {
  const count = 4 * SPB;
  const x = silence(count + 12 * SPB + 1.5);
  song.events.forEach((e, i) => {
    if (skip.includes(i)) return;
    const t = count + e.beat * SPB + shift(i);
    if (e.notes.length > 1) strum(x, e.notes.map((n) => n.midi), t);
    else pluck(x, e.notes[0]!.midi, t);
  });
  phoneMic(x);
  roomNoise(x);
  const s = new PlayAlongSession(song);
  const out: TimedOutcome[] = [];
  let cands: number[] = [];
  let now = 0;
  const judge = new WaitJudge(SR, (j) => {
    if (j.kind !== 'hit') return;
    const index = cands[j.group];
    if (index === undefined) return;
    out.push(s.hit(index, s.position - (now - j.time) / s.spb));
  });
  const a = new FrameAnalyzer(SR);
  for (let i = 0; i + 512 <= x.length; i += 512) {
    const f = a.push(x.subarray(i, i + 512));
    now = (i + 512) / SR;
    s.tick(512 / SR);
    if (!f) continue;
    cands = s.candidates();
    judge.setTargets(cands.length ? -1 - cands.reduce((h, k) => (h * 31 + k + 1) | 0, 7) : null, cands.map((k) => song.events[k]!.notes.map((n) => n.midi)));
    judge.push(f);
  }
  return { s, out };
}

describe('Play-along with the audio judge', () => {
  it('notes on the beat are all hits, measured within a few ms', () => {
    const { s, out } = play(() => 0);
    expect(s.status.every((x) => x === 'hit')).toBe(true);
    const offs = out.map((o) => (o.kind === 'ignored' ? NaN : o.offsetMs));
    expect(Math.max(...offs.map(Math.abs))).toBeLessThan(40);
    expect(s.finished).toBe(true);
  });

  it('early / late by 120 ms is Bom, by 250 ms is off, a skipped note is a miss', () => {
    const shift = (i: number) => (i === 1 ? -0.12 : i === 3 ? 0.12 : i === 5 ? 0.25 : 0);
    const { s, out } = play(shift, [6]);
    expect(s.timing[1]).toBe('good');
    expect(s.timing[3]).toBe('good');
    expect(out.find((o) => o.kind === 'off')).toMatchObject({ index: 5 });
    expect(s.status[5]).toBe('miss');
    expect(s.status[6]).toBe('miss');
    expect(s.status[8]).toBe('hit');
  });
});
