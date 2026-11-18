import { useRef, useState } from 'preact/hooks';
import { freqToMidi, midiToName, midiToSolfege, nearestString } from '../music';
import { DebugPanel } from './DebugPanel';
import { usePitch } from './usePitch';

/** Keeps showing the last note for a moment after the sound fades. */
const HOLD_MS = 1500;
const IN_TUNE_CENTS = 5;

export function Tuner({ onBack }: { onBack: () => void }) {
  const p = usePitch();
  const [debug, setDebug] = useState(false);
  const last = useRef<{ freq: number; at: number } | null>(null);

  if (p.freq !== null) last.current = { freq: p.freq, at: performance.now() };
  const held = last.current && performance.now() - last.current.at < HOLD_MS ? last.current.freq : null;
  const live = p.freq !== null;

  return (
    <main class="screen">
      <header class="bar">
        <button class="link" onClick={onBack}>‹ Início</button>
        <h2>Afinador</h2>
        <button class={`link ${debug ? 'on' : ''}`} onClick={() => setDebug(!debug)}>Debug</button>
      </header>

      {p.status !== 'running' ? (
        <section class="center">
          <button class="primary" onClick={p.start} disabled={p.status === 'starting'}>
            {p.status === 'starting' ? 'Abrindo microfone…' : 'Ativar microfone'}
          </button>
          {p.error && <p class="error">{p.error}</p>}
          <p class="muted">Toque uma corda solta por vez, perto do celular.</p>
        </section>
      ) : (
        <section class={`tuner ${live ? '' : 'faded'}`}>
          {held === null ? <Waiting /> : <Reading freq={held} />}
        </section>
      )}

      {debug && <DebugPanel p={p} />}
    </main>
  );
}

function Waiting() {
  return (
    <>
      <div class="note">–</div>
      <p class="muted">Aguardando som…</p>
    </>
  );
}

function Reading({ freq }: { freq: number }) {
  const midi = freqToMidi(freq);
  const nearest = Math.round(midi);
  const cents = (midi - nearest) * 100;
  const inTune = Math.abs(cents) < IN_TUNE_CENTS;
  const string = nearestString(midi);
  const pos = 50 + cents; // 0..100 across the meter

  return (
    <>
      <div class={`note ${inTune ? 'ok' : ''}`}>{midiToSolfege(nearest)}</div>
      <p class="muted">
        {midiToName(nearest)} · mais perto da {string}ª corda
      </p>
      <div class="meter" aria-label={`${cents.toFixed(0)} cents`}>
        <div class="meter-center" />
        <div class={`meter-needle ${inTune ? 'ok' : ''}`} style={{ left: `${pos}%` }} />
      </div>
      <p class={inTune ? 'ok' : ''}>
        {inTune ? 'Afinado' : cents < 0 ? `${cents.toFixed(0)} cents · suba a afinação` : `+${cents.toFixed(0)} cents · desça a afinação`}
      </p>
      <p class="muted small">{freq.toFixed(1)} Hz</p>
    </>
  );
}
