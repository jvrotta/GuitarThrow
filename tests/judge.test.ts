import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, WaitJudge, type Judgement } from '../src/audio';
import { midiToFreq } from '../src/music';

const SR = 48000;
let seed = 3;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

/** Plucks that keep ringing under the next ones (open strings), each with a short click. */
function ringing(list: [number, number][], seconds: number, decay = 2.5): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (const [midi, start] of list) {
    const f = midiToFreq(midi);
    for (let i = Math.round(start * SR); i < out.length; i++) {
      const t = i / SR - start;
      const s = 0.6 * Math.sin(2 * Math.PI * f * t) + Math.sin(4 * Math.PI * f * t) + 0.4 * Math.sin(6 * Math.PI * f * t);
      out[i]! += 0.1 * Math.exp(-t * decay) * s + (t < 0.004 ? 0.03 * noise() * (1 - t / 0.004) : 0);
    }
  }
  return out;
}

/** Runs a wait-mode session over `targets`; returns judgements and how many targets were hit. */
function run(signal: Float32Array, targets: number[]) {
  const out: Judgement[] = [];
  let k = 0;
  const judge = new WaitJudge(SR, (j) => {
    out.push(j);
    if (j.kind === 'hit') k++;
  });
  const a = new FrameAnalyzer(SR);
  for (let i = 0; i + 512 <= signal.length; i += 512) {
    const f = a.push(signal.subarray(i, i + 512));
    if (!f) continue;
    judge.setTarget(k < targets.length ? k : null, k < targets.length ? [targets[k]!] : []);
    judge.push(f);
  }
  return { hits: k, wrong: out.filter((j) => j.kind === 'wrong').map((j) => (j as { midi: number }).midi) };
}

describe('WaitJudge', () => {
  it.each([2.5, 0.8])('hits every open string while the previous ones keep ringing (decay %s)', (decay) => {
    const seq = [40, 45, 50, 55, 59, 64];
    const r = run(ringing(seq.map((m, i) => [m, 0.1 + i * 0.45]), 3.4, decay), seq);
    expect(r).toEqual({ hits: 6, wrong: [] });
  });

  it('a wrong note is reported and does not advance', () => {
    const r = run(ringing([[43, 0.1]], 1.2), [40]);
    expect(r.hits).toBe(0);
    expect(r.wrong).toEqual([43]);
  });

  it('a semitone off on the low E string is not accepted', () => {
    expect(run(ringing([[41, 0.1]], 1.2), [40]).hits).toBe(0);
  });

  it('one pluck never satisfies two equal targets; two plucks do', () => {
    expect(run(ringing([[64, 0.1]], 1.5), [64, 64]).hits).toBe(1);
    expect(run(ringing([[64, 0.1], [64, 0.35]], 1.5), [64, 64]).hits).toBe(2);
  });

  it('strings ringing together without a new attack never count as wrong', () => {
    const r = run(ringing([[40, 0.1], [45, 0.6]], 3, 0.8), [40, 45, 50]);
    expect(r).toEqual({ hits: 2, wrong: [] });
  });

  it('silence and noise never hit', () => {
    const sig = new Float32Array(SR);
    for (let i = 0; i < sig.length; i++) sig[i] = 0.003 * noise();
    expect(run(sig, [40]).hits).toBe(0);
  });
});
