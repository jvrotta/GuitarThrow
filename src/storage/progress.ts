import { del, get, keys, set } from './kv';

export type PracticeMode = 'wait' | 'play';

/** Best result of a song in one mode. */
export interface Best {
  accuracy: number;
  stars: number;
  /** Speed of that best run (0.5..1). */
  speed: number;
  plays: number;
  /** Date.now() of the last run. */
  at: number;
}

export type SongProgress = Partial<Record<PracticeMode, Best>>;

export interface LastPlayed {
  id: string;
  title: string;
  mode: PracticeMode;
  at: number;
}

export interface RunResult {
  id: string;
  title: string;
  mode: PracticeMode;
  accuracy: number;
  stars: number;
  speed: number;
}

/** A run counts as better with more stars, then a higher speed, then a higher accuracy. */
const better = (r: RunResult, b: Best) =>
  r.stars !== b.stars ? r.stars > b.stars : r.speed !== b.speed ? r.speed > b.speed : r.accuracy > b.accuracy;

export async function recordRun(r: RunResult): Promise<{ best: Best; improved: boolean }> {
  const p = (await get<SongProgress>(`progress:${r.id}`)) ?? {};
  const old = p[r.mode];
  const at = Date.now();
  const improved = !old || better(r, old);
  const best: Best = improved
    ? { accuracy: r.accuracy, stars: r.stars, speed: r.speed, plays: (old?.plays ?? 0) + 1, at }
    : { ...old, plays: old.plays + 1, at };
  await set(`progress:${r.id}`, { ...p, [r.mode]: best });
  await set('last', { id: r.id, title: r.title, mode: r.mode, at } satisfies LastPlayed);
  return { best, improved };
}

/** Marks a song as the one to continue (called when it opens). */
export async function touchSong(id: string, title: string, mode: PracticeMode): Promise<void> {
  await set('last', { id, title, mode, at: Date.now() } satisfies LastPlayed);
}

export async function lastPlayed(): Promise<LastPlayed | undefined> {
  return get<LastPlayed>('last');
}

/** Progress of every song played so far, by id. */
export async function allProgress(): Promise<Record<string, SongProgress>> {
  const out: Record<string, SongProgress> = {};
  for (const k of await keys('progress:')) out[k.slice('progress:'.length)] = (await get<SongProgress>(k)) ?? {};
  return out;
}

export async function clearProgress(): Promise<void> {
  for (const k of await keys('progress:')) await del(k);
  await del('last');
}
