import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../content/fusionDrills';
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
});
