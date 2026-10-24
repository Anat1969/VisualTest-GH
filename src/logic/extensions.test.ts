import { describe, expect, it } from 'vitest';
import { INTENSITY, PRODUCTS } from '../content/extensions';
import { generateItem } from './generators';
import type { Level, SceneSpec, TestType } from './types';

const run = (type: TestType, levels: Level[], f: (item: ReturnType<typeof generateItem>, level: Level) => void) => {
  for (const level of levels) for (let seed = 1; seed <= 40; seed++) f(generateItem({ type, dim: '2D', motion: 'static' }, level, seed * 7907), level);
};
const answer = (item: ReturnType<typeof generateItem>) => (item.options[item.correctIndex].visual as { text: string }).text;
const words = (item: ReturnType<typeof generateItem>) => (item.stimulus as { words: string[] }).words;

describe('extension drills: answer keys', () => {
  it('loop: an even number of negative links reinforces', () => {
    run('loop', [1, 2, 3], (item) => {
      const negatives = (item.stimulus as SceneSpec).prims.filter((p) => p.p === 'arrow' && p.dash).length;
      expect(answer(item).includes('יעלה עוד')).toBe(negatives % 2 === 0);
    });
  });

  it('effects (no side branch): the sign of the path decides', () => {
    run('effects', [1], (item) => {
      const negatives = (item.stimulus as SceneSpec).prims.filter((p) => p.p === 'arrow' && p.dash).length;
      expect(answer(item).endsWith('יעלה')).toBe(negatives % 2 === 0);
    });
  });

  it('intensity: the answer sits between its neighbours on one scale', () => {
    run('intensity', [1, 2, 3], (item) => {
      const [a, , c] = words(item);
      const scale = INTENSITY.find((s) => s.words.includes(a))!;
      const ia = scale.words.indexOf(a);
      expect(scale.words.indexOf(answer(item))).toBe(ia + 1);
      expect(scale.words.indexOf(c)).toBe(ia + 2);
    });
  });

  it('trace level 1: running the shown code gives the keyed answer', () => {
    run('trace', [1], (item) => {
      const [l0, l1, l2] = words(item);
      let x = Number(l0.split('=')[1]);
      const n = Number(l1.match(/\d+/)![0]);
      const b = Number(l2.match(/- (\d+)/)![1]);
      for (let i = 0; i < n; i++) x = x * 2 - b;
      expect(answer(item)).toBe(String(x));
    });
  });

  it('query level 1: counting the table by hand gives the keyed answer', () => {
    run('query', [1], (item) => {
      const [c1, c2] = item.prompt.replace('כמה שורות עונות על הסינון: ', '').replace('?', '').split(' וגם ');
      const test = (label: string, r: (typeof PRODUCTS)[number]) => {
        if (label.startsWith('צבע')) return r.color === label.split('= ')[1];
        if (label.startsWith('מחיר')) return r.price > Number(label.split('> ')[1]);
        if (label.startsWith('גודל')) return r.size === label.split('= ')[1];
        return r.stock;
      };
      expect(answer(item)).toBe(String(PRODUCTS.filter((r) => test(c1, r) && test(c2, r)).length));
    });
  });
});
