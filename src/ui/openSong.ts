import { loadSong, type Song } from '../music';
import { loadImported } from '../storage';

/** A built-in song (content/build) or one the user imported (ids `imp-…`, kept in IndexedDB). */
export async function openSong(id: string): Promise<Song> {
  if (!id.startsWith('imp-')) return loadSong(id);
  const s = await loadImported(id);
  if (!s) throw new Error('Esta música importada não está mais no aparelho.');
  return s;
}
