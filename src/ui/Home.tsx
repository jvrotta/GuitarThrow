import { useEffect, useState } from 'preact/hooks';
import type { Mode } from '../engine';
import { lastPlayed, type LastPlayed } from '../storage';
import { GearIcon, Logo, MusicIcon, PlayIcon, TunerIcon } from './icons';

interface Props {
  onTuner: () => void;
  onLibrary: () => void;
  onSettings: () => void;
  onContinue: (id: string, mode: Mode) => void;
}

const MODE_NAME: Record<Mode, string> = { wait: 'modo Espera', play: 'Play-along' };

export function Home({ onTuner, onLibrary, onSettings, onContinue }: Props) {
  const [last, setLast] = useState<LastPlayed | null>(null);
  useEffect(() => {
    void lastPlayed().then((l) => setLast(l ?? null));
  }, []);

  return (
    <main class="home">
      <header class="brand">
        <Logo />
        <div>
          <h1>GuitarThrow</h1>
          <p>Seu guia de prática de violão</p>
        </div>
      </header>

      <div class="home-body">
        {last && (
          <button class="hero-card" onClick={() => onContinue(last.id, last.mode)}>
            <span class="hero-icon">
              <PlayIcon />
            </span>
            <span class="hero-text">
              <strong>Continuar</strong>
              <span>
                {last.title} · {MODE_NAME[last.mode]}
              </span>
            </span>
            <span class="chevron">›</span>
          </button>
        )}

        <button class={`hero-card ${last ? 'secondary' : ''}`} onClick={onLibrary}>
          <span class="hero-icon">
            <MusicIcon />
          </span>
          <span class="hero-text">
            <strong>Músicas</strong>
            <span>Exercícios, acordes e suas tabs: modo Espera ou Play-along</span>
          </span>
          <span class="chevron">›</span>
        </button>

        <button class="hero-card secondary" onClick={onTuner}>
          <span class="hero-icon">
            <TunerIcon />
          </span>
          <span class="hero-text">
            <strong>Afinador</strong>
            <span>Afine as 6 cordas</span>
          </span>
          <span class="chevron">›</span>
        </button>

        <button class="hero-card secondary" onClick={onSettings}>
          <span class="hero-icon">
            <GearIcon />
          </span>
          <span class="hero-text">
            <strong>Ajustes</strong>
            <span>Calibrar o microfone, metrônomo, contagem</span>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <footer>versão {__BUILD_ID__}</footer>
    </main>
  );
}
