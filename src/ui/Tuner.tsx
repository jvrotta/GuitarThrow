import { useEffect, useRef, useState } from 'preact/hooks';
import { IN_TUNE_CENTS as IN_TUNE, readTuning, stringLabels, type TuningReading } from '../music';
import { DebugPanel } from './DebugPanel';
import { GaugeIcon } from './icons';
import { StringRows } from './StringRows';
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

  // Check mark once a string stays in tune long enough.
  useEffect(() => {
    if (!live || Math.abs(shown?.cents ?? 99) >= IN_TUNE) {
      inTuneSince.current = null;
      return;
    }
    const t = inTuneSince.current;
    if (!t || t.string !== live.string) inTuneSince.current = { string: live.string, at: now };
    else if (now - t.at > CONFIRM_MS && !done.has(live.string)) setDone(new Set(done).add(live.string));
  });

  const toggleLock = (s: number) => setLocked(locked === s ? null : s);
  const running = p.status === 'running';

  return (
    <main class="tuner-screen">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Afinador</h2>
        <button class={`icon-btn ${debug ? 'on' : ''}`} onClick={() => setDebug(!debug)} aria-label="Diagnóstico">
          <GaugeIcon />
        </button>
      </header>

      <section class={`readout ${live ? '' : 'faded'}`}>
        <Readout r={shown} locked={locked} />
      </section>

      <StringRows labels={LABELS} reading={shown} live={live !== null} locked={locked} done={done} onToggle={toggleLock} />

      {!running && (
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

function Readout({ r, locked }: { r: TuningReading | null; locked: number | null }) {
  if (!r) {
    return (
      <>
        <div class="big-note idle">{locked ? LABELS[locked - 1] : '—'}</div>
        <div class="verdict muted">{locked ? `${locked}ª corda travada · toque a corda` : 'Toque uma corda solta'}</div>
      </>
    );
  }
  const c = Math.round(r.cents);
  const ok = Math.abs(r.cents) < IN_TUNE;
  return (
    <>
      <div class={`big-note ${ok ? 'ok' : ''}`}>{LABELS[r.string - 1]}</div>
      <div class={`verdict ${ok ? 'ok' : Math.abs(c) > 25 ? 'far' : 'near'}`}>
        {ok
          ? '✓ Afinada'
          : Math.abs(c) >= 100
            ? c < 0
              ? '▲ Muito grave · suba'
              : '▼ Muito aguda · desça'
            : c < 0
              ? `▲ Suba · ${c}`
              : `▼ Desça · +${c}`}
      </div>
    </>
  );
}
