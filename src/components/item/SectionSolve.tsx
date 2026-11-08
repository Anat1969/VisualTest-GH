import { useMemo } from 'react';
import { CAM_SHAPES, project } from '../../logic/camera';
import { canFitSection, fitSection } from '../../logic/solveSection';
import type { Item, P2, SceneSpec } from '../../logic/types';
import { Scene } from '../stimulus/Scene';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Cross-sections: the chosen shape lifts off the page and lays itself into the cutting plane, inside the solid.
 * Its edges that meet the solid's walls turn green; edges that poke out of the solid or stop short of its walls
 * turn red. The real section is never drawn: the learner sees only where the chosen shape fails.
 */

const T_LIFT = 600, T_LAY = 1800, T_LAND = 700, T_BACK = 1100;
const TOTAL = T_LIFT + T_LAY + T_LAND;

export const canSolveSection = (item: Item) => item.stimulus.kind === 'scene' && canFitSection(item);

const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function SectionSolve({ item, target }: SolveProps) {
  const scene = item.stimulus as SceneSpec;
  const fit = useMemo(() => fitSection(item, target), [item, target]);
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);

  const lift = ease(phase(ms, 0, T_LIFT));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK)) : 0;
  const lay = ease(phase(ms, T_LIFT, T_LAY)) * (1 - back);
  const land = phase(ms, T_LIFT + T_LAY, T_LAND) * (1 - back);

  // flat: the option's drawing, set beside the solid at a readable size; laid: projected into the plane
  const [bx, by, bw, bh] = scene.box;
  const unit = Math.max(bw, bh) / 300;
  const k = Math.min(bw, bh) * 0.2;
  const home: P2 = [bx + bw * 0.5, by + bh * 0.5];
  const flat = fit.flat.map(([x, y]) => [home[0] + x * k, home[1] + y * k] as P2);
  const laid = fit.placed.map((p) => project(CAM_SHAPES, p) as P2);
  const shape = flat.map((p, i) => lerp(p, laid[i], lay));
  const rise = (1 - lay) * lift * k * 0.12;

  const out = fit.pieces.filter((p) => p.state === 'out').length;
  const short = fit.pieces.filter((p) => p.state === 'in').length;
  const L = OPTION_LABELS[target];
  const landed = ms >= TOTAL && back === 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הצורה חוזרת לדף'
      : landed
        ? fit.same
          ? `${L} נוגעת בדפנות הגוף לכל אורך ההיקף`
          : out && short
            ? `${L} בולטת מהגוף בחלק, ולא מגיעה לדפנות בחלק`
            : out
              ? `${L} בולטת מחוץ לגוף`
              : `${L} לא מגיעה לדפנות הגוף`
        : ms < T_LIFT
          ? `${L} מתרוממת מהדף`
          : `${L} נכנסת למישור החותך`;

  const pts = (list: P2[]) => list.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
  return (
    <>
      <Scene spec={scene} label={caption}>
        {lift > 0 && lay < 1 && (
          <polygon points={pts(shape.map(([x, y]) => [x + rise, y + rise * 1.5] as P2))} fill={SOLVE.ink} opacity={0.12 * lift * (1 - lay)} />
        )}
        <polygon
          points={pts(shape)}
          fill={land > 0.5 ? (fit.same ? SOLVE.ok : SOLVE.anchor) : SOLVE.anchor}
          fillOpacity={0.35 + 0.25 * (1 - lay)}
          stroke={SOLVE.ink}
          strokeWidth={1.2 * unit}
          strokeLinejoin="round"
          opacity={Math.max(lift, back > 0 ? 1 : 0, 0.0001)}
        />
        {land > 0 &&
          fit.pieces.map((p, i) => {
            const [a, b] = [project(CAM_SHAPES, p.a), project(CAM_SHAPES, p.b)];
            return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={p.state === 'on' ? SOLVE.ok : SOLVE.bad} strokeWidth={3.2 * unit} strokeLinecap="round" opacity={land} />;
          })}
      </Scene>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
