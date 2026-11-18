import { useEffect, useRef, useState } from 'preact/hooks';
import { IN_TUNE_CENTS as IN_TUNE, readTuning, stringLabels, type TuningReading } from '../music';
import { DebugPanel } from './DebugPanel';
import { GaugeIcon } from './icons';
import { Gauge } from './tuner/Gauge';
import { Headstock } from './tuner/Headstock';
import type { PitchState } from './usePitch';

/** Keeps the last reading on screen for a moment after the sound fades. */
const HOLD_MS = 1500;
/** Time a string must stay in tune to get its check mark. */
const CONFIRM_MS = 400;
/** Exponential smoothing of the needle (per animation frame). */
const EMA = 0.35;

const LABELS = stringLabels();

export function Tuner({ p, onBack }: { p: PitchState; onBack: () => void }) {
  const [locked, setLocked] = useState<number | null>(null);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [debug, setDebug] = useState(false);
  const last = useRef<{ r: TuningReading; at: number } | null>(null);
  const inTuneSince = useRef<{ string: number; at: number } | null>(null);

  const now = performance.now();
  const live = p.freq !== null ? readTuning(p.freq, locked) : null;
  if (live) {
    const prev = last.current?.r;
    const cents = prev && prev.string === live.string ? prev.cents + EMA * (live.cents - prev.cents) : live.cents;
    last.current = { r: { ...live, cents }, at: now };
  }
  const shown = last.current && now - last.current.at < HOLD_MS ? last.current.r : null;
  const ok = shown !== null && Math.abs(shown.cents) < IN_TUNE;

  // Check mark once a string stays in tune long enough.
  useEffect(() => {
    if (!live || !ok) {
      inTuneSince.current = null;
      return;
    }
    const t = inTuneSince.current;
    if (!t || t.string !== live.string) inTuneSince.current = { string: live.string, at: now };
    else if (now - t.at > CONFIRM_MS && !done.has(live.string)) setDone(new Set(done).add(live.string));
  });

  const target = shown?.string ?? locked;

  return (
    <main class="tuner-screen">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Afinador</h2>
        <div class="bar-actions">
          <button
            class={`auto-chip ${locked === null ? 'on' : ''}`}
            onClick={() => setLocked(null)}
            aria-pressed={locked === null}
          >
            Auto
          </button>
          <button class={`icon-btn ${debug ? 'on' : ''}`} onClick={() => setDebug(!debug)} aria-label="Diagnóstico">
            <GaugeIcon />
          </button>
        </div>
      </header>

      <section class={`t-top ${live ? '' : 'faded'}`}>
        <Gauge cents={shown?.cents ?? null} stale={!live} />
        <div class={`big-note ${ok ? 'ok' : ''} ${target ? '' : 'idle'}`}>{target ? LABELS[target - 1] : '—'}</div>
        <div class={`verdict ${shown ? (ok ? 'ok' : Math.abs(shown.cents) > 25 ? 'far' : 'near') : 'muted'}`}>
          {verdict(shown, locked)}
        </div>
      </section>

      <section class="t-head">
        <Headstock
          labels={LABELS}
          active={shown?.string ?? null}
          activeOk={ok}
          locked={locked}
          done={done}
          onPick={(s) => setLocked(locked === s ? null : s)}
        />
      </section>

      {p.status !== 'running' && (
        <button class="overlay" onClick={p.start} disabled={p.status === 'starting'}>
          <strong>
            {p.status === 'starting' ? 'Abrindo microfone…' : p.status === 'error' ? 'Tentar de novo' : 'Toque para ouvir'}
          </strong>
          {p.error && <span class="error">{p.error}</span>}
        </button>
      )}

      {debug && (
        <div class="sheet">
          <div class="sheet-head">
            <strong>Diagnóstico</strong>
            <button class="icon-btn" onClick={() => setDebug(false)} aria-label="Fechar">×</button>
          </div>
          <DebugPanel p={p} />
        </div>
      )}
    </main>
  );
}

function verdict(r: TuningReading | null, locked: number | null): string {
  if (!r) return locked ? `${locked}ª corda travada · toque essa corda` : 'Toque uma corda solta';
  const c = Math.round(r.cents);
  if (Math.abs(r.cents) < IN_TUNE) return '✓ Afinada';
  if (Math.abs(c) >= 100) return c < 0 ? '▲ Muito grave · aperte a tarraxa' : '▼ Muito aguda · afrouxe a tarraxa';
  return c < 0 ? '▲ Aperte um pouco' : '▼ Afrouxe um pouco';
}
