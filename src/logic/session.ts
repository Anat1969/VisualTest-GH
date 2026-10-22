// Session planning: variety rules, timing and item selection.
import { generateItem } from './generators';
import { makeRng, randomSeed } from './rng';
import type { Item, Level, Mode, TestType, Variant } from './types';
import { TYPE_VARIANTS, variantKey } from './types';

export const ITEMS_PER_MODE: Record<Mode, number> = { explain: 6, practice: 10, exam: 12, simulation: 16 };

/** Seconds per item in timed modes. Estimate only: the 14–30 s target is not a verified figure. */
export const SECONDS_PER_ITEM: Record<Level, number> = { 1: 45, 2: 35, 3: 25 };
export const isTimed = (mode: Mode) => mode === 'exam' || mode === 'simulation';

export function variantsOf(type: TestType): Variant[] {
  return TYPE_VARIANTS[type].map(([dim, motion]) => ({ type, dim, motion }));
}

/**
 * Order variants so that: every 2D/3D × static/dynamic combination appears in each round,
 * and no more than two consecutive items share a type (mixed) or a variant (single type).
 */
export function planVariants(types: TestType[], count: number, seed: number): Variant[] {
  const rng = makeRng(seed);
  const pool = types.flatMap(variantsOf);
  const runKey = (v: Variant) => (types.length > 1 ? v.type : variantKey(v));
  const used = new Map<string, number>();
  const out: Variant[] = [];
  while (out.length < count) {
    const blocked =
      out.length >= 2 && runKey(out[out.length - 1]) === runKey(out[out.length - 2]) ? runKey(out[out.length - 1]) : null;
    const prev = out.length ? variantKey(out[out.length - 1]) : null;
    // Relax the rules only when nothing else is left, e.g. a session with a single one-variant type.
    let allowed = pool.filter((v) => runKey(v) !== blocked && variantKey(v) !== prev);
    if (!allowed.length) allowed = pool.filter((v) => runKey(v) !== blocked);
    if (!allowed.length) allowed = pool;
    const minUse = Math.min(...allowed.map((v) => used.get(variantKey(v)) ?? 0));
    const choice = rng.pick(allowed.filter((v) => (used.get(variantKey(v)) ?? 0) === minUse));
    used.set(variantKey(choice), (used.get(variantKey(choice)) ?? 0) + 1);
    out.push(choice);
  }
  return out;
}

export interface SessionConfig {
  mode: Mode;
  types: TestType[];
  levels: Record<TestType, Level>;
}

/** Build items; an item seen in the last 7 days is regenerated with a new seed. */
export function buildItems(config: SessionConfig, recentIds: Set<string>): Item[] {
  const plan = planVariants(config.types, ITEMS_PER_MODE[config.mode], randomSeed());
  const ids = new Set(recentIds);
  return plan.map((v) => {
    let item = generateItem(v, config.levels[v.type], randomSeed());
    for (let i = 0; i < 20 && ids.has(item.id); i++) item = generateItem(v, config.levels[v.type], randomSeed());
    ids.add(item.id);
    return item;
  });
}
