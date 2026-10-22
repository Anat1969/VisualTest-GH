// Logical-mathematical drills. Every answer key is computed, not hand-written.
import { CONDITIONALS, SYLLOGISM_TERMS } from '../../content/logical';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec, VerbalSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ================= number series ================= */

interface SeriesRule {
  terms: number[]; // shown terms + the answer at the end
  describe: string;
  wrong: { value: number; errorType: Option['errorType']; why: string }[];
}

function seriesRule(rng: Rng, level: Level, len: number): SeriesRule {
  const kinds = level === 1 ? ['arith', 'geom'] : level === 2 ? ['second', 'interleave', 'square'] : ['fib', 'alternate', 'interleaveGeom', 'second'];
  const kind = rng.pick(kinds);
  const t: number[] = [];
  switch (kind) {
    case 'arith': {
      const a = rng.int(2, 30);
      const d = rng.pick([3, 4, 6, 7, 8, 9, 11, 12]) * rng.pick([1, 1, -1]);
      for (let i = 0; i <= len; i++) t.push(a + d * i);
      return {
        terms: t,
        describe: `בכל צעד מוסיפים ${d > 0 ? d : `מינוס ${-d}`}.`,
        wrong: [
          { value: t[len] + d, errorType: 'encoding', why: 'דילגת על איבר: זה האיבר שאחרי התשובה.' },
          { value: t[len] - 1, errorType: 'encoding', why: 'הכלל נכון, החישוב לא מדויק.' },
          { value: t[len - 1] * 2, errorType: 'wrong_rule', why: 'הכפלה במקום הוספה קבועה.' },
        ],
      };
    }
    case 'geom': {
      const a = rng.int(1, 5);
      const r = rng.pick([2, 3]);
      for (let i = 0; i <= len; i++) t.push(a * r ** i);
      const diff = t[len - 1] - t[len - 2];
      return {
        terms: t,
        describe: `בכל צעד כופלים ב-${r}.`,
        wrong: [
          { value: t[len - 1] + diff, errorType: 'wrong_rule', why: 'הוספת את ההפרש האחרון. הסדרה גדלה בכפל, לא בחיבור.' },
          { value: t[len - 1] * (r + 1), errorType: 'encoding', why: 'המכפיל לא נכון.' },
          { value: t[len] + r, errorType: 'encoding', why: 'קרוב, אבל לא לפי הכלל.' },
        ],
      };
    }
    case 'second': {
      const a = rng.int(1, 20);
      const d0 = rng.int(1, 6);
      const dd = rng.int(1, 4);
      t.push(a);
      for (let i = 1; i <= len; i++) t.push(t[i - 1] + d0 + dd * (i - 1));
      const lastDiff = t[len - 1] - t[len - 2];
      return {
        terms: t,
        describe: `ההפרשים גדלים ב-${dd} בכל צעד (${d0}, ${d0 + dd}, ${d0 + 2 * dd}...).`,
        wrong: [
          { value: t[len - 1] + lastDiff, errorType: 'wrong_rule', why: 'הנחת הפרש קבוע. ההפרש עצמו גדל.' },
          { value: t[len] + dd, errorType: 'transformation', why: 'הוספת את גידול ההפרש פעם אחת יותר מדי.' },
          { value: t[len] - 1, errorType: 'encoding', why: 'החישוב לא מדויק.' },
        ],
      };
    }
    case 'square': {
      const c = rng.int(-3, 5);
      const s0 = rng.int(1, 3);
      for (let i = 0; i <= len; i++) t.push((s0 + i) ** 2 + c);
      return {
        terms: t,
        describe: `ריבועים${c ? ` ${c > 0 ? 'ועוד' : 'פחות'} ${Math.abs(c)}` : ''}: ${s0}², ${s0 + 1}², ${s0 + 2}²...`,
        wrong: [
          { value: t[len - 1] + (t[len - 1] - t[len - 2]), errorType: 'wrong_rule', why: 'הנחת הפרש קבוע. ההפרשים גדלים.' },
          { value: (s0 + len + 1) ** 2 + c, errorType: 'encoding', why: 'האיבר שאחרי התשובה.' },
          { value: (s0 + len) ** 2, errorType: 'transformation', why: 'שכחת את התיקון הקבוע.' },
        ],
      };
    }
    case 'interleave': {
      const a = rng.int(1, 10);
      const b = rng.int(20, 40);
      const da = rng.int(2, 5);
      const db = -rng.int(2, 5);
      for (let i = 0; i <= len; i++) t.push(i % 2 === 0 ? a + da * (i / 2) : b + db * ((i - 1) / 2));
      const other = len % 2 === 0 ? t[len - 1] + db : t[len - 1] + da;
      return {
        terms: t,
        describe: `שתי סדרות שזורות: במקומות האי-זוגיים מוסיפים ${da}, ובזוגיים מחסירים ${-db}.`,
        wrong: [
          { value: other, errorType: 'transformation', why: 'המשכת את הסדרה השנייה. בכל צעד מחליפים סדרה.' },
          { value: t[len - 1] + (t[len - 1] - t[len - 2]), errorType: 'wrong_rule', why: 'קראת סדרה אחת. יש כאן שתיים, שזורות.' },
          { value: t[len] + 1, errorType: 'encoding', why: 'קרוב, אבל לא מדויק.' },
        ],
      };
    }
    case 'fib': {
      const a = rng.int(1, 4);
      const b = rng.int(2, 6);
      t.push(a, b);
      while (t.length <= len) t.push(t[t.length - 1] + t[t.length - 2]);
      return {
        terms: t,
        describe: 'כל איבר הוא סכום שני האיברים שלפניו.',
        wrong: [
          { value: t[len - 1] + (t[len - 1] - t[len - 2]), errorType: 'wrong_rule', why: 'הוספת את ההפרש האחרון. כאן מחברים את שני האיברים האחרונים.' },
          { value: t[len - 1] * 2, errorType: 'transformation', why: 'הכפלה של האחרון במקום חיבור שני האחרונים.' },
          { value: t[len] + t[len - 2], errorType: 'encoding', why: 'חיברת איברים לא נכונים.' },
        ],
      };
    }
    case 'alternate': {
      const a = rng.int(1, 6);
      const add = rng.int(2, 5);
      const mul = 2;
      t.push(a);
      for (let i = 1; i <= len; i++) t.push(i % 2 === 1 ? t[i - 1] + add : t[i - 1] * mul);
      const lastIsAdd = len % 2 === 1;
      return {
        terms: t,
        describe: `לסירוגין: מוסיפים ${add}, ואז כופלים ב-${mul}.`,
        wrong: [
          { value: lastIsAdd ? t[len - 1] * mul : t[len - 1] + add, errorType: 'transformation', why: 'הפעולה הנכונה, אבל לא בתורה: הפעולות מתחלפות.' },
          { value: t[len - 1] + (t[len - 1] - t[len - 2]), errorType: 'wrong_rule', why: 'הנחת הפרש קבוע.' },
          { value: t[len] + 2, errorType: 'encoding', why: 'החישוב לא מדויק.' },
        ],
      };
    }
    default: {
      // interleaved geometric and arithmetic
      const g = rng.int(1, 3);
      const a = rng.int(10, 20);
      for (let i = 0; i <= len; i++) t.push(i % 2 === 0 ? g * 2 ** (i / 2) : a + 5 * ((i - 1) / 2));
      const other = len % 2 === 0 ? t[len - 1] + 5 : t[len - 1] * 2;
      return {
        terms: t,
        describe: 'שתי סדרות שזורות: באחת כופלים ב-2, ובשנייה מוסיפים 5.',
        wrong: [
          { value: other, errorType: 'transformation', why: 'המשכת את הסדרה הלא נכונה.' },
          { value: t[len - 2] * 3, errorType: 'wrong_rule', why: 'המכפיל לא נכון.' },
          { value: t[len] + 1, errorType: 'encoding', why: 'קרוב, אבל לא מדויק.' },
        ],
      };
    }
  }
}

