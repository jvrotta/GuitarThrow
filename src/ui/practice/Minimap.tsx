import { useEffect, useRef } from 'preact/hooks';
import type { EventStatus } from '../../engine';
import type { Song } from '../../music';

interface Props {
  song: Song;
  status: readonly EventStatus[];
  getPos: () => number;
  /** Tap or drag → jump to that point (beats). */
  onSeek: (beat: number) => void;
}

const COLOR: Record<EventStatus, string> = { pending: 'var(--muted)', hit: 'var(--ok)', miss: 'var(--far)' };

/** Whole-song strip: every note as a tick (colored by result), playhead, tap/drag to seek. */
export function Minimap({ song, status, getPos, onSeek }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pct = Math.max(0, Math.min(1, getPos() / song.length)) * 100;
      if (head.current) head.current.style.left = `${pct}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [song]);

  const beatAt = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * song.length;
  };

  return (
    <div
      ref={box}
      class="minimap"
      role="slider"
      aria-label="Posição na música"
      aria-valuemin={0}
      aria-valuemax={song.length}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragging.current = true;
        onSeek(beatAt(e.clientX));
      }}
      onPointerMove={(e) => dragging.current && onSeek(beatAt(e.clientX))}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <svg viewBox={`0 0 ${song.length} 7`} preserveAspectRatio="none" aria-hidden="true">
        {song.bars.slice(1).map((b) => (
          <rect key={b} x={b} y={0} width={song.length / 400} height={7} fill="var(--line)" />
        ))}
        {song.events.flatMap((e, i) =>
          e.notes.map((n) => (
            <rect
              key={`${i}-${n.string}`}
              x={e.beat}
              y={n.string - 0.4}
              width={Math.max(e.dur * 0.8, song.length / 300)}
              height={0.8}
              fill={COLOR[status[i] ?? 'pending']}
              opacity={status[i] === 'pending' ? 0.6 : 1}
            />
          )),
        )}
      </svg>
      <div ref={head} class="minimap-head" />
    </div>
  );
}
