/**
 * ui — screens and components (Preact). Interface text in pt-BR. Styles: styles.css (tokens, tuner), pages.css.
 * App.tsx: screen switch; owns the mic (usePitch) and starts it inside the tap that opens the tuner (iOS rule).
 * Home.tsx · Tuner.tsx + StringRows.tsx · DebugPanel.tsx · Library.tsx (catalog) · SongView.tsx (tab + transport).
 * tab/draw.ts: canvas tab drawing + geometry; tab/TabCanvas.tsx: HiDPI canvas, rAF loop, drag-to-scrub.
 */
export { App } from './App';