export function series(rng: Rng, level: Level): Draft {
  const len = level === 1 ? 5 : 6;
  for (;;) {
    const rule = seriesRule(rng, level, len);
    const answer = rule.terms[len];
    const seen = new Set([answer]);
    const wrong = rule.wrong.filter((w) => !seen.has(w.value) && (seen.add(w.value), true));
    for (let k = 2; wrong.length < 3; k++) if (!seen.has(answer + k)) (seen.add(answer + k), wrong.push({ value: answer + k, errorType: 'encoding', why: 'לא לפי הכלל.' }));
    if (rule.terms.some((v) => Math.abs(v) > 9999)) continue;
    return {
      dim: '2D',
      prompt: 'מה המספר הבא בסדרה?',
      stimulus: { kind: 'verbal', mode: 'series', words: rule.terms.slice(0, len).map(String) } satisfies VerbalSpec,
      options: [{ visual: text(String(answer)), correct: true, why: rule.describe }, ...wrong.slice(0, 3).map<Option>((w) => ({ visual: text(String(w.value)), correct: false, errorType: w.errorType, why: w.why }))],
      explanation: `${rule.describe} בדקי קודם הפרשים, אחר כך יחסים, ואם אין כלל אחד, חפשי שתי סדרות שזורות.`,
    };
  }
}

