/**
 * ui — screens and components (Preact). Interface text in pt-BR. Styles: styles.css (tokens incl. --finger-N, shared),
 * pages.css, tuner/tuner.css, practice/practice.css.
 * App.tsx: screen switch; owns the mic (usePitch) and starts it inside the tap that opens the tuner or a song (iOS rule).
 * Home.tsx · Tuner.tsx (+ tuner/Gauge.tsx, tuner/Headstock.tsx SVG) · DebugPanel.tsx · Library.tsx (catalog) ·
 * practice/Practice.tsx (Wait-mode session: HUD, WaitJudge → PracticeSession) + Minimap.tsx + Overlays.tsx (mic, pause, summary).
 * tab/: geometry.ts (layout, theme, TabFrame) · draw.ts (strings, pills by finger/result, cursor) · overlay.ts (ball,
 * popups, count-in) · TabCanvas.tsx (HiDPI canvas, rAF loop, drag-to-scrub).
 */
export { App } from './App';
