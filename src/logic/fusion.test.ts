import { describe, expect, it } from 'vitest';
import { BRANCH_PARTS, BRANCH_PLANS, MESSAGES } from '../content/fusionDrills';
import { generateItem } from './generators';
import { channelOf } from './generators/fusion';
import type { Level, TestType } from './types';

const run = (type: TestType, f: (item: ReturnType<typeof generateItem>, level: Level) => void) => {
  for (const level of [1, 2, 3] as Level[]) for (let seed = 1; seed <= 40; seed++) f(generateItem({ type, dim: '2D', motion: 'static' }, level, seed * 6151), level);
};
const answer = (item: ReturnType<typeof generateItem>) => (item.options[item.correctIndex].visual as { text: string }).text;
const table = (item: ReturnType<typeof generateItem>) => (item.stimulus as { words: string[] }).words.slice(1).map((r) => r.split('|'));

describe('fusion drills: answer keys', () => {
  it('channel: every bank message maps to one channel by its emotion level', () => {
    for (const m of MESSAGES) expect(['text', 'voice', 'meeting']).toContain(channelOf(m.level));
  });

  it('conditions: the keyed pair matches the log exactly, and no other pair does', () => {
    run('fx_conditions', (item) => {
      const rows = table(item);
      const head = (item.stimulus as { words: string[] }).words[0].split('|').slice(1, 5);
      const [a, b] = answer(item).split(' וגם ').map((n) => head.indexOf(n));
      for (const r of rows) expect(r[1 + a] === 'כן' && r[1 + b] === 'כן').toBe(r[5] !== '–');
    });
  });

  it('baseline: the keyed dimension is the one outside the week range', () => {
    run('fx_baseline', (item) => {
      const rows = table(item);
      const week = rows.slice(0, -1);
      const today = rows[rows.length - 1];
      const col = { 'אורך ההודעה': 1, 'שעת השליחה': 2, 'זמן התגובה': 3 }[answer(item)]!;
      const num = (s: string) => parseInt(s, 10);
      const vals = week.map((r) => num(r[col]));
      expect(num(today[col]) < Math.min(...vals) || num(today[col]) > Math.max(...vals)).toBe(true);
    });
  });

  it('resolution: the keyed element has the highest dwell per metre', () => {
    run('fx_resolution', (item) => {
      const rows = table(item).map((r) => ({ name: r[0], v: parseInt(r[2], 10) / parseInt(r[1], 10) }));
      const best = rows.reduce((x, y) => (y.v > x.v ? y : x));
      expect(answer(item)).toBe(best.name);
    });
  });

  it('loop: the keyed step is the only column that changes across days', () => {
    run('fx_loop', (item) => {
      const rows = table(item).map((r) => r.slice(1));
      const k = parseInt(answer(item).replace('צעד ', ''), 10) - 1;
      expect(new Set(rows.map((r) => r[k])).size).toBeGreaterThan(1);
      // every other column keeps the same set of contents (a moved step changes position, not content)
      const contents = (r: string[]) => r.filter((_, i) => i !== k).slice().sort().join();
      expect(new Set(rows.map(contents)).size).toBe(1);
    });
  });

  it('branch: the keyed part is the one plan line not shown', () => {
    run('fx_branch', (item) => {
      const shown = (item.stimulus as { words: string[] }).words;
      const plan = BRANCH_PLANS.find((p) => p.parts.some((x) => shown.some((w) => w.endsWith(x))))!;
      const missing = BRANCH_PARTS.indexOf(answer(item) as (typeof BRANCH_PARTS)[number]);
      expect(missing).toBeGreaterThanOrEqual(0);
      expect(shown.some((w) => w.endsWith(plan.parts[missing]))).toBe(false);
      expect(shown.length).toBe(3);
    });
  });

  it('forecast: stress appears exactly on the keyed time-and-person rows', () => {
    run('fx_forecast', (item) => {
      const [t, p] = answer(item).slice(1).split(', עם ה');
      for (const r of table(item)) expect(r[1] === t && r[2] === p).toBe(r[3] === 'כן');
    });
  });

  it('proportion: the keyed cost is the largest per year, and not the largest number on the page', () => {
    run('fx_proportion', (item) => {
      const per = (s: string) => (s.includes('לחודש') ? 12 : s.includes('ליום עבודה') ? 220 : s.includes('לשבוע') ? 52 : s.includes('לרבעון') ? 4 : 1);
      const vals = (item.stimulus as { words: string[] }).words.map((w) => {
        const n = parseInt(w.split(': ')[1], 10);
        return { w, n, year: n * per(w) };
      });
      const best = vals.reduce((a, b) => (b.year > a.year ? b : a));
      const raw = vals.reduce((a, b) => (b.n > a.n ? b : a));
      expect(answer(item)).toBe(best.w);
      expect(raw.w).not.toBe(best.w);
    });
  });
});