/* ================= syllogisms ================= */

export type Form = 'A' | 'E' | 'I' | 'O';
export interface Stmt {
  form: Form;
  s: number; // subject term index
  p: number; // predicate term index
}

/**
 * Validity by brute force: a model says, for each of the 8 regions of three sets,
 * whether it has members. All three terms are taken to be non-empty.
 */
const MODELS: boolean[][] = (() => {
  const out: boolean[][] = [];
  for (let m = 0; m < 256; m++) {
    const regions = Array.from({ length: 8 }, (_, r) => Boolean(m & (1 << r)));
    const nonEmpty = [0, 1, 2].every((t) => regions.some((has, r) => has && r & (1 << t)));
    if (nonEmpty) out.push(regions);
  }
  return out;
})();

export function holds(st: Stmt, model: boolean[]): boolean {
  const inS = (r: number) => Boolean(r & (1 << st.s));
  const inP = (r: number) => Boolean(r & (1 << st.p));
  const regs = model.map((has, r) => ({ has, r }));
  switch (st.form) {
    case 'A':
      return regs.every(({ has, r }) => !has || !inS(r) || inP(r));
    case 'E':
      return regs.every(({ has, r }) => !has || !inS(r) || !inP(r));
    case 'I':
      return regs.some(({ has, r }) => has && inS(r) && inP(r));
    case 'O':
      return regs.some(({ has, r }) => has && inS(r) && !inP(r));
  }
}

export function follows(premises: Stmt[], c: Stmt): boolean {
  return MODELS.filter((m) => premises.every((p) => holds(p, m))).every((m) => holds(c, m));
}
export const consistent = (premises: Stmt[]) => MODELS.some((m) => premises.every((p) => holds(p, m)));

function say(st: Stmt, terms: string[]): string {
  const S = terms[st.s];
  const P = terms[st.p];
  switch (st.form) {
    case 'A':
      return `כל ה${S} הם ${P}.`;
    case 'E':
      return `אין ${S} שהם ${P}.`;
    case 'I':
      return `חלק מה${S} הם ${P}.`;
    case 'O':
      return `חלק מה${S} אינם ${P}.`;
  }
}

const NO_CONCLUSION = 'אין מסקנה הכרחית על הקשר ביניהם';

