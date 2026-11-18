/**
 * audio — everything that touches the microphone.
 * startPitchSession: mic (AudioWorklet, echo/noise/gain processing off) → sliding 2048-sample
 * window → MPM pitch (pitchy) → PitchFrame {freq|null, clarity, db} ~90×/s; can record WAV samples.
 * FrameAnalyzer is pure (no Web Audio) and is what tests exercise. NoteDetector (onset.ts): frames → NotePlayed,
 * one per attack (repeated notes need a new attack) or per clear legato pitch change.
 * WaitJudge (judge.ts): knows the expected note(s) → hit / wrong / heard from the spectrum of the sound that is
 * new since each attack (fft.ts + harmonic.ts: prominent aligned partials, steady pitch), so ringing strings,
 * claps, knocks and speech do not count. Chords (chord.ts): every chord note must show partials of its own.
 * setTargets() takes several candidate events at once (Play-along).
 */
export { startPitchSession, type PitchSession } from './session';
export { MicError, type MicInfo, type MicErrorKind } from './mic';
export { FrameAnalyzer, MedianSmoother, DEFAULT_ANALYZER, rms, type PitchFrame, type AnalyzerOptions } from './analyzer';
export { encodeWav, decodeWav } from './wav';
export { NoteDetector, DEFAULT_ONSET, type NotePlayed, type OnsetOptions } from './onset';
export { WaitJudge, DEFAULT_JUDGE, JUDGE_ONSET, type Judgement, type JudgeOptions, type TargetGroups } from './judge';
export { ChordTracker, type ChordAttempt } from './chord';
export { PowerSpectrum } from './fft';
export { HarmonicScorer, type NoteEvidence, type ScoreOptions } from './harmonic';
