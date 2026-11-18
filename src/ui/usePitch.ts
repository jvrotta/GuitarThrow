import { useEffect, useRef, useState } from 'preact/hooks';
import { MedianSmoother, MicError, startPitchSession, type MicInfo, type PitchFrame, type PitchSession } from '../audio';
import { acquireWakeLock } from './wakeLock';

export type MicStatus = 'idle' | 'starting' | 'running' | 'error';

export interface PitchState {
  status: MicStatus;
  error: string;
  info: MicInfo | null;
  /** Latest raw frame (debug). */
  frame: PitchFrame | null;
  /** Median-smoothed frequency, null when nothing pitched is heard. */
  freq: number | null;
  /** Analysis frames per second actually received. */
  fps: number;
  start(): void;
  stop(): void;
  record(seconds: number): Promise<Uint8Array<ArrayBuffer>>;
}

/**
 * Owns a PitchSession for a screen. Audio frames arrive ~90×/s; the UI re-renders once per
 * animation frame with the latest values. Stops when the app goes to background (iOS cuts the mic).
 */
export function usePitch(): PitchState {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState<MicInfo | null>(null);
  const [view, setView] = useState<{ frame: PitchFrame | null; freq: number | null; fps: number }>({
    frame: null,
    freq: null,
    fps: 0,
  });
  const session = useRef<PitchSession | null>(null);
  const releaseLock = useRef<() => void>(() => {});
  const latest = useRef({ frame: null as PitchFrame | null, freq: null as number | null, count: 0 });

  const stop = () => {
    const s = session.current;
    session.current = null;
    releaseLock.current();
    if (s) void s.stop();
    setStatus('idle');
    setView({ frame: null, freq: null, fps: 0 });
  };

  const start = () => {
    if (session.current) return;
    setStatus('starting');
    setError('');
    const smoother = new MedianSmoother(5);
    // Called synchronously from the tap handler: iOS requires it for audio.
    startPitchSession((f) => {
      const l = latest.current;
      l.frame = f;
      l.freq = smoother.push(f.freq);
      l.count++;
    })
      .then(async (s) => {
        session.current = s;
        setInfo(s.info);
        setStatus('running');
        releaseLock.current = await acquireWakeLock();
      })
      .catch((e: unknown) => {
        setError(e instanceof MicError ? e.message : `Erro ao abrir o microfone: ${String(e)}`);
        setStatus('error');
      });
  };

  // Render loop + fps counter while running.
  useEffect(() => {
    if (status !== 'running') return;
    let raf = 0;
    let fps = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      const l = latest.current;
      if (now - t0 >= 1000) {
        fps = Math.round((l.count * 1000) / (now - t0));
        l.count = 0;
        t0 = now;
      }
      setView({ frame: l.frame, freq: l.freq, fps });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // Background → stop; unmount → stop.
  useEffect(() => {
    const onVis = () => document.hidden && stop();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, []);

  return {
    status,
    error,
    info,
    ...view,
    start,
    stop,
    record: (seconds) => session.current?.record(seconds) ?? Promise.reject(new Error('Microfone desligado.')),
  };
}