export function syllogism(rng: Rng, level: Level): Draft {
  const forms: Form[] = level === 1 ? ['A', 'E'] : level === 2 ? ['A', 'E', 'I'] : ['A', 'E', 'I', 'O'];
  for (;;) {
    const terms = rng.shuffle(SYLLOGISM_TERMS).slice(0, 3); // 0 = X, 1 = Y (middle), 2 = Z
    const p1: Stmt = rng.chance(0.5) ? { form: rng.pick(forms), s: 0, p: 1 } : { form: rng.pick(forms), s: 1, p: 0 };
    const p2: Stmt = rng.chance(0.5) ? { form: rng.pick(forms), s: 1, p: 2 } : { form: rng.pick(forms), s: 2, p: 1 };
    if (!consistent([p1, p2])) continue;
    const cands: Stmt[] = (['A', 'E', 'I', 'O'] as Form[]).flatMap((form) => [{ form, s: 0, p: 2 }, { form, s: 2, p: 0 }]);
    const valid = cands.filter((c) => follows([p1, p2], c));
    // the weakest conclusions (I/O) follow from the strong ones; prefer the strongest valid one
    const strong = valid.filter((c) => c.form === 'A' || c.form === 'E');
    if (level === 1 && !strong.length) continue;
    if (level < 3 && !valid.length) continue;
    const invalid = rng.shuffle(cands.filter((c) => !follows([p1, p2], c) && consistent([p1, p2, c])));
    const correct = strong.length ? rng.pick(strong) : valid.length ? rng.pick(valid) : null;
    // with a conclusion: 2 tempting non-conclusions + "no conclusion"; without one: 3 tempting ones
    if (invalid.length < (correct ? 2 : 3)) continue;
    const options: Option[] = correct
      ? [
          { visual: text(say(correct, terms)), correct: true, why: 'זה נכון בכל מצב שבו שתי ההנחות נכונות.' },
          ...invalid.slice(0, 2).map<Option>((c) => ({ visual: text(say(c, terms)), correct: false, errorType: 'wrong_rule', why: 'זה אפשרי, אבל לא הכרחי: יש מצב שבו ההנחות נכונות והמשפט הזה לא.' })),
          { visual: text(NO_CONCLUSION), correct: false, errorType: 'encoding', why: 'יש מסקנה הכרחית: הקשר דרך האיבר המשותף מספיק.' },
        ]
      : [
          { visual: text(NO_CONCLUSION), correct: true, why: 'לכל אחת מהמסקנות יש מצב שבו ההנחות נכונות והיא לא.' },
          ...invalid.slice(0, 3).map<Option>((c) => ({ visual: text(say(c, terms)), correct: false, errorType: 'wrong_rule', why: 'זה אפשרי, אבל לא הכרחי.' })),
        ];
    return {
      dim: '2D',
      prompt: `נניח ששתי ההנחות נכונות. מה נובע מהן בהכרח על ${terms[0]} ו${terms[2]}?`,
      stimulus: { kind: 'verbal', mode: 'sentences', words: [say(p1, terms), say(p2, terms)] },
      options,
      explanation:
        'ציירי שלושה עיגולים חופפים, אחד לכל קבוצה. "כל" מכניס עיגול לתוך אחר, "אין" מפריד ביניהם, "חלק" רק מבטיח נקודת חפיפה. מסקנה הכרחית נכונה בכל ציור שמתאים להנחות. המילים כאן מומצאות, כדי שהידע הקודם לא יטה.',
    };
  }
}

/* ================= conditionals ================= */

