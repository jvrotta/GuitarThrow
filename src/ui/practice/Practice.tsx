import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PlayAlongSession, starsFor, WaitSession, type Mode, type Session } from '../../engine';
import { midiToSolfege, type Song } from '../../music';
import { recordRun, touchSong, type Settings } from '../../storage';
import { openSong } from '../openSong';
import { TabCanvas } from '../tab/TabCanvas';
import { readTheme, type Popup } from '../tab/geometry';
import type { PitchState } from '../usePitch';
import { Controls, type LoopStep } from './Controls';
import { MicOverlay, PausedOverlay, Summary } from './Overlays';
import { useClock } from './useClock';
import { useJudge, type Feedback } from './useJudge';

const FINGERS = ['indicador', 'médio', 'anelar', 'mínimo'];

interface Props {
  id: string;
  mode: Mode;
  p: PitchState;
  settings: Settings;
  onBack: () => void;
}

/**
 * Practice screen. Espera: the tab holds on each note until the mic hears it right. Play-along: the tab
 * runs at tempo; each note is judged on time (Perfeito / Bom). Count-in and metronome clicks, speed,
 * A–B loop, chord names; the result of each full run is saved (best per song and mode).
 */
export function Practice({ id, mode: initialMode, p, settings, onBack }: Props) {
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState('');
  const [, setVersion] = useState(0);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopStep, setLoopStep] = useState<LoopStep>('off');
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [heard, setHeard] = useState<{ name: string; id: number } | null>(null);
  const [record, setRecord] = useState<{ improved: boolean; first: boolean } | null>(null);
  const session = useRef<Session | null>(null);
  const popups = useRef<Popup[]>([]);
  const idle = useRef(false);
  idle.current = paused || finished;
  const tickAt = useRef(0);
  const loopA = useRef(0);
  const theme = useMemo(readTheme, []);
  const refs = { session, idle, tickAt };
  const bump = () => setVersion((v) => v + 1);

  const make = (m: Mode, sg: Song) => {
    const x = m === 'wait' ? new WaitSession(sg, settings.countInBars) : new PlayAlongSession(sg, settings.countInBars);
    x.speed = speed;
    x.setLoop(session.current?.loop ?? null);
    if (x.loop) x.restart();
    return x;
  };

  useEffect(() => {
    openSong(id)
      .then((sg) => {
        session.current = make(mode, sg);
        setSong(sg);
        void touchSong(id, sg.title, mode);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useClock(!!song, p.status === 'running', p.ctx, refs, settings, {
    onFinish: () => setFinished(true),
    onLap: () => (popups.current = []),
  });

  useJudge(song, p, refs, settings.latencyMs, (f: Feedback) => {
    if (f.kind === 'heard') return setHeard({ name: midiToSolfege(f.midi), id: performance.now() });
    if (f.kind === 'toast') return setToast({ text: f.text, id: performance.now() });
    if (f.kind === 'changed') return bump();
    const e = song!.events[f.index]!;
    const now = performance.now();
    const color = f.tone === 'ok' ? theme.ok : f.tone === 'accent' ? theme.accent : theme.bad;
    const string = Math.min(...e.notes.map((n) => n.string));
    popups.current = [...popups.current.filter((x) => now - x.t0 < 1000), { beat: e.beat, string, text: f.text, color, t0: now }];
    if (f.tone !== 'bad') setToast(null);
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // A full run ended: save it (best per song and mode).
  useEffect(() => {
    const s = session.current;
    if (!finished || !s || !song) return;
    const accuracy = s.accuracy;
    void recordRun({ id, title: song.title, mode: s.mode, accuracy, stars: starsFor(accuracy), speed: s.speed }).then((r) =>
      setRecord({ improved: r.improved, first: r.best.plays === 1 }),
    );
  }, [finished]);

  const s = session.current;
  const reset = () => {
    popups.current = [];
    setFinished(false);
    setRecord(null);
    bump();
  };
  const seek = (beat: number) => {
    s?.seek(beat);
    reset();
  };
  const restart = () => {
    s?.restart();
    setPaused(false);
    reset();
  };
  const changeSpeed = (v: number) => {
    if (s) s.speed = v;
    setSpeed(v);
  };
  const switchMode = (m: Mode) => {
    if (!song || m === mode) return;
    session.current = make(m, song);
    setMode(m);
    void touchSong(id, song.title, m);
    reset();
  };
  const tapLoop = () => {
    if (!s || !song) return;
    const pos = Math.max(0, s.position);
    const barStart = (b: number) => [...song.bars].reverse().find((x) => x <= b + 1e-6) ?? 0;
    const barEnd = (b: number) => song.bars.find((x) => x > b + 1e-6) ?? song.length;
    if (loopStep === 'off') {
      loopA.current = barStart(pos);
      setLoopStep('a');
    } else if (loopStep === 'a') {
      s.setLoop({ a: loopA.current, b: Math.max(barEnd(pos), barEnd(loopA.current)) });
      s.restart();
      setLoopStep('on');
      reset();
    } else {
      s.setLoop(null);
      setLoopStep('off');
    }
    bump();
  };

  const target = s instanceof WaitSession ? s.targetEvent : undefined;
  const finger = target?.notes[0]?.finger;
  const start = s?.loop?.a ?? 0;
  const hint = !target ? '' : target.chord ? `Acorde ${target.chord}` : target.notes.length === 1 && finger ? `Dedo ${finger} · ${FINGERS[finger - 1]}` : '';
  const calibrateHint = mode === 'play' && !settings.calibrated && s && s.position < start ? 'Dica: calibre o microfone em Ajustes' : '';

  return (
    <main class="practice">
      <header class="bar p-hud">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <div class="p-title">
          <h2>{song?.title ?? 'Carregando…'}</h2>
          <div class="mode-toggle" role="group" aria-label="Modo">
            <button class={`mode-chip ${mode === 'wait' ? 'on' : ''}`} onClick={() => switchMode('wait')}>Espera</button>
            <button class={`mode-chip ${mode === 'play' ? 'on' : ''}`} onClick={() => switchMode('play')}>Play-along</button>
          </div>
        </div>
        {heard && <span key={heard.id} class="heard">♪ {heard.name}</span>}
        <span class="stat"><b>{s?.combo ?? 0}</b> seguidas</span>
        <span class="stat"><b>{s ? Math.round(s.accuracy * 100) : 100}%</b> precisão</span>
      </header>

      <div class="tab-area">
        {error && <p class="error">{error}</p>}
        {song && s && (
          <TabCanvas
            song={song}
            getFrame={() => ({
              pos: s.position,
              target: s instanceof WaitSession ? s.target : (s as PlayAlongSession).candidates()[0],
              waiting: s instanceof WaitSession && s.waiting,
              status: s.status,
              countIn: s.position < start && s.position >= start - s.countIn ? (Math.floor(s.position - start + s.countIn) % s.barBeats) + 1 : undefined,
              popups: popups.current,
              loop: s.loop,
            })}
            onScrub={(beat, phase) => phase === 'end' && seek(beat)}
          />
        )}
        {toast && <p key={toast.id} class="p-toast">{toast.text}</p>}
        {!toast && (hint || calibrateHint) && <p class="p-hint">{hint || calibrateHint}</p>}
        <p class="rotate-hint">Gire o celular para ver mais compassos</p>
        {p.status !== 'running' && <MicOverlay p={p} />}
        {p.status === 'running' && paused && !finished && <PausedOverlay onResume={() => setPaused(false)} onRestart={restart} />}
        {finished && s && (
          <Summary session={s} speed={speed} record={record} onRepeat={restart} onSpeed={(v) => { changeSpeed(v); restart(); }} onBack={onBack} />
        )}
      </div>

      {song && s && (
        <Controls song={song} s={s} paused={paused} speed={speed} loopStep={loopStep} onPause={() => setPaused(!paused)} onSeek={seek} onSpeed={changeSpeed} onLoop={tapLoop} />
      )}
    </main>
  );
}
