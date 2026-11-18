import { assignFingers } from './fingering.ts';
import { STANDARD_TUNING } from './notes.ts';
import type { NoteRef, Song, SongEvent } from './song';

/** A tab line: optional string name, then mostly dashes, digits and bar lines. */
const LINE = /^\s*([A-Ga-g][#b]?)?\s*[|:]?([-0-9|hpbr/\\~x().:<>^*]+)\s*$/;

/**
 * Plain-text ("ASCII") tab → Song. Blocks of 6 lines, high e first (as written on the web); digits in
 * the same column sound together. ASCII tab has no rhythm: each column with notes is an eighth note,
 * stretched to a quarter or half when the gap after it is clearly wider than usual.
 */
export function parseTextTab(text: string, meta: { id: string; title: string; tempo?: number }): Song {
  const lines = text.split(/\r?\n/);
  const blocks: string[][] = [];
  let run: string[] = [];
  for (const line of [...lines, '']) {
    const m = LINE.exec(line);
    if (m && (m[2]!.match(/-/g)?.length ?? 0) >= 4) {
      run.push(m[2]!);
      continue;
    }
    if (run.length >= 6) for (let i = 0; i + 6 <= run.length; i += 6) blocks.push(run.slice(i, i + 6));
    run = [];
  }
  if (blocks.length === 0) throw new Error('Não encontrei uma tab: são precisas 6 linhas seguidas, como "e|--0--3--|".');

  // Columns with notes, in order: [{ notes, width }]; width = characters until the next column with notes.
  const cols: { notes: NoteRef[]; at: number }[] = [];
  let offset = 0;
  for (const block of blocks) {
    const width = Math.max(...block.map((l) => l.length));
    for (let c = 0; c < width; c++) {
      const notes: NoteRef[] = [];
      block.forEach((l, i) => {
        if (!/\d/.test(l[c] ?? '') || /\d/.test(l[c - 1] ?? '')) return; // a 2-digit fret starts once
        const fret = Number(/^\d{1,2}/.exec(l.slice(c))![0]);
        const string = i + 1;
        notes.push({ string, fret, midi: STANDARD_TUNING[6 - string]! + fret });
      });
      if (notes.length) cols.push({ notes, at: offset + c });
    }
    offset += width + 4;
  }
  if (cols.length === 0) throw new Error('A tab não tem notas.');

  const gaps = cols.slice(1).map((c, i) => c.at - cols[i]!.at);
  const usual = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 2;
  const events: SongEvent[] = [];
  let beat = 0;
  cols.forEach((c, i) => {
    const gap = gaps[i] ?? usual;
    const dur = gap >= usual * 3.5 ? 2 : gap >= usual * 1.8 ? 1 : 0.5;
    events.push({ beat, dur, notes: c.notes.sort((a, b) => a.string - b.string) });
    beat += dur;
  });
  const length = Math.ceil(beat / 4) * 4;
  const bars = Array.from({ length: length / 4 }, (_, i) => i * 4);
  assignFingers(events, bars);
  return {
    id: meta.id,
    title: meta.title,
    kind: 'imported',
    level: 1,
    source: 'Importada (tab em texto)',
    tempo: meta.tempo ?? 80,
    timeSig: [4, 4],
    tuning: [...STANDARD_TUNING],
    bars,
    length,
    events,
  };
}
