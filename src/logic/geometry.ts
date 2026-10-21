import type { M3, P2, V3 } from './types';

export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const norm = (a: V3): V3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

export const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const mulV = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export function mulM(a: M3, b: M3): M3 {
  const r: number[] = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

/** Rotation about a unit axis through the origin (right-hand rule). */
export function axisAngle(axis: V3, angleDeg: number): M3 {
  const [x, y, z] = norm(axis);
  const t = (angleDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const C = 1 - c;
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
}

export const roundM = (m: M3): M3 => m.map((v) => Math.round(v * 1e6) / 1e6 + 0);

/** The 24 proper rotations of the cube, as integer matrices. */
export const CUBE_ROTATIONS: M3[] = (() => {
  const out: M3[] = [];
  const seen = new Set<string>();
  const gens = [axisAngle([1, 0, 0], 90), axisAngle([0, 1, 0], 90), axisAngle([0, 0, 1], 90)].map(roundM);
  const queue: M3[] = [I3];
  while (queue.length) {
    const m = queue.shift()!;
    const k = m.map(Math.round).join(',');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m.map(Math.round));
    for (const g of gens) queue.push(roundM(mulM(g, m)));
  }
  return out;
})();

/* ---------- 2D ---------- */

export const dot2 = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];

export function reflect2(p: P2, n: P2, c: number): P2 {
  const d = dot2(n, p) - c;
  return [p[0] - 2 * d * n[0], p[1] - 2 * d * n[1]];
}

/** Keep the part of a convex polygon where side*(n·p - c) >= 0. */
export function clipHalf(poly: P2[], n: P2, c: number, side: 1 | -1): P2[] {
  const out: P2[] = [];
  const f = (p: P2) => side * (dot2(n, p) - c);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= -1e-9) out.push(a);
    if ((fa > 1e-9 && fb < -1e-9) || (fa < -1e-9 && fb > 1e-9)) {
      const t = fa / (fa - fb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

export function area(poly: P2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

export function insideConvex(poly: P2[], p: P2, eps = 1e-6): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) <= eps) continue;
    const s = Math.sign(cr);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Distance from a point to the boundary of a convex polygon (positive inside). */
export function edgeDistance(poly: P2[], p: P2): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len < 1e-9) continue;
    const d = Math.abs(ex * (p[1] - a[1]) - ey * (p[0] - a[0])) / len;
    best = Math.min(best, d);
  }
  return best;
}
