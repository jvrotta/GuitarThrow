import { scoreToSong } from './alphatab.ts';
import type { Song } from './song';
import { parseTextTab } from './texttab.ts';

/** File types the import screen accepts. */
export const IMPORT_ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxl,.xml,.txt';

const stem = (name: string) => name.replace(/\.[^.]+$/, '');
const newId = () => `imp-${Date.now().toString(36)}`;

/**
 * A user's file → Song. Text tab is parsed here; Guitar Pro / MusicXML go through alphaTab, loaded only
 * now (≈1 MB, kept out of the app start). Throws with a message in pt-BR.
 */
export async function importFile(file: File): Promise<Song> {
  if (/\.txt$/i.test(file.name)) return parseTextTab(await file.text(), { id: newId(), title: stem(file.name) });
  const alphaTab = await import('@coderline/alphatab');
  alphaTab.Logger.logLevel = alphaTab.LogLevel.None;
  let score;
  try {
    score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('Não consegui ler este arquivo. Aceito Guitar Pro (.gp, .gp3–5, .gpx), MusicXML e tab em texto (.txt).');
  }
  const song = scoreToSong(score as never, { id: newId(), kind: 'imported', level: 1, source: `Importada (${file.name})` });
  if (!song.title) song.title = stem(file.name);
  if (song.events.length === 0) throw new Error('O arquivo não tem notas de violão.');
  return song;
}

/** Pasted text tab → Song. */
export function importText(text: string, title: string): Song {
  return parseTextTab(text, { id: newId(), title: title.trim() || 'Tab importada' });
}
