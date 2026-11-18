import { describe, expect, it } from 'vitest';
import { allProgress, clearProgress, DEFAULT_SETTINGS, lastPlayed, loadSettings, recordRun, saveSettings } from '../src/storage';

describe('storage (memory fallback)', () => {
  it('settings round-trip over defaults', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, latencyMs: 120, calibrated: true });
    expect((await loadSettings()).latencyMs).toBe(120);
  });

  it('keeps the best run per mode and the last song', async () => {
    const run = { id: 'a', title: 'A', mode: 'wait' as const };
    expect((await recordRun({ ...run, accuracy: 0.7, stars: 1, speed: 1 })).improved).toBe(true);
    expect((await recordRun({ ...run, accuracy: 0.9, stars: 2, speed: 0.5 })).improved).toBe(true);
    const r = await recordRun({ ...run, accuracy: 0.85, stars: 2, speed: 0.5 });
    expect(r.improved).toBe(false);
    expect(r.best).toMatchObject({ accuracy: 0.9, stars: 2, plays: 3 });
    await recordRun({ id: 'b', title: 'B', mode: 'play', accuracy: 1, stars: 3, speed: 1 });
    expect(Object.keys(await allProgress()).sort()).toEqual(['a', 'b']);
    expect((await lastPlayed())?.id).toBe('b');
    await clearProgress();
    expect(await allProgress()).toEqual({});
  });
});
