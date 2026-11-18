/** Small inline SVG icons; colors come from CSS (currentColor / classes). */

export function Logo() {
  return (
    <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="var(--surface-2)" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="var(--accent)" stroke-width="5" />
      {[15, 18.6, 22.2, 25.8, 29.4, 33].map((x) => (
        <line key={x} x1={x} y1="7" x2={x} y2="41" stroke="var(--text)" stroke-width="1.2" />
      ))}
    </svg>
  );
}

export function TunerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 17a8 8 0 0 1 16 0" />
      <path d="M12 17l4-6" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M3 6h18M3 10h18M3 14h18M3 18h18" stroke-width="1.2" opacity="0.6" />
      <circle cx="8" cy="10" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg class="lock" viewBox="0 0 24 24" aria-label="travada" fill="none" stroke="currentColor" stroke-width="2.2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}
