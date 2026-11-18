import { get, set } from './kv';

export interface Settings {
  /** Measured by the calibration screen: how late the app hears a note played together with a click (ms). */
  latencyMs: number;
  /** Was latencyMs measured (vs. the default)? */
  calibrated: boolean;
  /** Keep clicking after the count-in in Play-along. */
  metronome: boolean;
  /** 0..1 */
  clickVolume: number;
  /** Count-in length before the song (and each loop pass). */
  countInBars: 1 | 2;
}

export const DEFAULT_SETTINGS: Settings = { latencyMs: 0, calibrated: false, metronome: true, clickVolume: 0.6, countInBars: 1 };

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await get<Partial<Settings>>('settings')) ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await set('settings', s);
}
