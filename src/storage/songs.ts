import type { Song } from '../music';
import { del, get, keys, set } from './kv';

/** Songs the user imported (Guitar Pro / MusicXML / text tab). They live only on this device. */
export async function saveImported(song: Song): Promise<void> {
  await set(`song:${song.id}`, song);
}

export async function loadImported(id: string): Promise<Song | undefined> {
  return get<Song>(`song:${id}`);
}

export async function listImported(): Promise<Song[]> {
  const out: Song[] = [];
  for (const k of await keys('song:')) {
    const s = await get<Song>(k);
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
}

export async function deleteImported(id: string): Promise<void> {
  await del(`song:${id}`);
  await del(`progress:${id}`);
}
