// Cube nets: folding geometry, valid views and face looks.
import { CUBE_ROTATIONS, add, axisAngle, cross, mulM, mulV, sub, I3 } from './geometry';
import type { Rng } from './rng';
import type { CubeViewSpec, FaceLook, M3, P2, V3 } from './types';

/** The 11 nets of the cube, [col,row] cells. */
export const NETS: P2[][] = [
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

export function transformNet(cells: P2[], rot: number, flip: boolean): P2[] {
  let c = cells.map(([x, y]) => [flip ? -x : x, y] as P2);
  for (let i = 0; i < rot; i++) c = c.map(([x, y]) => [-y, x] as P2);
  const mx = Math.min(...c.map((p) => p[0]));
  const my = Math.min(...c.map((p) => p[1]));
  return c.map(([x, y]) => [x - mx, y - my] as P2);
}

interface Affine {
  m: M3;
  t: V3;
}
const apply = (a: Affine, p: V3): V3 => add(mulV(a.m, p), a.t);
const compose = (a: Affine, b: Affine): Affine => ({ m: mulM(a.m, b.m), t: add(mulV(a.m, b.t), a.t) });

/** Flat coordinates: x = col, y = -row (north is up), z = 0. Printed side faces +z. */
const flat = (cell: P2): V3 => [cell[0], -cell[1], 0];

export interface FoldedFace {
  id: number;
  corners: V3[]; // 4 corners, order: NW, NE, SE, SW (in face-local terms)
  center: V3;
  normal: V3; // printed-side normal
  up: V3; // printed "up" direction
  right: V3;
}

function tree(cells: P2[], root: number): number[] {
  const parent = cells.map(() => -2);
  parent[root] = -1;
  const queue = [root];
  while (queue.length) {
    const i = queue.shift()!;
    cells.forEach((c, j) => {
      if (parent[j] !== -2) return;
      if (Math.abs(c[0] - cells[i][0]) + Math.abs(c[1] - cells[i][1]) === 1) {
        parent[j] = i;
        queue.push(j);
      }
    });
  }
  return parent;
}

/** Fold the net by fraction t (0 flat → 1 closed). Faces fold down so the printed side ends outside. */
export function foldNet(cells: P2[], root: number, t: number): FoldedFace[] {
  const parent = tree(cells, root);
  const memo = new Map<number, Affine>();
  const affineOf = (i: number): Affine => {
    if (memo.has(i)) return memo.get(i)!;
    let a: Affine = { m: I3, t: [0, 0, 0] };
    const p = parent[i];
    if (p >= 0) {
      const P = flat(cells[p]);
      const C = flat(cells[i]);
      const d = sub(C, P);
      const hinge: V3 = [(P[0] + C[0]) / 2, (P[1] + C[1]) / 2, 0];
      const axis = cross([0, 0, 1], d);
      const r = axisAngle(axis, 90 * t);
      // rotate about hinge line: x -> R(x - h) + h
      const local: Affine = { m: r, t: sub(hinge, mulV(r, hinge)) };
      a = compose(affineOf(p), local);
    }
    memo.set(i, a);
    return a;
  };
  return cells.map((cell, id) => {
    const a = affineOf(id);
    const c = flat(cell);
    const corners: V3[] = [
      [c[0] - 0.5, c[1] + 0.5, 0],
      [c[0] + 0.5, c[1] + 0.5, 0],
      [c[0] + 0.5, c[1] - 0.5, 0],
      [c[0] - 0.5, c[1] - 0.5, 0],
    ].map((p) => apply(a, p as V3));
    return {
      id,
      corners,
      center: apply(a, c),
      normal: mulV(a.m, [0, 0, 1]),
      up: mulV(a.m, [0, 1, 0]),
      right: mulV(a.m, [1, 0, 0]),
    };
  });
}

const roundV = (v: V3): V3 => v.map((x) => Math.round(x) + 0) as V3;
const vkey = (v: V3) => roundV(v).join(',');

export interface CubeFrame {
  normal: V3;
  up: V3;
}

/** Closed-cube frames for each face id (normal outward, pattern up). */
export function cubeFrames(cells: P2[], root: number): CubeFrame[] {
  return foldNet(cells, root, 1).map((f) => ({ normal: roundV(f.normal), up: roundV(f.up) }));
}

export function isValidNet(cells: P2[], root = 0): boolean {
  const frames = cubeFrames(cells, root);
  return new Set(frames.map((f) => vkey(f.normal))).size === 6;
}

export function oppositeOf(frames: CubeFrame[], id: number): number {
  const n = frames[id].normal;
  return frames.findIndex((f) => f.normal[0] === -n[0] && f.normal[1] === -n[1] && f.normal[2] === -n[2]);
}

/* ---------- views: top (+z), front (-y), right (+x) ---------- */

export const SLOT_NORMALS: Record<'top' | 'front' | 'right', V3> = {
  top: [0, 0, 1],
  front: [0, -1, 0],
  right: [1, 0, 0],
};
const SLOT_REF_UP: Record<'top' | 'front' | 'right', V3> = {
  top: [0, 1, 0],
  front: [0, 0, 1],
  right: [0, 0, 1],
};

/** 0..3 quarter-turns of an up-vector relative to the slot's reference up. */
export function orientIndex(slot: 'top' | 'front' | 'right', up: V3): number {
  const n = SLOT_NORMALS[slot];
  let ref = SLOT_REF_UP[slot];
  for (let k = 0; k < 4; k++) {
    if (vkey(ref) === vkey(up)) return k;
    ref = roundV(mulV(axisAngle(n, 90), ref));
  }
  return -1;
}

export interface ViewKeyFace {
  id: number;
  up: V3;
}

export function viewFor(frames: CubeFrame[], rot: M3): Record<'top' | 'front' | 'right', ViewKeyFace> {
  const world = frames.map((f) => ({ normal: roundV(mulV(rot, f.normal)), up: roundV(mulV(rot, f.up)) }));
  const find = (n: V3) => {
    const id = world.findIndex((w) => vkey(w.normal) === vkey(n));
    return { id, up: world[id].up };
  };
  return { top: find(SLOT_NORMALS.top), front: find(SLOT_NORMALS.front), right: find(SLOT_NORMALS.right) };
}

export function viewKey(v: Record<'top' | 'front' | 'right', ViewKeyFace>, oriented: boolean): string {
  return (['top', 'front', 'right'] as const)
    .map((s) => (oriented ? `${v[s].id}@${orientIndex(s, v[s].up)}` : `${v[s].id}`))
    .join('|');
}

export function allValidViewKeys(frames: CubeFrame[], oriented: boolean): Set<string> {
  return new Set(CUBE_ROTATIONS.map((r) => viewKey(viewFor(frames, r), oriented)));
}

export function rotateUp(slot: 'top' | 'front' | 'right', up: V3, quarter: number): V3 {
  return roundV(mulV(axisAngle(SLOT_NORMALS[slot], 90 * quarter), up));
}

/* ---------- looks ---------- */

export const FACE_COLORS = ['#C65D3B', '#D9A441', '#6F8F5E', '#4F6D8F', '#8A5A83', '#B9B2A3'];
export const FACE_COLOR_NAMES = ['טרקוטה', 'חרדל', 'מרווה', 'כחול צפחה', 'שזיף', 'חול'];
const MARKS: FaceLook['mark'][] = ['none', 'dot', 'ring', 'four', 'diamond', 'cross'];
/** Asymmetric Hebrew letters (orientation is readable) and look-alike substitutes. */
export const LETTERS = ['ב', 'ג', 'ד', 'ל', 'פ', 'ק'];
export const LOOKALIKE: Record<string, string> = { ב: 'כ', ג: 'נ', ד: 'ר', ל: 'ן', פ: 'ף', ק: 'ה' };

export function makeLooks(rng: Rng, oriented: boolean): FaceLook[] {
  const colors = rng.shuffle(FACE_COLORS);
  const marks = rng.shuffle(MARKS);
  const letters = rng.shuffle(LETTERS);
  return colors.map((color, id) => ({
    id,
    color,
    mark: oriented ? 'none' : marks[id],
    letter: oriented ? letters[id] : undefined,
  }));
}

export function viewSpec(v: Record<'top' | 'front' | 'right', ViewKeyFace>, looks: FaceLook[]): CubeViewSpec {
  return {
    kind: 'cubeView',
    top: { face: looks[v.top.id], up: v.top.up },
    front: { face: looks[v.front.id], up: v.front.up },
    right: { face: looks[v.right.id], up: v.right.up },
  };
}
