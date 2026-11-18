import { DEFAULT_ANALYZER, FrameAnalyzer, type AnalyzerOptions, type PitchFrame } from './analyzer';
import { openMic, type MicInfo, type MicSession } from './mic';
import { encodeWav } from './wav';

export interface PitchSession {
  readonly info: MicInfo;
  /** The mic's AudioContext: the metronome plays on the same clock. */
  readonly ctx: AudioContext;
  /** Records the next `seconds` of raw mic audio and resolves with a WAV file. */
  record(seconds: number): Promise<Uint8Array<ArrayBuffer>>;
  stop(): Promise<void>;
}

/** Hop between analyses, in samples (~10.7 ms at 48 kHz). */
const HOP = 512;

/** Mic → sliding-window pitch analysis → onFrame (~90 frames/s). Call from a user gesture. */
export async function startPitchSession(
  onFrame: (f: PitchFrame) => void,
  opts: AnalyzerOptions = DEFAULT_ANALYZER,
): Promise<PitchSession> {
  let analyzer: FrameAnalyzer | null = null;
  let rec: { chunks: Float32Array[]; left: number; done: (wav: Uint8Array<ArrayBuffer>) => void } | null = null;
  let mic: MicSession | null = null;

  mic = await openMic((chunk) => {
    if (!analyzer) return;
    if (rec) {
      rec.chunks.push(chunk.slice());
      rec.left -= chunk.length;
      if (rec.left <= 0) {
        const all = new Float32Array(rec.chunks.reduce((n, c) => n + c.length, 0));
        let o = 0;
        for (const c of rec.chunks) {
          all.set(c, o);
          o += c.length;
        }
        rec.done(encodeWav(all, analyzer.sampleRate));
        rec = null;
      }
    }
    const f = analyzer.push(chunk);
    if (f) onFrame(f);
  }, HOP);
  analyzer = new FrameAnalyzer(mic.ctx.sampleRate, opts);

  return {
    info: mic.info,
    ctx: mic.ctx,
    record(seconds) {
      if (rec) return Promise.reject(new Error('Já está gravando.'));
      return new Promise((done) => {
        rec = { chunks: [], left: Math.round(seconds * analyzer!.sampleRate), done };
      });
    },
    stop: () => mic!.stop(),
  };
}
