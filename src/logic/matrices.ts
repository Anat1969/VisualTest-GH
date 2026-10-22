// Matrix puzzles: a 3×3 grid of glyphs with three attributes. Each attribute follows one rule,
// applied to every row. The bottom-right cell is the answer, and the checker verifies it.
import type { Rng } from './rng';
import type { Count, Fill, Glyph, Level, Shape } from './types';

export type Attr = 'shape' | 'count' | 'fill';
export type Rule = 'constant' | 'progression' | 'distribution';
export type Step = 1 | -1;

export interface Puzzle {
  rules: Record<Attr, Rule>;
  /** Direction of the count progression, used only when count follows 'progression'. */
  step: Step;
  /** Full 3×3 grid, row-major. The bottom-right cell is the answer. */
  grid: Glyph[][];
}

export const ATTRS: Attr[] = ['shape', 'count', 'fill'];
export const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond'];
export const FILLS: Fill[] = ['empty', 'hatched', 'solid'];
export const COUNTS: Count[] = [1, 2, 3];

export const ATTR_LABEL: Record<Attr, string> = { shape: 'צורה', count: 'מספר', fill: 'מילוי' };
export const SHAPE_LABEL: Record<Shape, string> = { circle: 'עיגול', square: 'ריבוע', triangle: 'משולש', diamond: 'מעוין' };
export const FILL_LABEL: Record<Fill, string> = { empty: 'ריק', hatched: 'מקווקו', solid: 'מלא' };
export const RULE_LABEL: Record<Rule, string> = {
  constant: 'זהה בכל משבצות השורה',
  progression: 'עולה או יורד בצעד קבוע לאורך השורה',
  distribution: 'בכל שורה מופיע כל אחד משלושת הערכים פעם אחת',
};

export function valueLabel(a: Attr, g: Glyph): string {
  if (a === 'shape') return SHAPE_LABEL[g.shape];
  if (a === 'fill') return FILL_LABEL[g.fill];
  return String(g.count);
}

/** Values an attribute can take in the full pool. */
export const poolOf = (a: Attr): (Shape | Count | Fill)[] => (a === 'shape' ? SHAPES : a === 'fill' ? FILLS : COUNTS);

/** How many attributes vary, by level. The rest stay constant. */
export const VARYING_BY_LEVEL: Record<Level, number> = { 1: 1, 2: 2, 3: 3 };

/** Builds a puzzle whose rows all satisfy its rules. */
export function makePuzzle(rng: Rng, level: Level): Puzzle {
  const varying = rng.shuffle(ATTRS).slice(0, VARYING_BY_LEVEL[level]);
  const rules: Record<Attr, Rule> = { shape: 'constant', count: 'constant', fill: 'constant' };
  for (const a of varying) rules[a] = a === 'count' && rng.chance(0.5) ? 'progression' : 'distribution';
  const step: Step = rng.pick([1, -1] as Step[]);
  // Distribution uses a fixed set of three values per attribute, the same across rows.
  const sets: Record<Attr, (Shape | Count | Fill)[]> = {
    shape: rng.shuffle(SHAPES).slice(0, 3),
    count: COUNTS,
    fill: FILLS,
  };

  const line = (a: Attr): (Shape | Count | Fill)[] => {
    if (rules[a] === 'progression') return step === 1 ? [1, 2, 3] : [3, 2, 1];
    if (rules[a] === 'distribution') return rng.shuffle(sets[a]);
    const v = rng.pick(poolOf(a));
    return [v, v, v];
  };

  const grid: Glyph[][] = [];
  for (let r = 0; r < 3; r++) {
    const shape = line('shape') as Shape[];
    const count = line('count') as Count[];
    const fill = line('fill') as Fill[];
    grid.push([0, 1, 2].map((c) => ({ shape: shape[c], count: count[c], fill: fill[c] })));
  }
  return { rules, step, grid };
}

/** True when `grid` obeys every rule of `p`. Rules are checked on all three rows. */
export function fits(p: Puzzle, grid: Glyph[][]): boolean {
  for (const a of ATTRS) {
    const rule = p.rules[a];
    const ref = grid[0].map((g) => g[a]);
    for (const row of grid) {
      const v = row.map((g) => g[a]);
      if (rule === 'constant' && !v.every((x) => x === v[0])) return false;
      if (rule === 'progression' && !(Number(v[1]) - Number(v[0]) === p.step && Number(v[2]) - Number(v[1]) === p.step))
        return false;
      if (rule === 'distribution' && !(new Set(v).size === 3 && v.every((x) => ref.includes(x)))) return false;
    }
  }
  return true;
}

/** True when `cell` completes the puzzle's bottom-right corner. */
export function completes(p: Puzzle, cell: Glyph): boolean {
  const grid = p.grid.map((row) => row.slice());
  grid[2][2] = cell;
  return fits(p, grid);
}
