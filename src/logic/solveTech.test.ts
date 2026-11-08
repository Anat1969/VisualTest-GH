import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { fitBeam, fitPath, fitTrain, fitWater } from './solveTech';
import type { Level, Variant } from './types';

const each = (v: Variant, n: number, fn: (item: ReturnType<typeof generateItem>) => void) => {
  for (const level of [1, 2, 3] as Level[]) for (let seed = 1; seed <= n; seed++) fn(generateItem(v, level, seed * 7919 + level));
};

describe('technical solutions: only the correct option survives the check', () => {
  for (const motion of ['static', 'dynamic'] as const) {
    it(`gears (${motion}): the chosen motion, passed back, turns the first wheel exactly as given`, () =>
      each({ type: 'mechanics', dim: '2D', motion }, 40, (item) =>
        item.options.forEach((_, i) => expect(fitTrain(item, i).same).toBe(i === item.correctIndex)),
      ));
    it(`paths (${motion}): only the correct path bends with the force everywhere`, () =>
      each({ type: 'physics', dim: '2D', motion }, 60, (item) => {
        if (item.solve?.kind !== 'path') return;
        item.options.forEach((_, i) => expect([i, fitPath(item, i).same, fitPath(item, i).issues]).toEqual([i, i === item.correctIndex, fitPath(item, i).issues]));
      }));
  }
  it('beam: only the correct load balances the moments', () =>
    each({ type: 'statics', dim: '2D', motion: 'static' }, 40, (item) =>
      item.options.forEach((_, i) => expect(fitBeam(item, i).same).toBe(i === item.correctIndex)),
    ));
  it('water: only the correct surface is level and keeps the volume', () =>
    each({ type: 'physics', dim: '2D', motion: 'static' }, 60, (item) => {
      if (item.solve?.kind !== 'water') return;
      item.options.forEach((_, i) => expect(fitWater(item, i).same).toBe(i === item.correctIndex));
    }));
});
