// Animated solutions for the 2D spatial types: what moves where, and which parts land.
// Pure math, no React. Each fit tests the learner's choice against the item itself, never against the key.
import { dot2, reflect2 } from './geometry';
import { foldSteps, unfold } from './paper';
import type { P2, PaperFold, PaperStepsSpec, Poly2DSpec, SceneSpec } from './types';

const near = (a: P2, b: P2, eps = 0.12) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;

/* ---------------- 2D rotation: turn the original onto an option ---------------- */

/** Rotate a point clockwise on screen (SVG `rotate`, y down). */
export function rot(p: P2, deg: number): P2 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}

/** Cell centres in the shape's own frame: centred like Poly2D draws it, mirrored if flagged. */
export function localCells(spec: Poly2DSpec): P2[] {
  const xs = spec.cells.map((c) => c[0]);
  const ys = spec.cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
  return spec.cells.map(([x, y]) => [(x + 0.5 - cx) * (spec.mirror ? -1 : 1), y + 0.5 - cy] as P2);
}

export interface PolyFit {
  /** the screen angle the original turns to */
  angle: number;
  /** screen offset the original slides by, to sit over the option */
  shift: P2;
  /** per original cell: does it land on a cell of the option? */
  hits: boolean[];
  same: boolean;
}

const SHIFTS: P2[] = [[0, 0], ...[-1, -0.5, 0.5, 1].flatMap((a) => [[a, 0], [0, a]] as P2[]), [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]];

/** The quarter turn (and small slide) that lands the most cells of the original on the option. Rotation only, never a flip. */
export function fitPoly(start: Poly2DSpec, opt: Poly2DSpec): PolyFit {
  const target = localCells(opt);
  const own = localCells({ ...start, mirror: false });
  let best: PolyFit | null = null;
  let bestN = -1;
  for (const k of [0, 1, 2, 3])
    for (const t of SHIFTS) {
      const placed = own.map((p) => {
        const q = rot(p, 90 * k);
        return [q[0] + t[0], q[1] + t[1]] as P2;
      });
      const hits = placed.map((p) => target.some((q) => near(p, q)));
      const n = hits.filter(Boolean).length;
      if (n > bestN) {
        bestN = n;
        // the screen angle closest to where the original starts, so the turn takes the short way
        let angle = opt.angle + 90 * k;
        while (angle - start.angle > 180) angle -= 360;
        while (angle - start.angle <= -180) angle += 360;
        best = { angle, shift: rot(t, opt.angle), hits, same: n === own.length && own.length === target.length };
      }
    }
  return best!;
}

/* ---------------- paper folding: fold the chosen sheet back onto the punch ---------------- */

const onFlap = (p: P2, f: PaperFold) => f.keep * (dot2(f.n, p) - f.c) < -1e-9;

/** Where a point of the open sheet is with folds 0..k-1 done and fold k at fraction t (0..1). */
export function foldPoint(p: P2, folds: PaperFold[], k: number, t: number): P2 {
  let q = p;
  for (let i = 0; i < folds.length && i <= k; i++) {
    const f = folds[i];
    if (!onFlap(q, f)) continue;
    if (i < k) q = reflect2(q, f.n, f.c);
    else {
      const d = dot2(f.n, q) - f.c;
      const m = d * (1 - Math.cos(Math.PI * t));
      q = [q[0] - m * f.n[0], q[1] - m * f.n[1]];
    }
  }
  return q;
}

/** Point lies on the part of the sheet that turns over during fold k. */
export const flapAt = (p: P2, folds: PaperFold[], k: number) => k < folds.length && onFlap(foldPoint(p, folds, k, 0), folds[k]);

export interface PaperFit {
  /** per hole of the option: does it fold onto a punch? */
  hits: boolean[];
  /** how many layers the punch goes through, i.e. how many holes the open sheet must have */
  layers: number;
  /** layers the punch goes through that have no hole in the option */
  missing: number;
  same: boolean;
}

export function fitPaper(steps: PaperStepsSpec, holes: P2[]): PaperFit {
  const n = steps.folds.length;
  const hits = holes.map((h) => steps.punches.some((p) => near(foldPoint(h, steps.folds, n, 0), p, 0.03)));
  const layers = unfold(steps.folds, steps.punches).length;
  // two holes drawn on the same spot are one hole
  const landed = new Set(holes.filter((_, i) => hits[i]).map((h) => h.map((v) => Math.round(v * 16)).join()));
  const missing = Math.max(0, layers - landed.size);
  return { hits, layers, missing, same: missing === 0 && hits.every(Boolean) };
}

/** The sheet's regions for drawing a fold frame. */
export const paperRegions = (folds: PaperFold[]) => foldSteps(folds);

/* ---------------- hidden figure: slide the sample over the chosen figure ---------------- */

export type Seg = [number, number, number, number];
const S = 10;

