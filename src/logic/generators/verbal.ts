// Linguistic intelligence drills: relations (analogies), odd word out, paragraph order.
import {
  CONFUSABLE,
  PARAGRAPHS,
  RELATION_LABEL,
  RELATION_PAIRS,
  RELATION_SENTENCE,
  WORD_SETS,
  type Relation,
} from '../../content/verbal';
import type { Rng } from '../rng';
import type { Level, Option, VerbalSpec } from '../types';
import type { Draft } from './index';

const RELATIONS = Object.keys(RELATION_PAIRS) as Relation[];
const SYMMETRIC: Relation[] = ['opposite'];
const pairOpt = (a: string, b: string): VerbalSpec => ({ kind: 'verbal', mode: 'pairOption', words: [a, b] });

/* ---------------- relations ---------------- */

export function analogy(rng: Rng, level: Level): Draft {
  const rel = rng.pick(RELATIONS);
  const [stem, target, mismatch] = rng.shuffle(RELATION_PAIRS[rel]);
  const others = (pool: Relation[]) => rng.shuffle(pool).map((r) => ({ r, pair: rng.pick(RELATION_PAIRS[r]) }));
  const say = RELATION_SENTENCE[rel];

  const reversed: Option = {
    visual: pairOpt(target[1], target[0]),
    correct: false,
    errorType: 'transformation',
    why: `היחס נכון אבל הכיוון הפוך. במקור: ${say(stem[0], stem[1])}; כאן הסדר מתהפך.`,
  };
  const mismatched: Option = {
    visual: pairOpt(target[0], mismatch[1]),
    correct: false,
    errorType: 'encoding',
    why: `שתי המילים מתאימות לסוג היחס, אבל אין קשר ביניהן: ${target[0]} אינו קשור ל${mismatch[1]}.`,
  };
  const otherRel = (r: Relation, pair: [string, string]): Option => ({
    visual: pairOpt(pair[0], pair[1]),
    correct: false,
    errorType: 'wrong_rule',
    why: `כאן היחס הוא ${RELATION_LABEL[r]}: ${RELATION_SENTENCE[r](pair[0], pair[1])}. זה לא אותו יחס.`,
  });

  const far = others(RELATIONS.filter((r) => r !== rel && !CONFUSABLE[rel].includes(r)));
  const near = others(CONFUSABLE[rel]);
  // a symmetric relation reads the same both ways, so a reversed pair would also be correct
  const dirOpt = SYMMETRIC.includes(rel) ? otherRel(near[0].r, near[0].pair) : reversed;
  const distractors: Option[] =
    level === 1
      ? [dirOpt, otherRel(far[0].r, far[0].pair), otherRel(far[1].r, far[1].pair)]
      : level === 2
        ? [dirOpt, mismatched, otherRel(far[0].r, far[0].pair)]
        : [dirOpt, mismatched, otherRel(SYMMETRIC.includes(rel) ? far[0].r : near[0].r, SYMMETRIC.includes(rel) ? far[0].pair : near[0].pair)];

  return {
    dim: '2D',
    prompt: 'איזה זוג מקיים את אותו היחס כמו הזוג שלמעלה, ובאותו כיוון?',
    stimulus: { kind: 'verbal', mode: 'pair', words: stem },
    options: [
      { visual: pairOpt(target[0], target[1]), correct: true, why: `${say(target[0], target[1])}, בדיוק כמו ש${say(stem[0], stem[1])}.` },
      ...distractors,
    ],
    explanation: `היחס הוא ${RELATION_LABEL[rel]}. נסחי אותו כמשפט על הזוג הראשון ("${say(stem[0], stem[1])}") והציבי אותו בכל אפשרות.`,
  };
}

/* ---------------- odd word out ---------------- */

