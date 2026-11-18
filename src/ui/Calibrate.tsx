import { useEffect, useRef, useState } from 'preact/hooks';
import { WaitJudge } from '../audio';
import { ClockMap } from './practice/clock';
import { Metronome } from './practice/metronome';
import { MicOverlay } from './practice/Overlays';
import type { PitchState } from './usePitch';

const SPB = 60 / 90;
const COUNT = 4;
const BEATS = 8;
const OPEN_STRINGS = [[40], [45], [50], [55], [59], [64]];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

type Phase = { name: 'intro' } | { name: 'run'; t0: number } | { name: 'done'; ms: number; spread: number; n: number };

/**
 * Latency calibration: 4 count-in clicks, then 8 clicks with a light; the player plucks any open string
 * on each. The judge (which ignores the clicks themselves) gives each attack's time; the median of
 * (attack − beat) is how late the app hears a note played on time.
 */
export function Calibrate({ p, onBack, onSave }: { p: PitchState; onBack: () => void; onSave: (ms: number) => void }) {
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const [beat, setBeat] = useState(-1);
  const [hits, setHits] = useState(0);
  const offsets = useRef<number[]>([]);

  const start = () => {
    const ctx = p.ctx;
    if (!ctx) return;
    const metro = new Metronome(ctx);
    const out = (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
    const lead = 0.4;
    for (let k = 0; k < COUNT + BEATS; k++) metro.click(ctx.currentTime + lead + k * SPB - out, k % 4 === 0, 0.8);
    offsets.current = [];
    setHits(0);
    setPhase({ name: 'run', t0: performance.now() / 1000 + lead + COUNT * SPB });
  };

  // Lights and the end of the run.
  useEffect(() => {
    if (phase.name !== 'run') return;
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000 - phase.t0;
      setBeat(Math.floor(t / SPB + 0.5));
      if (t > BEATS * SPB + 0.3) {
        const xs = offsets.current;
        const m = median(xs);
        setPhase({ name: 'done', ms: Math.round(m), spread: Math.round(median(xs.map((x) => Math.abs(x - m)))), n: xs.length });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Attacks → offset from the nearest beat.
  const sampleRate = p.info?.sampleRate;
  useEffect(() => {
    if (!sampleRate || phase.name !== 'run') return;
    const clock = new ClockMap();
    const judge = new WaitJudge(sampleRate, (j) => {
      if (j.kind !== 'hit') return;
      const t = clock.toPage(j.time) - phase.t0;
      const k = Math.round(t / SPB);
      const off = t - k * SPB;
      if (k < 0 || k >= BEATS || Math.abs(off) > SPB * 0.45) return;
      offsets.current.push(off * 1000);
      setHits(offsets.current.length);
    });
    judge.setTargets(1, OPEN_STRINGS);
    return p.listen((f) => {
      clock.observe(f.time);
      judge.push(f);
    });
  }, [sampleRate, phase]);

  const running = phase.name === 'run';
  const counting = running && beat < 0;
  return (
    <main class="page calibrate">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Calibrar o microfone</h2>
        <span class="icon-btn" />
      </header>

      <p class="cal-help">
        Toque <b>qualquer corda solta</b> junto com cada clique, quando a bolinha acender. Primeiro vêm 4 cliques de contagem.
        Assim o Play-along sabe quanto o microfone atrasa neste aparelho.
      </p>

      <div class="cal-beats" aria-hidden="true">
        {Array.from({ length: BEATS }, (_, k) => (
          <i key={k} class={running && k === beat ? 'now' : running && k < beat ? 'past' : ''} />
        ))}
      </div>
      <p class="cal-status">
        {counting ? `Contagem… ${COUNT + beat + 1}` : running ? `${hits} de ${BEATS} notas ouvidas` : ' '}
      </p>

      {phase.name === 'done' &&
        (phase.n >= 5 ? (
          <div class="cal-result">
            <strong>{phase.ms} ms</strong>
            <span class="muted">
              {phase.n} notas · variação {phase.spread} ms{phase.spread > 40 ? ' — irregular, vale repetir' : ''}
            </span>
          </div>
        ) : (
          <p class="error">Ouvi só {phase.n} notas. Afine o violão e toque mais perto do celular.</p>
        ))}

      <div class="p-actions">
        {phase.name === 'done' && phase.n >= 5 && (
          <button class="btn primary" onClick={() => onSave(phase.ms)}>Salvar</button>
        )}
        <button class={`btn ${phase.name === 'done' && phase.n >= 5 ? '' : 'primary'}`} disabled={running || p.status !== 'running'} onClick={start}>
          {phase.name === 'intro' ? 'Começar' : 'Repetir'}
        </button>
      </div>
      {p.status !== 'running' && <MicOverlay p={p} />}
    </main>
  );
}
