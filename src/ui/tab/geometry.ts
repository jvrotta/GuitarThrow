import type { EventStatus } from '../../engine';

/** Colors read once from the CSS tokens on :root. */
export interface TabTheme {
  bg: string;
  text: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
  ok: string;
  bad: string;
  /** Index = finger: 0 open string, 1 index, 2 middle, 3 ring, 4 little. Never green/red (those mean results). */
  fingers: string[];
}

export function readTheme(): TabTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v('--bg'),
    text: v('--text'),
    muted: v('--muted'),
    line: v('--line'),
    surface: v('--surface-2'),
    accent: v('--accent'),
    ok: v('--ok'),
    bad: v('--far'),
    fingers: [0, 1, 2, 3, 4].map((i) => v(`--finger-${i}`)),
  };
}

/** A text that floats up from a note ("Perfeito!"), timed with performance.now(). */
export interface Popup {
  beat: number;
  string: number;
  text: string;
  color: string;
  t0: number;
}

/** Everything that changes from frame to frame. */
export interface TabFrame {
  /** Cursor position in beats. */
  pos: number;
  /** Wait mode: index of the event to play now. */
  target?: number;
  /** Clock holding on the target: the ball bounces in place. */
  waiting?: boolean;
  /** Per-event result; past notes take the result color. */
  status?: readonly EventStatus[];
  /** Count-in number to show at the cursor. */
  countIn?: number;
  popups?: readonly Popup[];
}

export const LABEL_W = 42;

/** Layout shared by drawing and touch scrubbing. */
export function tabGeometry(width: number, height: number) {
  const top = 50; // room for bar numbers and the ball bouncing over string 1
  const gap = (height - top - 18) / 5;
  return {
    top,
    gap,
    /** Note half-height. */
    r: Math.min(gap * 0.42, 17),
    /** Pixels per beat. */
    ppb: Math.max(70, Math.min(150, width / 7)),
    /** The "now" line sits at 1/3 of the width (more room to read ahead). */
    cursorX: Math.round(Math.max(LABEL_W + 40, width / 3)),
    y: (string: number) => top + (string - 1) * gap,
  };
}

export type TabGeometry = ReturnType<typeof tabGeometry>;
