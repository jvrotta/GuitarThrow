/**
 * audio — everything that touches the microphone.
 * startPitchSession: mic (AudioWorklet, echo/noise/gain processing off) → sliding 2048-sample
 * window → MPM pitch (pitchy) → PitchFrame {freq|null, clarity, db} ~90×/s; can record WAV samples.
 * FrameAnalyzer is pure (no Web Audio) and is what tests exercise. NoteDetector (onset.ts): frames → NotePlayed,
 * one per attack (repeated notes need a new attack) or per clear legato pitch change.
 * WaitJudge (judge.ts): knows the expected note(s) → hit / wrong / heard; checks the target's partials
 * (target.ts, Goertzel) so it still works while earlier strings ring. Planned: chroma for chords (M4).
 */
export { startPitchSession, type PitchSession } from './session';
export { MicError, type MicInfo, type MicErrorKind } from './mic';
export { FrameAnalyzer, MedianSmoother, DEFAULT_ANALYZER, rms, type PitchFrame, type AnalyzerOptions } from './analyzer';
export { encodeWav, decodeWav } from './wav';
export { NoteDetector, DEFAULT_ONSET, type NotePlayed, type OnsetOptions } from './onset';
export { WaitJudge, DEFAULT_JUDGE, type Judgement, type JudgeOptions } from './judge';
export { noteSalience, type Salience } from './target';
