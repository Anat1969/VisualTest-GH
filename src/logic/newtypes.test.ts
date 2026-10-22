import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { contains } from './generators/perception';
import { elevation } from './generators/plans';
import { solveTrain } from './generators/technical';
import { makeSolid, section, shapeName } from './solids';
import type { Level, P2, SceneSpec } from './types';

const segsOf = (s: SceneSpec) =>
  s.prims
    .filter((p) => p.p === 'line')
    .map((p) => {
      const [[a, b], [c, d]] = (p as { pts: P2[] }).pts;
      return [a / 10, b / 10, c / 10, d / 10] as [number, number, number, number];
    });

describe('hidden figures', () => {
  it('the target hides in exactly one option', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed < 80; seed++) {
        const item = generateItem({ type: 'hidden', dim: '2D', motion: 'static' }, level, seed);
        const target = segsOf(item.stimulus as SceneSpec);
        const hits = item.options.map((o) => contains(segsOf(o.visual as SceneSpec), target, 6));
        expect(hits.filter(Boolean)).toHaveLength(1);
        expect(hits[item.correctIndex]).toBe(true);
      }
  });
});

describe('statics', () => {
  it('the correct answer balances the beam', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed < 80; seed++) {
        const item = generateItem({ type: 'statics', dim: '2D', motion: 'static' }, level, seed);
        const prims = (item.stimulus as SceneSpec).prims;
        // hanging boxes: a rect with a numeric label at its centre; x / 18 = position
        const loads = prims
          .filter((p) => p.p === 'text' && /^\d+$/.test(p.text) && p.at[1] > 20)
          .map((p) => ({ pos: (p as { at: P2 }).at[0] / 18, w: Number((p as { text: string }).text) }));
        const m = loads.reduce((s, l) => s + l.pos * l.w, 0);
        const ans = (item.options[item.correctIndex].visual as { text: string }).text;
        const n = Number(ans.replace(/[^\d.]/g, ''));
        if (level < 3) {
          const unknown = prims.find((p) => p.p === 'text' && p.text === '?') as { at: P2 };
          expect(m + (unknown.at[0] / 18) * n).toBeCloseTo(0);
        } else {
          const w = Number(item.prompt.match(/(\d+) ק״ג/)![1]);
          expect(m + n * w).toBeCloseTo(0);
        }
      }
  });
});

describe('mechanics', () => {
  it('meshes reverse, open belts keep, crossed belts reverse, shafts share speed', () => {
    const w = (teeth: number) => ({ c: [0, 0] as P2, r: teeth, teeth, label: '' });
    const s = solveTrain([w(10), w(20), w(20), w(10), w(5)], ['mesh', 'shaft', 'cross', 'belt']);
    expect(s.map((x) => x.dir)).toEqual([1, -1, -1, 1, 1]);
    expect(s.map((x) => x.speed)).toEqual([1, 0.5, 0.5, 1, 2]);
  });
});

describe('sections', () => {
  it('names the classic cube sections', () => {
    const cube = makeSolid('cube');
    const s3 = Math.sqrt(3);
    expect(shapeName(section(cube, { n: [0, 0, 1], d: 0.2 }).poly)).toBe('ריבוע');
    expect(shapeName(section(cube, { n: [1 / s3, 1 / s3, 1 / s3], d: 0 }).poly)).toBe('משושה משוכלל');
    expect(shapeName(section(cube, { n: [1 / s3, 1 / s3, 1 / s3], d: 1.2 }).poly)).toBe('משולש שווה צלעות');
    expect(shapeName(section(makeSolid('cylinder'), { n: [0, 0, 1], d: 0 }).poly)).toBe('עיגול');
  });
});

describe('plans', () => {
  it('elevations read max heights in the viewer order', () => {
    const h = [
      [1, 0, 2],
      [3, 1, 0],
    ];
    expect(elevation(h, 'front')).toEqual([3, 1, 2]);
    expect(elevation(h, 'back')).toEqual([2, 1, 3]);
    expect(elevation(h, 'right')).toEqual([2, 3]);
    expect(elevation(h, 'left')).toEqual([3, 2]);
  });
});
