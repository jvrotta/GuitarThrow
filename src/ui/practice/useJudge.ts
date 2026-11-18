import { useEffect } from 'preact/hooks';
import { WaitJudge, type Judgement } from '../../audio';
import { PlayAlongSession, WaitSession, type Session } from '../../engine';
import { midiToSolfege, type Song, type SongEvent } from '../../music';
import type { PitchState } from '../usePitch';
import { ClockMap } from './clock';

export type Feedback =
  | { kind: 'popup'; index: number; text: string; tone: 'ok' | 'accent' | 'bad' }
  | { kind: 'toast'; text: string }
  | { kind: 'heard'; midi: number }
  /** A judged event changed the score (re-render the HUD). */
  | { kind: 'changed' };

interface Refs {
  session: { current: Session | null };
  /** Paused or finished: ignore what the mic hears. */
  idle: { current: boolean };
  /** performance.now() seconds of the last session tick. */
  tickAt: { current: number };
}

const names = (midis: readonly number[]) => [...new Set(midis.map(midiToSolfege))].join(', ');
const what = (e: SongEvent) => (e.chord ? `o acorde é ${e.chord}` : e.notes.length > 1 ? `o acorde é ${names(e.notes.map((n) => n.midi))}` : `a nota é ${names([e.notes[0]!.midi])}`);

/**
 * Mic frames → WaitJudge → the session. Wait mode: the expected event is the target; a hit advances,
 * a clear wrong note (or an incomplete chord) explains what was heard. Play-along: every pending note
 * near the cursor is a candidate; the attack time (analyzer clock → page clock − calibrated latency)
 * becomes a position in beats, which the session turns into Perfeito / Bom / adiantado / atrasado.
 */
export function useJudge(song: Song | null, p: PitchState, refs: Refs, latencyMs: number, emit: (f: Feedback) => void) {
  const sampleRate = p.info?.sampleRate;
  useEffect(() => {
    if (!song || !sampleRate) return;
    const clock = new ClockMap();
    let cands: number[] = [];

    const onWait = (s: WaitSession, j: Judgement) => {
      const t = s.targetEvent;
      if (!t) return;
      if (j.kind === 'hit') {
        const out = s.hit();
        if (out.kind === 'hit') emit({ kind: 'popup', index: out.index, text: out.firstTry ? 'Perfeito!' : 'Ok', tone: out.firstTry ? 'ok' : 'accent' });
      } else if (j.kind === 'wrong') {
        if (s.wrong().kind === 'ignored') return;
        const played = midiToSolfege(j.midi);
        const exp = t.notes.map((n) => n.midi);
        const octave = exp.length === 1 && midiToSolfege(exp[0]!) === played ? ' (outra oitava)' : '';
        const text = j.missing?.length
          ? `Faltou ${names(j.missing)}${t.chord ? ` no ${t.chord}` : ''}`
          : `Você tocou ${played}${octave} — ${what(t)}`;
        emit({ kind: 'toast', text });
      }
      emit({ kind: 'changed' });
    };

    const onPlay = (s: PlayAlongSession, j: Judgement) => {
      if (j.kind === 'wrong') {
        if (cands.length) emit({ kind: 'toast', text: j.missing?.length ? `Faltou ${names(j.missing)}` : `Você tocou ${midiToSolfege(j.midi)}` });
        return;
      }
      if (j.kind !== 'hit') return;
      const index = cands[j.group];
      if (index === undefined) return;
      const beat = s.position - (refs.tickAt.current - clock.toPage(j.time, latencyMs)) / s.spb;
      const out = s.hit(index, beat);
      if (out.kind === 'hit') emit({ kind: 'popup', index, text: out.timing === 'perfect' ? 'Perfeito!' : 'Bom', tone: out.timing === 'perfect' ? 'ok' : 'accent' });
      else if (out.kind === 'off') emit({ kind: 'popup', index, text: out.offsetMs < 0 ? 'Adiantado' : 'Atrasado', tone: 'bad' });
      emit({ kind: 'changed' });
    };

    const judge = new WaitJudge(sampleRate, (j) => {
      const s = refs.session.current;
      if (!s || refs.idle.current) return;
      if (j.kind === 'heard') return emit({ kind: 'heard', midi: j.midi });
      if (s instanceof WaitSession) onWait(s, j);
      else if (s instanceof PlayAlongSession) onPlay(s, j);
    });

    return p.listen((f) => {
      clock.observe(f.time);
      const s = refs.session.current;
      if (s instanceof WaitSession) {
        const t = s.targetEvent;
        judge.setTarget(t ? s.target : null, t?.notes.map((n) => n.midi) ?? []);
      } else if (s instanceof PlayAlongSession) {
        cands = s.candidates();
        // Negative keys: never equal to a Wait-mode key (an event index) after switching modes.
        const key = cands.length ? -1 - (cands.reduce((h, i) => (h * 31 + i + 1) | 0, 7) & 0x3fffffff) : null;
        judge.setTargets(key, cands.map((i) => s.song.events[i]!.notes.map((n) => n.midi)));
      }
      judge.push(f);
    });
  }, [song, sampleRate, latencyMs]);
}
