import { describe, expect, it } from 'vitest';
import { PARAGRAPHS, RELATION_PAIRS, WORD_SETS } from '../content/verbal';
import { generateItem } from './generators';
import { notes, stats, tokenize, wordCount } from './rhythm';
import type { Level, VerbalSpec } from './types';

describe('linguistic content', () => {
  it('each relation has enough distinct pairs and no word appears twice inside one relation', () => {
    for (const pairs of Object.values(RELATION_PAIRS)) {
      expect(pairs.length).toBeGreaterThanOrEqual(8);
      const words = pairs.flat();
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('word sets: the near intruder and the decoy are not listed as plain members', () => {
    for (const s of WORD_SETS) {
      expect(s.members).not.toContain(s.near);
      expect(s.members).not.toContain(s.decoy);
      expect(s.members.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('paragraphs have the length of their bucket', () => {
    for (const [size, list] of Object.entries(PARAGRAPHS)) for (const p of list) expect(p.lines).toHaveLength(Number(size));
  });
});

describe('relations drill', () => {
  it('only the correct option holds the stem relation, in either direction for symmetric ones', () => {
    const key = (a: string, b: string) => `${a}|${b}`;
    const byRel = Object.fromEntries(Object.entries(RELATION_PAIRS).map(([r, ps]) => [r, new Set(ps.map(([a, b]) => key(a, b)))]));
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed < 120; seed++) {
        const item = generateItem({ type: 'analogy', dim: '2D', motion: 'static' }, level, seed);
        const [sa, sb] = (item.stimulus as VerbalSpec).words;
        const rel = Object.keys(byRel).find((r) => byRel[r].has(key(sa, sb)))!;
        item.options.forEach((o, i) => {
          const [a, b] = (o.visual as VerbalSpec).words;
          const holds = byRel[rel].has(key(a, b)) || (rel === 'opposite' && byRel[rel].has(key(b, a)));
          expect(holds).toBe(i === item.correctIndex);
        });
      }
  });
});

describe('sequence drill', () => {
  it('the correct option restores the original paragraph', () => {
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed < 60; seed++) {
        const item = generateItem({ type: 'sequence', dim: '2D', motion: 'static' }, level, seed);
        const shown = (item.stimulus as VerbalSpec).words;
        const order = (item.options[item.correctIndex].visual as VerbalSpec).words.map((n) => Number(n) - 1);
        const restored = order.map((i) => shown[i]);
        const p = Object.values(PARAGRAPHS).flat().find((x) => x.lines.includes(shown[0]))!;
        expect(restored).toEqual(p.lines);
      }
  });
});

describe('rhythm', () => {
  it('splits sentences and counts words and pauses', () => {
    const t = tokenize('הכלב רץ, והחתול ישב. ואז שקט!');
    expect(t).toHaveLength(2);
    expect(t[0].words.map((w) => w.pause)).toEqual([0, 1, 0, 2]);
    expect(wordCount('אחת  שתיים, שלוש.')).toBe(3);
  });

  it('flags a flat rhythm and repeated words', () => {
    const text = 'הבית עומד על הגבעה. הבית צופה אל הים. הבית שומר על השקט.';
    const s = tokenize(text);
    const st = stats(s);
    expect(st.variety).toBeLessThan(0.25);
    expect(st.repeated[0][0]).toBe('בית');
    expect(notes(s, st).join(' ')).toContain('אחיד');
  });
});
