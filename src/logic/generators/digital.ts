// Digital-systemic drills: trace code, filter a table, follow a data pipeline. All generated and checked by running them.
import { PRODUCTS } from '../../content/extensions';
import type { Rng } from '../rng';
import type { ErrorType, Level, Option, TextSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });
type Wrong = { value: number; errorType: Exclude<ErrorType, 'timeout'>; why: string };

/** Answer plus distinct distractors; fills gaps with near numbers so there are always four options. */
function numeric(answer: number, why: string, wrong: Wrong[]): Option[] {
  const seen = new Set([answer]);
  const out: Option[] = [{ visual: text(String(answer)), correct: true, why }];
  for (const w of wrong) {
    if (seen.has(w.value) || out.length === 4) continue;
    seen.add(w.value);
    out.push({ visual: text(String(w.value)), correct: false, errorType: w.errorType, why: w.why });
  }
  for (let d = 1; out.length < 4; d++)
    for (const v of [answer + d, answer - d])
      if (!seen.has(v) && out.length < 4) {
        seen.add(v);
        out.push({ visual: text(String(v)), correct: false, errorType: 'encoding', why: 'טעות חישוב באחד הצעדים.' });
      }
  return out;
}

/* ================= trace ================= */

export function trace(rng: Rng, level: Level): Draft {
  if (level === 1) {
    const a = rng.int(2, 6);
    const b = rng.int(1, 4);
    const n = rng.int(3, 4);
    const run = (k: number, swapped = false) => {
      let x = a;
      for (let i = 0; i < k; i++) x = swapped ? (x - b) * 2 : x * 2 - b;
      return x;
    };
    return {
      dim: '2D',
      prompt: 'מה יודפס בסוף?',
      stimulus: { kind: 'verbal', mode: 'code', words: [`x = ${a}`, `repeat ${n} times:`, `    x = x * 2 - ${b}`, 'print(x)'] },
      options: numeric(run(n), `x עובר ${n} סבבים: כל סבב מכפיל ב-2 ומחסיר ${b}.`, [
        { value: run(n - 1), errorType: 'wrong_rule', why: `זה אחרי ${n - 1} סבבים. הלולאה רצה ${n} פעמים.` },
        { value: run(n, true), errorType: 'transformation', why: `סדר הפעולות התהפך: קודם כפל, אחר כך חיסור.` },
        { value: run(n + 1), errorType: 'encoding', why: `זה אחרי ${n + 1} סבבים.` },
      ]),
      explanation: 'עקבי אחרי המשתנה בטבלה: שורה לכל סבב, עמודה לכל משתנה. ספרי את הסבבים ולא את השורות בקוד.',
    };
  }
  if (level === 2) {
    const n = rng.int(8, 14);
    const k = rng.pick([2, 3, 4]);
    let s = 0;
    let all = 0;
    let cnt = 0;
    let offByOne = 0;
    for (let i = 1; i <= n; i++) {
      all += i;
      if (i % k === 0) {
        s += i;
        cnt++;
        if (i < n) offByOne += i;
      }
    }
    return {
      dim: '2D',
      prompt: 'מה יודפס בסוף?',
      stimulus: { kind: 'verbal', mode: 'code', words: ['s = 0', `for i in 1..${n}:`, `    if i % ${k} == 0:`, '        s = s + i', 'print(s)'] },
      options: numeric(s, `סכום המספרים מ-1 עד ${n} שמתחלקים ב-${k}.`, [
        { value: all, errorType: 'wrong_rule', why: 'התנאי לא נבדק: זה סכום כל המספרים.' },
        { value: cnt, errorType: 'encoding', why: 'זו כמות המספרים שעברו את התנאי, לא הסכום שלהם.' },
        { value: offByOne, errorType: 'transformation', why: `הטווח כולל את ${n}. כאן הוא נעצר מספר אחד לפני.` },
      ]),
      explanation: 'סמני אילו ערכים של i עוברים את התנאי, ורק אותם סכמי. בדקי אם הטווח כולל את הקצה.',
    };
  }
  // level 3: a branch inside the loop
  const start = rng.pick([6, 7, 9, 11, 12, 13, 17]);
  const n = rng.int(4, 5);
  const step = (x: number, flip = false) => ((x % 2 === 0) !== flip ? x / 2 : 3 * x + 1);
  const run = (k: number, flip = false) => {
    let x = start;
    for (let i = 0; i < k; i++) x = step(x, flip);
    return x;
  };
  return {
    dim: '2D',
    prompt: 'מה יודפס בסוף?',
    stimulus: { kind: 'verbal', mode: 'code', words: [`x = ${start}`, `repeat ${n} times:`, '    if x % 2 == 0:', '        x = x // 2', '    else:', '        x = 3 * x + 1', 'print(x)'] },
    options: numeric(run(n), `${n} סבבים: זוגי מתחלק ב-2, אי-זוגי הופך ל-3x+1.`, [
      { value: run(n - 1), errorType: 'wrong_rule', why: `זה אחרי ${n - 1} סבבים.` },
      { value: run(n + 1), errorType: 'encoding', why: `זה אחרי ${n + 1} סבבים.` },
      { value: Math.round(run(n, true)), errorType: 'transformation', why: 'הענפים התהפכו: זוגי ואי-זוגי הוחלפו.' },
    ]),
    explanation: 'בכל סבב בדקי קודם את התנאי ורק אחר כך חשבי. כתבי את ערך x אחרי כל סבב.',
  };
}

