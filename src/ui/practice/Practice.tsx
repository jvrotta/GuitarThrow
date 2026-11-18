import { useEffect, useRef, useState } from 'preact/hooks';
import { WaitJudge } from '../../audio';
import { PracticeSession } from '../../engine';
import { loadSong, midiToSolfege, type Song } from '../../music';
import { TabCanvas } from '../tab/TabCanvas';
import { readTheme, type Popup } from '../tab/geometry';
import type { PitchState } from '../usePitch';
import { Minimap } from './Minimap';
import { MicOverlay, PausedOverlay, Summary } from './Overlays';

const SPEEDS = [0.5, 0.75, 1];
const FINGERS = ['indicador', 'médio', 'anelar', 'mínimo'];

/**
 * Practice session (Wait mode): the tab scrolls at the song tempo and holds on each note until the
 * mic hears it right. WaitJudge (audio) turns mic frames + the expected notes into hit / wrong.
 */
export function Practice({ id, p, onBack }: { id: string; p: PitchState; onBack: () => void }) {
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState('');
  const [, setVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [heard, setHeard] = useState<{ name: string; id: number } | null>(null);
  const session = useRef<PracticeSession | null>(null);
  const popups = useRef<Popup[]>([]);
  const live = useRef({ paused, running: false, finished });
  live.current = { paused, running: p.status === 'running', finished };
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    loadSong(id)
      .then((s) => {
        session.current = new PracticeSession(s);
        setSong(s);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [id]);

  // Clock: advances only while the mic is listening and not paused.
  useEffect(() => {
    if (!song) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const s = session.current!;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const l = live.current;
      if (l.running && !l.paused && !l.finished) {
        s.tick(dt);
        if (s.finished) setFinished(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [song]);

  // Mic frames + expected notes → judgements → session.
  const sampleRate = p.info?.sampleRate;
  useEffect(() => {
    if (!song || !sampleRate) return;
    const theme = readTheme();
    const judge = new WaitJudge(sampleRate, (j) => {
      const s = session.current!;
      const l = live.current;
      if (l.paused || l.finished) return;
      if (j.kind === 'heard') return setHeard({ name: midiToSolfege(j.midi), id: performance.now() });
      const midi = j.kind === 'hit' ? s.targetEvent?.notes[0]?.midi : j.midi;
      if (midi === undefined) return;
      const out = s.play(midi);
      if (out.kind === 'hit') {
        const e = song.events[out.index]!;
        const string = Math.min(...e.notes.map((n) => n.string));
        const now = performance.now();
        popups.current = [
          ...popups.current.filter((x) => now - x.t0 < 1000),
          { beat: e.beat, string, text: out.firstTry ? 'Perfeito!' : 'Ok', color: out.firstTry ? theme.ok : theme.accent, t0: now },
        ];
        setToast(null);
      } else if (out.kind === 'wrong') {
        const exp = out.expected.map(midiToSolfege);
        const name = midiToSolfege(midi);
        const octave = exp.includes(name) ? ' (outra oitava)' : '';
        setToast({ text: `Você tocou ${name}${octave} — a nota é ${[...new Set(exp)].join('/')}`, id: performance.now() });
      }
      if (out.kind !== 'ignored') bump();
    });
    return p.listen((f) => {
      const s = session.current!;
      const t = s.targetEvent;
      judge.setTarget(t ? s.target : null, t?.notes.map((n) => n.midi) ?? []);
      judge.push(f);
    });
  }, [song, sampleRate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (song && !session.current) session.current = new PracticeSession(song); // e.g. after a hot reload
  const s = session.current;
  const seek = (beat: number) => {
    s?.seek(beat);
    setFinished(false);
    bump();
  };
  const changeSpeed = (v: number) => {
    if (s) s.speed = v;
    setSpeed(v);
  };
  const restart = () => {
    s?.restart();
    popups.current = [];
    setFinished(false);
    setPaused(false);
    bump();
  };
  const target = s?.targetEvent;
  const finger = target?.notes[0]?.finger;

  return (
    <main class="practice">
      <header class="bar p-hud">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <div class="p-title">
          <h2>{song?.title ?? 'Carregando…'}</h2>
          <span class="mode-chip on">Espera</span>
          <span class="mode-chip" title="Chega no M5">Play-along · em breve</span>
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
              target: s.target,
              waiting: s.waiting,
              status: s.status,
              countIn: s.position < 0 ? Math.floor(s.position + s.barBeats) + 1 : undefined,
              popups: popups.current,
            })}
            onScrub={(beat, phase) => phase === 'end' && seek(beat)}
          />
        )}
        {toast && <p key={toast.id} class="p-toast">{toast.text}</p>}
        {s?.waiting && finger !== undefined && finger > 0 && !toast && (
          <p class="p-hint">Dedo {finger} · {FINGERS[finger - 1]}</p>
        )}
        <p class="rotate-hint">Gire o celular para ver mais compassos</p>
        {p.status !== 'running' && <MicOverlay p={p} />}
        {p.status === 'running' && paused && !finished && <PausedOverlay onResume={() => setPaused(false)} onRestart={restart} />}
        {finished && s && (
          <Summary session={s} speed={speed} onRepeat={restart} onSpeed={(v) => { changeSpeed(v); restart(); }} onBack={onBack} />
        )}
      </div>

      <footer class="controls">
        <button class="icon-btn" aria-label={paused ? 'Continuar' : 'Pausar'} onClick={() => setPaused(!paused)}>
          {paused ? '▶' : '❚❚'}
        </button>
        {song && s && <Minimap song={song} status={[...s.status]} getPos={() => s.position} onSeek={seek} />}
        <div class="legend" aria-label="Cores dos dedos">
          {[1, 2, 3, 4].map((f) => <i key={f} style={{ background: `var(--finger-${f})` }}>{f}</i>)}
        </div>
        <div class="chips" role="group" aria-label="Velocidade">
          {SPEEDS.map((v) => (
            <button key={v} class={`chip ${v === speed ? 'on' : ''}`} onClick={() => changeSpeed(v)}>
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      </footer>
    </main>
  );
}
