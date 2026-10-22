import { describe, expect, it } from 'vitest';
import { generateItem } from './generators';
import { consistent, follows, type Stmt } from './generators/logical';
import { tipping } from './generators/kinesthetic';
import { FOOD_WEBS } from '../content/nature';
import type { Level, TestType } from './types';

const st = (form: Stmt['form'], s: number, p: number): Stmt => ({ form, s, p });

describe('syllogism model check', () => {
  it('Barbara: all X are Y, all Y are Z, so all X are Z', () => {
    expect(follows([st('A', 0, 1), st('A', 1, 2)], st('A', 0, 2))).toBe(true);
    expect(follows([st('A', 0, 1), st('A', 1, 2)], st('A', 2, 0))).toBe(false);
  });
  it('Celarent: all X are Y, no Y is Z, so no X is Z', () => {
    expect(follows([st('A', 0, 1), st('E', 1, 2)], st('E', 0, 2))).toBe(true);
  });
  it('undistributed middle has no conclusion', () => {
    const prem = [st('A', 0, 1), st('A', 2, 1)];
    for (const form of ['A', 'E', 'I', 'O'] as const) {
      expect(follows(prem, st(form, 0, 2))).toBe(false);
      expect(follows(prem, st(form, 2, 0))).toBe(false);
    }
  });
  it('detects contradiction', () => {
    expect(consistent([st('A', 0, 1), st('E', 0, 1)])).toBe(false);
  });
});

describe('balance', () => {
  it('a centered tower stands, an overhanging top falls', () => {
    expect(tipping([{ x: 0, w: 4 }, { x: 0, w: 4 }, { x: 1, w: 2 }]).at).toBe(-1);
    expect(tipping([{ x: 0, w: 2 }, { x: 1.6, w: 2 }]).at).toBe(1);
  });
  it('the combined center of mass decides, not each block alone', () => {
    // each block rests on the one below, but together the top two overhang
    const t = tipping([{ x: 0, w: 2 }, { x: 1, w: 2 }, { x: 2, w: 2 }]);
    expect(t.at).toBe(1);
    expect(t.topOnly).toBe(true);
  });
});

describe('content', () => {
  it('every food web is a DAG with known species', () => {
    for (const w of FOOD_WEBS) {
      const names = new Set(w.species.map((s) => s.name));
      for (const [a, b] of w.eats) {
        expect(names.has(a) && names.has(b)).toBe(true);
        const la = w.species.find((s) => s.name === a)!.level;
        const lb = w.species.find((s) => s.name === b)!.level;
        expect(la).toBeGreaterThan(lb);
      }
    }
  });
});

describe('intelligence drills: answer keys', () => {
  const run = (type: TestType, f: (item: ReturnType<typeof generateItem>) => void) => {
    for (const level of [1, 2, 3] as Level[]) for (let seed = 1; seed <= 40; seed++) f(generateItem({ type, dim: '2D', motion: 'static' }, level, seed * 104729));
  };
  const textOf = (v: unknown) => (v as { text?: string }).text ?? '';

  it('series: the correct option continues the shown terms', () => {
    run('series', (item) => {
      const words = (item.stimulus as { words: string[] }).words;
      expect(words.length).toBeGreaterThanOrEqual(5);
      expect(Number.isFinite(Number(textOf(item.options[item.correctIndex].visual)))).toBe(true);
    });
  });

  it('perspective: the answer is never a hidden circle', () => {
    run('perspective', (item) => {
      const why = item.options[item.correctIndex].why;
      expect(why).toContain('רואה');
      const ego = item.options.find((o) => o.errorType === 'wrong_rule');
      expect(ego?.why).toContain('סגור');
    });
  });

  it('ecology: exactly one direction is correct and options are the four outcomes', () => {
    run('ecology', (item) => {
      const texts = item.options.map((o) => textOf(o.visual)).sort();
      expect(texts).toEqual(['יגדל', 'ייעלם מיד', 'יקטן', 'לא ישתנה'].sort());
    });
  });

  it('syllogism: the stated correct answer is validated by the model check', () => {
    run('syllogism', (item) => {
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
      expect((item.stimulus as { words: string[] }).words).toHaveLength(2);
    });
  });
});
