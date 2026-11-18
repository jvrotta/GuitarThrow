import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, MedianSmoother, decodeWav, encodeWav } from '../src/audio';
import { midiToFreq, nearestString, midiToSolfege } from '../src/music';

const SR = 48000;

/** Plucked-string-like tone: harmonics with the 2nd louder than the fundamental, decaying. */
function pluck(freq: number, seconds: number, amp = 0.3): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  const harmonics = [0.6, 1, 0.5, 0.3, 0.2];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    harmonics.forEach((a, h) => (s += a * Math.sin(2 * Math.PI * freq * (h + 1) * t)));
    out[i] = amp * Math.exp(-t * 1.5) * (s / 2.6);
  }
  return out;
}

function noise(seconds: number, amp: number): Float32Array {
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  return Float32Array.from({ length: Math.round(seconds * SR) }, () => amp * rnd());
}

/** Feeds a signal in 512-sample hops and returns the frames. */
function analyze(signal: Float32Array) {
  const a = new FrameAnalyzer(SR);
  const frames = [];
  for (let i = 0; i + 512 <= signal.length; i += 512) {
    const f = a.push(signal.subarray(i, i + 512));
    if (f) frames.push(f);
  }
  return frames;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

describe('FrameAnalyzer', () => {
  // All six open strings plus a high fretted note (string 1, fret 12).
  it.each([40, 45, 50, 55, 59, 64, 76])('detects MIDI %i within 5 cents', (midi) => {
    const target = midiToFreq(midi);
    const frames = analyze(pluck(target, 1));
    const voiced = frames.filter((f) => f.freq !== null).map((f) => f.freq!);
    expect(voiced.length).toBeGreaterThan(frames.length * 0.8);
    const cents = 1200 * Math.log2(median(voiced) / target);
    expect(Math.abs(cents)).toBeLessThan(5);
  });

  it('rejects silence and low noise', () => {
    expect(analyze(new Float32Array(SR)).every((f) => f.freq === null)).toBe(true);
    expect(analyze(noise(1, 0.001)).every((f) => f.freq === null)).toBe(true);
  });

  it('rejects loud white noise as unpitched', () => {
    const frames = analyze(noise(1, 0.3));
    expect(frames.filter((f) => f.freq !== null).length).toBeLessThan(frames.length * 0.05);
  });
});

describe('MedianSmoother', () => {
  it('ignores a single outlier and resets on silence', () => {
    const m = new MedianSmoother(5);
    [110, 110, 220, 110].forEach((v) => m.push(v));
    expect(m.push(110)).toBe(110);
    expect(m.push(null)).toBeNull();
    expect(m.push(82)).toBe(82);
  });
});

describe('WAV', () => {
  it('round-trips samples', () => {
    const src = pluck(110, 0.1);
    const { samples, sampleRate } = decodeWav(encodeWav(src, SR));
    expect(sampleRate).toBe(SR);
    expect(samples.length).toBe(src.length);
    samples.forEach((s, i) => expect(Math.abs(s - src[i]!)).toBeLessThan(1e-4));
  });
});

describe('tuner helpers', () => {
  it('finds the nearest open string and solfege name', () => {
    expect(nearestString(40.3)).toBe(6);
    expect(nearestString(58)).toBe(2);
    expect(nearestString(64)).toBe(1);
    expect(midiToSolfege(45)).toBe('Lá');
  });
});
