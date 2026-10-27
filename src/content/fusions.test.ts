import { describe, expect, it } from 'vitest';
import { FUSIONS, fusionFromSlug, fusionKey, fusionSlug } from './fusions';
import { FUSION_PROGRAMS } from './fusionPrograms';
import { INTELLIGENCES, PROGRAMS } from './intelligences';

describe('fusion cards', () => {
  const keys = Object.keys(FUSIONS);
  it('one card for each of the 66 pairs of the 12 intelligences', () => {
    const expected = INTELLIGENCES.flatMap((a, i) => INTELLIGENCES.slice(i + 1).map((b) => fusionKey(a.id, b.id))).sort();
    expect(keys.sort()).toEqual(expected);
  });
  it('every card has its five mirrored fields', () => {
    for (const c of Object.values(FUSIONS)) for (const f of [c.name, c.definition, c.insight, c.practice, c.recognize]) expect(f.trim().length).toBeGreaterThan(0);
  });
  it('page slugs round-trip and both sides have keyed drills for the mixed round', () => {
    for (const k of keys) {
      expect(fusionFromSlug(fusionSlug(k))).toBe(k);
      for (const id of k.split('+')) expect(PROGRAMS[id as keyof typeof PROGRAMS]?.skills.some((s) => s.drill)).toBe(true);
    }
  });
  it('fusion programmes are keyed by real fusions', () => {
    for (const k of Object.keys(FUSION_PROGRAMS)) expect(FUSIONS[k]).toBeDefined();
  });
});
