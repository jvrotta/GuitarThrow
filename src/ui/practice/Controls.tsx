import type { Session } from '../../engine';
import type { Song } from '../../music';
import { Minimap } from './Minimap';

const SPEEDS = [0.5, 0.75, 1];

/** A–B loop: off → A marked (waiting for B) → on. */
export type LoopStep = 'off' | 'a' | 'on';

interface Props {
  song: Song;
  s: Session;
  paused: boolean;
  speed: number;
  loopStep: LoopStep;
  onPause: () => void;
  onSeek: (beat: number) => void;
  onSpeed: (v: number) => void;
  onLoop: () => void;
}

const LOOP_LABEL: Record<LoopStep, string> = { off: 'A–B', a: 'Fim B', on: 'A–B ✕' };
const LOOP_HELP: Record<LoopStep, string> = {
  off: 'Repetir um trecho: marca o início no compasso atual',
  a: 'Marca o fim do trecho no compasso atual',
  on: 'Parar de repetir o trecho',
};

/** Bottom bar: pause, whole-song minimap, A–B loop, finger colors, speed. */
export function Controls({ song, s, paused, speed, loopStep, onPause, onSeek, onSpeed, onLoop }: Props) {
  return (
    <footer class="controls">
      <button class="icon-btn" aria-label={paused ? 'Continuar' : 'Pausar'} onClick={onPause}>
        {paused ? '▶' : '❚❚'}
      </button>
      <Minimap song={song} status={[...s.status]} getPos={() => s.position} loop={s.loop} onSeek={onSeek} />
      <button class={`chip loop-btn ${loopStep !== 'off' ? 'on' : ''}`} aria-label={LOOP_HELP[loopStep]} title={LOOP_HELP[loopStep]} onClick={onLoop}>
        {LOOP_LABEL[loopStep]}
      </button>
      <div class="legend" aria-label="Cores dos dedos">
        {[1, 2, 3, 4].map((f) => <i key={f} style={{ background: `var(--finger-${f})` }}>{f}</i>)}
      </div>
      <div class="chips" role="group" aria-label="Velocidade">
        {SPEEDS.map((v) => (
          <button key={v} class={`chip ${v === speed ? 'on' : ''}`} onClick={() => onSpeed(v)}>
            {Math.round(v * 100)}%
          </button>
        ))}
      </div>
    </footer>
  );
}
