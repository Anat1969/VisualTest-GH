import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { mulV } from './geometry';
import { endRotation, fitRotation, turnAt } from './solve3d';
import type { Cubes3DSpec, Level } from './types';

const close = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

describe('3D rotation solution', () => {
  it('the correct option always fits fully, and every other option leaves at least one cube without a place', () => {
    for (const motion of ['static'] as const)
      for (const level of [1, 2, 3] as Level[])
        for (let seed = 1; seed <= 40; seed++) {
          const item = generateItem({ type: 'rotation', dim: '3D', motion }, level, seed * 7919);
          const start = item.stimulus as Cubes3DSpec;
          item.options.forEach((o, i) => {
            const fit = fitRotation(start.cubes, (o.visual as Cubes3DSpec).cubes);
            expect(fit.same).toBe(i === item.correctIndex);
          });
        }
  });

  it('at the end of the turn the original lies exactly on the correct option', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const item = generateItem({ type: 'rotation', dim: '3D', motion: 'static' }, 2, seed * 104729);
      const start = item.stimulus as Cubes3DSpec;
      const opt = item.options[item.correctIndex].visual as Cubes3DSpec;
      const fit = fitRotation(start.cubes, opt.cubes);
      const end = turnAt(start.rot, endRotation(opt.rot, fit), 1);
      const shift = mulV(opt.rot, fit.t);
      const placed = start.cubes.map((c) => mulV(end, c).map((v, k) => v + shift[k]));
      const target = opt.cubes.map((c) => mulV(opt.rot, c));
      for (const p of placed) expect(target.some((q) => close(p, q))).toBe(true);
    }
  });
});