export function oddWord(rng: Rng, level: Level): Draft {
  const set = rng.pick(WORD_SETS);
  const other = rng.pick(WORD_SETS.filter((s) => s !== set));
  const members = rng.shuffle(set.members);
  const word = (w: string): VerbalSpec => ({ kind: 'verbal', mode: 'word', words: [w] });

  const intruder =
    level === 1
      ? (() => {
          const w = rng.pick(other.members);
          return { w, why: `${w} שייך ל${other.category}, והשאר הם ${set.category}.` };
        })()
      : { w: set.near, why: set.nearWhy };
  const shown = level === 3 ? [set.decoy, members[0], members[1]] : [members[0], members[1], members[2]];

  const options: Option[] = [
    { visual: word(intruder.w), correct: true, why: intruder.why },
    ...shown.map<Option>((w) =>
      w === set.decoy
        ? { visual: word(w), correct: false, errorType: 'wrong_rule', why: `${w} שונה במראה או בהתנהגות, אבל הוא בהחלט שייך ל${set.category}. מיון לפי תכונה שטחית.` }
        : { visual: word(w), correct: false, errorType: 'encoding', why: `${w} שייך ל${set.category}.` },
    ),
  ];
  return {
    dim: '2D',
    prompt: 'איזו מילה אינה שייכת לקבוצה?',
    stimulus: { kind: 'verbal', mode: 'note', words: ['שלוש מהמילים שייכות לאותה קבוצה. אחת לא.'] },
    options,
    explanation: `הקבוצה: ${set.category}. ${level === 1 ? '' : set.nearWhy}`.trim(),
  };
}

/* ---------------- paragraph order ---------------- */

const chips = (order: number[]): VerbalSpec => ({ kind: 'verbal', mode: 'order', words: order.map((i) => String(i + 1)) });
const inWords = (order: number[]) =>
  `מתחילים במשפט ${order[0] + 1}, ממשיכים ב-${order.slice(1, -1).map((i) => i + 1).join(', ב-')}, ומסיימים ב-${order[order.length - 1] + 1}`;

export function sequence(rng: Rng, level: Level): Draft {
  const size = (level + 3) as 4 | 5 | 6;
  const p = rng.pick(PARAGRAPHS[size]);
  const n = p.lines.length;
  // shown in a scrambled order; the reader's job is to restore the original
  const shown = rng.shuffle(p.lines.map((_, i) => i));
  while (shown.every((v, i) => v === i)) shown.reverse();
  const posOf = (orig: number) => shown.indexOf(orig); // label of an original sentence in the shown list
  const correct = p.lines.map((_, i) => posOf(i));

  const banned = new Set([correct, ...(p.alt ?? []).map((o) => o.map(posOf))].map((o) => o.join()));
  const variants: { order: number[]; errorType: Option['errorType']; why: string }[] = [];
  const swapAt = (k: number) => {
    const o = correct.slice();
    [o[k], o[k + 1]] = [o[k + 1], o[k]];
    return o;
  };
  const middle = rng.shuffle(Array.from({ length: n - 1 }, (_, k) => k).filter((k) => (level === 3 ? k > 0 && k < n - 2 : true)));
  for (const k of middle)
    variants.push({ order: swapAt(k), errorType: 'encoding', why: `משפטים ${correct[k] + 1} ו-${correct[k + 1] + 1} הפוכים. מילת הקישור או הכינוי מחייבים סדר אחר.` });
  variants.push({ order: [correct[n - 1], ...correct.slice(0, n - 1)], errorType: 'wrong_rule', why: 'המסקנה הוקדמה לפתיחה. משפט שמסכם בא אחרי הנימוקים.' });
  variants.push({ order: [...correct.slice(1), correct[0]], errorType: 'transformation', why: 'משפט הפתיחה הועבר לסוף, ואז המשפט השני מפנה לדבר שעוד לא הוזכר.' });
  variants.push({ order: correct.slice().reverse(), errorType: 'transformation', why: 'הסדר הפוך מקצה לקצה.' });

  const picked: typeof variants = [];
  for (const v of level === 1 ? rng.shuffle(variants.slice(-3)) : variants) {
    const k = v.order.join();
    if (banned.has(k)) continue;
    banned.add(k);
    picked.push(v);
    if (picked.length === 3) break;
  }
  return {
    dim: '2D',
    prompt: `באיזה סדר המשפטים יוצרים פסקה רציפה? (${p.title})`,
    stimulus: { kind: 'verbal', mode: 'sentences', words: shown.map((i) => p.lines[i]) },
    options: [
      { visual: chips(correct), correct: true, why: p.anchors },
      ...picked.map<Option>((v) => ({ visual: chips(v.order), correct: false, errorType: v.errorType, why: v.why })),
    ],
    explanation: `${inWords(correct)}. ${p.anchors}`,
  };
}
