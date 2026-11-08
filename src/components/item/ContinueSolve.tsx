import { useMemo } from 'react';
import { add, axisAngle, mulM, scale } from '../../logic/geometry';
import { fitContinue2D } from '../../logic/solve2d';
import { fitContinue3D } from '../../logic/solve3d';
import type { Cubes3DSpec, DynamicSpec, Item, Poly2DSpec } from '../../logic/types';
import { faces } from './RotationSolve';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Dynamic rotation: from the question point the shape keeps turning the way it was turning, until it meets the
 * chosen option. An arc counts the turn against what the question asked: green up to the asked amount, red past
 * it, dashed where it falls short. An option no turn can meet (a mirror image, another axis) shows red parts.
 */

const T_LIFT = 500, T_LAND = 600, T_BACK = 1100;
const turnTime = (deg: number) => 700 + deg * 6;

type Rot2 = Extract<DynamicSpec, { kind: 'rotate2d' }>;
type Rot3 = Extract<DynamicSpec, { kind: 'rotate3d' }>;

export const canContinue2D = (item: Item) => item.type === 'rotation' && item.dynamic?.kind === 'rotate2d' && item.stimulus.kind === 'poly2d';
export const canContinue3D = (item: Item) => item.type === 'rotation' && item.dynamic?.kind === 'rotate3d' && item.stimulus.kind === 'cubes3d';

function caption(L: string, ms: number, total: number, done: boolean, back: number, deg: number, f: { same: boolean; right: boolean; x: number; delta: number; miss: number; unit: [string, string] }) {
  if (done && back > 0) return `${L} לא מתאימה. נסי שוב מנקודת העצירה`;
  if (back > 0) return 'הצורה חוזרת לנקודת העצירה';
  if (ms >= total) {
    if (f.right) return `המשך של ${f.x}° באותו כיוון מביא בדיוק אל ${L}`;
    if (!f.same) return `${count(f.miss, f.unit[0], f.unit[1])} מקום ב-${L}: שום המשך של הסיבוב לא מביא אליה`;
    if (f.delta === 360) return `${L} היא המצב בנקודת העצירה: רק סיבוב שלם מחזיר אליה`;
    return `כדי להגיע אל ${L} צריך להמשיך ${f.delta}°, לא ${f.x}°`;
  }
  if (ms < T_LIFT) return 'ממשיכים מנקודת העצירה, באותו כיוון';
  return `${deg}° מתוך ${f.x}° שהשאלה מבקשת`;
}

