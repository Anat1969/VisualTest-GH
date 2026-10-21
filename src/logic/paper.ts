// Paper folding & hole punching on the unit square. Coordinates: x right, y down.
import { area, clipHalf, dot2, edgeDistance, insideConvex, reflect2 } from './geometry';
import type { Rng } from './rng';
import type { P2, PaperFold } from './types';

export const SQUARE: P2[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

const DIRS: { n: P2; family: 'axis' | 'diag' }[] = [
  { n: [1, 0], family: 'axis' },
  { n: [0, 1], family: 'axis' },
  { n: [Math.SQRT1_2, Math.SQRT1_2], family: 'diag' },
  { n: [Math.SQRT1_2, -Math.SQRT1_2], family: 'diag' },
];

export interface FoldStep {
  fold: PaperFold;
  before: P2[];
  kept: P2[];
  flap: P2[];
}

/** Regions before/after each fold. */
export function foldSteps(folds: PaperFold[]): FoldStep[] {
  let region = SQUARE;
  return folds.map((fold) => {
    const kept = clipHalf(region, fold.n, fold.c, fold.keep);
    const flap = clipHalf(region, fold.n, fold.c, (-fold.keep) as 1 | -1);
    const step = { fold, before: region, kept, flap };
    region = kept;
    return step;
  });
}

export function candidateFolds(region: P2[], allowDiag: boolean): PaperFold[] {
  const out: PaperFold[] = [];
  for (const d of DIRS) {
    if (d.family === 'diag' && !allowDiag) continue;
    const proj = region.map((p) => dot2(d.n, p));
    const c = (Math.min(...proj) + Math.max(...proj)) / 2;
    for (const keep of [1, -1] as const) {
      const kept = clipHalf(region, d.n, c, keep);
      const flap = clipHalf(region, d.n, c, (-keep) as 1 | -1);
      if (area(kept) < 0.02 || area(flap) < 0.02) continue;
      const fits = flap.every((p) => insideConvex(kept, reflect2(p, d.n, c), 1e-6));
      if (fits) out.push({ n: d.n, c, keep });
    }
  }
  return out;
}

export function randomFolds(rng: Rng, count: number, allowDiag: boolean): PaperFold[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const folds: PaperFold[] = [];
    let region = SQUARE;
    for (let i = 0; i < count; i++) {
      const cands = candidateFolds(region, allowDiag);
      if (!cands.length) break;
      const f = rng.pick(cands);
      folds.push(f);
      region = clipHalf(region, f.n, f.c, f.keep);
    }
    if (folds.length === count) return folds;
  }
  return [{ n: [1, 0], c: 0.5, keep: -1 }];
}

const GRID = 8;

export function pickPunches(rng: Rng, folds: PaperFold[], count: number): P2[] {
  const steps = foldSteps(folds);
  const final = steps[steps.length - 1].kept;
  const cands: P2[] = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const p: P2 = [(i + 0.5) / GRID, (j + 0.5) / GRID];
      if (!insideConvex(final, p) || edgeDistance(final, p) < 0.05) continue;
      if (folds.some((f) => Math.abs(dot2(f.n, p) - f.c) < 0.05)) continue;
      cands.push(p);
    }
  return rng.shuffle(cands).slice(0, count);
}

/** Unfold: walk folds in reverse, mirroring holes that lie on the folded flap. */
export function unfold(folds: PaperFold[], punches: P2[], skip = -1, swapAxis = -1): P2[] {
  const steps = foldSteps(folds);
  let holes = punches.slice();
  for (let i = steps.length - 1; i >= 0; i--) {
    if (i === skip) continue;
    const s = steps[i];
    let { n, c } = s.fold;
    if (i === swapAxis) {
      n = [n[1], -n[0]] as P2;
      const proj = s.before.map((p) => dot2(n, p));
      c = (Math.min(...proj) + Math.max(...proj)) / 2;
    }
    const mirrored = holes
      .map((h) => reflect2(h, n, c))
      .filter((p) => insideConvex(s.before, p, 1e-6) && p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1);
    holes = dedupe([...holes, ...mirrored]);
  }
  return holes;
}

const r16 = (v: number) => Math.round(v * 16) / 16;

export function dedupe(points: P2[]): P2[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const k = `${r16(p[0])},${r16(p[1])}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const holesKey = (holes: P2[]) =>
  holes
    .map((p) => `${r16(p[0])},${r16(p[1])}`)
    .sort()
    .join(';');