/* ================= query ================= */

type Row = (typeof PRODUCTS)[number];
interface Cond {
  label: string;
  f: (r: Row) => boolean;
}

function conds(rng: Rng): Cond[] {
  const color = rng.pick(['כחול', 'אדום', 'ירוק']);
  const price = rng.pick([100, 150, 200, 300]);
  const size = rng.pick(['S', 'M', 'L'] as const);
  return rng.shuffle([
    { label: `צבע = ${color}`, f: (r) => r.color === color },
    { label: `מחיר > ${price}`, f: (r) => r.price > price },
    { label: `גודל = ${size}`, f: (r) => r.size === size },
    { label: 'במלאי', f: (r) => r.stock },
  ]);
}

export function query(rng: Rng, level: Level): Draft {
  for (;;) {
    const [A, B, C] = conds(rng);
    const count = (f: (r: Row) => boolean) => PRODUCTS.filter(f).length;
    let q: string;
    let answer: number;
    let wrong: Wrong[];
    if (level === 1) {
      q = `${A.label} וגם ${B.label}`;
      answer = count((r) => A.f(r) && B.f(r));
      wrong = [
        { value: count((r) => A.f(r) || B.f(r)), errorType: 'wrong_rule', why: '"וגם" דורש ששני התנאים יתקיימו. זו התוצאה של "או".' },
        { value: count(A.f), errorType: 'encoding', why: 'רק התנאי הראשון נבדק.' },
        { value: PRODUCTS.length - answer, errorType: 'transformation', why: 'אלה השורות שלא עברו את הסינון.' },
      ];
    } else if (level === 2) {
      q = `${A.label} או ${B.label}`;
      answer = count((r) => A.f(r) || B.f(r));
      wrong = [
        { value: count((r) => A.f(r) && B.f(r)), errorType: 'wrong_rule', why: '"או" מספיק בתנאי אחד. זו התוצאה של "וגם".' },
        { value: count(A.f) + count(B.f), errorType: 'encoding', why: 'שורות שעונות על שני התנאים נספרו פעמיים.' },
        { value: PRODUCTS.length - answer, errorType: 'transformation', why: 'אלה השורות שלא עברו את הסינון.' },
      ];
    } else {
      q = `(${A.label} או ${B.label}) וגם לא ${C.label}`;
      answer = count((r) => (A.f(r) || B.f(r)) && !C.f(r));
      wrong = [
        { value: count((r) => A.f(r) || B.f(r)), errorType: 'encoding', why: 'ה"לא" נשכח: לא הוצאו השורות שעונות על התנאי השלישי.' },
        { value: count((r) => (A.f(r) || B.f(r)) && C.f(r)), errorType: 'transformation', why: 'ה"לא" התהפך: נספרו דווקא השורות שעונות על התנאי השלישי.' },
        { value: count((r) => A.f(r) || (B.f(r) && !C.f(r))), errorType: 'wrong_rule', why: 'הסוגריים התעלמו: ה"וגם לא" חל רק על התנאי השני.' },
      ];
    }
    if (answer === 0 || answer === PRODUCTS.length) continue;
    const rows = ['שם|צבע|גודל|מחיר|מלאי', ...PRODUCTS.map((r) => `${r.name}|${r.color}|${r.size}|${r.price}|${r.stock ? 'כן' : 'לא'}`)];
    return {
      dim: '2D',
      prompt: `כמה שורות עונות על הסינון: ${q}?`,
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options: numeric(answer, `סמני כל שורה שעונה על הסינון וספרי: ${answer}.`, wrong),
      explanation: 'עברי שורה-שורה ושאלי שאלת כן-לא לכל תנאי. "וגם" דורש את כולם, "או" מסתפק באחד, ו"לא" הופך תנאי. בסוגריים מחשבים קודם.',
    };
  }
}

