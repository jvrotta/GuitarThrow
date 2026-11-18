import { firstEventAfter, type Song } from '../../music';

/** Colors read once from the CSS tokens on :root. */
export interface TabTheme {
  bg: string;
  text: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
}

export function readTheme(): TabTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { bg: v('--bg'), text: v('--text'), muted: v('--muted'), line: v('--line'), surface: v('--surface-2'), accent: v('--accent') };
}

const LABELS = ['Mi', 'Si', 'Sol', 'Ré', 'Lá', 'Mi'];
const LABEL_W = 42;

/** Layout shared by drawing and touch scrubbing. */
export function tabGeometry(width: number, height: number) {
  const top = 28;
  const gap = (height - top - 16) / 5;
  return {
    top,
    gap,
    /** Pixels per beat. */
    ppb: Math.max(70, Math.min(150, width / 7)),
    /** The "now" line sits at 1/3 of the width (more room to read ahead). */
    cursorX: Math.round(Math.max(LABEL_W + 40, width / 3)),
    y: (string: number) => top + (string - 1) * gap,
  };
}

/** Draws the tab around position `pos` (beats). `target` highlights one event (Wait mode, M3). */
export function drawTab(ctx: CanvasRenderingContext2D, song: Song, pos: number, w: number, h: number, t: TabTheme, target?: number) {
  const g = tabGeometry(w, h);
  const x = (beat: number) => g.cursorX + (beat - pos) * g.ppb;
  const from = pos - g.cursorX / g.ppb - 1;
  const to = pos + (w - g.cursorX) / g.ppb + 1;
  const yTop = g.y(1);
  const yBot = g.y(6);
  ctx.clearRect(0, 0, w, h);

  // Beat grid and bar lines with numbers.
  ctx.lineWidth = 1;
  for (let b = Math.max(0, Math.ceil(from)); b <= Math.min(to, song.length); b++) {
    ctx.strokeStyle = t.line;
    ctx.globalAlpha = 0.35;
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
      ctx.fillText(String(i + 1), x(b) + 4, yTop - 12);
    }
  });

  // Strings (low strings thicker).
  for (let s = 1; s <= 6; s++) {
    ctx.strokeStyle = t.muted;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1 + (s - 1) * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, g.y(s));
    ctx.lineTo(w, g.y(s));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Notes: sustain bar + fret badge. Past notes fade, the sounding/target event lights up.
  const r = Math.min(g.gap * 0.42, 17);
  ctx.font = `700 ${Math.round(r * 1.15)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ev = song.events;
  for (let i = firstEventAfter(ev, from); i < ev.length && ev[i]!.beat < to; i++) {
    const e = ev[i]!;
    const x0 = x(e.beat);
    const x1 = x(e.beat + e.dur) - r * 0.6;
    const current = target !== undefined ? i === target : e.beat <= pos && pos < e.beat + e.dur;
    const past = target !== undefined ? i < target : e.beat + e.dur <= pos;
    ctx.globalAlpha = past ? 0.3 : 1;

    if (e.notes.length > 1) {
      ctx.strokeStyle = current ? t.accent : t.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, g.y(e.notes[0]!.string));
      ctx.lineTo(x0, g.y(e.notes[e.notes.length - 1]!.string));
      ctx.stroke();
    }
    for (const n of e.notes) {
      const y = g.y(n.string);
      ctx.fillStyle = current ? t.accent : t.text;
      ctx.globalAlpha = (past ? 0.3 : 1) * 0.22;
      roundRect(ctx, x0, y - r * 0.32, Math.max(0, x1 - x0), r * 0.64, r * 0.32);
      ctx.globalAlpha = past ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(x0, y, r, 0, Math.PI * 2);
      ctx.fillStyle = current ? t.accent : t.surface;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = current ? t.accent : t.text;
      ctx.stroke();
      ctx.fillStyle = current ? t.bg : t.text;
      ctx.fillText(String(n.fret), x0, y + 1);
    }
  }
  ctx.globalAlpha = 1;

  // "Now" line.
  ctx.save();
  ctx.shadowColor = t.accent;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.cursorX, yTop - 14);
  ctx.lineTo(g.cursorX, yBot + 14);
  ctx.stroke();
  ctx.restore();

  // String names over a fade, so notes slide under them.
  const fade = ctx.createLinearGradient(0, 0, LABEL_W + 24, 0);
  fade.addColorStop(0, t.bg);
  fade.addColorStop(0.65, t.bg);
  fade.addColorStop(1, 'transparent');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, LABEL_W + 24, h);
  ctx.font = '700 13px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = t.muted;
  LABELS.forEach((l, i) => ctx.fillText(l, 6, g.y(i + 1)));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2));
  ctx.fill();
}
