// Animated solution for cross-sections: lay the chosen shape into the cutting plane and see where it meets
// the solid's walls. The real section is used only to place and to judge; it is never drawn. Pure math, no React.
import { add, scale } from './geometry';
import { makeSolid, normalFrame, planeBasis, section, type SolidName } from './solids';
import type { Item, P2, SceneSpec, SolveHint, V3 } from './types';

export type EdgeState = 'on' | 'in' | 'out';

export interface SectionFit {
  /** option outline, flat on the page (the option's own drawing units) */
  flat: P2[];
  /** the same outline laid into the cutting plane, in world space */
  placed: V3[];
  /** short pieces of the laid outline: on the solid's wall, short of it (inside), or poking out */
  pieces: { a: V3; b: V3; state: EdgeState }[];
  same: boolean;
}

export const canFitSection = (item: Item) => item.type === 'sections' && item.solve?.kind === 'section';

/** The option's outline in normalized shape coordinates (y up), as shapePrims drew it with y flipped. */
const outline = (scene: SceneSpec): P2[] => {
  const p = scene.prims[0];
  return p.p === 'line' ? p.pts : [];
};

function distToBoundary(poly: P2[], q: P2): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]));
  }
  return best;
}

function inside(poly: P2[], q: P2): boolean {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    if (Math.abs(c) < 1e-12) continue;
    if (s === 0) s = Math.sign(c);
    else if (Math.sign(c) !== s) return false;
  }
  return true;
}

export function fitSection(item: Item, target: number): SectionFit {
  const hint = item.solve as Extract<SolveHint, { kind: 'section' }>;
  const solid = makeSolid(hint.solid as SolidName);
  const real = section(solid, { n: hint.n, d: hint.d }).poly;
  const f = normalFrame(real);
  const [u, v] = planeBasis(hint.n);
  const c0 = scale(hint.n, hint.d);
  const flat = outline(item.options[target].visual as SceneSpec);
  // undo the normalization of the real section: same centre, principal axis and radius
  const toPlane = ([x, y]: P2): P2 => {
    const q: P2 = [x * f.m, -y * f.m];
    const c = Math.cos(f.ang), s = Math.sin(f.ang);
    return [q[0] * c - q[1] * s + f.cx, q[0] * s + q[1] * c + f.cy];
  };
  const to3 = ([x, y]: P2): V3 => add(add(c0, scale(u, x)), scale(v, y));
  const flat2 = flat.map(toPlane);

  const raw: { a: V3; b: V3; dist: number; in: boolean }[] = [];
  for (let i = 0; i < flat2.length; i++) {
    const a = flat2[i], b = flat2[(i + 1) % flat2.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (0.05 * f.m)));
    for (let k = 0; k < n; k++) {
      const p: P2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const q: P2 = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n];
      const mid: P2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      raw.push({ a: to3(p), b: to3(q), dist: distToBoundary(real, mid), in: inside(real, mid) });
    }
  }
  // close enough to the wall counts as on it; a near-miss shape still shows where it misses most
  const far = Math.max(...raw.map((r) => r.dist));
  // laid in the real section's own frame, the right shape coincides with the cut all round
  const same = far < 0.01 * f.m;
  const tol = same ? Infinity : Math.min(0.025 * f.m, 0.5 * far);
  const pieces = raw.map((r) => ({ a: r.a, b: r.b, state: (r.dist < tol ? 'on' : r.in ? 'in' : 'out') as EdgeState }));
  return { flat, placed: flat2.map(to3), pieces, same };
}
