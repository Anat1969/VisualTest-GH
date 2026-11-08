import { useMemo } from 'react';
import { fitHidden, gridOf, readSegs, unitSegs, type Seg } from '../../logic/solve2d';
import type { Item, SceneSpec } from '../../logic/types';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Hidden figure: the sample lifts off the page and slides over the chosen figure, at its own size and direction,
 * to the place that covers most of it. Its lines that lie on lines of the figure turn green, the rest red.
 */

const T_LIFT = 500, T_SLIDE = 1700, T_LAND = 600, T_BACK = 900;
const TOTAL = T_LIFT + T_SLIDE + T_LAND;
const U = 10;

export const canSolveHidden = (item: Item) => item.type === 'hidden' && item.stimulus.kind === 'scene';

export function HiddenSolve({ item, target }: SolveProps) {
  const figure = item.options[target].visual as SceneSpec;
  const grid = gridOf(figure);
  const sample = useMemo(() => unitSegs(readSegs(item.stimulus as SceneSpec)), [item]);
  const fit = useMemo(() => fitHidden(sample, readSegs(figure), grid), [sample, figure, grid]);
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const slide = ease(phase(ms, T_LIFT, T_SLIDE)) * (1 - back);
  const land = phase(ms, T_LIFT + T_SLIDE, T_LAND) * (1 - back);

  // the sample starts in the middle of the frame and slides to its best place
  const xs = fit.strokes.flatMap((s) => [s.seg[0], s.seg[2]]);
  const ys = fit.strokes.flatMap((s) => [s.seg[1], s.seg[3]]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const from = [(grid - w) / 2 - fit.at[0], (grid - h) / 2 - fit.at[1]];
  const dx = from[0] * (1 - slide) * U, dy = from[1] * (1 - slide) * U;
  const up = lift * (1 - land);

  const miss = fit.strokes.filter((s) => !s.hit).length;
  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הדוגמה חוזרת'
      : landed
        ? fit.same
          ? `הדוגמה יושבת כולה בתוך ${L}`
          : `${count(miss, 'קו אחד של הדוגמה לא נמצא', 'קווים של הדוגמה לא נמצאים')} ב-${L}, גם במקום הקרוב ביותר`
        : ms < T_LIFT
          ? 'הדוגמה מתרוממת מהדף'
          : `הדוגמה מחפשת מקום ב-${L}, באותו גודל ובאותו כיוון`;

  const line = (s: Seg, key: string, stroke: string, width: number, extra: object = {}) => (
    <line key={key} x1={s[0] * U} y1={s[1] * U} x2={s[2] * U} y2={s[3] * U} stroke={stroke} strokeWidth={width} strokeLinecap="round" {...extra} />
  );

  return (
    <>
      <svg viewBox={figure.box.join(' ')} className="stim-svg" role="img" aria-label={caption}>
        <rect x={-4} y={-4} width={grid * U + 8} height={grid * U + 8} rx={2} fill="#FBF9F4" stroke="var(--line-strong)" strokeWidth={0.6} />
        {readSegs(figure).map((s, i) => line(s, `f${i}`, SOLVE.ink, 1.5, { opacity: 0.55 }))}
        {up > 0 && <g transform={`translate(${dx + 1.2 * up} ${dy + 1.8 * up})`} opacity={0.15 * up}>{fit.strokes.map((s, i) => line(s.seg, `s${i}`, SOLVE.ink, 2.6))}</g>}
        <g transform={`translate(${dx} ${dy})`}>
          {fit.strokes.map((s, i) => line(s.seg, `d${i}`, land > 0.5 ? (s.hit ? SOLVE.ok : SOLVE.bad) : SOLVE.anchor, 2.6 + 0.6 * up, { opacity: 0.9 }))}
        </g>
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
