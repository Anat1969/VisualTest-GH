import { useMemo } from 'react';
import { patternDiff, readPattern } from '../../logic/solve2d';
import type { Item, SceneSpec } from '../../logic/types';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Perceptual speed: the sample lifts off the page and lies over the chosen pattern, cell on cell.
 * Cells that differ are marked red; an identical pattern gets a green frame.
 */

const T_LIFT = 500, T_LAY = 1200, T_LAND = 700, T_BACK = 800;
const TOTAL = T_LIFT + T_LAY + T_LAND;
const U = 10;

export const canSolveSpeed = (item: Item) => item.type === 'speed' && item.motion === 'static' && item.stimulus.kind === 'scene';

export function SpeedSolve({ item, target }: SolveProps) {
  const sample = useMemo(() => readPattern(item.stimulus as SceneSpec), [item]);
  const shown = useMemo(() => readPattern(item.options[target].visual as SceneSpec), [item, target]);
  const diff = useMemo(() => patternDiff(sample, shown), [sample, shown]);
  const n = Math.round(Math.sqrt(sample.length));
  const same = diff.length === 0;
  const END = same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const lay = ease(phase(ms, T_LIFT, T_LAY)) * (1 - back);
  const land = phase(ms, T_LIFT + T_LAY, T_LAND) * (1 - back);
  // the sample comes in from above, over the pattern
  const dy = -(1 - lay) * n * U * 0.35 * Math.max(lift, back > 0 ? 1 : 0);

  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הדוגמה חוזרת'
      : landed
        ? same
          ? `${L} זהה לדוגמה, משבצת אחר משבצת`
          : `${count(diff.length, 'משבצת אחת שונה', 'משבצות שונות')} בין ${L} לדוגמה`
        : ms < T_LIFT
          ? 'הדוגמה מתרוממת מהדף'
          : `הדוגמה מונחת על ${L}`;

  const cell = (i: number) => [(i % n) * U, Math.floor(i / n) * U];
  return (
    <>
      <svg viewBox={`-3 -3 ${n * U + 6} ${n * U + 6}`} className="stim-svg" role="img" aria-label={caption}>
        {shown.map((on, i) => {
          const [x, y] = cell(i);
          return <rect key={`o${i}`} x={x + 0.8} y={y + 0.8} width={U - 1.6} height={U - 1.6} rx={1} fill={on ? SOLVE.ink : '#FBF9F4'} stroke={on ? SOLVE.ink : 'var(--line-strong)'} strokeWidth={0.5} />;
        })}
        <g transform={`translate(0 ${dy})`} opacity={0.15 + 0.5 * lift * (1 - land * 0.6)}>
          {sample.map((on, i) => {
            const [x, y] = cell(i);
            return on ? <rect key={`s${i}`} x={x + 1.6} y={y + 1.6} width={U - 3.2} height={U - 3.2} rx={0.8} fill={SOLVE.anchor} /> : null;
          })}
        </g>
        {land > 0 &&
          diff.map((i) => {
            const [x, y] = cell(i);
            return <rect key={`d${i}`} x={x + 0.2} y={y + 0.2} width={U - 0.4} height={U - 0.4} fill="none" stroke={SOLVE.bad} strokeWidth={1.6} opacity={land} />;
          })}
        {land > 0 && same && <rect x={-1.5} y={-1.5} width={n * U + 3} height={n * U + 3} fill="none" stroke={SOLVE.ok} strokeWidth={1.4} opacity={land} />}
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
