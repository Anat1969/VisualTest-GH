import { useMemo } from 'react';
import { SolveChrome, useSolveClock } from './solveKit';
import { add, dot, mulV, scale } from '../../logic/geometry';
import { endRotation, fitRotation, turnAt } from '../../logic/solve3d';
import type { Cubes3DSpec, Item, M3, V3 } from '../../logic/types';
import { CAM_SHAPES, depth, lightness, project, pts, shade } from '../stimulus/projection';
const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];

/*
 * Animated solution for 3D rotation items ("the solution lifts off the page").
 * 1. predict: the learner has already chosen; 2. test: the original rises from the page and turns onto the chosen
 * option; 3. prove: cubes that land are green, cubes that find no place are red. Any option can be tested.
 */

const DIRS: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const ANCHOR = 2; // the first arm's cubes are the anchor the learner follows
const C = { stim: '#9DB0C4', anchor: '#3B86B0', ok: '#46A06A', bad: '#C9574B' };
const T_LIFT = 800, T_TURN = 2300, T_LAND = 700;
const TOTAL = T_LIFT + T_TURN + T_LAND;
// a wrong option: the result holds for a second, then the figure turns back to the original drawing to try again
const T_HOLD = 1000, T_BACK = 1000;

function faceAxes(d: V3): [V3, V3] {
  if (d[0]) return [[0, 1, 0], [0, 0, 1]];
  if (d[1]) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

interface Poly { key: string; points: string; fill: string; z: number; ghost: boolean }

export function faces(cubes: V3[], R: M3, off: V3, floor: number, flat: number, color: (i: number) => string, ghost: boolean, tag: string): Poly[] {
  const cam = CAM_SHAPES;
  const set = new Set(cubes.map((c) => c.map((v) => Math.round(v * 2)).join(',')));
  const has = (p: V3) => set.has(p.map((v) => Math.round(v * 2)).join(','));
  const world = (p: V3): V3 => {
    const w = add(mulV(R, p), off);
    return [w[0], w[1], floor + (w[2] - floor) * flat];
  };
  const out: Poly[] = [];
  cubes.forEach((c, i) => {
    for (const d of DIRS) {
      if (has(add(c, d))) continue;
      const n = mulV(R, d);
      if (dot(n, cam.c) <= 1e-6) continue;
      const [e1, e2] = faceAxes(d);
      const center = add(c, scale(d, 0.5));
      const corners = [
        add(add(center, scale(e1, -0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, 0.5)),
        add(add(center, scale(e1, -0.5)), scale(e2, 0.5)),
      ].map((p) => project(cam, world(p)));
      out.push({ key: `${tag}${i}|${d.join(',')}`, points: pts(corners), fill: shade(color(i), lightness(n)), z: depth(cam, world(center)), ghost });
    }
  });
  return out;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

/** Plays inside the item's own stage: the original lifts off the page and turns onto option `target`. */
export function RotationSolve({ item, target }: { item: Item; target: number }) {
  const start = item.stimulus as Cubes3DSpec;
  const opt = item.options[target].visual as Cubes3DSpec;
  const fit = useMemo(() => fitRotation(start.cubes, opt.cubes), [start, opt]);
  const end = useMemo(() => endRotation(opt.rot, fit), [opt, fit]);
  const shift = useMemo(() => mulV(opt.rot, fit.t), [opt, fit]);

  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, replay } = useSolveClock(TOTAL, END, target);

  const lift = easeInOut(clamp(ms / T_LIFT));
  const back = END > TOTAL ? clamp((ms - TOTAL - T_HOLD) / T_BACK) : 0;
  const turn = easeInOut(clamp((ms - T_LIFT) / T_TURN)) * (1 - easeInOut(back));
  const land = clamp((ms - T_LIFT - T_TURN) / T_LAND) * (1 - back);
  const done = ms >= END;
  const returned = done && END > TOTAL;

  // same frame as the static stimulus (Cubes3D), so the figure lifts straight out of the drawing
  const radius = Math.max(...start.cubes.map((c) => Math.hypot(...c)), ...opt.cubes.map((c) => Math.hypot(...c) + Math.hypot(...shift))) + 0.9;
  const r = Math.max(2.6, radius);
  const R = turnAt(start.rot, end, turn);
  // the figure floats up while it turns and settles as it lands (world z is up)
  const hover = 0.45 * Math.sin(Math.PI * clamp(ms / (T_LIFT + T_TURN))) + 0.3 * Math.sin(Math.PI * back);
  const off = add(scale(shift, turn), [0, 0, hover]);

  const anchorMix = lift * (1 - land);
  const origColor = (i: number) => (back > 0 ? C.stim : land > 0.5 ? (fit.hits[i] ? C.ok : C.bad) : i < ANCHOR && anchorMix > 0.3 ? C.anchor : C.stim);
  const polys = [
    ...(land > 0 ? faces(opt.cubes, opt.rot, [0, 0, 0], 0, 1, () => C.stim, true, 'g') : []),
    ...faces(start.cubes, R, off, 0, 1, origColor, false, 'o'),
  ].sort((a, b) => a.z - b.z);
  const miss = fit.hits.filter((h) => !h).length;
  const L = OPTION_LABELS[target];
  const caption = returned
    ? `${L} לא מתאימה. נסי שוב מהמצב המקורי`
    : back > 0
      ? 'הצורה חוזרת למצב המקורי'
      : ms >= TOTAL && !fit.same
        ? `${miss} ${miss === 1 ? 'קובייה לא מוצאת' : 'קוביות לא מוצאות'} מקום ב-${L}, גם בסיבוב הקרוב ביותר`
        : !done
    ? ms < T_LIFT
      ? 'הצורה מתרוממת'
      : `המקור מסתובב אל ${L}. עקבי אחרי הזרוע הכחולה`
    : fit.same
      ? `כל ${start.cubes.length} הקוביות יושבות על ${L}`
      : `${miss} ${miss === 1 ? 'קובייה לא מוצאת' : 'קוביות לא מוצאות'} מקום ב-${L}, גם בסיבוב הקרוב ביותר`;

  return (
    <>
      <svg viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} className="stim-svg" role="img" aria-label={caption}>
        {polys.map((p) => (
          <polygon
            key={p.key}
            points={p.points}
            fill={p.fill}
            fillOpacity={p.ghost ? 0.22 * land : 1}
            stroke="var(--ink)"
            strokeOpacity={p.ghost ? 0.5 * land : 1}
            strokeDasharray={p.ghost ? '0.12 0.08' : undefined}
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}

/** Items whose stage can play the lift-off solution. */
export const canSolve3D = (item: Item) => item.type === 'rotation' && item.motion === 'static' && item.stimulus.kind === 'cubes3d';
