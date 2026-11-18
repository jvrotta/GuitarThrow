// Converts an alphaTab Score into our Song. Used at build time (scripts/build-content.mjs, via Node's
// type stripping — so runtime imports need the .ts extension) and at runtime for imported Guitar Pro /
// MusicXML files (import.ts loads alphaTab lazily). Minimal structural types keep alphaTab out of the bundle.
import { assignFingers } from './fingering.ts';
import { placeNote } from './notes.ts';
import type { NoteRef, Song, SongEvent, SongMeta } from './song';

const TICKS_PER_BEAT = 960;

interface AtNote {
  string: number; // alphaTab: 1 = LOWEST string
  fret: number;
  realValue: number;
  isTieDestination: boolean;
  /** alphaTab Fingers: -2 unknown, -1 none, 0 thumb, 1 index … 4 little. alphaTex {lf 2} = index. */
  leftHandFinger: number;
}
interface AtBeat {
  playbackStart: number;
  playbackDuration: number;
  notes: AtNote[];
  chord?: { name: string } | null;
}
interface AtStaff {
  tuning: number[];
  isPercussion?: boolean;
  bars: { voices: { beats: AtBeat[] }[] }[];
}
interface AtScore {
  title: string;
  tempo: number;
  masterBars: { start: number; timeSignatureNumerator: number; timeSignatureDenominator: number }[];
  tracks: { name?: string; staves: AtStaff[] }[];
}

/** Meta fields not present in the score come from the caller (file header or import dialog). */
export function scoreToSong(score: AtScore, meta: Omit<SongMeta, 'tempo' | 'title'> & Partial<SongMeta>): Song {
  // First guitar-like staff (6 strings, not drums); files often start with a vocal or piano track.
  const staves = score.tracks.flatMap((t) => t.staves).filter((st) => !st.isPercussion);
  const staff = staves.find((st) => st.tuning.length === 6) ?? staves[0];
  if (!staff) throw new Error('Partitura sem faixa/pauta.');
  const strings = staff.tuning.length;
  const tuning = strings === 6 ? [...staff.tuning].reverse() : [40, 45, 50, 55, 59, 64];
  const events: SongEvent[] = [];

  staff.bars.forEach((bar, i) => {
    // beat.playbackStart is relative to its bar.
    const barStart = score.masterBars[i]?.start ?? 0;
    for (const b of bar.voices[0]?.beats ?? []) {
      // Tied notes continue a previous note: nothing new to play.
      const played = b.notes.filter((n) => !n.isTieDestination);
      if (played.length === 0) continue;
      const notes: NoteRef[] = played
        .map((n) => {
          // Scores without tablature (MusicXML from notation apps) have no string/fret: place the note.
          const pos = strings === 6 && n.string >= 1 && n.fret >= 0 ? { string: strings - n.string + 1, fret: n.fret } : placeNote(n.realValue, tuning);
          return { ...pos, midi: n.realValue, ...(n.leftHandFinger >= 1 ? { finger: n.leftHandFinger } : {}) };
        })
        .filter((n) => n.fret >= 0)
        .sort((a, c) => a.string - c.string);
      if (notes.length === 0) continue;
      const chord = b.chord?.name;
      events.push({ beat: (barStart + b.playbackStart) / TICKS_PER_BEAT, dur: b.playbackDuration / TICKS_PER_BEAT, notes, ...(chord ? { chord } : {}) });
    }
  });
  events.sort((a, b) => a.beat - b.beat);
  assignFingers(events, score.masterBars.map((m) => m.start / TICKS_PER_BEAT));

  const mb = score.masterBars;
  const first = mb[0];
  const last = mb[mb.length - 1];
  const barBeats = (m: AtScore['masterBars'][number]) => (m.timeSignatureNumerator * 4) / m.timeSignatureDenominator;

  return {
    ...meta,
    title: meta.title ?? score.title,
    tempo: meta.tempo ?? score.tempo,
    timeSig: [first?.timeSignatureNumerator ?? 4, first?.timeSignatureDenominator ?? 4],
    tuning,
    bars: mb.map((m) => m.start / TICKS_PER_BEAT),
    length: last ? last.start / TICKS_PER_BEAT + barBeats(last) : 0,
    events,
  };
}
