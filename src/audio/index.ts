/**
 * audio — everything that touches the microphone.
 * startPitchSession: mic (AudioWorklet, echo/noise/gain processing off) → sliding 2048-sample
 * window → MPM pitch (pitchy) → PitchFrame {freq|null, clarity, db} ~90×/s; can record WAV samples.
 * FrameAnalyzer is pure (no Web Audio) and is what tests exercise. Planned: onset (M3), chroma (M4).
 */
export { startPitchSession, type PitchSession } from './session';
export { MicError, type MicInfo, type MicErrorKind } from './mic';
export { FrameAnalyzer, MedianSmoother, DEFAULT_ANALYZER, rms, type PitchFrame, type AnalyzerOptions } from './analyzer';
export { encodeWav, decodeWav } from './wav';