export function conditional(rng: Rng, level: Level): Draft {
  const c = rng.pick(CONDITIONALS);
  const kinds = level === 1 ? ['MP', 'MT'] : level === 2 ? ['MP', 'MT', 'AC', 'DA'] : ['chainMT', 'chainMP', 'AC', 'DA'];
  const kind = rng.pick(kinds);
  const cannot = (what: string) => `אי אפשר לקבוע ${what}`;
  let premises: string[];
  let options: Option[];
  let explanation: string;
  switch (kind) {
    case 'MP':
      premises = [`אם ${c.p}, אז ${c.q}.`, `${c.P}.`];
      options = [
        { visual: text(`${c.Q}.`), correct: true, why: 'התנאי מתקיים, ולכן התוצאה מתקיימת.' },
        { visual: text(`${c.notQ}.`), correct: false, errorType: 'transformation', why: 'הפוך: התנאי מתקיים, ולכן התוצאה בהכרח מתקיימת.' },
        { visual: text(cannot(`אם ${c.q}`)), correct: false, errorType: 'wrong_rule', why: 'זהירות יתר. כשהתנאי מתקיים, התוצאה נובעת בהכרח.' },
        { visual: text(`${c.notP}.`), correct: false, errorType: 'encoding', why: 'זה סותר את מה שנתון.' },
      ];
      explanation = 'כשהתנאי ("אם") מתקיים, התוצאה ("אז") מתקיימת בהכרח.';
      break;
    case 'MT':
      premises = [`אם ${c.p}, אז ${c.q}.`, `${c.notQ}.`];
      options = [
        { visual: text(`${c.notP}.`), correct: true, why: 'אילו התנאי היה מתקיים, התוצאה הייתה מתקיימת. היא לא, ולכן גם התנאי לא.' },
        { visual: text(`${c.P}.`), correct: false, errorType: 'transformation', why: 'הפוך: היעדר התוצאה שולל את התנאי.' },
        { visual: text(cannot(`אם ${c.p}`)), correct: false, errorType: 'wrong_rule', why: 'אפשר לקבוע: היעדר התוצאה שולל את התנאי.' },
        { visual: text(`${c.Q}.`), correct: false, errorType: 'encoding', why: 'זה סותר את מה שנתון.' },
      ];
      explanation = 'היעדר התוצאה שולל את התנאי: אילו התנאי היה מתקיים, התוצאה הייתה מתקיימת.';
      break;
    case 'AC':
      premises = [`אם ${c.p}, אז ${c.q}.`, `${c.Q}.`];
      options = [
        { visual: text(cannot(`אם ${c.p}`)), correct: true, why: 'התוצאה יכולה לנבוע גם מסיבה אחרת.' },
        { visual: text(`${c.P}.`), correct: false, errorType: 'wrong_rule', why: 'אישור התוצאה אינו מוכיח את התנאי. ייתכנו סיבות אחרות.' },
        { visual: text(`${c.notP}.`), correct: false, errorType: 'transformation', why: 'גם השלילה לא נובעת. אי אפשר לדעת.' },
        { visual: text(`${c.notQ}.`), correct: false, errorType: 'encoding', why: 'זה סותר את מה שנתון.' },
      ];
      explanation = 'התוצאה מתקיימת, אבל ייתכן שמסיבה אחרת. "אם א אז ב" לא אומר ש"ב" קורה רק בגלל "א".';
      break;
    case 'DA':
      premises = [`אם ${c.p}, אז ${c.q}.`, `${c.notP}.`];
      options = [
        { visual: text(cannot(`אם ${c.q}`)), correct: true, why: 'התוצאה יכולה לקרות גם בלי התנאי.' },
        { visual: text(`${c.notQ}.`), correct: false, errorType: 'wrong_rule', why: 'שלילת התנאי אינה שוללת את התוצאה. ייתכנו סיבות אחרות.' },
        { visual: text(`${c.Q}.`), correct: false, errorType: 'transformation', why: 'גם זה לא נובע.' },
        { visual: text(`${c.P}.`), correct: false, errorType: 'encoding', why: 'זה סותר את מה שנתון.' },
      ];
      explanation = 'התנאי לא מתקיים, אבל התוצאה עדיין יכולה לקרות מסיבה אחרת.';
      break;
    case 'chainMP':
      premises = [`אם ${c.p}, אז ${c.q}.`, `אם ${c.q}, אז ${c.r}.`, `${c.P}.`];
      options = [
        { visual: text(`${c.R}.`), correct: true, why: 'התנאי הראשון מוביל לשני, והשני לשלישי.' },
        { visual: text(`${c.notR}.`), correct: false, errorType: 'transformation', why: 'הפוך: השרשרת מובילה עד הסוף.' },
        { visual: text(cannot(`אם ${c.r}`)), correct: false, errorType: 'wrong_rule', why: 'אפשר לקבוע: שתי החוליות מתחברות.' },
        { visual: text(`${c.notQ}.`), correct: false, errorType: 'encoding', why: 'החוליה האמצעית דווקא מתקיימת.' },
      ];
      explanation = 'שרשרת: א מוביל לב, ב מוביל לג. לכן א מוביל לג.';
      break;
    default:
      premises = [`אם ${c.p}, אז ${c.q}.`, `אם ${c.q}, אז ${c.r}.`, `${c.notR}.`];
      options = [
        { visual: text(`${c.notP}.`), correct: true, why: 'בלי ג אין ב, ובלי ב אין א.' },
        { visual: text(`${c.P}.`), correct: false, errorType: 'transformation', why: 'הפוך: השלילה עוברת אחורה בשרשרת.' },
        { visual: text(cannot(`אם ${c.p}`)), correct: false, errorType: 'wrong_rule', why: 'אפשר לקבוע: השלילה עוברת אחורה דרך שתי החוליות.' },
        { visual: text(`${c.Q}.`), correct: false, errorType: 'encoding', why: 'בלי ג גם ב לא מתקיים.' },
      ];
      explanation = 'השלילה עוברת אחורה בשרשרת: אם התוצאה האחרונה לא קרתה, אף חוליה לפניה לא התקיימה.';
  }
  return {
    dim: '2D',
    prompt: 'מה נובע בהכרח מהנתונים?',
    stimulus: { kind: 'verbal', mode: 'sentences', words: premises },
    options,
    explanation,
  };
}
