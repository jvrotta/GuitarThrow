import { PlayAlongSession, starsFor, type Mode, type Session } from '../../engine';
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
      <span class="muted">O app escuta o violão: no modo Espera só avança quando você acerta; no Play-along, toque no tempo.</span>
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
  session: Session;
  speed: number;
  /** Saved best: null while saving; `improved` = this run is the new best. */
  record: { improved: boolean; first: boolean } | null;
  onRepeat: () => void;
  onSpeed: (v: number) => void;
  onBack: () => void;
}

const MODE_NAME: Record<Mode, string> = { wait: 'Espera', play: 'Play-along' };

/** End of song: precision, stars, best streak (Play-along: Perfeito/Bom/errou); repeat, change speed or leave. */
export function Summary({ session, speed, record, onRepeat, onSpeed, onBack }: SummaryProps) {
  const acc = session.accuracy;
  const stars = starsFor(acc);
  const slower = Math.max(0.5, speed - 0.25);
  const faster = Math.min(1, speed + 0.25);
  const t = session instanceof PlayAlongSession ? session.timing : null;
  const count = (k: string) => t?.filter((x) => x === k).length ?? 0;
  const misses = session.status.filter((x) => x === 'miss').length;
  return (
    <div class="p-overlay summary" role="dialog" aria-label="Resumo">
      <div class="stars" aria-label={`${stars} de 3 estrelas`}>
        {[1, 2, 3].map((n) => (
          <span key={n} class={n <= stars ? 'on' : ''}>★</span>
        ))}
      </div>
      <strong class="big">{Math.round(acc * 100)}%</strong>
      {record?.improved && <span class="record">{record.first ? 'Primeiro resultado salvo' : 'Novo recorde!'}</span>}
      <span class="muted">
        {t ? `${count('perfect')} perfeitas · ${count('good')} boas · ${misses} erradas` : `precisão · melhor sequência ${session.bestCombo}`}
        {' · '}
        {MODE_NAME[session.mode]} a {Math.round(speed * 100)}%
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
