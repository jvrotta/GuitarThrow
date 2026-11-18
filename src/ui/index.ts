/**
 * ui — screens and components (Preact). Interface text in pt-BR. Styles: styles.css (tokens, shared), pages.css, tuner/tuner.css.
 * App.tsx: screen switch; owns the mic (usePitch) and starts it inside the tap that opens the tuner (iOS rule).
 * Home.tsx · Tuner.tsx (+ tuner/Gauge.tsx, tuner/Headstock.tsx SVG, tuner/tuner.css) · DebugPanel.tsx · Library.tsx (catalog) · SongView.tsx (tab + transport).
 * tab/draw.ts: canvas tab drawing + geometry; tab/TabCanvas.tsx: HiDPI canvas, rAF loop, drag-to-scrub.
 */
export { App } from './App';
