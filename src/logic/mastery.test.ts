import { describe, expect, it } from 'vitest';
import { applyResult, currentLevel, initialMastery } from './mastery';
import { planVariants } from './session';
import { variantKey } from './types';

describe('mastery rules', () => {
  it('two sessions at 80%+ move up a level', () => {
    let rows = initialMastery();
    let r = applyResult(rows, 'rotation', 1, 0.8, '2026-01-01');
    expect(r.event.kind).toBe('streak');
    r = applyResult(r.rows, 'rotation', 1, 0.9, '2026-01-02');
    expect(r.event.kind).toBe('up');
    rows = r.rows;
    expect(currentLevel(rows, 'rotation')).toBe(2);
    expect(currentLevel(rows, 'folding')).toBe(1);
  });

  it('a session in between breaks the streak', () => {
    let r = applyResult(initialMastery(), 'folding', 1, 0.85, 'd1');
    r = applyResult(r.rows, 'folding', 1, 0.75, 'd2');
    r = applyResult(r.rows, 'folding', 1, 0.85, 'd3');
    expect(r.event.kind).toBe('streak');
    expect(currentLevel(r.rows, 'folding')).toBe(1);
  });

  it('under 70% drops a level, never below 1', () => {
    let r = applyResult(initialMastery(), 'rotation', 1, 0.9, 'd1');
    r = applyResult(r.rows, 'rotation', 1, 0.9, 'd2');
    r = applyResult(r.rows, 'rotation', 2, 0.5, 'd3');
    expect(r.event.kind).toBe('down');
    expect(currentLevel(r.rows, 'rotation')).toBe(1);
    r = applyResult(r.rows, 'rotation', 1, 0.2, 'd4');
    expect(r.event.kind).toBe('hold');
    expect(currentLevel(r.rows, 'rotation')).toBe(1);
  });

  it('sessions off the current level do not change the level', () => {
    const r = applyResult(initialMastery(), 'rotation', 3, 1, 'd1');
    expect(r.event.kind).toBe('off-level');
    expect(currentLevel(r.rows, 'rotation')).toBe(1);
  });
});

describe('variety planner', () => {
  it('never three of the same type in a row in mixed sessions, covers all variants', () => {
    for (let seed = 1; seed < 50; seed++) {
      const plan = planVariants(['rotation', 'folding'], 16, seed);
      for (let i = 2; i < plan.length; i++)
        expect(plan[i].type === plan[i - 1].type && plan[i].type === plan[i - 2].type).toBe(false);
      expect(new Set(plan.map(variantKey)).size).toBe(8);
    }
  });

  it('single-type sessions mix 2D/3D and static/dynamic without repeats in a row', () => {
    for (let seed = 1; seed < 50; seed++) {
      const plan = planVariants(['folding'], 10, seed);
      for (let i = 1; i < plan.length; i++) expect(variantKey(plan[i])).not.toBe(variantKey(plan[i - 1]));
      expect(new Set(plan.slice(0, 4).map(variantKey)).size).toBe(4);
    }
  });
});
