/**
 * Front view of a 3+3 headstock: left pegs Ré/Lá/Mi(6) top→bottom, right pegs Sol/Si/Mi(1).
 * Each peg's label is a button (tap = lock that string). The active string, its peg and label light up,
 * so the player sees which tuning key to turn.
 */

interface Peg {
  string: number;
  side: -1 | 1;
  y: number;
}

const PEGS: Peg[] = [
  { string: 4, side: -1, y: 70 },
  { string: 5, side: -1, y: 130 },
  { string: 6, side: -1, y: 190 },
  { string: 3, side: 1, y: 70 },
  { string: 2, side: 1, y: 130 },
  { string: 1, side: 1, y: 190 },
];
const CX = 130;
const POST_DX = 26;
const KEY_DX = 72;
const LABEL_DX = 108;
const NUT_Y = 262;
/** Nut x for strings 1..6 (high E on the right, as seen from the front). */
const nutX = (s: number) => CX + 22 - (s - 1) * 8.8;

export type PegState = 'idle' | 'active' | 'ok';

interface Props {
  labels: string[];
  active: number | null;
  activeOk: boolean;
  locked: number | null;
  done: ReadonlySet<number>;
  onPick: (string: number) => void;
}

export function Headstock({ labels, active, activeOk, locked, done, onPick }: Props) {
  const tone = (s: number) => (s === active ? (activeOk ? 'ok' : 'active') : 'idle');

  return (
    <svg class="headstock" viewBox="0 0 260 300" role="group" aria-label="Cordas do violão">
      <defs>
        <linearGradient id="hs-wood" x1="0" x2="1">
          <stop offset="0" stop-color="#3a2416" />
          <stop offset="0.5" stop-color="#5a3a22" />
          <stop offset="1" stop-color="#3a2416" />
        </linearGradient>
      </defs>

      {/* Keys (behind the head) */}
      {PEGS.map((p) => (
        <g key={`k${p.string}`} class={`hs-key ${tone(p.string)}`}>
          <rect x={Math.min(CX + p.side * POST_DX, CX + p.side * KEY_DX)} y={p.y - 3} width={KEY_DX - POST_DX} height="6" rx="3" />
          <ellipse cx={CX + p.side * KEY_DX} cy={p.y} rx="11" ry="16" />
        </g>
      ))}

      {/* Head and neck */}
      <path
        class="hs-head"
        fill="url(#hs-wood)"
        d="M100,300 L100,262 C90,242 82,214 80,180 L78,46 Q78,18 106,14 Q130,6 154,14 Q182,18 182,46 L180,180 C178,214 170,242 160,262 L160,300 Z"
      />
      <rect class="hs-board" x="100" y={NUT_Y} width="60" height="38" />
      <rect class="hs-nut" x="99" y={NUT_Y - 3} width="62" height="5" rx="2" />

      {/* Strings: post → nut → down the fretboard */}
      {PEGS.map((p) => {
        const px = CX + p.side * POST_DX;
        const nx = nutX(p.string);
        return (
          <polyline
            key={`s${p.string}`}
            class={`hs-string ${tone(p.string)}`}
            points={`${px},${p.y} ${nx},${NUT_Y} ${nx},300`}
            stroke-width={0.9 + (p.string - 1) * 0.35}
          />
        );
      })}

      {/* Posts */}
      {PEGS.map((p) => (
        <circle key={`p${p.string}`} class={`hs-post ${tone(p.string)}`} cx={CX + p.side * POST_DX} cy={p.y} r="6" />
      ))}

      {/* Labels (tap targets) */}
      {PEGS.map((p) => {
        const x = CX + p.side * LABEL_DX;
        const s = p.string;
        return (
          <g
            key={`l${s}`}
            class={`hs-label ${tone(s)} ${locked === s ? 'locked' : ''}`}
            role="button"
            aria-label={`${s}ª corda ${labels[s - 1]}${locked === s ? ', travada' : ''}`}
            onClick={() => onPick(s)}
          >
            <circle cx={x} cy={p.y} r="21" />
            <text x={x} y={p.y + 1}>
              {labels[s - 1]}
            </text>
            <text class="hs-num" x={x} y={p.y + 33}>
              {s}ª
            </text>
            {done.has(s) && (
              <g class="hs-done">
                <circle cx={x + p.side * -16} cy={p.y - 16} r="8" />
                <path d={`M${x + p.side * -16 - 4},${p.y - 16} l3,3 l5,-6`} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
