import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { fitContinue2D, fitHidden, fitPaper, fitPoly, foldPoint, gridOf, patternDiff, readPattern, readSegs, rot, localCells } from './solve2d';
import { fitPlan } from './solvePlan';
import { fitContinue3D } from './solve3d';
import { fitSection } from './solveSection';
import type { Cubes3DSpec, Level, PaperHolesSpec, PaperStepsSpec, Poly2DSpec, SceneSpec, Variant } from './types';

const LEVELS: Level[] = [1, 2, 3];
const each = (v: Variant, n: number, fn: (item: ReturnType<typeof generateItem>) => void) => {
  for (const level of LEVELS) for (let seed = 1; seed <= n; seed++) fn(generateItem(v, level, seed * 7919 + level));
};

describe('2D rotation solution', () => {
  it('only the correct option takes every cell of the original', () =>
    each({ type: 'rotation', dim: '2D', motion: 'static' }, 40, (item) =>
      item.options.forEach((o, i) => expect(fitPoly(item.stimulus as Poly2DSpec, o.visual as Poly2DSpec).same).toBe(i === item.correctIndex)),
    ));

  it('at the end of the turn the original lies on the correct option', () =>
    each({ type: 'rotation', dim: '2D', motion: 'static' }, 20, (item) => {
      const start = item.stimulus as Poly2DSpec;
      const opt = item.options[item.correctIndex].visual as Poly2DSpec;
      const fit = fitPoly(start, opt);
      const placed = localCells({ ...start, mirror: false }).map((p) => rot(p, fit.angle)).map((p) => [p[0] + fit.shift[0], p[1] + fit.shift[1]]);
      const target = localCells(opt).map((p) => rot(p, opt.angle));
      for (const p of placed) expect(target.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)).toBe(true);
      expect(Math.abs(fit.angle - start.angle)).toBeLessThanOrEqual(180);
    }));
});

describe('paper folding solution', () => {
  it('only the correct sheet folds back onto the punch with no hole missing', () =>
    each({ type: 'folding', dim: '2D', motion: 'static' }, 40, (item) =>
      item.options.forEach((o, i) => expect(fitPaper(item.stimulus as PaperStepsSpec, (o.visual as PaperHolesSpec).holes).same).toBe(i === item.correctIndex)),
    ));

  it('no sheet shows two holes on the same spot', () =>
    each({ type: 'folding', dim: '2D', motion: 'static' }, 60, (item) =>
      item.options.forEach((o) => {
        const keys = (o.visual as PaperHolesSpec).holes.map((h) => h.map((v) => Math.round(v * 16)).join());
        expect(new Set(keys).size).toBe(keys.length);
      }),
    ));

  it('a fold half done moves only the flap, and a full fold mirrors it', () => {
    const folds = [{ n: [1, 0] as [number, number], c: 0.5, keep: 1 as const }];
    expect(foldPoint([0.25, 0.5], folds, 0, 1)).toEqual([0.75, 0.5]);
    expect(foldPoint([0.75, 0.5], folds, 0, 0.5)).toEqual([0.75, 0.5]);
    expect(foldPoint([0.25, 0.5], folds, 0, 0)).toEqual([0.25, 0.5]);
  });
});

describe('hidden figure solution', () => {
  it('the sample fits whole only in the correct figure', () =>
    each({ type: 'hidden', dim: '2D', motion: 'static' }, 30, (item) => {
      const sample = readSegs(item.stimulus as SceneSpec);
      item.options.forEach((o, i) => {
        const fig = o.visual as SceneSpec;
        expect(fitHidden(sample, readSegs(fig), gridOf(fig)).same).toBe(i === item.correctIndex);
      });
    }));
});

describe('perceptual speed solution', () => {
  it('only the correct pattern has no differing cell', () =>
    each({ type: 'speed', dim: '2D', motion: 'static' }, 30, (item) => {
      const sample = readPattern(item.stimulus as SceneSpec);
      item.options.forEach((o, i) => expect(patternDiff(sample, readPattern(o.visual as SceneSpec)).length === 0).toBe(i === item.correctIndex));
    }));
});

describe('plans solution', () => {
  it('only the correct drawing matches the building in every column', () =>
    each({ type: 'plans', dim: '3D', motion: 'static' }, 40, (item) =>
      item.options.forEach((_, i) => expect(fitPlan(item, i).same).toBe(i === item.correctIndex)),
    ));
});

describe('sections solution', () => {
  it('only the correct shape lies on the solid walls all round', () =>
    each({ type: 'sections', dim: '3D', motion: 'static' }, 40, (item) =>
      item.options.forEach((_, i) => {
        const fit = fitSection(item, i);
        expect(fit.same).toBe(i === item.correctIndex);
        const on = fit.pieces.filter((p) => p.state === 'on').length / fit.pieces.length;
        if (i === item.correctIndex) expect(on).toBe(1);
        else expect(on).toBeLessThan(1);
      }),
    ));
});

describe('dynamic rotation solution', () => {
  it('2D: only the correct option is met by exactly the asked continuation', () =>
    each({ type: 'rotation', dim: '2D', motion: 'dynamic' }, 40, (item) => {
      const d = item.dynamic as Extract<NonNullable<typeof item.dynamic>, { kind: 'rotate2d' }>;
      item.options.forEach((o, i) => expect(fitContinue2D(item.stimulus as Poly2DSpec, o.visual as Poly2DSpec, d.to, d.reveal).right).toBe(i === item.correctIndex));
    }));

  it('3D: only the correct option is met by exactly the asked continuation', () =>
    each({ type: 'rotation', dim: '3D', motion: 'dynamic' }, 40, (item) => {
      const d = item.dynamic as Extract<NonNullable<typeof item.dynamic>, { kind: 'rotate3d' }>;
      const s = item.stimulus as Cubes3DSpec;
      item.options.forEach((o, i) => {
        const v = o.visual as Cubes3DSpec;
        const f = fitContinue3D(s.cubes, s.rot, d.axis, Math.sign(d.reveal - d.to), Math.abs(d.reveal - d.to), v.cubes, v.rot);
        expect(f.right).toBe(i === item.correctIndex);
      });
    }));
});

describe('dynamic plans, paper, nets and sections', () => {
  it('plans: only the correct front after the quarter turn matches', () =>
    each({ type: 'plans', dim: '3D', motion: 'dynamic' }, 40, (item) =>
      item.options.forEach((_, i) => expect(fitPlan(item, i).same).toBe(i === item.correctIndex)),
    ));
  it('paper: the dynamic sheet folds back the same way', () =>
    each({ type: 'folding', dim: '2D', motion: 'dynamic' }, 20, (item) =>
      item.options.forEach((o, i) => expect(fitPaper(item.stimulus as PaperStepsSpec, (o.visual as PaperHolesSpec).holes).same).toBe(i === item.correctIndex)),
    ));
  it('sections: the dynamic cut is judged the same way', () =>
    each({ type: 'sections', dim: '3D', motion: 'dynamic' }, 20, (item) =>
      item.options.forEach((_, i) => expect(fitSection(item, i).same).toBe(i === item.correctIndex)),
    ));
});
