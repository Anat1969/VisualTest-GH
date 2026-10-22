import { describe, expect, it } from 'vitest';
import { buildMatrix } from './generators/matrices';
import { generateItem } from './generators';
import { completes, fits } from './matrices';
import { makeRng } from './rng';
import { planVariants } from './session';
import type { Glyph, Level } from './types';

describe('matrix puzzles', () => {
  it('the full grid obeys its own rules for every level and seed', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed <= 300; seed++) {
        const { puzzle } = buildMatrix(makeRng(seed * 104729), level);
        expect(fits(puzzle, puzzle.grid)).toBe(true);
      }
  });

  it('exactly one option completes the puzzle, and it is the marked correct one', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed <= 300; seed++) {
        const { draft, puzzle } = buildMatrix(makeRng(seed * 104729), level);
        const cells = draft.options.map((o) => (o.visual as { glyph: Glyph }).glyph);
        const passing = cells.filter((c) => completes(puzzle, c));
        expect(passing).toHaveLength(1);
        expect(completes(puzzle, cells[0])).toBe(true);
        expect(draft.options[0].correct).toBe(true);
      }
  });

  it('every distractor has an error type and differs from the answer', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { draft } = buildMatrix(makeRng(seed), 3);
      const keys = draft.options.map((o) => JSON.stringify(o.visual));
      expect(new Set(keys).size).toBe(4);
      for (const o of draft.options.slice(1)) expect(o.errorType).toBeDefined();
    }
  });

  it('level 1 varies one attribute, level 3 varies all three', () => {
    const varied = (level: Level, seed: number) => {
      const { puzzle } = buildMatrix(makeRng(seed), level);
      return Object.values(puzzle.rules).filter((r) => r !== 'constant').length;
    };
    for (let seed = 1; seed <= 50; seed++) {
      expect(varied(1, seed)).toBe(1);
      expect(varied(3, seed)).toBe(3);
    }
  });

  it('items are deterministic for a seed and use the matrix visual', () => {
    const a = generateItem({ type: 'matrices', dim: '2D', motion: 'static' }, 2, 99);
    const b = generateItem({ type: 'matrices', dim: '2D', motion: 'static' }, 2, 99);
    expect(a).toEqual(b);
    expect(a.stimulus.kind).toBe('matrix');
    expect(a.dynamic).toBeUndefined();
  });
});

describe('planning with a one-variant type', () => {
  it('a matrices-only session still returns the requested number of items', () => {
    const plan = planVariants(['matrices'], 12, 7);
    expect(plan).toHaveLength(12);
    expect(plan.every((v) => v.type === 'matrices' && v.dim === '2D' && v.motion === 'static')).toBe(true);
  });
});