/** Line segments of a figure drawing, in lattice units. */
export function readSegs(scene: SceneSpec): Seg[] {
  return scene.prims.flatMap((p) => (p.p === 'line' && p.pts.length === 2 ? [[p.pts[0][0] / S, p.pts[0][1] / S, p.pts[1][0] / S, p.pts[1][1] / S] as Seg] : []));
}

export const gridOf = (scene: SceneSpec) => Math.round((scene.box[2] - 16) / S);

/** Unit steps of a figure, direction-normalised. */
export function unitSegs(segs: Seg[]): Seg[] {
  const out = new Map<string, Seg>();
  for (const [x1, y1, x2, y2] of segs) {
    const n = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    for (let i = 0; i < n; i++) {
      const a: P2 = [x1 + dx * i, y1 + dy * i];
      const b: P2 = [a[0] + dx, a[1] + dy];
      const s: Seg = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]];
      out.set(s.join(), s);
    }
  }
  return [...out.values()];
}

export interface HiddenFit {
  /** where the sample's top-left corner lands in the figure */
  at: P2;
  /** the sample's unit strokes, placed, with whether each lies on a line of the figure */
  strokes: { seg: Seg; hit: boolean }[];
  same: boolean;
}

/** The placement, at the sample's own size and direction, that covers the most of it with lines of the figure. */
export function fitHidden(sample: Seg[], figure: Seg[], grid: number): HiddenFit {
  const own = unitSegs(sample);
  const x0 = Math.min(...own.flatMap((s) => [s[0], s[2]]));
  const y0 = Math.min(...own.flatMap((s) => [s[1], s[3]]));
  const w = Math.max(...own.flatMap((s) => [s[0], s[2]])) - x0;
  const h = Math.max(...own.flatMap((s) => [s[1], s[3]])) - y0;
  const fig = new Set(unitSegs(figure).map((s) => s.join()));
  let best: HiddenFit | null = null;
  let bestN = -1;
  for (let dy = 0; dy + h <= grid; dy++)
    for (let dx = 0; dx + w <= grid; dx++) {
      const strokes = own.map((s) => {
        const seg: Seg = [s[0] - x0 + dx, s[1] - y0 + dy, s[2] - x0 + dx, s[3] - y0 + dy];
        return { seg, hit: fig.has(seg.join()) };
      });
      const n = strokes.filter((s) => s.hit).length;
      if (n > bestN) {
        bestN = n;
        best = { at: [dx, dy], strokes, same: n === own.length };
      }
    }
  return best!;
}

/* ---------------- perceptual speed: lay the sample over the chosen pattern ---------------- */

/** On/off cells of a pattern drawing, row by row. */
export function readPattern(scene: SceneSpec): boolean[] {
  return scene.prims.flatMap((p) => (p.p === 'rect' && p.w < 10 ? [p.fill === 'ink'] : []));
}

/** Indices of the cells where the option differs from the sample. */
export const patternDiff = (sample: boolean[], option: boolean[]) => sample.flatMap((v, i) => (v !== option[i] ? [i] : []));

/* ---------------- dynamic 2D rotation: keep turning the same way until the shape meets the option ---------------- */

export interface ContinueFit {
  /** how far, in the stated direction, the shape must keep turning to meet the option (degrees, 1..360) */
  delta: number;
  /** what the question asks: continue by x in direction dir */
  x: number;
  dir: 1 | -1;
  /** some continuation in that direction meets the option exactly */
  same: boolean;
  /** ...and it is exactly the asked continuation */
  right: boolean;
  /** for an option no turn can meet: per cell, does it land at the closest turn */
  hits: boolean[];
  shift: P2;
}

const mod360 = (v: number) => ((Math.round(v) % 360) + 360) % 360;

export function fitContinue2D(start: Poly2DSpec, opt: Poly2DSpec, to: number, reveal: number): ContinueFit {
  const dir = (Math.sign(reveal - to) || 1) as 1 | -1;
  const x = Math.round(Math.abs(reveal - to));
  const target = localCells(opt);
  const own = localCells({ ...start, mirror: false });
  const turnTo = (angle: number) => mod360(dir * (angle - start.angle)) || 360;
  const full: number[] = [];
  for (const k of [0, 1, 2, 3]) {
    const hits = own.map((p) => target.some((q) => near(rot(p, 90 * k), q)));
    if (hits.every(Boolean) && own.length === target.length) full.push(turnTo(opt.angle + 90 * k));
  }
  if (full.length) {
    const delta = full.includes(mod360(x) || 360) ? mod360(x) || 360 : Math.min(...full);
    return { delta, x, dir, same: true, right: delta === (mod360(x) || 360), hits: own.map(() => true), shift: [0, 0] };
  }
  const fit = fitPoly(start, opt);
  return { delta: turnTo(fit.angle), x, dir, same: false, right: false, hits: fit.hits, shift: fit.shift };
}
