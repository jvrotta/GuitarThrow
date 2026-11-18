import { useEffect, useRef } from 'preact/hooks';
import type { Song } from '../../music';
import { drawTab } from './draw';
import { readTheme, tabGeometry, type TabFrame } from './geometry';

interface Props {
  song: Song;
  /** Polled every animation frame. */
  getFrame: () => TabFrame;
  /** Drag to scrub: called with the new position in beats. */
  onScrub?: (beat: number, phase: 'start' | 'move' | 'end') => void;
}

/** HiDPI canvas that redraws the scrolling tab every frame. */
export function TabCanvas({ song, getFrame, onScrub }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const drag = useRef<{ x: number; pos: number } | null>(null);
  const frameFn = useRef(getFrame);
  frameFn.current = getFrame;

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const theme = readTheme();
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w: width, h: height };
    });
    ro.observe(c);
    let raf = 0;
    const frame = (now: number) => {
      const { w, h } = size.current;
      if (w > 0) drawTab(ctx, song, frameFn.current(), w, h, theme, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [song]);

  const clampBeat = (b: number) => Math.max(0, Math.min(song.length, b));
  const ppb = () => tabGeometry(size.current.w, size.current.h).ppb;

  return (
    <canvas
      ref={canvas}
      class="tab-canvas"
      onPointerDown={(e) => {
        if (!onScrub) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, pos: frameFn.current().pos };
        onScrub(drag.current.pos, 'start');
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d && onScrub) onScrub(clampBeat(d.pos - (e.clientX - d.x) / ppb()), 'move');
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (d && onScrub) onScrub(clampBeat(d.pos - (e.clientX - d.x) / ppb()), 'end');
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    />
  );
}
