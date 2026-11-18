/** Internal song model. Every importer converts to this; the app only knows this. */

export interface NoteRef {
  /** 1 (high E) .. 6 (low E) — same as tab lines, top to bottom. */
  string: number;
  fret: number;
  midi: number;
  /** Left-hand finger: 0 open string, 1 index, 2 middle, 3 ring, 4 little. Filled by assignFingers when absent. */
  finger?: number;
}

export interface SongEvent {
  /** Start, in quarter-note beats from the beginning. */
  beat: number;
  /** Duration in beats. */
  dur: number;
  /** One note = single note; several = chord / double stop. Rests are not stored. */
  notes: NoteRef[];
  /** Chord name shown over the tab ("Em", "G"), when the source names it. */
  chord?: string;
}

/** Library groups: built-in exercises, chord exercises and songs; `imported` = the user's own files. */
export type SongKind = 'exercise' | 'chords' | 'song' | 'imported';

export interface SongMeta {
  id: string;
  title: string;
  kind: SongKind;
  /** 1 (first lessons) .. 5. */
  level: number;
  /** Copyright origin, e.g. "Exercício original", "Tradicional", "Beethoven (domínio público)". */
  source: string;
  /** Beats per minute (quarter note). */
  tempo: number;
  /** Style shelf in the library (e.g. "rock"); none = the generic group of its kind. */
  genre?: string;
}

export interface Song extends SongMeta {
  timeSig: [number, number];
  /** Open-string MIDI numbers, low E first. */
  tuning: number[];
  /** Start beat of each bar. */
  bars: number[];
  /** Total length in beats. */
  length: number;
  events: SongEvent[];
}

/** Catalog row: what the library lists without loading the song. */
export interface CatalogEntry extends SongMeta {
  notes: number;
  bars: number;
}

/** Index of the first event that ends after `beat` (binary search; events are sorted). */
export function firstEventAfter(events: readonly SongEvent[], beat: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const e = events[mid]!;
    if (e.beat + e.dur <= beat) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