/** The sweep so far, against the asked amount, drawn around the figure. */
function Arc({ r, dir, swept, x, show }: { r: number; dir: number; swept: number; x: number; show: number }) {
  const at = (deg: number): [number, number] => {
    const a = ((-90 + dir * deg) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  };
  const path = (a: number, b: number) => {
    if (b - a < 0.5) return '';
    const [x0, y0] = at(a), [x1, y1] = at(b);
    return `M${x0} ${y0} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} ${dir > 0 ? 1 : 0} ${x1} ${y1}`;
  };
  const [tx, ty] = at(x);
  const [ix, iy] = at(x).map((v) => v * 0.9);
  return (
    <g opacity={show} fill="none" strokeLinecap="round">
      {swept < x && <path d={path(swept, x)} stroke={SOLVE.ink} strokeOpacity={0.35} strokeWidth={r * 0.03} strokeDasharray={`${r * 0.05} ${r * 0.05}`} />}
      <path d={path(0, Math.min(swept, x))} stroke={SOLVE.ok} strokeWidth={r * 0.05} />
      {swept > x && <path d={path(x, swept)} stroke={SOLVE.bad} strokeWidth={r * 0.05} />}
      <line x1={ix} y1={iy} x2={tx * 1.08} y2={ty * 1.08} stroke={SOLVE.ink} strokeWidth={r * 0.025} />
      <text x={tx * 1.2} y={ty * 1.2} fontSize={r * 0.11} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={SOLVE.ink} stroke="none">
        {x}°
      </text>
    </g>
  );
}

export function Continue2DSolve({ item, target }: SolveProps) {
  const start = item.stimulus as Poly2DSpec;
  const spec = item.dynamic as Rot2;
  const opt = item.options[target].visual as Poly2DSpec;
  const fit = useMemo(() => fitContinue2D(start, opt, spec.to, spec.reveal), [start, opt, spec]);
  const T_TURN = turnTime(fit.delta);
  const TOTAL = T_LIFT + T_TURN + T_LAND;
  const END = fit.right ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const turn = ease(phase(ms, T_LIFT, T_TURN)) * (1 - back);
  const land = phase(ms, T_LIFT + T_TURN, T_LAND) * (1 - back);
  const swept = fit.delta * turn;
  const angle = start.angle + fit.dir * swept;
  const xs = start.cells.map((c) => c[0]), ys = start.cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
  const oxs = opt.cells.map((c) => c[0]), oys = opt.cells.map((c) => c[1]);
  const ox = (Math.min(...oxs) + Math.max(...oxs) + 1) / 2, oy = (Math.min(...oys) + Math.max(...oys) + 1) / 2;
  const [sx, sy] = [fit.shift[0] * turn, fit.shift[1] * turn];
  const up = lift * (1 - land);
  const color = (i: number) =>
    land > 0.5 ? (fit.same ? (fit.right ? SOLVE.ok : SOLVE.stim) : fit.hits[i] ? SOLVE.ok : SOLVE.bad) : i === 0 && up > 0.3 ? SOLVE.anchor : SOLVE.stim;
  const L = OPTION_LABELS[target];
  const text = caption(L, ms, TOTAL, done, back, Math.round(swept), {
    same: fit.same, right: fit.right, x: fit.x, delta: fit.delta, miss: fit.hits.filter((h) => !h).length, unit: ['משבצת אחת לא מוצאת', 'משבצות לא מוצאות'],
  });

  return (
    <>
      <svg viewBox="-3.4 -3.4 6.8 6.8" className="stim-svg" role="img" aria-label={text}>
        {fit.same && <Arc r={3.05} dir={fit.dir} swept={swept} x={fit.x} show={Math.max(lift, back > 0 ? 1 - back : 0)} />}
        {land > 0 && (
          <g transform={`rotate(${opt.angle}) scale(${opt.mirror ? -1 : 1} 1) translate(${-ox} ${-oy})`} opacity={land}>
            {opt.cells.map(([x, y]) => <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="none" stroke={SOLVE.ink} strokeWidth={0.06} strokeDasharray="0.14 0.09" strokeOpacity={0.7} />)}
          </g>
        )}
        <g transform={`translate(${sx} ${sy}) rotate(${angle}) scale(${1 + 0.06 * up}) translate(${-cx} ${-cy})`}>
          {start.cells.map(([x, y], i) => <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={color(i)} stroke={SOLVE.ink} strokeWidth={0.06} strokeLinejoin="round" />)}
        </g>
      </svg>
      <SolveChrome caption={text} verdict={ms >= TOTAL ? (fit.right ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}

export function Continue3DSolve({ item, target }: SolveProps) {
  const start = item.stimulus as Cubes3DSpec;
  const spec = item.dynamic as Rot3;
  const opt = item.options[target].visual as Cubes3DSpec;
  const dir = Math.sign(spec.reveal - spec.to) || 1;
  const x = Math.abs(spec.reveal - spec.to);
  const fit = useMemo(() => fitContinue3D(start.cubes, start.rot, spec.axis, dir, x, opt.cubes, opt.rot), [start, spec, dir, x, opt]);
  const T_TURN = turnTime(fit.theta);
  const TOTAL = T_LIFT + T_TURN + T_LAND;
  const END = fit.right ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const turn = ease(phase(ms, T_LIFT, T_TURN)) * (1 - back);
  const land = phase(ms, T_LIFT + T_TURN, T_LAND) * (1 - back);
  const swept = fit.theta * turn;
  const R = mulM(axisAngle(spec.axis, dir * swept), start.rot);
  const hover = 0.35 * Math.sin(Math.PI * phase(ms, 0, T_LIFT + T_TURN)) * (1 - back);
  const off = add(scale(fit.t, turn), [0, 0, hover]);
  const color = (i: number) => (land > 0.5 ? (fit.same ? (fit.right ? SOLVE.ok : SOLVE.stim) : fit.hits[i] ? SOLVE.ok : SOLVE.bad) : i < 2 && lift * (1 - land) > 0.3 ? SOLVE.anchor : SOLVE.stim);
  const polys = [
    ...(land > 0 ? faces(opt.cubes, opt.rot, [0, 0, 0], 0, 1, () => SOLVE.stim, true, 'g') : []),
    ...faces(start.cubes, R, off, 0, 1, color, false, 'o'),
  ].sort((a, b) => a.z - b.z);
  const radius = Math.max(...start.cubes.map((c) => Math.hypot(...c))) + 0.9 + Math.hypot(...fit.t);
  const r = Math.max(2.6, radius);
  const L = OPTION_LABELS[target];
  const text = caption(L, ms, TOTAL, done, back, Math.round(swept), {
    same: fit.same, right: fit.right, x, delta: fit.theta, miss: fit.hits.filter((h) => !h).length, unit: ['קובייה אחת לא מוצאת', 'קוביות לא מוצאות'],
  });

  return (
    <>
      <svg viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} className="stim-svg" role="img" aria-label={text}>
        {fit.same && <Arc r={r * 0.92} dir={1} swept={swept} x={x} show={Math.max(lift, back > 0 ? 1 - back : 0) * 0.9} />}
        {polys.map((p) => (
          <polygon key={p.key} points={p.points} fill={p.fill} fillOpacity={p.ghost ? 0.22 * land : 1} stroke="var(--ink)" strokeOpacity={p.ghost ? 0.5 * land : 1} strokeDasharray={p.ghost ? '0.12 0.08' : undefined} strokeWidth={0.045} strokeLinejoin="round" />
        ))}
      </svg>
      <SolveChrome caption={text} verdict={ms >= TOTAL ? (fit.right ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
