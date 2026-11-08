// Animated solution for plans and elevations: the building turns to the asked side, the camera flattens to a
// straight view, and the chosen drawing is laid over it column by column. Pure math, no React.
import type { Cubes3DSpec, Item, SceneSpec, V3 } from './types';

export type PlanView = 'front' | 'right' | 'top';
const U = 10;
const r2 = (v: number) => Math.round(v * 2) / 2;

export const isTopPlan = (s: SceneSpec) => s.label === 'תוכנית עם גובהי קומות';

export function planView(item: Item): PlanView {
  if (isTopPlan(item.options[0].visual as SceneSpec)) return 'top';
  return item.prompt.includes('הימני') ? 'right' : 'front';
}

/** Column heights of an elevation drawing, left to right. */
export function readElevation(s: SceneSpec): number[] {
  const ground = s.prims.find((p) => p.p === 'line');
  const len = ground && ground.p === 'line' ? Math.round((ground.pts[1][0] - 3) / U) : 0;
  const cols = Array.from({ length: len }, () => 0);
  for (const p of s.prims) if (p.p === 'rect') cols[Math.round(p.x / U)]++;
  return cols;
}

/** Plan grid [y][x] (y = 0 is the front row, drawn at the bottom) from a plan drawing. */
export function readTop(s: SceneSpec): number[][] {
  const rects = s.prims.flatMap((p) => (p.p === 'rect' ? [[Math.round(p.x / U), Math.round(p.y / U)]] : []));
  const w = Math.max(...rects.map((r) => r[0])) + 1;
  const d = Math.max(...rects.map((r) => r[1])) + 1;
  const grid = Array.from({ length: d }, () => Array.from({ length: w }, () => 0));
  for (const p of s.prims)
    if (p.p === 'text') {
      const col = Math.floor(p.at[0] / U), row = Math.floor(p.at[1] / U);
      grid[d - 1 - row][col] = Number(p.text);
    }
  return grid;
}

/** The building as the asked side sees it: world x is screen right, y is depth (or, from above, toward the back). */
export const viewTurn = (view: PlanView): number => (view === 'right' ? -90 : 0);

/** Cube position after the turn that brings the asked side to the front. */
export const turned = (c: V3, view: PlanView): V3 => (view === 'right' ? [c[1], -c[0], c[2]] : c);

export interface PlanCell {
  /** world position of the column (elevation) or cell (plan), after the turn */
  x: number;
  y: number;
  /** what the chosen drawing shows there, and what the building really has */
  shown: number;
  real: number;
  ok: boolean;
}

export interface PlanFit {
  view: PlanView;
  cells: PlanCell[];
  /** ground level (bottom face of the lowest cubes) */
  floor: number;
  same: boolean;
}

/**
 * Lay the chosen drawing over the building. The drawings span the whole site, including empty edge rows the
 * building does not show, so the correct drawing is used only to register where the site's first column is.
 */
export function fitPlan(item: Item, target: number): PlanFit {
  const view = planView(item);
  const building = item.stimulus as Cubes3DSpec;
  const cubes = building.cubes.map((c) => turned(c, view));
  const zmin = Math.min(...cubes.map((c) => c[2]));
  const xs = cubes.map((c) => r2(c[0]));
  const ys = cubes.map((c) => r2(c[1]));
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const height = (pred: (c: V3) => boolean) => {
    const zs = cubes.filter(pred).map((c) => c[2]);
    return zs.length ? Math.round(Math.max(...zs) - zmin) + 1 : 0;
  };
  const correct = item.options[item.correctIndex].visual as SceneSpec;
  const shown = item.options[target].visual as SceneSpec;

  if (view !== 'top') {
    const real = (x: number) => height((c) => Math.abs(c[0] - x) < 0.25);
    const ref = readElevation(correct);
    // shift k: drawing column i sits at world x = x0 + i - k
    let k = 0;
    for (let s = 0; s < ref.length; s++) if (ref.every((h, i) => h === real(x0 + i - s))) { k = s; break; }
    const cols = readElevation(shown);
    const cells = cols.map((h, i) => {
      const x = x0 + i - k;
      const r = real(x);
      return { x, y: 0, shown: h, real: r, ok: h === r };
    });
    // built columns the drawing leaves out
    for (const x of new Set(xs)) if (!cells.some((c) => Math.abs(c.x - x) < 0.25)) cells.push({ x, y: 0, shown: 0, real: real(x), ok: false });
    return { view, cells, floor: zmin - 0.5, same: cells.every((c) => c.ok) };
  }

  const real = (x: number, y: number) => height((c) => Math.abs(c[0] - x) < 0.25 && Math.abs(c[1] - y) < 0.25);
  const ref = readTop(correct);
  let kx = 0, ky = 0;
  search: for (let sy = 0; sy < ref.length; sy++)
    for (let sx = 0; sx < ref[0].length; sx++)
      if (ref.every((row, y) => row.every((h, x) => h === real(x0 + x - sx, y0 + y - sy)))) {
        kx = sx;
        ky = sy;
        break search;
      }
  const grid = readTop(shown);
  const cells: PlanCell[] = [];
  // every cell of the drawing, plus any built cell the drawing leaves out
  const seen = new Set<string>();
  grid.forEach((row, y) =>
    row.forEach((h, x) => {
      const wx = x0 + x - kx, wy = y0 + y - ky;
      seen.add(`${wx},${wy}`);
      const r = real(wx, wy);
      cells.push({ x: wx, y: wy, shown: h, real: r, ok: h === r });
    }),
  );
  for (const c of cubes) {
    const key = `${r2(c[0])},${r2(c[1])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ x: r2(c[0]), y: r2(c[1]), shown: 0, real: real(r2(c[0]), r2(c[1])), ok: false });
  }
  return { view, cells, floor: zmin - 0.5, same: cells.every((c) => c.ok) };
}
