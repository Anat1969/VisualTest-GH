import type { Rng } from '../rng';
import { ATTRS, ATTR_LABEL, RULE_LABEL, completes, makePuzzle, poolOf, valueLabel, type Attr, type Puzzle } from '../matrices';
import type { Glyph, Level, MatrixSpec, Option, VisualSpec } from '../types';
import type { Draft } from './index';

const glyphVisual = (g: Glyph): VisualSpec => ({ kind: 'glyph', glyph: g });

/** A puzzle and the draft built from it. Exposed so tests can check the answer key. */
export function buildMatrix(rng: Rng, level: Level): { draft: Draft; puzzle: Puzzle } {
  const puzzle = makePuzzle(rng, level);
  const answer = puzzle.grid[2][2];
  const cells: MatrixSpec['cells'] = puzzle.grid.flat().map((g, i) => (i === 8 ? null : g));

  // Each distractor changes exactly one attribute of the answer. Every one breaks that attribute's rule.
  const alts: { attr: Attr; glyph: Glyph }[] = [];
  for (const attr of ATTRS)
    for (const v of poolOf(attr))
      if (v !== answer[attr]) alts.push({ attr, glyph: { ...answer, [attr]: v } });

  const picked: { attr: Attr; glyph: Glyph }[] = [];
  const seen = new Set([JSON.stringify(answer)]);
  for (const alt of rng.shuffle(alts)) {
    if (picked.length === 3) break;
    const key = JSON.stringify(alt.glyph);
    if (seen.has(key) || completes(puzzle, alt.glyph)) continue;
    seen.add(key);
    picked.push(alt);
  }
  if (picked.length < 3) throw new Error('matrices: not enough distinct distractors');

  const rulesText = ATTRS.map((a) => `${ATTR_LABEL[a]}: ${RULE_LABEL[puzzle.rules[a]]}`).join('; ');
  const correct: Option = {
    visual: glyphVisual(answer),
    correct: true,
    why: `בכל שורה מתקיימים הכללים: ${rulesText}.`,
  };
  const distractors: Option[] = picked.map(({ attr, glyph }) => {
    const rule = puzzle.rules[attr];
    return {
      visual: glyphVisual(glyph),
      correct: false,
      errorType: rule === 'constant' ? 'encoding' : 'wrong_rule',
      why:
        rule === 'constant'
          ? `${ATTR_LABEL[attr]}: הערך במשבצת צריך להיות זהה לשתי המשבצות הקודמות בשורה, כלומר ${valueLabel(attr, answer)}.`
          : `${ATTR_LABEL[attr]}: הכלל "${RULE_LABEL[rule]}" קובע ${valueLabel(attr, answer)} במשבצת הריקה.`,
    };
  });

  return {
    draft: {
      dim: '2D',
      prompt: 'איזו צורה תשלים את המשבצת הריקה, כך שכל שורה תעמוד באותם כללים?',
      stimulus: { kind: 'matrix', cells },
      options: [correct, ...distractors],
      explanation: `בדקי כל תכונה בנפרד, לאורך השורות. הכללים בפריט: ${rulesText}. התשובה נכונה כשכל תכונה מקבלת את הערך שהכלל מחייב, ולא רק ערך דומה לו.`,
    },
    puzzle,
  };
}

export function matrices2D(rng: Rng, level: Level): Draft {
  return buildMatrix(rng, level).draft;
}
