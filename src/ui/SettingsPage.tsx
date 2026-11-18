import { useState } from 'preact/hooks';
import { clearProgress, type Settings } from '../storage';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onCalibrate: () => void;
  onBack: () => void;
}

/** Ajustes: mic latency (calibration or by hand), metronome, click volume, count-in, reset progress. */
export function SettingsPage({ settings: s, onChange, onCalibrate, onBack }: Props) {
  const [cleared, setCleared] = useState(false);
  const set = (patch: Partial<Settings>) => onChange({ ...s, ...patch });
  const nudge = (ms: number) => set({ latencyMs: Math.max(-100, Math.min(400, s.latencyMs + ms)) });

  return (
    <main class="page settings">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Ajustes</h2>
        <span class="icon-btn" />
      </header>

      <section class="set-group">
        <h3>Microfone</h3>
        <div class="set-row">
          <span class="set-text">
            <strong>Atraso do microfone</strong>
            <span>{s.calibrated ? 'Medido na calibração.' : 'Ainda não calibrado.'} Usado no Play-along para julgar o tempo.</span>
          </span>
          <span class="stepper">
            <button class="chip" aria-label="Diminuir 10 ms" onClick={() => nudge(-10)}>−</button>
            <b>{s.latencyMs} ms</b>
            <button class="chip" aria-label="Aumentar 10 ms" onClick={() => nudge(10)}>+</button>
          </span>
        </div>
        <button class="btn primary wide" onClick={onCalibrate}>Calibrar com o violão</button>
      </section>

      <section class="set-group">
        <h3>Metrônomo</h3>
        <label class="set-row">
          <span class="set-text">
            <strong>Clique durante a música</strong>
            <span>No Play-along. A contagem inicial sempre tem clique.</span>
          </span>
          <input type="checkbox" class="switch" checked={s.metronome} onChange={(e) => set({ metronome: e.currentTarget.checked })} />
        </label>
        <label class="set-row">
          <span class="set-text">
            <strong>Volume do clique</strong>
            <span>{s.clickVolume === 0 ? 'Mudo' : `${Math.round(s.clickVolume * 100)}%`}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={s.clickVolume}
            onInput={(e) => set({ clickVolume: Number(e.currentTarget.value) })}
          />
        </label>
        <div class="set-row">
          <span class="set-text">
            <strong>Contagem antes de começar</strong>
            <span>Também antes de cada volta do trecho A–B.</span>
          </span>
          <span class="chips">
            {([1, 2] as const).map((n) => (
              <button key={n} class={`chip ${s.countInBars === n ? 'on' : ''}`} onClick={() => set({ countInBars: n })}>
                {n} {n === 1 ? 'compasso' : 'compassos'}
              </button>
            ))}
          </span>
        </div>
      </section>

      <section class="set-group">
        <h3>Progresso</h3>
        <button
          class="btn wide"
          disabled={cleared}
          onClick={async () => {
            if (!confirm('Apagar as estrelas e recordes de todas as músicas? Não dá para desfazer.')) return;
            await clearProgress();
            setCleared(true);
          }}
        >
          {cleared ? 'Progresso apagado' : 'Apagar progresso'}
        </button>
      </section>

      <p class="muted set-foot">Tudo fica só neste aparelho. versão {__BUILD_ID__}</p>
    </main>
  );
}
