/**
 * storage — on-device persistence (IndexedDB via kv.ts, memory fallback). No accounts, no server.
 * settings.ts: latency calibration, metronome, count-in. progress.ts: best result per song and mode,
 * last played song. songs.ts: imported songs.
 */
export { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './settings';
export {
  recordRun,
  touchSong,
  lastPlayed,
  allProgress,
  clearProgress,
  type Best,
  type SongProgress,
  type LastPlayed,
  type RunResult,
  type PracticeMode,
} from './progress';
export { saveImported, loadImported, listImported, deleteImported } from './songs';
