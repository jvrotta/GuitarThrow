/**
 * ui — screens and components (Preact). Interface text in pt-BR. Styles: styles.css (tokens incl. --finger-N, shared),
 * pages.css, tuner/tuner.css, practice/practice.css, forms.css.
 * App.tsx: screen switch + settings; owns the mic (usePitch) and starts it inside the tap that opens a screen (iOS rule).
 * Home.tsx (Continuar) · Tuner.tsx (+ tuner/) · DebugPanel.tsx · Library.tsx (catalog + imported, best stars) ·
 * SettingsPage.tsx · Calibrate.tsx (latency) · Import.tsx (text tab / file) · openSong.ts (built-in or imported).
 * practice/: Practice.tsx (Espera / Play-along) · useJudge.ts (mic → WaitJudge → session) · useClock.ts (tick +
 * metronome.ts) · clock.ts (audio → page time) · Controls.tsx + Minimap.tsx · Overlays.tsx (mic, pause, summary).
 * tab/: geometry.ts (layout, theme, TabFrame) · draw.ts (strings, pills by finger/result, cursor) · overlay.ts (ball,
 * popups, count-in, chord names, loop) · TabCanvas.tsx (HiDPI canvas, rAF loop, drag-to-scrub).
 */
export { App } from './App';
