// Animated solution for 3D rotation items: find the cube rotation that brings the original as close as possible
// to an option, and interpolate smoothly between orientations. Pure math, no React.
import { CUBE_ROTATIONS, axisAngle, mulM, mulV, roundM } from './geometry';
import type { M3, V3 } from './types';

const key = (p: V3) => p.map((v) => Math.round(v * 2)).join(',');
const centroid = (cs: V3[]): V3 => [0, 1, 2].map((i) => cs.reduce((s, c) => s + c[i], 0) / cs.length) as V3;

export interface Fit {
  /** integer rotation applied to the original, in the option's local frame */
  m: M3;
  /** translation (option frame) that lays the rotated original over the option */
  t: V3;
  /** per original cube: does it land on a cube of the option? */
  hits: boolean[];
  /** true when every cube lands and the counts match: the same shape */
  same: boolean;
}

/** Best of the 24 cube rotations: the most original cubes landing on option cubes, centroids aligned. */
export function fitRotation(orig: V3[], target: V3[]): Fit {
  const tc = centroid(target);
  const tset = new Set(target.map(key));
  let best: Fit | null = null;
  let bestN = -1;
  for (const m of CUBE_ROTATIONS) {
    const rc = orig.map((c) => mulV(m, c));
    const cc = centroid(rc);
    // snap the shift to the half-grid so cubes land exactly
    const t = [0, 1, 2].map((i) => Math.round((tc[i] - cc[i]) * 2) / 2) as V3;
    const hits = rc.map((c) => tset.has(key([c[0] + t[0], c[1] + t[1], c[2] + t[2]])));
    const n = hits.filter(Boolean).length;
    if (n > bestN) {
      bestN = n;
      best = { m, t, hits, same: n === orig.length && orig.length === target.length };
    }
  }
  return best!;
}

/* ---------- quaternions, for a smooth turn between two orientations ---------- */

type Q = [number, number, number, number]; // w, x, y, z

export function quatFromM(m: M3): Q {
  const [a, b, c, d, e, f, g, h, i] = m;
  const tr = a + e + i;
  let q: Q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [0.25 * s, (h - f) / s, (c - g) / s, (d - b) / s];
  } else if (a > e && a > i) {
    const s = Math.sqrt(1 + a - e - i) * 2;
    q = [(h - f) / s, 0.25 * s, (b + d) / s, (c + g) / s];
  } else if (e > i) {
    const s = Math.sqrt(1 + e - a - i) * 2;
    q = [(c - g) / s, (b + d) / s, 0.25 * s, (f + h) / s];
  } else {
    const s = Math.sqrt(1 + i - a - e) * 2;
    q = [(d - b) / s, (c + g) / s, (f + h) / s, 0.25 * s];
  }
  const n = Math.hypot(...q);
  return q.map((v) => v / n) as Q;
}

export function mFromQuat([w, x, y, z]: Q): M3 {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

export function slerp(a: Q, b: Q, t: number): Q {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb = d < 0 ? (b.map((v) => -v) as Q) : b;
  d = Math.abs(d);
  if (d > 0.9995) {
    const q = a.map((v, i) => v + (bb[i] - v) * t) as Q;
    const n = Math.hypot(...q);
    return q.map((v) => v / n) as Q;
  }
  const th = Math.acos(d);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb) as Q;
}

/** Orientation of the original at time t (0..1) on its way from `start` to `end`. */
export const turnAt = (start: M3, end: M3, t: number): M3 => mFromQuat(slerp(quatFromM(start), quatFromM(end), t));

/** Where the original ends: the option's own view rotation times the fitted cube rotation. */
export const endRotation = (optionRot: M3, fit: Fit): M3 => mulM(optionRot, fit.m);

/* ---------- dynamic 3D rotation: keep turning about the same axis until the figure meets the option ---------- */

export interface Continue3D {
  /** degrees, in the stated direction, until the figure meets the option (or comes closest) */
  theta: number;
  same: boolean;
  right: boolean;
  /** per cube at that turn: does it land on a cube of the option */
  hits: boolean[];
  /** world shift that lays the turned figure over the option */
  t: V3;
}

export function fitContinue3D(cubes: V3[], startRot: M3, axis: V3, dir: number, x: number, optCubes: V3[], optRot: M3): Continue3D {
  const target = optCubes.map((c) => mulV(optRot, c));
  const tset = new Set(target.map(key));
  const tc = centroid(target);
  const tries = [90, 180, 270, 360].map((theta) => {
    const R = roundM(mulM(axisAngle(axis, dir * theta), startRot));
    const w = cubes.map((c) => mulV(R, c));
    const cc = centroid(w);
    const t = [0, 1, 2].map((i) => Math.round((tc[i] - cc[i]) * 2) / 2) as V3;
    const hits = w.map((c) => tset.has(key([c[0] + t[0], c[1] + t[1], c[2] + t[2]])));
    return { theta, hits, t, same: hits.every(Boolean) && cubes.length === optCubes.length };
  });
  const full = tries.filter((r) => r.same);
  const pick = full.find((r) => r.theta === x) ?? full[0] ?? tries.reduce((a, b) => (b.hits.filter(Boolean).length > a.hits.filter(Boolean).length ? b : a));
  return { theta: pick.theta, same: pick.same, right: pick.same && pick.theta === x, hits: pick.hits, t: pick.t };
}
