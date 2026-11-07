import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { fitCubeView, fitOpposite } from './solveNet';
import type { CubeViewSpec, Level, NetSpec, SwatchSpec } from './types';

describe('cube net solution', () => {
  it('only the correct option fits fully, at every level', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed <= 60; seed++) {
        const item = generateItem({ type: 'folding', dim: '3D', motion: 'static' }, level, seed * 7907);
        const net = item.stimulus as NetSpec;
        item.options.forEach((o, i) => {
          const fit =
            o.visual.kind === 'cubeView'
              ? fitCubeView(net, o.visual as CubeViewSpec, level === 3)
              : fitOpposite(net, net.highlight!, (o.visual as SwatchSpec).face.id);
          expect(fit.same).toBe(i === item.correctIndex);
        });
      }
  });
});
