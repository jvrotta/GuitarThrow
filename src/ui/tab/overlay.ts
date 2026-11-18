import { firstEventAfter, type Song, type SongEvent } from '../../music';
import type { TabFrame, TabGeometry, TabTheme } from './geometry';

/**
 * The bouncing ball rides the "now" line: it arcs from one note to the next and lands as each note
 * reaches the line, so the rhythm is visible before playing. Holding on a target → small bounces in place.
 */
export function drawBall(ctx: CanvasRenderingContext2D, song: Song, f: TabFrame, g: TabGeometry, t: TabTheme, now: number) {
  const ev = song.events;
  let i = firstEventAfter(ev, f.pos);
  if (ev[i] && ev[i]!.beat < f.pos - 1e-6 && !f.waiting) i++; // inside a note: head for the next one
  const to = ev[i];
  if (!to) return;
  const from: SongEvent | undefined = ev[i - 1];
  const ballR = Math.max(5, g.r * 0.42);
  const land = (e: SongEvent) => g.y(Math.min(...e.notes.map((n) => n.string))) - g.r - ballR - 2;

  let y: number;
  if (f.waiting) {
    y = land(to) - Math.abs(Math.sin((now / 1000) * Math.PI * 1.6)) * Math.min(g.gap * 0.6, land(to) - ballR);
  } else {
    let b0 = from ? from.beat : Math.floor(f.pos);
    let b1 = to.beat;
    if (b1 - f.pos > 1 && (!from || f.pos >= from.beat + from.dur)) {
      // Long wait or count-in: bounce once per beat on the coming note.
      b0 = Math.floor(f.pos);
      b1 = b0 + 1;
    }
    const p = Math.max(0, Math.min(1, (f.pos - b0) / Math.max(1e-6, b1 - b0)));
    const y0 = from && b0 === from.beat ? land(from) : land(to);
    const room = Math.min(y0, land(to)) - ballR; // never arc off the top of the canvas
    const height = Math.min(g.gap * 1.6, (b1 - b0) * g.gap * 0.9, room);
    y = y0 + (land(to) - y0) * p - height * 4 * p * (1 - p);
  }
  ctx.save();
  ctx.shadowColor = t.text;
  ctx.shadowBlur = 10;
  ctx.fillStyle = t.text;
  ctx.beginPath();
  ctx.arc(g.cursorX, Math.max(ballR, y), ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const POPUP_MS = 900;

/** Floating result texts; returns false when none is still visible. */
export function drawPopups(ctx: CanvasRenderingContext2D, f: TabFrame, g: TabGeometry, x: (beat: number) => number, now: number) {
  ctx.font = '800 15px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of f.popups ?? []) {
    const age = (now - p.t0) / POPUP_MS;
    if (age < 0 || age > 1) continue;
    ctx.globalAlpha = 1 - age * age;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x(p.beat), g.y(p.string) - g.r - 12 - age * 36);
  }
  ctx.globalAlpha = 1;
}

/** Big count-in number next to the cursor. */
export function drawCountIn(ctx: CanvasRenderingContext2D, f: TabFrame, g: TabGeometry, t: TabTheme, h: number) {
  if (f.countIn === undefined) return;
  ctx.font = `800 ${Math.round(h * 0.28)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillText(String(f.countIn), g.cursorX + g.ppb * 1.2, h / 2);
  ctx.globalAlpha = 1;
}

/** Chord names over the tab, written where the chord changes. */
export function drawChords(ctx: CanvasRenderingContext2D, song: Song, g: TabGeometry, t: TabTheme, x: (b: number) => number, from: number, to: number) {
  const ev = song.events;
  ctx.font = '800 15px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.accent;
  for (let i = Math.max(0, firstEventAfter(ev, from) - 1); i < ev.length && ev[i]!.beat < to; i++) {
    const c = ev[i]!.chord;
    if (c && c !== ev[i - 1]?.chord) ctx.fillText(c, x(ev[i]!.beat) - g.r, g.y(1) - g.r - 22);
  }
}

/** A–B loop: shaded region with its edges. */
export function drawLoop(ctx: CanvasRenderingContext2D, f: TabFrame, g: TabGeometry, t: TabTheme, x: (b: number) => number, h: number) {
  if (!f.loop) return;
  const a = x(f.loop.a);
  const b = x(f.loop.b);
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(a, 0, b - a, h);
  ctx.globalAlpha = 0.8;
  ctx.fillRect(a - 1, g.y(1) - g.r - 4, 2, g.y(6) - g.y(1) + 2 * g.r + 8);
  ctx.fillRect(b - 1, g.y(1) - g.r - 4, 2, g.y(6) - g.y(1) + 2 * g.r + 8);
  ctx.globalAlpha = 1;
}
