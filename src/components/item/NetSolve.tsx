import { useEffect, useMemo, useRef, useState } from 'react';
import { camera, type Camera } from '../../logic/camera';
import { foldNet } from '../../logic/cubeNet';
import { add, dot, mulV, scale, sub } from '../../logic/geometry';
import { turnAt } from '../../logic/solve3d';
import { fitCubeView, fitOpposite, SLOTS, type Slot } from '../../logic/solveNet';
import type { CubeViewSpec, Item, M3, NetSpec, SwatchSpec, V3 } from '../../logic/types';
import { FacePattern } from '../stimulus/FacePattern';
import { lightness, project, pts, shade } from '../stimulus/projection';

/*
 * Animated solution for cube nets, played in the item's own stage:
 * the net lifts from the page and folds into a cube, the cube turns to show the chosen option,
 * and each face is marked as matching or not. A wrong option holds a second, then unfolds back to the net.
 */

const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];
const T_FOLD = 1700, T_TURN = 1500, T_LAND = 500, T_HOLD = 1000, T_BACK = 1500;
const TOTAL = T_FOLD + T_TURN + T_LAND;
const OK = '#3F8A5A', BAD = '#C2493D';
const DIR_TOP: V3 = [0, -0.02, 1];
const DIR_FOLD: V3 = [0.55, -1.25, 1.45];
const DIR_CUBE: V3 = [1, -1, 0.9];
const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SLOT_NORMAL: Record<Slot, V3> = { top: [0, 0, 1], front: [0, -1, 0], right: [1, 0, 0] };

export const canSolveNet = (item: Item) => item.type === 'folding' && item.motion === 'static' && item.stimulus.kind === 'net';

