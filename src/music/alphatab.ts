// Converts an alphaTab Score into our Song. Used at build time (scripts/build-content.mjs, via Node's
// type stripping — so this file must only have type-only imports) and, in M6, at runtime for imported
// Guitar Pro / MusicXML files. Minimal structural types keep alphaTab out of the app bundle.
import type { NoteRef, Song, SongEvent, SongMeta } from './song';

const TICKS_PER_BEAT = 960;

interface AtNote {
  string: number; // alphaTab: 1 = LOWEST string
  fret: number;
  realValue: number;
  isTieDestination: boolean;
}
interface AtBeat {
  playbackStart: number;
  playbackDuration: number;
  notes: AtNote[];
}
interface AtScore {
  title: string;
  tempo: number;
  masterBars: { start: number; timeSignatureNumerator: number; timeSignatureDenominator: number }[];
  tracks: { staves: { tuning: number[]; bars: { voices: { beats: AtBeat[] }[] }[] }[] }[];
}

/** Meta fields not present in the score come from the caller (file header or import dialog). */
export function scoreToSong(score: AtScore, meta: Omit<SongMeta, 'tempo' | 'title'> & Partial<SongMeta>): Song {
  const staff = score.tracks[0]?.staves[0];
  if (!staff) throw new Error('Partitura sem faixa/pauta.');
  const strings = staff.tuning.length;
  const events: SongEvent[] = [];

  staff.bars.forEach((bar, i) => {
    // beat.playbackStart is relative to its bar.
    const barStart = score.masterBars[i]?.start ?? 0;
    for (const b of bar.voices[0]?.beats ?? []) {
      // Tied notes continue a previous note: nothing new to play.
      const played = b.notes.filter((n) => !n.isTieDestination);
      if (played.length === 0) continue;
      const notes: NoteRef[] = played
        .map((n) => ({ string: strings - n.string + 1, fret: n.fret, midi: n.realValue }))
        .sort((a, c) => a.string - c.string);
      events.push({ beat: (barStart + b.playbackStart) / TICKS_PER_BEAT, dur: b.playbackDuration / TICKS_PER_BEAT, notes });
    }
  });
  events.sort((a, b) => a.beat - b.beat);

  const mb = score.masterBars;
  const first = mb[0];
  const last = mb[mb.length - 1];
  const barBeats = (m: AtScore['masterBars'][number]) => (m.timeSignatureNumerator * 4) / m.timeSignatureDenominator;

  return {
    ...meta,
    title: meta.title ?? score.title,
    tempo: meta.tempo ?? score.tempo,
    timeSig: [first?.timeSignatureNumerator ?? 4, first?.timeSignatureDenominator ?? 4],
    tuning: [...staff.tuning].reverse(),
    bars: mb.map((m) => m.start / TICKS_PER_BEAT),
    length: last ? last.start / TICKS_PER_BEAT + barBeats(last) : 0,
    events,
  };
}
