// Polyominoes (2D) and polycubes (3D): generation, congruence and controlled mutation.
import { CUBE_ROTATIONS, mulV } from './geometry';
import type { Rng } from './rng';
import type { P2, V3 } from './types';

/* ---------- 2D ---------- */

const N4: P2[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function norm2(cells: P2[]): string {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([x, y]) => [x - mx, y - my])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((c) => c.join(','))
    .join(';');
}

const rot90 = (cells: P2[]): P2[] => cells.map(([x, y]) => [-y, x] as P2);
export const mirror2 = (cells: P2[]): P2[] => cells.map(([x, y]) => [-x, y] as P2);

export function rotations2(cells: P2[]): string[] {
  const out: string[] = [];
  let c = cells;
  for (let i = 0; i < 4; i++) {
    out.push(norm2(c));
    c = rot90(c);
  }
  return out;
}

/** Key equal for shapes that are the same up to rotation (not reflection). */
export const rotKey2 = (cells: P2[]) => rotations2(cells).sort()[0];
export const congruentKey2 = (cells: P2[]) => [rotKey2(cells), rotKey2(mirror2(cells))].sort()[0];

export function isChiral2(cells: P2[]): boolean {
  return rotKey2(cells) !== rotKey2(mirror2(cells));
}

export function hasRotSym2(cells: P2[]): boolean {
  const r = rotations2(cells);
  return r[1] === r[0] || r[2] === r[0];
}

function connected2(cells: P2[]): boolean {
  const set = new Set(cells.map((c) => c.join(',')));
  const seen = new Set<string>([cells[0].join(',')]);
  const stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of N4) {
      const k = `${x + dx},${y + dy}`;
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === cells.length;
}

function grow2(rng: Rng, n: number): P2[] {
  const cells: P2[] = [[0, 0]];
  const has = (p: P2) => cells.some((c) => c[0] === p[0] && c[1] === p[1]);
  while (cells.length < n) {
    const base = rng.pick(cells);
    const d = rng.pick(N4);
    const p: P2 = [base[0] + d[0], base[1] + d[1]];
    if (!has(p)) cells.push(p);
  }
  return cells;
}

/** Asymmetric polyomino: chiral and without rotational symmetry, max extent 4. */
export function randomPolyomino(rng: Rng, n: number): P2[] {
  for (let i = 0; i < 500; i++) {
    const c = grow2(rng, n);
    const w = Math.max(...c.map((p) => p[0])) - Math.min(...c.map((p) => p[0]));
    const h = Math.max(...c.map((p) => p[1])) - Math.min(...c.map((p) => p[1]));
    if (w > 3 || h > 3) continue;
    if (isChiral2(c) && !hasRotSym2(c)) return c;
  }
  return [[0, 0], [1, 0], [2, 0], [2, 1], [0, 1], [0, 2]].slice(0, n) as P2[];
}

/** Move one cell so the result is connected and not congruent to the source (even with mirror). */
export function mutate2(rng: Rng, cells: P2[]): P2[] {
  const srcKey = congruentKey2(cells);
  for (let i = 0; i < 300; i++) {
    const idx = rng.int(0, cells.length - 1);
    const rest = cells.filter((_, j) => j !== idx);
    if (!connected2(rest)) continue;
    const base = rng.pick(rest);
    const d = rng.pick(N4);
    const p: P2 = [base[0] + d[0], base[1] + d[1]];
    if (rest.some((c) => c[0] === p[0] && c[1] === p[1])) continue;
    const next = [...rest, p];
    if (congruentKey2(next) !== srcKey && !hasRotSym2(next)) return next;
  }
  return cells;
}

/* ---------- 3D ---------- */

const N6: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export function norm3(cubes: V3[]): string {
  const m = [0, 1, 2].map((i) => Math.min(...cubes.map((c) => c[i])));
  return cubes
    .map((c) => c.map((v, i) => Math.round(v - m[i])))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    .map((c) => c.join(','))
    .join(';');
}

