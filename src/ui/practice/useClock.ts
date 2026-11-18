import { useEffect, useRef } from 'preact/hooks';
import type { Session } from '../../engine';
import type { Settings } from '../../storage';
import { Metronome } from './metronome';

interface Refs {
  session: { current: Session | null };
  idle: { current: boolean };
  tickAt: { current: number };
}

interface Events {
  onFinish: () => void;
  /** The loop wrapped back to A. */
  onLap: () => void;
}

/**
 * The practice clock: every animation frame, while the mic listens and the run is not paused, advances
 * the session and schedules the metronome — the count-in always clicks; in Play-along the click goes
 * on through the song when the setting is on.
 */
export function useClock(active: boolean, running: boolean, ctx: AudioContext | null, refs: Refs, settings: Settings, ev: Events) {
  const live = useRef({ running, settings, ev });
  live.current = { running, settings, ev };

  useEffect(() => {
    if (!active) return;
    const metro = ctx ? new Metronome(ctx) : null;
    let raf = 0;
    let last = performance.now();
    let laps = refs.session.current?.laps ?? 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = refs.session.current;
      const l = live.current;
      if (!s || !l.running || refs.idle.current) return metro?.reset();
      s.tick(dt);
      refs.tickAt.current = now / 1000;
      if (s.laps !== laps) {
        laps = s.laps;
        l.ev.onLap();
      }
      if (metro && l.settings.clickVolume > 0) {
        const start = s.loop?.a ?? 0;
        const always = s.mode === 'play' && l.settings.metronome;
        metro.schedule(s.position, s.spb, s.barBeats, l.settings.clickVolume, (b) => always || b < start);
      }
      if (s.finished) l.ev.onFinish();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, ctx]);
}
