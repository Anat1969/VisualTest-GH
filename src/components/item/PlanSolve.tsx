import { useMemo } from 'react';
import { camera, type Camera } from '../../logic/camera';
import { add, axisAngle, dot, mulV, scale } from '../../logic/geometry';
import { fitPlan, viewTurn } from '../../logic/solvePlan';
import type { Cubes3DSpec, Item, M3, V3 } from '../../logic/types';
import { depth, lightness, project, pts, shade } from '../stimulus/projection';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, count, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Plans and elevations: the building lifts off the page, turns so the asked side faces the viewer, and the
 * camera flattens to a straight view (front, side, or from above). The chosen drawing is then laid over it:
 * columns (or plan cells) that match are green, the rest red. A wrong drawing holds, then the building goes back.
 */

const T_LIFT = 500, T_TURN = 2100, T_LAND = 700, T_BACK = 1300;
const TOTAL = T_LIFT + T_TURN + T_LAND;
const DIRS: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const START: V3 = [1, -1.35, 0.95];
const FRONT: V3 = [0, -1, 0.001];
const TOP: V3 = [0, -0.02, 1];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const canSolvePlan = (item: Item) => item.type === 'plans' && item.stimulus.kind === 'cubes3d';

function faceAxes(d: V3): [V3, V3] {
  if (d[0]) return [[0, 1, 0], [0, 0, 1]];
  if (d[1]) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

function buildingFaces(cubes: V3[], R: M3, off: V3, cam: Camera, tint: (c: V3) => string, flat: number) {
  const set = new Set(cubes.map((c) => c.map((v) => Math.round(v * 2)).join(',')));
  const has = (p: V3) => set.has(p.map((v) => Math.round(v * 2)).join(','));
  const out: { key: string; points: string; fill: string; z: number }[] = [];
  for (const c of cubes)
    for (const d of DIRS) {
      if (has(add(c, d))) continue;
      const n = mulV(R, d);
      if (dot(n, cam.c) <= 1e-3) continue;
      const [e1, e2] = faceAxes(d);
      const center = add(c, scale(d, 0.5));
      const world = (p: V3) => add(mulV(R, p), off);
      const corners = [
        add(add(center, scale(e1, -0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, 0.5)),
        add(add(center, scale(e1, -0.5)), scale(e2, 0.5)),
      ].map((p) => project(cam, world(p)));
      out.push({ key: `${c.join(',')}|${d.join(',')}`, points: pts(corners), fill: shade(tint(c), lightness(n) + (1 - lightness(n)) * flat), z: depth(cam, world(center)) });
    }
  return out.sort((a, b) => a.z - b.z);
}

export function PlanSolve({ item, target }: SolveProps) {
  const building = item.stimulus as Cubes3DSpec;
  const fit = useMemo(() => fitPlan(item, target), [item, target]);
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const turn = ease(phase(ms, T_LIFT, T_TURN)) * (1 - back);
  const land = phase(ms, T_LIFT + T_TURN, T_LAND) * (1 - back);

  const top = fit.view === 'top';
  const cam = camera(lerp3(START, top ? TOP : FRONT, turn));
  // the dynamic item stopped half way through its quarter turn: continue from there
  const from = fit.view === 'quarter' ? 45 : 0;
  const R = axisAngle([0, 0, 1], from + (viewTurn(fit.view) - from) * turn);
  const hover = 0.35 * Math.sin(Math.PI * phase(ms, 0, T_LIFT + T_TURN)) * (1 - back);
  // in the straight view the faces take the flat colour of the drawings
  const polys = buildingFaces(building.cubes, R, [0, 0, hover], cam, () => SOLVE.stim, turn);

  const radius = Math.max(...building.cubes.map((c) => Math.hypot(c[0], c[1], c[2]))) + 0.9;
  const r = Math.max(2.6, radius) + 0.6;
  // the fixed "front" arrow fades as the building turns to face the viewer
  const zFloor = fit.floor;
  const a1 = project(cam, [0, -radius - 0.4, zFloor]);
  const a2 = project(cam, [0, -radius + 0.5, zFloor]);
  const arrow = 1 - turn;

  // overlay in screen units: in the straight view, screen x = world x and screen y = -z (or -y from above)
  const bad = fit.cells.filter((c) => !c.ok).length;
  const overlay = land > 0 && (
    <g opacity={land}>
      {top
        ? fit.cells.map((c, i) => {
            const color = c.ok ? SOLVE.ok : SOLVE.bad;
            const cy = -c.y;
            return (
              <g key={i}>
                <rect x={c.x - 0.46} y={cy - 0.46} width={0.92} height={0.92} fill={c.ok ? 'none' : SOLVE.bad} fillOpacity={0.14} stroke={color} strokeWidth={0.07} strokeDasharray={c.shown ? undefined : '0.12 0.08'} />
                {(c.shown > 0 || !c.ok) && (
                  <text x={c.x} y={cy + 0.16} fontSize={0.48} fontWeight={700} textAnchor="middle" fill={color}>
                    {c.shown}
                  </text>
                )}
              </g>
            );
          })
        : fit.cells.flatMap((c, i) =>
            Array.from({ length: Math.max(c.shown, c.real) }, (_, k) => {
              const y = -(zFloor + k + 1);
              // per cube: drawn and built = green; drawn but not built = red outline; built but not drawn = red fill
              const drawn = k < c.shown;
              const built = k < c.real;
              const color = drawn && built ? SOLVE.ok : SOLVE.bad;
              return (
                <rect
                  key={`${i}-${k}`}
                  x={c.x - 0.47}
                  y={y + 0.03}
                  width={0.94}
                  height={0.94}
                  fill={drawn && built ? 'none' : SOLVE.bad}
                  fillOpacity={drawn ? 0.12 : 0.4}
                  stroke={drawn ? color : 'none'}
                  strokeWidth={0.07}
                  strokeDasharray="0.14 0.09"
                />
              );
            }),
          )}
    </g>
  );

  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const unit = top ? ['משבצת אחת לא תואמת', 'משבצות לא תואמות'] : ['עמודה אחת לא תואמת', 'עמודות לא תואמות'];
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב מהמבט המקורי`
    : back > 0
      ? 'הבניין חוזר למבט המקורי'
      : landed
        ? fit.same
          ? top
            ? `כל המשבצות של ${L} תואמות את הבניין`
            : `כל העמודות של ${L} תואמות את הבניין`
          : `${count(bad, unit[0], unit[1])} את הבניין ב-${L}`
        : ms < T_LIFT
          ? 'הבניין מתרומם מהדף'
          : fit.view === 'front'
            ? 'המבט עובר לחזית, בגובה העיניים'
            : fit.view === 'right'
              ? 'הבניין מסתובב: הצד הימני פונה אלייך'
              : fit.view === 'quarter'
                ? 'הבניין משלים את רבע הסיבוב, והמבט עובר לחזית'
              : 'המבט עולה מעל הבניין. החזית למטה';

  return (
    <>
      <svg viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} className="stim-svg" role="img" aria-label={caption}>
        {arrow > 0.02 && (
          <g opacity={arrow * (1 - lift * 0.4)}>
            <line x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} stroke="var(--bad)" strokeWidth={0.07} />
            <text x={a1[0]} y={a1[1] + 0.35} fontSize={0.36} fontWeight={700} textAnchor="middle" fill="var(--bad)">
              חזית
            </text>
          </g>
        )}
        {polys.map((p) => (
          <polygon key={p.key} points={p.points} fill={p.fill} stroke={SOLVE.ink} strokeWidth={0.045} strokeLinejoin="round" />
        ))}
        {!top && land > 0 && <line x1={-r + 0.4} y1={-zFloor} x2={r - 0.4} y2={-zFloor} stroke={SOLVE.ink} strokeWidth={0.06} opacity={land} />}
        {overlay}
      </svg>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
