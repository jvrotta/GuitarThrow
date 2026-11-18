/**
 * engine — practice logic, independent of UI.
 * Transport: musical clock in beats (play/pause/seek/speed, injectable time source).
 * PracticeSession (practice.ts): Wait mode — 1-bar count-in, clock holds on the target until it is played
 * right (no note skipped), per-event hit/miss, combo, first-try accuracy, stars, seek/restart.
 * Planned: chord matching by chroma (M4), Play-along timing windows (M5).
 */
export { Transport } from './transport';
export { PracticeSession, starsFor, matches, type EventStatus, type PlayOutcome } from './practice';
