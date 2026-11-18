import { useEffect, useRef, useState } from 'preact/hooks';
import { Transport } from '../engine';
import { loadSong, type Song } from '../music';
import { TabCanvas } from './tab/TabCanvas';

const SPEEDS = [0.5, 0.75, 1];

/** Song preview: scrolling tab with play/pause, speed and drag-to-scrub. Practice modes come in M3/M5. */
export function SongView({ id, onBack }: { id: string; onBack: () => void }) {
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bar, setBar] = useState(1);
  const transport = useRef(new Transport(100));

  useEffect(() => {
    loadSong(id)
      .then((s) => {
        transport.current = new Transport(s.tempo);
        setSong(s);
      })
      .catch((e: unknown) => setError(String(e)));
    return () => transport.current.pause();
  }, [id]);

  // Stop at the end and keep the bar counter in sync (cheap, 4×/s).
  useEffect(() => {
    if (!song) return;
    const t = setInterval(() => {
      const pos = transport.current.position();
      if (pos >= song.length && transport.current.isPlaying) {
        transport.current.pause();
        transport.current.seek(song.length);
        setPlaying(false);
      }
      setBar(Math.max(1, song.bars.filter((b) => b <= pos).length));
    }, 250);
    return () => clearInterval(t);
  }, [song]);

  const toggle = () => {
    const t = transport.current;
    if (t.isPlaying) t.pause();
    else {
      if (song && t.position() >= song.length) t.seek(0);
      t.play();
    }
    setPlaying(t.isPlaying);
  };

  const changeSpeed = (s: number) => {
    transport.current.setSpeed(s);
    setSpeed(s);
  };

  return (
    <main class="song-screen">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>{song?.title ?? 'Carregando…'}</h2>
        <span class="bar-meta">{song ? `${Math.round(song.tempo * speed)} bpm` : ''}</span>
      </header>

      <div class="tab-area">
        {error && <p class="error">{error}</p>}
        {song && (
          <TabCanvas
            song={song}
            getPos={() => transport.current.position()}
            onScrub={(beat, phase) => {
              const t = transport.current;
              if (phase === 'start' && t.isPlaying) {
                t.pause();
                setPlaying(false);
              }
              t.seek(beat);
            }}
          />
        )}
        <p class="rotate-hint">Gire o celular para ver mais compassos</p>
      </div>

      <footer class="controls">
        <button
          class="icon-btn"
          aria-label="Voltar ao início"
          onClick={() => transport.current.seek(0)}
        >
          ⏮
        </button>
        <button class="play-btn" onClick={toggle} disabled={!song} aria-label={playing ? 'Pausar' : 'Tocar'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div class="chips" role="group" aria-label="Velocidade">
          {SPEEDS.map((s) => (
            <button key={s} class={`chip ${s === speed ? 'on' : ''}`} onClick={() => changeSpeed(s)}>
              {Math.round(s * 100)}%
            </button>
          ))}
        </div>
        <span class="bar-count">
          {song ? `${bar}/${song.bars.length}` : ''}
        </span>
      </footer>
    </main>
  );
}
