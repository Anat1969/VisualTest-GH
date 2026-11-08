import { useMemo } from 'react';
import { dot2 } from '../../logic/geometry';
import { foldPoint, fitPaper, paperRegions } from '../../logic/solve2d';
import type { Item, P2, PaperHolesSpec, PaperStepsSpec } from '../../logic/types';
import { FoldLine, Ghost } from '../stimulus/Paper';
import { pts } from '../stimulus/projection';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, clamp, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Paper folding, tested backwards: the chosen open sheet comes onto the page and is folded again, in the same
 * order. Holes that fall onto the punch are green; holes that land beside it are red; layers the punch goes
 * through with no hole are counted. A wrong sheet holds a second, then opens back up.
 */

const T_OPEN = 700, T_FOLD = 1100, T_LAND = 700, T_BACK_FOLD = 550;
const S = 100;
const sc = (p: P2): [number, number] => [p[0] * S, p[1] * S];
const PAPER = '#FBF9F4', FLAP_BACK = '#DCE6EF';

export const canSolvePaper = (item: Item) => item.type === 'folding' && item.stimulus.kind === 'paperSteps';

export function PaperSolve({ item, target }: SolveProps) {
  const steps = item.stimulus as PaperStepsSpec;
  const holes = (item.options[target].visual as PaperHolesSpec).holes;
  const n = steps.folds.length;
  const fit = useMemo(() => fitPaper(steps, holes), [steps, holes]);
  const regions = useMemo(() => paperRegions(steps.folds), [steps]);

  const TOTAL = T_OPEN + n * T_FOLD + T_LAND;
  const T_BACK = n * T_BACK_FOLD + 300;
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  // continuous fold progress, 0 (open) .. n (all folds done), forward then back
  const back = END > TOTAL ? phase(ms, TOTAL + T_HOLD, T_BACK) : 0;
  const F = back > 0 ? n * (1 - back) : n * phase(ms, T_OPEN, n * T_FOLD);
  const k = Math.min(n, Math.floor(F + 1e-9));
  const t = k >= n ? 0 : ease(F - k);
  const land = phase(ms, T_OPEN + n * T_FOLD, T_LAND) * (back > 0 ? 0 : 1);
  const appear = clamp(ms / T_OPEN);

  const s = regions[Math.min(k, n - 1)];
  const folded = k >= n;
  const flap = folded
    ? []
    : s.flap.map((p) => {
        const d = dot2(s.fold.n, p) - s.fold.c;
        const m = d * (1 - Math.cos(Math.PI * t));
        return [p[0] - m * s.fold.n[0], p[1] - m * s.fold.n[1]] as P2;
      });

  const placed = holes.map((h) => foldPoint(h, steps.folds, k, t));
  const extra = fit.hits.filter((h) => !h).length;
  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הדף נפתח חזרה'
      : landed
        ? fit.same
          ? `כל ${holes.length} החורים נופלים על הניקוב`
          : [
              extra ? `${count(extra, 'חור אחד לא נופל', 'חורים לא נופלים')} על הניקוב` : '',
              fit.missing ? `הניקוב עובר דרך ${fit.layers} שכבות, ו${fit.missing === 1 ? 'חסר חור אחד' : `חסרים ${fit.missing} חורים`}` : '',
            ].filter(Boolean).join('. ')
        : ms < T_OPEN
          ? `הדף של ${L} נכנס. מקפלים אותו שוב, באותו סדר`
          : folded
            ? 'בודקים מול הניקוב'
            : `קיפול ${k + 1} מתוך ${n}`;

  return (
    <>
      <svg viewBox="-14 -14 128 128" className="stim-svg" role="img" aria-label={caption}>
        <Ghost />
        <g opacity={0.4 + 0.6 * appear}>
          <polygon points={pts((F < 0.02 ? s.before : s.kept).map(sc))} fill={PAPER} stroke={SOLVE.ink} strokeWidth={1.2} />
          {F < 0.05 &&
            [0.25, 0.5, 0.75].map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={0.6}>
                <line x1={v * S} y1={0} x2={v * S} y2={S} />
                <line x1={0} y1={v * S} x2={S} y2={v * S} />
              </g>
            ))}
          {!folded && F >= 0.02 && <polygon points={pts(flap.map(sc))} fill={t > 0.5 ? FLAP_BACK : PAPER} stroke={SOLVE.ink} strokeWidth={1.2} opacity={0.96} />}
          {!folded && F > 0.02 && <FoldLine fold={s.fold} region={s.before} />}
        </g>
        {land > 0 &&
          steps.punches.map((p, i) => {
            const [x, y] = sc(p);
            return <circle key={`p${i}`} cx={x} cy={y} r={8} fill="none" stroke={fit.missing ? SOLVE.bad : SOLVE.ok} strokeWidth={1.6} strokeDasharray="3 2.2" opacity={land} />;
          })}
        {placed.map((p, i) => {
          const [x, y] = sc(p);
          const fill = land > 0.5 ? (fit.hits[i] ? SOLVE.ok : SOLVE.bad) : SOLVE.ink;
          return <circle key={i} cx={x} cy={y} r={4.2} fill={fill} fillOpacity={0.85} opacity={appear} />;
        })}
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
