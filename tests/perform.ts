import { FrameAnalyzer, WaitJudge } from '../src/audio';
import { PlayAlongSession } from '../src/engine';
import type { Song } from '../src/music';
import { phoneMic, pluck, roomNoise, silence, SR } from './synth';

/**
 * A clean performance of a song as a phone mic would hear it: every event on time after a 1-bar
 * count-in, chords strummed low to high, a string re-plucked cuts its previous note.
 */
export function perform(song: Song): Float32Array {
  const spb = 60 / song.tempo;
  const count = 4 * spb;
  const x = silence(count + song.length * spb + 1.5);
  const at = (beat: number) => count + beat * spb;
  const next = (i: number, string: number) => {
    const j = song.events.findIndex((e, k) => k > i && e.notes.some((n) => n.string === string));
    return j < 0 ? Infinity : at(song.events[j]!.beat);
  };
  song.events.forEach((e, i) => {
    const notes = [...e.notes].sort((a, b) => b.string - a.string);
    notes.forEach((n, k) => pluck(x, n.midi, at(e.beat) + k * 0.012, { gain: notes.length > 1 ? 0.12 : 0.25, end: next(i, n.string) }));
  });
  phoneMic(x);
  roomNoise(x);
  return x;
}

function frames(x: Float32Array, each: (f: NonNullable<ReturnType<FrameAnalyzer['push']>>, t: number) => void) {
  const a = new FrameAnalyzer(SR);
  for (let i = 0; i + 512 <= x.length; i += 512) {
    const f = a.push(x.subarray(i, i + 512));
    if (f) each(f, (i + 512) / SR);
  }
}

/** Play-along as the screen runs it (see useJudge): candidates → judge, attack time → beat. */
export function playAlong(song: Song, x: Float32Array): PlayAlongSession {
  const s = new PlayAlongSession(song);
  let cands: number[] = [];
  let now = 0;
  const judge = new WaitJudge(SR, (j) => {
    const index = j.kind === 'hit' ? cands[j.group] : undefined;
    if (j.kind === 'hit' && index !== undefined) s.hit(index, s.position - (now - j.time) / s.spb);
  });
  let last = 0;
  frames(x, (f, t) => {
    s.tick(t - last);
    last = t;
    now = t;
    cands = s.candidates();
    const key = cands.length ? -1 - (cands.reduce((h, k) => (h * 31 + k + 1) | 0, 7) & 0x3fffffff) : null;
    judge.setTargets(key, cands.map((k) => song.events[k]!.notes.map((n) => n.midi)));
    judge.push(f);
  });
  return s;
}
