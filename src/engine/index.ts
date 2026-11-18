/**
 * engine — practice logic, independent of UI. Pure: time is pushed in with tick(dt).
 * Transport: musical clock in beats (play/pause/seek/speed, injectable time source).
 * session.ts: Session base — per-event status, combo, accuracy, count-in, seek/restart, A–B loop; starsFor.
 * practice.ts: WaitSession — clock holds on the target until the judge says hit (no note skipped); wrong never advances.
 * playalong.ts: PlayAlongSession — clock runs; hits within ±80 ms (Perfeito) / ±160 ms (Bom) of the attack, else miss.
 */
export { Transport } from './transport';
export { Session, starsFor, type EventStatus, type Mode, type Loop } from './session';
export { WaitSession, type PlayOutcome } from './practice';
export { PlayAlongSession, WINDOW, DECISION, type Timing, type TimedOutcome } from './playalong';
