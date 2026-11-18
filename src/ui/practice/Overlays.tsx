import { starsFor, type PracticeSession } from '../../engine';
import type { PitchState } from '../usePitch';

/** Mic not listening: start it from this tap (iOS needs a gesture), or show the error. */
export function MicOverlay({ p }: { p: PitchState }) {
  if (p.status === 'starting') {
    return (
      <div class="p-overlay">
        <p>Abrindo o microfone…</p>
      </div>
    );
  }
  return (
    <button class="p-overlay" onClick={() => p.start()}>
      {p.status === 'error' && <p class="error">{p.error}</p>}
      <strong>🎤 Toque para ouvir</strong>
      <span class="muted">O app escuta o violão e só avança quando você acerta a nota.</span>
    </button>
  );
}

export function PausedOverlay({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <div class="p-overlay">
      <strong>Pausado</strong>
      <div class="p-actions">
        <button class="btn primary" onClick={onResume}>Continuar</button>
        <button class="btn" onClick={onRestart}>Recomeçar</button>
      </div>
    </div>
  );
}

interface SummaryProps {
  session: PracticeSession;
  speed: number;
  onRepeat: () => void;
  onSpeed: (v: number) => void;
  onBack: () => void;
}

/** End of song: precision, stars, best streak; repeat, change speed or leave. */
export function Summary({ session, speed, onRepeat, onSpeed, onBack }: SummaryProps) {
  const acc = session.accuracy;
  const stars = starsFor(acc);
  const slower = Math.max(0.5, speed - 0.25);
  const faster = Math.min(1, speed + 0.25);
  return (
    <div class="p-overlay summary" role="dialog" aria-label="Resumo">
      <div class="stars" aria-label={`${stars} de 3 estrelas`}>
        {[1, 2, 3].map((n) => (
          <span key={n} class={n <= stars ? 'on' : ''}>★</span>
        ))}
      </div>
      <strong class="big">{Math.round(acc * 100)}%</strong>
      <span class="muted">
        precisão · melhor sequência {session.bestCombo} · {session.song.events.length} notas a {Math.round(speed * 100)}%
      </span>
      <div class="p-actions">
        <button class="btn primary" onClick={onRepeat}>Repetir</button>
        {speed > 0.5 && <button class="btn" onClick={() => onSpeed(slower)}>Mais lento</button>}
        {speed < 1 && <button class="btn" onClick={() => onSpeed(faster)}>Mais rápido</button>}
        <button class="btn" onClick={onBack}>Voltar</button>
      </div>
    </div>
  );
}
