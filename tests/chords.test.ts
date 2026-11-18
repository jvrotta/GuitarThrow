import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, WaitJudge, type Judgement } from '../src/audio';
import { CHORDS, clap, phoneMic, pluck, roomNoise, silence, SR, strum } from './synth';

/** Wait mode over chord targets; returns hits and the wrong reports. */
function run(signal: Float32Array, targets: number[][]) {
  const wrong: { midi: number; missing?: number[] }[] = [];
  let k = 0;
  const judge = new WaitJudge(SR, (j: Judgement) => {
    if (j.kind === 'hit') k++;
    if (j.kind === 'wrong') wrong.push({ midi: j.midi, ...(j.missing ? { missing: j.missing } : {}) });
  });
  const a = new FrameAnalyzer(SR);
  for (let i = 0; i + 512 <= signal.length; i += 512) {
    const f = a.push(signal.subarray(i, i + 512));
    if (!f) continue;
    judge.setTarget(k < targets.length ? k : null, targets[k] ?? []);
    judge.push(f);
  }
  return { hits: k, wrong };
}

const take = (seconds: number, fn: (x: Float32Array) => void) => {
  const x = silence(seconds);
  fn(x);
  roomNoise(x);
  return phoneMic(x);
};

describe('WaitJudge — chords', () => {
  it.each(Object.keys(CHORDS))('a strummed %s is accepted', (name) => {
    const c = CHORDS[name]!;
    expect(run(take(1.5, (x) => strum(x, c, 0.3)), [c]).hits).toBe(1);
  });

  it.each([
    ['Am', 'Em'],
    ['C', 'Am'],
    ['G', 'C'],
    ['D', 'G'],
    ['Em', 'D'],
  ])('%s does not pass for %s', (played, target) => {
    expect(run(take(1.5, (x) => strum(x, CHORDS[played]!, 0.3)), [CHORDS[target]!]).hits).toBe(0);
  });

  it('a chord with a missing note is not accepted and says which', () => {
    const r = run(take(1.5, (x) => strum(x, [50, 57, 62], 0.3)), [CHORDS.D!]); // D without F#
    expect(r.hits).toBe(0);
    expect(r.wrong[0]?.missing).toEqual([66]);
    const am = run(take(1.5, (x) => strum(x, [45, 52, 57, 64], 0.3)), [CHORDS.Am!]); // Am without C
    expect(am.hits).toBe(0);
    expect(am.wrong[0]?.missing).toContain(60);
  });

  it('a single note of the chord is not the chord', () => {
    expect(run(take(1.5, (x) => pluck(x, 40, 0.3)), [CHORDS.Em!]).hits).toBe(0);
  });

  it('chord changes with the previous chord still ringing', () => {
    const seq = ['Em', 'Am', 'D', 'G', 'C'].map((n) => CHORDS[n]!);
    const r = run(take(5, (x) => seq.forEach((c, i) => strum(x, c, 0.3 + i * 0.9, { t60: 6 }))), seq);
    expect(r).toEqual({ hits: 5, wrong: [] });
  });

  it('claps are not a chord', () => {
    expect(run(take(2, (x) => [0.3, 0.9, 1.5].forEach((t) => clap(x, t))), [CHORDS.G!])).toEqual({ hits: 0, wrong: [] });
  });
});
