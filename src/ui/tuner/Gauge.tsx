import { IN_TUNE_CENTS } from '../../music';

const RANGE = 50;
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

/**
 * Horizontal scale with a vertical needle: left = flat (♭), right = sharp (♯).
 * The needle head shows the cents, or a check when in tune. `cents` null = no sound.
 */
export function Gauge({ cents, stale }: { cents: number | null; stale: boolean }) {
  const has = cents !== null;
  const c = cents ?? 0;
  const ok = has && Math.abs(c) < IN_TUNE_CENTS;
  const tone = !has ? 'idle' : ok ? 'ok' : Math.abs(c) > 25 ? 'far' : 'near';
  const pos = 50 + (Math.max(-RANGE, Math.min(RANGE, c)) / RANGE) * 50;
  const label = Math.abs(c) >= 100 ? (c < 0 ? '≪' : '≫') : `${c > 0 ? '+' : ''}${Math.round(c)}`;

  return (
    <div class={`gauge ${tone} ${has && !ok ? (c < 0 ? 'flat' : 'sharp') : ''} ${stale ? 'stale' : ''}`} role="meter" aria-valuemin={-RANGE} aria-valuemax={RANGE} aria-valuenow={Math.round(c)}>
      <span class="g-flat">♭</span>
      <span class="g-sharp">♯</span>
      <div class="g-scale">
        <div class="g-zone" />
        {TICKS.map((t) => (
          <i key={t} class={t === 0 ? 'center' : t % 50 === 0 ? 'major' : ''} style={{ left: `${50 + t}%` }} />
        ))}
        {has && (
          <div class="g-needle" style={{ left: `${pos}%` }}>
            <span class="g-head">{ok ? '✓' : label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
