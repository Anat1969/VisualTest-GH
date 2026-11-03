import { useEffect, useMemo, useRef, useState } from 'react';
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

function faceAxes(d: V3): [V3, V3] {
  if (d[0]) return [[0, 1, 0], [0, 0, 1]];
  if (d[1]) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

interface Poly { key: string; points: string; fill: string; z: number; ghost: boolean }

function faces(cubes: V3[], R: M3, off: V3, floor: number, flat: number, color: (i: number) => string, ghost: boolean, tag: string): Poly[] {
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

export function RotationSolve({ item, answer }: { item: Item; answer: number }) {
  const start = item.stimulus as Cubes3DSpec;
  const [target, setTarget] = useState(answer >= 0 ? answer : item.correctIndex);
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(0);
  const raf = useRef(0);

  const opt = item.options[target].visual as Cubes3DSpec;
  const fit = useMemo(() => fitRotation(start.cubes, opt.cubes), [start, opt]);
  const end = useMemo(() => endRotation(opt.rot, fit), [opt, fit]);
  const shift = useMemo(() => mulV(opt.rot, fit.t), [opt, fit]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setMs(TOTAL);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      setMs(Math.min(t, TOTAL));
      if (t < TOTAL) raf.current = requestAnimationFrame(tick);
    };
    setMs(0);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run]);

  const lift = easeInOut(clamp(ms / T_LIFT));
  const turn = easeInOut(clamp((ms - T_LIFT) / T_TURN));
  const land = clamp((ms - T_LIFT - T_TURN) / T_LAND);
  const done = ms >= TOTAL;

  const radius =
    Math.max(...start.cubes.map((c) => Math.hypot(...c)), ...opt.cubes.map((c) => Math.hypot(...c))) + Math.hypot(...shift) + 1.2;
  const floor = -radius * 0.8;
  const R = turnAt(start.rot, end, turn);
  const off = scale(shift, turn);

  const origColor = (i: number) => (land > 0.5 ? (fit.hits[i] ? C.ok : C.bad) : i < ANCHOR ? C.anchor : C.stim);
  const polys = [
    ...(land > 0 ? faces(opt.cubes, opt.rot, [0, 0, 0], floor, 1, () => C.stim, true, 'g') : []),
    ...faces(start.cubes, R, off, floor, 0.08 + 0.92 * lift, origColor, false, 'o'),
  ].sort((a, b) => a.z - b.z);

  const cam = CAM_SHAPES;
  const pageCorners = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([x, y]) => project(cam, [x * radius, y * radius, floor]));
  const miss = fit.hits.filter((h) => !h).length;
  const L = OPTION_LABELS[target];
  const caption = !done
    ? ms < T_LIFT
      ? 'הצורה קמה מהדף.'
      : `המקור מסתובב אל אפשרות ${L}. עקבי אחרי הזרוע הכחולה.`
    : fit.same
      ? `כל ${start.cubes.length} הקוביות יושבות על אפשרות ${L}. זו אותה צורה.`
      : `${miss} ${miss === 1 ? 'קובייה לא מוצאת' : 'קוביות לא מוצאות'} מקום באפשרות ${L}, גם בסיבוב הקרוב ביותר.`;

  return (
    <div className="solve3d">
      <div className="solve3d-head">
        <strong>הפתרון קם מהדף</strong>
        <span className="small muted">בדיקה מול:</span>
        <div className="solve3d-pick" role="group" aria-label="לבדוק מול אפשרות">
          {item.options.map((_, i) => (
            <button key={i} className="btn sm" aria-pressed={i === target} onClick={() => (i === target ? setRun((r) => r + 1) : setTarget(i))}>
              {OPTION_LABELS[i]}
            </button>
          ))}
        </div>
        <button className="btn ghost sm" onClick={() => setRun((r) => r + 1)}>
          שוב
        </button>
      </div>
      <svg viewBox={`${-radius * 1.25} ${-radius * 1.05} ${radius * 2.5} ${radius * 2.1}`} className="solve3d-svg" role="img" aria-label={caption}>
        <polygon points={pts(pageCorners)} fill="var(--surface-sunk)" stroke="var(--line)" strokeWidth={0.04} />
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
      <p className={`solve3d-cap ${done ? (fit.same ? 'ok' : 'bad') : ''}`} aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
