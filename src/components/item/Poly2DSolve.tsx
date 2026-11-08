import { useMemo } from 'react';
import { fitPoly } from '../../logic/solve2d';
import type { Item, Poly2DSpec } from '../../logic/types';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * 2D rotation: the original lifts off the page and turns (rotation only, never a flip) onto the chosen option.
 * Cells that land are green, cells that find no place are red. A wrong option goes back to the original.
 */

const T_LIFT = 600, T_TURN = 1800, T_LAND = 600, T_BACK = 1000;
const TOTAL = T_LIFT + T_TURN + T_LAND;

export const canSolve2D = (item: Item) => item.type === 'rotation' && item.motion === 'static' && item.stimulus.kind === 'poly2d';

function centre(spec: Poly2DSpec) {
  const xs = spec.cells.map((c) => c[0]);
  const ys = spec.cells.map((c) => c[1]);
  return [(Math.min(...xs) + Math.max(...xs) + 1) / 2, (Math.min(...ys) + Math.max(...ys) + 1) / 2];
}

export function Poly2DSolve({ item, target }: SolveProps) {
  const start = item.stimulus as Poly2DSpec;
  const opt = item.options[target].visual as Poly2DSpec;
  const fit = useMemo(() => fitPoly(start, opt), [start, opt]);
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const turn = ease(phase(ms, T_LIFT, T_TURN)) * (1 - back);
  const land = phase(ms, T_LIFT + T_TURN, T_LAND) * (1 - back);
  const up = lift * (1 - land) * (1 - back);

  const angle = start.angle + (fit.angle - start.angle) * turn;
  const [sx, sy] = [fit.shift[0] * turn, fit.shift[1] * turn];
  const [cx, cy] = centre(start);
  const [ox, oy] = centre(opt);
  const s = 1 + 0.07 * up;
  const color = (i: number) => (land > 0.5 ? (fit.hits[i] ? SOLVE.ok : SOLVE.bad) : i === 0 && up > 0.3 ? SOLVE.anchor : SOLVE.stim);

  const miss = fit.hits.filter((h) => !h).length;
  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב מהמצב המקורי`
    : back > 0
      ? 'הצורה חוזרת למצב המקורי'
      : landed
        ? fit.same
          ? `כל ${start.cells.length} המשבצות יושבות על ${L}`
          : `${count(miss, 'משבצת אחת לא מוצאת', 'משבצות לא מוצאות')} מקום ב-${L}, גם בסיבוב הקרוב ביותר`
        : ms < T_LIFT
          ? 'הצורה מתרוממת מהדף'
          : `המקור מסתובב אל ${L}, בלי היפוך. עקבי אחרי המשבצת הכחולה`;

  const cells = (spec: Poly2DSpec, fill: (i: number) => string, extra: object = {}) =>
    spec.cells.map(([x, y], i) => <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={fill(i)} stroke={SOLVE.ink} strokeWidth={0.06} strokeLinejoin="round" {...extra} />);

  return (
    <>
      <svg viewBox="-3.4 -3.4 6.8 6.8" className="stim-svg" role="img" aria-label={caption}>
        {land > 0 && (
          <g transform={`rotate(${opt.angle}) scale(${opt.mirror ? -1 : 1} 1) translate(${-ox} ${-oy})`} opacity={land}>
            {cells(opt, () => 'none', { strokeDasharray: '0.14 0.09', strokeOpacity: 0.7 })}
          </g>
        )}
        {up > 0 && (
          <g transform={`translate(${sx + 0.16 * up} ${sy + 0.24 * up}) rotate(${angle}) scale(${s}) translate(${-cx} ${-cy})`} opacity={0.18 * up}>
            {start.cells.map(([x, y]) => <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={SOLVE.ink} />)}
          </g>
        )}
        <g transform={`translate(${sx} ${sy}) rotate(${angle}) scale(${s}) translate(${-cx} ${-cy})`} opacity={land > 0 ? 0.92 : 1}>
          {cells(start, color)}
        </g>
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