export const mirror3 = (cubes: V3[]): V3[] => cubes.map(([x, y, z]) => [-x, y, z] as V3);

export function rotKey3(cubes: V3[]): string {
  return CUBE_ROTATIONS.map((r) => norm3(cubes.map((c) => mulV(r, c)))).sort()[0];
}
export const congruentKey3 = (cubes: V3[]) => [rotKey3(cubes), rotKey3(mirror3(cubes))].sort()[0];

export function isChiral3(cubes: V3[]): boolean {
  return rotKey3(cubes) !== rotKey3(mirror3(cubes));
}

/** True when some non-identity rotation maps the shape onto itself. */
export function hasRotSym3(cubes: V3[]): boolean {
  const k = norm3(cubes);
  return CUBE_ROTATIONS.slice(1).some((r) => norm3(cubes.map((c) => mulV(r, c))) === k);
}

/** Shepard–Metzler style arm figure: straight segments joined at right angles. */
export function randomPolycube(rng: Rng, n: number): V3[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const cubes: V3[] = [[0, 0, 0]];
    let dir: V3 = rng.pick(N6);
    const axesUsed = new Set<number>();
    let ok = true;
    while (cubes.length < n && ok) {
      const len = rng.int(2, 3);
      axesUsed.add(dir.findIndex((v) => v !== 0));
      for (let i = 0; i < len && cubes.length < n; i++) {
        const last = cubes[cubes.length - 1];
        const p: V3 = [last[0] + dir[0], last[1] + dir[1], last[2] + dir[2]];
        if (cubes.some((c) => c[0] === p[0] && c[1] === p[1] && c[2] === p[2])) {
          ok = false;
          break;
        }
        cubes.push(p);
      }
      const prevAxis = dir.findIndex((v) => v !== 0);
      dir = rng.pick(N6.filter((d) => d[prevAxis] === 0));
    }
    if (!ok || axesUsed.size < 3) continue;
    // no cube may touch a non-consecutive cube (keeps arms readable)
    const touching = cubes.some((a, i) =>
      cubes.some((b, j) => j > i + 1 && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) === 1),
    );
    if (touching) continue;
    if (isChiral3(cubes) && !hasRotSym3(cubes)) return center3(cubes);
  }
  return center3([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1], [2, 2, 2]]);
}

export function center3(cubes: V3[]): V3[] {
  const c = [0, 1, 2].map((i) => {
    const vals = cubes.map((p) => p[i]);
    return (Math.min(...vals) + Math.max(...vals)) / 2;
  });
  return cubes.map((p) => [p[0] - c[0], p[1] - c[1], p[2] - c[2]] as V3);
}

/** Bend the last arm in another direction: a near-identical but different shape. */
export function mutate3(rng: Rng, cubes: V3[]): V3[] {
  const srcKey = congruentKey3(cubes);
  for (let i = 0; i < 300; i++) {
    const fromEnd = rng.chance(0.5);
    const chain = fromEnd ? cubes.slice() : cubes.slice().reverse();
    const k = rng.int(1, 2);
    const kept = chain.slice(0, chain.length - k);
    let cur = kept[kept.length - 1];
    const prev = kept[kept.length - 2];
    const axis = [0, 1, 2].find((a) => cur[a] !== prev[a])!;
    const d = rng.pick(N6.filter((v) => v[axis] === 0));
    const out = kept.slice();
    let ok = true;
    for (let j = 0; j < k; j++) {
      const p: V3 = [cur[0] + d[0], cur[1] + d[1], cur[2] + d[2]];
      if (out.some((c) => Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) + Math.abs(c[2] - p[2]) < 0.5)) {
        ok = false;
        break;
      }
      out.push(p);
      cur = p;
    }
    if (!ok) continue;
    if (congruentKey3(out) !== srcKey) return center3(out);
  }
  return cubes;
}
