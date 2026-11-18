import type { SongEvent } from './song';

/**
 * Fills NoteRef.finger where the source had no fingering.
 * Open string → 0. Fretted notes: per bar, the hand position p is chosen so the bar's frets fit
 * in p..p+3 (p = max(1, maxFret − 3), never above minFret); finger = fret − p + 1, clamped to 1..4.
 * In first position (all frets ≤ 4) this gives finger = fret.
 */
export function assignFingers(events: SongEvent[], bars: readonly number[]): void {
  const barOf = (beat: number) => {
    let i = 0;
    while (i + 1 < bars.length && bars[i + 1]! <= beat) i++;
    return i;
  };
  const byBar = new Map<number, SongEvent[]>();
  for (const e of events) {
    const b = barOf(e.beat);
    byBar.set(b, [...(byBar.get(b) ?? []), e]);
  }
  for (const evs of byBar.values()) {
    const frets = evs.flatMap((e) => e.notes.map((n) => n.fret)).filter((f) => f > 0);
    const min = Math.min(...frets);
    const p = frets.length ? Math.min(min, Math.max(1, Math.max(...frets) - 3)) : 1;
    for (const n of evs.flatMap((e) => e.notes)) {
      if (n.finger !== undefined) continue;
      n.finger = n.fret === 0 ? 0 : Math.max(1, Math.min(4, n.fret - p + 1));
    }
  }
}