/* ================= pipeline ================= */

interface Stage {
  code: string;
  run: (xs: number[]) => number[];
}

export function pipeline(rng: Rng, level: Level): Draft {
  for (;;) {
    const xs = Array.from({ length: 6 }, () => rng.int(1, 12));
    const k = rng.pick([2, 3]);
    const m = rng.pick([2, 3, 10]);
    const t = rng.pick([2, 3]);
    const filt: Stage = { code: `filter(x > ${k * 2})`, run: (a) => a.filter((x) => x > k * 2) };
    const map: Stage = { code: `map(x * ${m})`, run: (a) => a.map((x) => x * m) };
    const mapAdd: Stage = { code: `map(x - ${k})`, run: (a) => a.map((x) => x - k) };
    const take: Stage = { code: `take(${t})`, run: (a) => a.slice(0, t) };
    const stages = level === 1 ? [filt, map] : level === 2 ? [mapAdd, filt, take] : [mapAdd, filt, map, take];
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
    const go = (ss: Stage[]) => sum(ss.reduce((a, s) => s.run(a), xs));
    const answer = go(stages);
    const swapped = stages.slice();
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const skipped = stages.filter((_, i) => i !== stages.length - 1);
    const inverse: Stage = { code: '', run: (a) => a.filter((x) => !(x > k * 2)) };
    const flipped = stages.map((s) => (s === filt ? inverse : s));
    const kept = stages.reduce((a, s) => s.run(a), xs);
    if (kept.length < 1 || answer === 0) continue;
    return {
      dim: '2D',
      prompt: 'הנתונים עוברים בצינור משמאל לימין, ובסוף מסכמים. מה התוצאה?',
      stimulus: { kind: 'verbal', mode: 'code', words: [`data = [${xs.join(', ')}]`, ...stages.map((s) => `  -> ${s.code}`), '  -> sum()'] },
      options: numeric(answer, `אחרי כל השלבים נשארים [${kept.join(', ')}], והסכום ${answer}.`, [
        { value: go(swapped), errorType: 'transformation', why: 'שני השלבים הראשונים הופעלו בסדר הפוך. בצינור הסדר קובע.' },
        { value: go(skipped), errorType: 'encoding', why: 'השלב האחרון דולג.' },
        { value: go(flipped), errorType: 'wrong_rule', why: 'הסינון התהפך: נשמרו דווקא האיברים שהיו צריכים לצאת.' },
      ]),
      explanation: 'כתבי את הרשימה אחרי כל שלב. filter מוציא, map משנה כל איבר, take שומר את הראשונים. כל שלב מקבל את מה שיצא מהקודם.',
    };
  }
}