export function NetSolve({ item, target }: { item: Item; target: number }) {
  const net = item.stimulus as NetSpec;
  const visual = item.options[target].visual;
  const oriented = item.level === 3;

  const fit = useMemo(() => {
    if (visual.kind === 'cubeView') {
      const f = fitCubeView(net, visual as CubeViewSpec, oriented);
      return { rot: f.rot, same: f.same, ok: f.ok, chosen: -1 };
    }
    const chosen = (visual as SwatchSpec).face.id;
    const f = fitOpposite(net, net.highlight ?? 0, chosen);
    return { rot: f.rot, same: f.same, ok: null, chosen };
  }, [net, visual, oriented]);

  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK;
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setMs(TOTAL);
      if (END === TOTAL) return;
      const id = window.setTimeout(() => setMs(END), T_HOLD);
      return () => window.clearTimeout(id);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      setMs(Math.min(t, END));
      if (t < END) raf.current = requestAnimationFrame(tick);
    };
    setMs(0);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, END]);

  // closed-cube centre, the pivot for the turn
  const center = useMemo(() => {
    const fs = foldNet(net.cells, net.root, 1);
    return scale(fs.reduce<V3>((s, f) => add(s, f.center), [0, 0, 0]), 1 / 6);
  }, [net]);

  const back = END > TOTAL ? clamp((ms - TOTAL - T_HOLD) / T_BACK) : 0;
  const unfoldBack = ease(clamp((back - 0.4) / 0.6));
  const turnBack = ease(clamp(back / 0.5));
  const fold = ease(clamp(ms / T_FOLD)) * (1 - unfoldBack);
  const turn = ease(clamp((ms - T_FOLD) / T_TURN)) * (1 - turnBack);
  const land = clamp((ms - T_FOLD - T_TURN) / T_LAND) * (1 - turnBack);
  const done = ms >= END;

  const camDir = turn > 0 ? lerp3(DIR_FOLD, DIR_CUBE, turn) : lerp3(DIR_TOP, DIR_FOLD, fold);
  const cam: Camera = camera(camDir);
  const R = turnAt(IDENTITY, fit.rot, turn);
  // move the cube's centre to the origin while it turns, so the final cube sits centred like the options
  const shift = scale(center, -turn);
  const place = (p: V3) => add(mulV(R, sub(p, center)), add(center, shift));

  const faces = foldNet(net.cells, net.root, fold).map((f) => ({
    id: f.id,
    corners: f.corners.map(place),
    center: place(f.center),
    normal: mulV(R, f.normal),
    up: mulV(R, f.up),
    right: mulV(R, f.right),
  }));

  // which face sits in which visible slot at the end, to mark matches
  const slotOf = (n: V3): Slot | null => SLOTS.find((s) => dot(n, SLOT_NORMAL[s]) > 0.9) ?? null;
  const outline = (id: number, n: V3): string | null => {
    if (land < 0.5) return null;
    if (fit.ok) {
      const s = slotOf(n);
      return s ? (fit.ok[s] ? OK : BAD) : null;
    }
    if (id === fit.chosen) return fit.same ? OK : BAD;
    return null;
  };
  // an opposite face is hidden at the back: the front face turns translucent to reveal it
  const xray = !fit.ok && fit.same ? land : 0;

  const order = faces.slice().sort((a, b) => dot(a.center, cam.c) - dot(b.center, cam.c));

  // frame: the whole net while it folds, then a smooth zoom onto the centred cube as it turns
  const boxes = useMemo(() => {
    const fit = (ps: [number, number][]) => {
      const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    };
    const netPts: [number, number][] = [];
    for (const d of [DIR_TOP, DIR_FOLD]) for (const t of [0, 0.5, 1]) for (const f of foldNet(net.cells, net.root, t)) for (const p of f.corners) netPts.push(project(camera(d), p));
    const cubePts: [number, number][] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) cubePts.push(project(camera(DIR_CUBE), [0.5 * sx, 0.5 * sy, 0.5 * sz]));
    const a = fit(netPts), b = fit(cubePts);
    // keep the cube a little smaller than the frame, like the cube options
    const pad = (r: number[], k: number) => { const w = r[2] - r[0], h = r[3] - r[1], m = Math.max(w, h) * k; return [r[0] - m, r[1] - m, r[2] + m, r[3] + m]; };
    return { net: pad(a, 0.08), cube: pad(b, 0.45) };
  }, [net]);
  const z = ease(turn);
  const bx = boxes.net.map((v, i) => v + (boxes.cube[i] - v) * z);
  const box = `${bx[0]} ${bx[1]} ${bx[2] - bx[0]} ${bx[3] - bx[1]}`;

  const L = OPTION_LABELS[target];
  const bad = fit.ok ? SLOTS.filter((s) => !fit.ok![s]).length : 0;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב מהפריסה`
    : back > 0
      ? 'הקובייה נפתחת חזרה לפריסה'
      : ms >= TOTAL
        ? fit.ok
          ? fit.same
            ? `שלוש הפאות מתאימות ל-${L}`
            : `${bad} ${bad === 1 ? 'פאה לא מתאימה' : 'פאות לא מתאימות'} ל-${L}, גם בסיבוב הקרוב ביותר`
          : fit.same
            ? `${L} מול הפאה המסומנת`
            : `${L} צמודה לפאה המסומנת: הן חולקות צלע`
        : ms < T_FOLD
          ? 'הפריסה מתקפלת לקובייה'
          : `הקובייה מסתובבת אל ${L}`;

  return (
    <>
      <svg viewBox={box} className="stim-svg net" role="img" aria-label={caption}>
        {order.map((f) => {
          const front = dot(f.normal, cam.c) > 0;
          const look = net.faces[f.id];
          const [ex, ey] = project(cam, f.center);
          const [rx, ry] = project(cam, f.right);
          const [ux, uy] = project(cam, f.up);
          const line = outline(f.id, f.normal);
          if (!front && !(xray > 0 && f.id === fit.chosen) && !(xray > 0.3))
            return (
              <polygon
                key={f.id}
                points={pts(f.corners.map((c) => project(cam, c)))}
                fill={shade('#E9E3D6', lightness(scale(f.normal, -1)))}
                stroke="#1F2A37"
                strokeWidth={0.035}
              />
            );
          // x-ray: the visible faces turn translucent so the opposite face at the back shows through
          const fade = xray > 0 && front ? 1 - 0.75 * xray : 1;
          return (
            <g key={f.id} transform={`matrix(${rx} ${ry} ${-ux} ${-uy} ${ex} ${ey})`} opacity={fade}>
              <FacePattern face={look} fill={shade(look.color, lightness(front ? f.normal : scale(f.normal, -1)))} />
              {net.highlight === f.id && land < 0.5 && (
                <rect x={-0.46} y={-0.46} width={0.92} height={0.92} fill="none" stroke="#1F2A37" strokeWidth={0.09} strokeDasharray="0.12 0.07" />
              )}
              {line && <rect x={-0.45} y={-0.45} width={0.9} height={0.9} fill="none" stroke={line} strokeWidth={0.11} />}
            </g>
          );
        })}
      </svg>
      <div className={`stage-status ${ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : ''}`} aria-live="polite">
        {caption}
      </div>
      {done && (
        <button className="btn ghost sm stage-replay" onClick={() => setRun((r) => r + 1)}>
          שוב
        </button>
      )}
    </>
  );
}
