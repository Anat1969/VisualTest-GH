import type { P2, Prim, SceneSpec, TextSpec, Tone, When } from '../../logic/types';

const TONES: Record<string, string> = {
  ink: 'var(--ink)',
  muted: 'var(--ink-3)',
  line: 'var(--line-strong)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  stim: 'var(--stim)',
  water: '#8FB3CF',
  paper: '#FBF9F4',
  sunk: 'var(--surface-sunk)',
  ok: 'var(--ok)',
  bad: 'var(--bad)',
  none: 'none',
};
export const tone = (t: Tone | undefined, fallback = 'none') => (t ? (TONES[t] ?? t) : fallback);

/**
 * Time on a dynamic item's timeline: 0..1 plays up to the question point, 1 is the pause,
 * 1..2 is the reveal after answering. Static scenes render at t = 1.
 */
function visible(when: When | undefined, t: number, revealing: boolean) {
  if (!when) return true;
  const playing = t < 1;
  switch (when) {
    case 'play':
      return playing;
    case 'pause':
      return !playing && !revealing;
    case 'reveal':
      return revealing;
    case 'pre':
      return !revealing;
    case 'post':
      return !playing;
  }
}

function along(path: P2[], u: number): P2 {
  if (path.length === 1) return path[0];
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    d -= lens[i];
  }
  return path[path.length - 1];
}

const pts = (list: P2[]) => list.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

function gearPath(r: number, teeth: number) {
  const out: P2[] = [];
  const inner = r * 0.84;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    out.push([Math.cos(a) * inner, Math.sin(a) * inner]);
    out.push([Math.cos(a + step * 0.12) * r, Math.sin(a + step * 0.12) * r]);
    out.push([Math.cos(a + step * 0.48) * r, Math.sin(a + step * 0.48) * r]);
    out.push([Math.cos(a + step * 0.6) * inner, Math.sin(a + step * 0.6) * inner]);
  }
  return pts(out);
}

function Arrow({ list, color, w, dash }: { list: P2[]; color: string; w: number; dash?: boolean }) {
  const a = list[list.length - 2];
  const b = list[list.length - 1];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const h = w * 4.2;
  const head: P2[] = [
    b,
    [b[0] - h * Math.cos(ang - 0.42), b[1] - h * Math.sin(ang - 0.42)],
    [b[0] - h * Math.cos(ang + 0.42), b[1] - h * Math.sin(ang + 0.42)],
  ];
  return (
    <g>
      <polyline points={pts(list)} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dash ? `${w * 3} ${w * 2}` : undefined} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={pts(head)} fill={color} />
    </g>
  );
}

function PrimView({ prim, t, revealing, unit }: { prim: Prim; t: number; revealing: boolean; unit: number }) {
  if (!visible(prim.when, t, revealing)) return null;
  const a = prim.anim;
  let transform: string | undefined;
  if (a?.spin && a.c) transform = `rotate(${(a.spin * t).toFixed(2)} ${a.c[0]} ${a.c[1]})`;
  if (a?.from) {
    const f = Math.max(0, 1 - Math.min(1, t));
    transform = `translate(${(a.from[0] * f).toFixed(3)} ${(a.from[1] * f).toFixed(3)})`;
  }
  const sw = (w?: number) => (w ?? 1) * unit;
  switch (prim.p) {
    case 'line':
      return prim.closed ? (
        <polygon
          points={pts(prim.pts)}
          transform={transform}
          fill={tone(prim.fill)}
          stroke={tone(prim.tone, 'var(--ink)')}
          strokeWidth={sw(prim.w)}
          strokeDasharray={prim.dash ? `${sw(prim.w) * 3} ${sw(prim.w) * 2}` : undefined}
          strokeLinejoin="round"
          opacity={prim.opacity}
        />
      ) : (
        <polyline
          points={pts(prim.pts)}
          transform={transform}
          fill="none"
          stroke={tone(prim.tone, 'var(--ink)')}
          strokeWidth={sw(prim.w)}
          strokeDasharray={prim.dash ? `${sw(prim.w) * 3} ${sw(prim.w) * 2}` : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={prim.opacity}
        />
      );
    case 'circle': {
      let c = prim.c;
      if (a?.path && t <= 1) c = along(a.path, t);
      if (a?.path && t > 1) c = a.revealPath ? along(a.revealPath, t - 1) : along(a.path, 1);
      return (
        <circle
          cx={c[0]}
          cy={c[1]}
          r={prim.r}
          transform={transform}
          fill={tone(prim.fill)}
          stroke={tone(prim.tone, 'var(--ink)')}
          strokeWidth={sw(prim.w)}
          strokeDasharray={prim.dash ? `${sw(prim.w) * 3} ${sw(prim.w) * 2}` : undefined}
        />
      );
    }
    case 'rect':
      return (
        <rect
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          rx={prim.rx}
          transform={transform}
          fill={tone(prim.fill)}
          stroke={tone(prim.tone, 'var(--ink)')}
          strokeWidth={sw(prim.sw)}
        />
      );
    case 'text':
      return (
        <text
          x={prim.at[0]}
          y={prim.at[1]}
          fontSize={prim.size ?? unit * 14}
          fontWeight={prim.weight ?? 600}
          fill={tone(prim.tone, 'var(--ink)')}
          textAnchor={prim.anchor ?? 'middle'}
          dominantBaseline="central"
          fontFamily="var(--font-body)"
          transform={transform}
        >
          {prim.text}
        </text>
      );
    case 'arrow':
      return (
        <g transform={transform}>
          <Arrow list={prim.pts} color={tone(prim.tone, 'var(--ink)')} w={sw(prim.w ?? 1.6)} dash={prim.dash} />
        </g>
      );
    case 'gear':
      return (
        <g transform={`translate(${prim.c[0]} ${prim.c[1]})`}>
          <g transform={`rotate(${((prim.angle ?? 0) + (a?.spin ?? 0) * t).toFixed(2)})`}>
            <polygon points={gearPath(prim.r, prim.teeth)} fill={tone(prim.fill, 'var(--stim)')} stroke="var(--ink)" strokeWidth={sw(1.4)} strokeLinejoin="round" />
            <line x1={0} y1={0} x2={prim.r * 0.62} y2={0} stroke="var(--ink)" strokeWidth={sw(1.4)} />
          </g>
          <circle r={prim.r * 0.16} fill="var(--surface)" stroke="var(--ink)" strokeWidth={sw(1.4)} />
          {prim.label && (
            <text y={-prim.r - unit * 11} fontSize={unit * 15} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill="var(--ink)">
              {prim.label}
            </text>
          )}
        </g>
      );
  }
}

/** Generic drawing. `t` follows the dynamic timeline (static scenes use the default). */
export function Scene({ spec, t = 1, revealing = false, label }: { spec: SceneSpec; t?: number; revealing?: boolean; label?: string }) {
  const [x, y, w, h] = spec.box;
  const unit = Math.max(w, h) / 300; // stroke and text sizes scale with the drawing
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label ?? spec.label ?? 'תרשים'} className={`stim-svg ${w / h > 1.3 ? 'wide' : ''}`}>
      {spec.prims.map((p, i) => (
        <PrimView key={i} prim={p} t={t} revealing={revealing} unit={unit} />
      ))}
    </svg>
  );
}

export function TextOption({ spec }: { spec: TextSpec }) {
  return (
    <span className="text-option">
      <strong>{spec.text}</strong>
      {spec.sub && <span className="small muted">{spec.sub}</span>}
    </span>
  );
}
