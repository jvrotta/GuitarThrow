import { IN_TUNE_CENTS as IN_TUNE, type TuningReading } from '../music';
import { LockIcon } from './icons';

/** Displayed range of the marker, in cents to each side. */
const RANGE = 50;

const centsLabel = (c: number) => {
  const r = Math.round(c);
  if (Math.abs(r) >= 100) return r < 0 ? '≪' : '≫';
  return r > 0 ? `+${r}` : `${r}`;
};

interface Props {
  labels: string[];
  reading: TuningReading | null;
  live: boolean;
  locked: number | null;
  done: ReadonlySet<number>;
  onToggle: (string: number) => void;
}

/** Six strings, high E on top (same orientation as the tab). Tap a string to lock it. */
export function StringRows({ labels, reading, live, locked, done, onToggle }: Props) {
  return (
    <ol class="strings">
      {labels.map((label, i) => {
        const s = i + 1;
        const active = reading?.string === s;
        const cents = active ? reading!.cents : 0;
        const ok = active && Math.abs(cents) < IN_TUNE;
        const tone = ok ? 'ok' : Math.abs(cents) > 25 ? 'far' : 'near';
        const pos = 50 + (Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE) * 50;
        const cls = ['string', active && 'active', active && !live && 'stale', locked === s && 'locked', done.has(s) && 'done']
          .filter(Boolean)
          .join(' ');
        return (
          <li key={s}>
            <button class={cls} onClick={() => onToggle(s)} aria-label={`${s}ª corda ${label}`}>
              <span class="s-label">
                {label}
                <small>{s}</small>
              </span>
              <span class="s-track">
                <span class="s-zone" />
                <span class="s-wire" style={{ height: `${1.5 + i * 0.6}px` }} />
                {active && <span class={`s-marker ${tone}`} style={{ left: `${pos}%` }} />}
              </span>
              <span class="s-state">
                {locked === s && <LockIcon />}
                {active && !ok ? (
                  <span class={tone}>{centsLabel(cents)}</span>
                ) : done.has(s) ? (
                  <span class="ok">✓</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
