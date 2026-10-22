import { describe, expect, it } from 'vitest';
import { NETS, cubeFrames, isValidNet, transformNet } from './cubeNet';
import { generateItem } from './generators';
import { congruentKey3, isChiral3, hasRotSym3 } from './shapes';
import { holesKey } from './paper';
import type { Level, Variant } from './types';

const VARIANTS: Variant[] = [
  { type: 'rotation', dim: '2D', motion: 'static' },
  { type: 'rotation', dim: '2D', motion: 'dynamic' },
  { type: 'rotation', dim: '3D', motion: 'static' },
  { type: 'rotation', dim: '3D', motion: 'dynamic' },
  { type: 'folding', dim: '2D', motion: 'static' },
  { type: 'folding', dim: '2D', motion: 'dynamic' },
  { type: 'folding', dim: '3D', motion: 'static' },
  { type: 'folding', dim: '3D', motion: 'dynamic' },
  { type: 'matrices', dim: '2D', motion: 'static' },
  { type: 'sections', dim: '3D', motion: 'static' },
  { type: 'sections', dim: '3D', motion: 'dynamic' },
  { type: 'plans', dim: '3D', motion: 'static' },
  { type: 'plans', dim: '3D', motion: 'dynamic' },
  { type: 'hidden', dim: '2D', motion: 'static' },
  { type: 'speed', dim: '2D', motion: 'static' },
  { type: 'speed', dim: '2D', motion: 'dynamic' },
  { type: 'mechanics', dim: '2D', motion: 'static' },
  { type: 'mechanics', dim: '2D', motion: 'dynamic' },
  { type: 'statics', dim: '2D', motion: 'static' },
  { type: 'physics', dim: '2D', motion: 'static' },
  { type: 'physics', dim: '2D', motion: 'dynamic' },
];

describe('cube nets', () => {
  it('all 11 nets fold into a closed cube in every orientation', () => {
    for (const net of NETS)
      for (let r = 0; r < 4; r++)
        for (const flip of [false, true]) {
          const cells = transformNet(net, r, flip);
          for (let root = 0; root < 6; root++) expect(isValidNet(cells, root)).toBe(true);
        }
  });

  it('a straight row of 4 makes faces 0 and 2 opposite', () => {
    const frames = cubeFrames(NETS[0], 1);
    const n0 = frames[1].normal;
    const n2 = frames[3].normal;
    expect(n0.map((v, i) => v + n2[i])).toEqual([0, 0, 0]);
  });
});

describe('item generators', () => {
  for (const v of VARIANTS)
    for (const level of [1, 2, 3] as Level[])
      it(`${v.type} ${v.dim} ${v.motion} L${level}: 4 distinct options, exactly one correct`, () => {
        for (let seed = 1; seed <= 60; seed++) {
          const item = generateItem(v, level, seed * 7919);
          expect(item.options).toHaveLength(4);
          expect(item.options.filter((o) => o.correct)).toHaveLength(1);
          expect(item.options[item.correctIndex].correct).toBe(true);
          const keys = item.options.map((o) => JSON.stringify(o.visual));
          expect(new Set(keys).size).toBe(4);
          for (const o of item.options) if (!o.correct) expect(o.errorType).toBeTruthy();
          if (item.options[0].visual.kind === 'paperHoles') {
            const hk = item.options.map((o) => holesKey((o.visual as { holes: [number, number][] }).holes));
            expect(new Set(hk).size).toBe(4);
          }
        }
      });

  it('is deterministic for a seed', () => {
    const a = generateItem(VARIANTS[2], 2, 1234);
    const b = generateItem(VARIANTS[2], 2, 1234);
    expect(a).toEqual(b);
  });

  it('3D rotation stimuli are chiral and asymmetric, distractor shapes differ', () => {
    for (let seed = 1; seed < 40; seed++) {
      const item = generateItem(VARIANTS[2], 2, seed);
      if (item.stimulus.kind !== 'cubes3d') throw new Error('kind');
      const cubes = item.stimulus.cubes;
      expect(isChiral3(cubes)).toBe(true);
      expect(hasRotSym3(cubes)).toBe(false);
      const src = congruentKey3(cubes);
      for (const o of item.options) {
        if (o.visual.kind !== 'cubes3d') throw new Error('kind');
        if (o.errorType === 'encoding') expect(congruentKey3(o.visual.cubes)).not.toBe(src);
      }
    }
  });
});
