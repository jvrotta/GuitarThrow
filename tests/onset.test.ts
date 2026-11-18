import { describe, expect, it } from 'vitest';
import { FrameAnalyzer, NoteDetector, type NotePlayed, type PitchFrame } from '../src/audio';
import { assignFingers } from '../src/music/fingering';
import { midiToFreq } from '../src/music';

const SR = 48000;

/**
 * Plucks: [midi, startSeconds]. Harmonics (2nd stronger than the fundamental) with a slow decay, plus
 * a 4 ms noise click like a pick/fingernail — modest (−12 dB below the tone) so the test stays honest.
 */
function plucks(list: [number, number][], seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const [midi, start] of list) {
    const f = midiToFreq(midi);
    for (let i = Math.round(start * SR); i < out.length; i++) {
      const t = i / SR - start;
      const s = 0.6 * Math.sin(2 * Math.PI * f * t) + Math.sin(4 * Math.PI * f * t) + 0.4 * Math.sin(6 * Math.PI * f * t);
      const click = t < 0.004 ? 0.03 * noise() * (1 - t / 0.004) : 0;
      out[i] = 0.12 * Math.exp(-t * 2.5) * s + click; // overwrites: re-plucking cuts the previous note
    }
  }
  return out;
}

function detect(signal: Float32Array): NotePlayed[] {
  const notes: NotePlayed[] = [];
  const det = new NoteDetector((n) => notes.push(n));
  const a = new FrameAnalyzer(SR);
  for (let i = 0; i + 512 <= signal.length; i += 512) {
    const f = a.push(signal.subarray(i, i + 512));
    if (f) det.push(f);
  }
  return notes;
}

describe('NoteDetector (synthetic audio)', () => {
  it('emits one note per pluck, including repeated equal notes', () => {
    const notes = detect(plucks([[64, 0.1], [64, 0.7], [64, 1.3], [65, 1.9]], 2.5));
    expect(notes.map((n) => n.midi)).toEqual([64, 64, 64, 65]);
    [0.1, 0.7, 1.3, 1.9].forEach((t, i) => expect(Math.abs(notes[i]!.time - t)).toBeLessThan(0.08));
  });

  it.each([0.2, 0.3])('catches fast repeated notes (%s s apart)', (gap) => {
    const starts = [0, 1, 2, 3, 4].map((k) => 0.1 + k * gap);
    expect(detect(plucks(starts.map((s) => [64, s]), 2)).length).toBe(5);
  });

  it('does not re-emit a single ringing note', () => {
    expect(detect(plucks([[45, 0.1]], 2)).map((n) => n.midi)).toEqual([45]);
  });

  it('ignores background noise while a note rings', () => {
    const sig = plucks([[52, 0.1]], 2);
    let seed = 7;
    for (let i = 0; i < sig.length; i++) sig[i]! += 0.004 * (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
    expect(detect(sig).map((n) => n.midi)).toEqual([52]);
  });

  it('detects the low E string', () => {
    expect(detect(plucks([[40, 0.1], [40, 0.8]], 1.6)).map((n) => n.midi)).toEqual([40, 40]);
  });
});

describe('NoteDetector (frames)', () => {
  const frame = (time: number, freq: number | null, db: number): PitchFrame => ({ time, freq, db, hopDb: db, hfDb: db - 20, clarity: 1, rawFreq: freq ?? 0, rms: 0, samples: new Float32Array(0) });

  it('emits a legato pitch change without a new attack', () => {
    const notes: NotePlayed[] = [];
    const det = new NoteDetector((n) => notes.push(n));
    let t = 0;
    for (let i = 0; i < 10; i++) det.push(frame((t += 0.01), null, -80));
    for (let i = 0; i < 20; i++) det.push(frame((t += 0.01), midiToFreq(60), -20));
    for (let i = 0; i < 20; i++) det.push(frame((t += 0.01), midiToFreq(62), -21));
    expect(notes.map((n) => n.midi)).toEqual([60, 62]);
  });
});

describe('assignFingers', () => {
  it('uses finger = fret in first position and shifts for higher positions', () => {
    const ev = (beat: number, fret: number) => ({ beat, dur: 1, notes: [{ string: 1, fret, midi: 64 + fret }] as { string: number; fret: number; midi: number; finger?: number }[] });
    const events = [ev(0, 0), ev(1, 1), ev(2, 3), ev(4, 5), ev(5, 7), ev(6, 8)];
    assignFingers(events, [0, 4]);
    expect(events.map((e) => e.notes[0]!.finger)).toEqual([0, 1, 3, 1, 3, 4]);
  });
});
