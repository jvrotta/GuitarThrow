import { firstEventAfter, type NoteRef, type Song } from '../../music';
import { LABEL_W, tabGeometry, type TabFrame, type TabGeometry, type TabTheme } from './geometry';
import { drawBall, drawChords, drawCountIn, drawLoop, drawPopups } from './overlay';

const LABELS = ['Mi', 'Si', 'Sol', 'Ré', 'Lá', 'Mi'];
const DARK_TEXT = '#0d0f14';

/**
 * Draws the scrolling tab for one frame. Notes are pills: length = duration, number = fret,
 * color = finger; once judged they take the result color (green hit / dim red miss).
 */
export function drawTab(ctx: CanvasRenderingContext2D, song: Song, f: TabFrame, w: number, h: number, t: TabTheme, now: number) {
  const g = tabGeometry(w, h);
  const x = (beat: number) => g.cursorX + (beat - f.pos) * g.ppb;
  const from = f.pos - g.cursorX / g.ppb - 1;
  const to = f.pos + (w - g.cursorX) / g.ppb + 1;
  ctx.clearRect(0, 0, w, h);
  drawLoop(ctx, f, g, t, x, h);
  drawGrid(ctx, song, g, t, x, from, to);
  drawStrings(ctx, g, t, w);
  drawNotes(ctx, song, f, g, t, x, from, to, now);
  drawChords(ctx, song, g, t, x, from, to);
  drawCursor(ctx, g, t);
  drawBall(ctx, song, f, g, t, now);
  drawPopups(ctx, f, g, x, now);
  drawCountIn(ctx, f, g, t, h);
  drawLabels(ctx, g, t, h);
}

function drawGrid(ctx: CanvasRenderingContext2D, song: Song, g: TabGeometry, t: TabTheme, x: (b: number) => number, from: number, to: number) {
  const yTop = g.y(1);
  const yBot = g.y(6);
  ctx.lineWidth = 1;
  ctx.strokeStyle = t.line;
  ctx.globalAlpha = 0.35;
  for (let b = Math.max(0, Math.ceil(from)); b <= Math.min(to, song.length); b++) {
    ctx.beginPath();
    ctx.moveTo(x(b), yTop);
    ctx.lineTo(x(b), yBot);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.font = '600 11px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  [...song.bars, song.length].forEach((b, i) => {
    if (b < from || b > to) return;
    ctx.strokeStyle = t.muted;
    ctx.lineWidth = b === song.length ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x(b), yTop - 6);
    ctx.lineTo(x(b), yBot + 6);
    ctx.stroke();
    if (b < song.length) {
      ctx.fillStyle = t.muted;
      ctx.fillText(String(i + 1), x(b) + 4, yTop - g.r - 6);
    }
  });
}

/** Six strings; the three low ones are thicker with a wound texture. */
function drawStrings(ctx: CanvasRenderingContext2D, g: TabGeometry, t: TabTheme, w: number) {
  for (let s = 1; s <= 6; s++) {
    const y = g.y(s);
    ctx.strokeStyle = t.muted;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1 + (s - 1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    if (s >= 4) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = t.bg;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 2.5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = 1;
}

function drawNotes(ctx: CanvasRenderingContext2D, song: Song, f: TabFrame, g: TabGeometry, t: TabTheme, x: (b: number) => number, from: number, to: number, now: number) {
  const { r } = g;
  ctx.font = `800 ${Math.round(r * 1.15)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pulse = 0.5 + 0.5 * Math.sin((now / 1000) * Math.PI * 3);
  const ev = song.events;
  for (let i = firstEventAfter(ev, from); i < ev.length && ev[i]!.beat < to; i++) {
    const e = ev[i]!;
    const status = f.status?.[i] ?? 'pending';
    const isTarget = i === f.target;
    const x0 = x(e.beat);
    const x1 = Math.max(x0 + r * 0.2, x(e.beat + e.dur) - 6);
    const fill = (n: NoteRef) => (status === 'hit' ? t.ok : status === 'miss' ? t.bad : t.fingers[n.finger ?? 0] ?? t.muted);
    ctx.globalAlpha = status === 'miss' ? 0.4 : status === 'hit' ? 0.85 : 1;

    if (e.notes.length > 1) {
      const ys = e.notes.map((n) => g.y(n.string));
      ctx.strokeStyle = status === 'pending' ? t.text : fill(e.notes[0]!);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, Math.min(...ys));
      ctx.lineTo(x0, Math.max(...ys));
      ctx.stroke();
    }
    for (const n of e.notes) {
      const y = g.y(n.string);
      if (isTarget) {
        ctx.save();
        ctx.shadowColor = t.text;
        ctx.shadowBlur = 8 + pulse * 14;
      }
      ctx.fillStyle = fill(n);
      ctx.beginPath();
      ctx.roundRect(x0 - r, y - r, x1 - x0 + r, 2 * r, r);
      ctx.fill();
      if (isTarget) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = t.text;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = status === 'miss' ? t.text : DARK_TEXT;
      ctx.fillText(String(n.fret), x0, y + 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawCursor(ctx: CanvasRenderingContext2D, g: TabGeometry, t: TabTheme) {
  ctx.save();
  ctx.shadowColor = t.accent;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = t.accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.cursorX, g.y(1) - g.r - 4);
  ctx.lineTo(g.cursorX, g.y(6) + g.r + 4);
  ctx.stroke();
  ctx.restore();
}

/** String names over a fade, so notes slide under them. */
function drawLabels(ctx: CanvasRenderingContext2D, g: TabGeometry, t: TabTheme, h: number) {
  const fade = ctx.createLinearGradient(0, 0, LABEL_W + 24, 0);
  fade.addColorStop(0, t.bg);
  fade.addColorStop(0.65, t.bg);
  fade.addColorStop(1, 'transparent');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, LABEL_W + 24, h);
  ctx.font = '700 13px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.muted;
  LABELS.forEach((l, i) => ctx.fillText(l, 6, g.y(i + 1)));
}
