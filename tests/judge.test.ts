import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, WaitJudge, type Judgement } from '../src/audio';
import { midiToFreq } from '../src/music';
import { clap, knock, phoneMic, pluck, roomNoise, silence, speech, SR } from './synth';

/** Runs a wait-mode session over `targets` (one note each); hits advance to the next target. */
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

/** Phone recording: plucks [midi, start, options?] + room noise + mic high-pass. */
function take(seconds: number, notes: [number, number, Parameters<typeof pluck>[3]?][], extra?: (x: Float32Array) => void) {
  const x = silence(seconds);
  for (const [m, t, o] of notes) pluck(x, m, t, o);
  extra?.(x);
  roomNoise(x);
  return phoneMic(x);
}

describe('WaitJudge — realistic takes', () => {
  it('open strings ringing into each other', () => {
    const seq = [40, 45, 50, 55, 59, 64];
    expect(run(take(4, seq.map((m, i) => [m, 0.3 + i * 0.55])), seq)).toEqual({ hits: 6, wrong: [] });
  });

  it('chromatic run on one string (each note mutes the previous one)', () => {
    const seq = [64, 65, 66, 67, 69, 71, 72];
    const notes = seq.map((m, i): [number, number, { end: number }] => [m, 0.3 + i * 0.3, { end: 0.3 + (i + 1) * 0.3 }]);
    expect(run(take(3, notes), seq)).toEqual({ hits: 7, wrong: [] });
  });

  it('quiet playing', () => {
    const seq = [52, 55, 57];
    expect(run(take(3, seq.map((m, i) => [m, 0.3 + i * 0.7, { gain: 0.04 }])), seq)).toEqual({ hits: 3, wrong: [] });
  });

  it('strings still ringing never count as wrong without a new attack', () => {
    const r = run(take(3, [[40, 0.3, { t60: 8 }], [45, 1, { t60: 8 }]]), [40, 45, 50]);
    expect(r).toEqual({ hits: 2, wrong: [] });
  });

  it.each([0.1, 0.9])('works for dark and bright plucks (bright %s)', (bright) => {
    expect(run(take(1.2, [[40, 0.3, { bright }]]), [40])).toEqual({ hits: 1, wrong: [] });
    expect(run(take(1.2, [[41, 0.3, { bright }]]), [40])).toEqual({ hits: 0, wrong: [41] });
  });

  it('accepts a string up to ~20 cents out of tune, not 35', () => {
    expect(run(take(1.2, [[40, 0.3, { cents: -20 }]]), [40]).hits).toBe(1);
    expect(run(take(1.2, [[40, 0.3, { cents: 20 }]]), [40]).hits).toBe(1);
    expect(run(take(1.2, [[40, 0.3, { cents: -35 }]]), [40]).hits).toBe(0);
  });

  it('repeated notes need repeated plucks', () => {
    expect(run(take(1.6, [[57, 0.3]]), [57, 57]).hits).toBe(1);
    expect(run(take(1.6, [[57, 0.3, { end: 0.6 }], [57, 0.6]]), [57, 57]).hits).toBe(2);
  });

  it.each([
    [40, 45, 'quarta'],
    [40, 47, 'quinta'],
    [40, 52, 'oitava acima'],
    [52, 40, 'oitava abaixo'],
    [64, 76, 'oitava acima (agudo)'],
    [59, 64, 'quarta (agudo)'],
    [40, 41, 'semitom'],
    [57, 56, 'semitom (agudo)'],
  ])('target %i, played %i (%s): no hit, reports the played note', (target, played) => {
    const r = run(take(1.5, [[played, 0.3]]), [target]);
    expect(r).toEqual({ hits: 0, wrong: [played] });
  });

  it.each([
    ['palmas', (x: Float32Array) => [0.3, 0.7, 1.1, 1.5].forEach((t) => clap(x, t))],
    ['batidas', (x: Float32Array) => [0.3, 0.8, 1.3].forEach((t, i) => knock(x, t, 0.3, 120 + i * 60))],
  ])('%s never hit nor count as wrong', (_name, noise) => {
    for (const target of [40, 47, 52, 64]) expect(run(take(2.4, [], noise), [target])).toEqual({ hits: 0, wrong: [] });
  });

  it('talking nearby is rarely taken for a note, and never for one outside the voice range', () => {
    const bad: string[] = [];
    for (const f0 of [100, 130, 160, 220]) {
      for (const target of [40, 47, 52, 64]) {
        const r = run(take(2.4, [], (x) => speech(x, 0.2, 2, 0.08, f0)), [target]);
        // A voice that pauses on the target pitch is singing it: only notes it never reaches must not hit.
        const reaches = midiToFreq(target) > f0 * 0.72 && midiToFreq(target) < f0 * 1.28;
        if ((r.hits && !reaches) || r.wrong.length > 3) bad.push(`voz ${f0} Hz, alvo ${target}: ${JSON.stringify(r)}`); // 2 s of speech
      }
    }
    expect(bad).toEqual([]);
  });

  it('costs well under a frame of real time', () => {
    const x = take(3, [[40, 0.3], [45, 1], [50, 1.7]]);
    const t0 = performance.now();
    run(x, [40, 45, 50]);
    const perFrame = (performance.now() - t0) / (x.length / 512);
    expect(perFrame).toBeLessThan(4); // a hop is 10.7 ms; the phone is slower than this machine
  });

  it('a clap while the note rings does not satisfy the next equal note', () => {
    const r = run(take(2, [[45, 0.3]], (x) => clap(x, 1)), [45, 45]);
    expect(r.hits).toBe(1);
  });
});
