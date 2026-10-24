// Systems drills: feedback loops, stocks and flows, chains of influence. Abstract node names keep the structure honest.
import type { Rng } from '../rng';
import type { Level, Option, P2, Prim, SceneSpec, TextSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });
const NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

/** Arrow from a to b, shortened at both ends, with its sign drawn at the middle. */
function signedArrow(a: P2, b: P2, sign: 1 | -1, r = 15): Prim[] {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / d;
  const uy = (b[1] - a[1]) / d;
  const p: P2 = [a[0] + ux * r, a[1] + uy * r];
  const q: P2 = [b[0] - ux * r, b[1] - uy * r];
  const mid: P2 = [(p[0] + q[0]) / 2 - uy * 9, (p[1] + q[1]) / 2 + ux * 9];
  return [
    { p: 'arrow', pts: [p, q], tone: sign > 0 ? 'ink' : 'bad', w: 1.6, dash: sign < 0 },
    { p: 'circle', c: mid, r: 6, fill: 'paper', tone: sign > 0 ? 'ink' : 'bad', w: 1 },
    { p: 'text', at: mid, text: sign > 0 ? '+' : '−', size: 9, weight: 700, tone: sign > 0 ? 'ink' : 'bad' },
  ];
}

const node = (c: P2, label: string, hot = false): Prim[] => [
  { p: 'circle', c, r: 14, fill: hot ? 'accentSoft' : 'paper', tone: hot ? 'accent' : 'ink', w: 1.4 },
  { p: 'text', at: c, text: label, size: 10, weight: 700 },
];

const legend = (y: number): Prim[] => [
  { p: 'text', at: [0, y], text: '+ אותו כיוון (עולה, מעלה)    − כיוון הפוך (עולה, מוריד)', size: 7, tone: 'muted' },
];

/* ================= loops ================= */

export function loop(rng: Rng, level: Level): Draft {
  const n = level + 2; // 3..5 nodes on a circle
  const signs = Array.from({ length: n }, () => (rng.chance(0.5) ? 1 : -1) as 1 | -1);
  if (level === 1 && signs.filter((s) => s < 0).length > 1) signs.fill(1, 1);
  const negatives = signs.filter((s) => s < 0).length;
  const reinforcing = negatives % 2 === 0;
  const R = 52;
  const pos: P2[] = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [R * Math.cos(a), R * Math.sin(a)];
  });
  const prims: Prim[] = [];
  for (let i = 0; i < n; i++) prims.push(...signedArrow(pos[i], pos[(i + 1) % n], signs[i]));
  pos.forEach((p, i) => prims.push(...node(p, NAMES[i], i === 0)));
  prims.push(...legend(R + 30));
  const scene: SceneSpec = { kind: 'scene', box: [-110, -80, 220, 160], prims, label: 'לולאת השפעה' };
  const up = 'א יעלה עוד, והלולאה תאיץ';
  const down = 'א ירד חזרה, והלולאה תייצב';
  const options: Option[] = [
    { visual: text(reinforcing ? up : down), correct: true, why: `${negatives} קשתות שליליות: ${reinforcing ? 'מספר זוגי, והשינוי חוזר מוגבר. לולאה מחזקת.' : 'מספר אי-זוגי, והשינוי חוזר הפוך. לולאה מאזנת.'}` },
    { visual: text(reinforcing ? down : up), correct: false, errorType: 'transformation', why: 'הכיוון הפוך. ספרי את הקשתות השליליות: זוגי מחזק, אי-זוגי מאזן.' },
    { visual: text('א לא ישתנה, כי ההשפעות מתקזזות'), correct: false, errorType: 'encoding', why: 'בלולאה אחת אין קיזוז: השינוי עובר בכל הקשתות וחוזר לא.' },
    { visual: text('תלוי בקשת הראשונה בלבד'), correct: false, errorType: 'wrong_rule', why: 'כל הקשתות קובעות יחד. סימן אחד שמתהפך הופך את סוג הלולאה.' },
  ];
  return {
    dim: '2D',
    prompt: 'נניח שא עולה מעט. אחרי סיבוב שלם בלולאה, מה יקרה לא?',
    stimulus: scene,
    options,
    explanation: 'עקבי אחרי השינוי קשת אחר קשת: + שומר על הכיוון, − הופך אותו. מספר זוגי של מינוסים מחזיר את השינוי מוגבר (לולאה מחזקת), אי-זוגי מחזיר אותו הפוך (לולאה מאזנת).',
  };
}

/* ================= stock and flow ================= */

function chart(inflow: number[], outflow: number[]): SceneSpec {
  const n = inflow.length;
  const W = 220;
  const H = 110;
  const max = Math.max(...inflow, ...outflow) * 1.15;
  const X = (i: number) => -W / 2 + ((i + 0.5) / n) * W;
  const Y = (v: number) => H / 2 - (v / max) * H;
  const prims: Prim[] = [
    { p: 'line', pts: [[-W / 2, H / 2], [W / 2, H / 2]], w: 1, tone: 'line' },
    { p: 'line', pts: inflow.map((v, i) => [X(i), Y(v)] as P2), w: 2.6, tone: '#2a8a7a' },
    { p: 'line', pts: outflow.map((v, i) => [X(i), Y(v)] as P2), w: 2.2, tone: 'ink', dash: true },
  ];
  for (let i = 0; i < n; i++) prims.push({ p: 'text', at: [X(i), H / 2 + 9], text: String(i + 1), size: 7, tone: 'muted' });
  prims.push({ p: 'text', at: [W / 2 - 4, -H / 2 - 4], text: 'זרימה פנימה (קו מלא)', size: 7.5, tone: '#2a8a7a', anchor: 'end', weight: 700 });
  prims.push({ p: 'text', at: [W / 2 - 4, -H / 2 + 7], text: 'זרימה החוצה (מקווקו)', size: 7.5, tone: 'ink', anchor: 'end' });
  prims.push({ p: 'text', at: [0, H / 2 + 19], text: 'זמן', size: 7, tone: 'muted' });
  return { kind: 'scene', box: [-W / 2 - 10, -H / 2 - 16, W + 20, H + 42], prims, label: 'זרימות לאורך זמן' };
}

const argBy = (xs: number[], better: (a: number, b: number) => boolean) => xs.reduce((best, v, i) => (better(v, xs[best]) ? i : best), 0);
const unique = (xs: number[], i: number) => xs.filter((v) => v === xs[i]).length === 1;

export function stock(rng: Rng, level: Level): Draft {
  for (;;) {
    const n = 10;
    const peak = rng.int(2, 5);
    const height = rng.int(8, 12);
    const inflow = Array.from({ length: n }, (_, i) => Math.max(1, Math.round(height - Math.abs(i - peak) * rng.pick([1.5, 2, 2.5]))));
    const base = rng.int(4, 6);
    const outflow = Array.from({ length: n }, (_, i) => (level === 1 ? base : base + Math.round(i * 0.4)));
    const net = inflow.map((v, i) => v - outflow[i]);
    const levelAt: number[] = [];
    net.reduce((s, d, i) => ((levelAt[i] = s + d), s + d), 20);
    const askMax = level < 3 || rng.chance(0.5);
    const better = askMax ? (a: number, b: number) => a > b : (a: number, b: number) => a < b;
    const ans = argBy(levelAt, better);
    const inPeak = argBy(inflow, (a, b) => (askMax ? a > b : a < b));
    const netPeak = argBy(net, better);
    if (!unique(levelAt, ans) || ans === 0 || ans === n - 1) continue;
    // rate confused with level: the moment the gap between flows is widest, or (if that is the same moment) the step after the turn
    const rate = netPeak !== inPeak && netPeak !== ans ? netPeak : ans + 1;
    const late = [n - 1, 0].find((v) => v !== ans && v !== inPeak && v !== rate);
    if (inPeak === ans || rate === inPeak || late === undefined) continue;
    const t = (i: number) => `זמן ${i + 1}`;
    const word = askMax ? 'הגבוהה ביותר' : 'הנמוכה ביותר';
    return {
      dim: '2D',
      prompt: `הגרף מראה כמה נכנס וכמה יוצא ממאגר בכל יחידת זמן. מתי כמות המים במאגר ${word}?`,
      stimulus: chart(inflow, outflow),
      options: [
        { visual: text(t(ans)), correct: true, why: askMax ? 'המאגר גדל כל עוד נכנס יותר משיוצא. השיא הוא ברגע האחרון שבו הקו המלא מעל המקווקו.' : 'המאגר יורד כל עוד יוצא יותר משנכנס. השפל הוא ברגע האחרון שבו המקווקו מעל הקו המלא.' },
        {
          visual: text(t(inPeak)),
          correct: false,
          errorType: 'wrong_rule',
          why: askMax ? 'זה שיא הזרימה פנימה, לא שיא המלאי. גם אחרי השיא נכנס יותר משיוצא, והמאגר ממשיך לגדול.' : 'זה שפל הזרימה פנימה, לא שפל המלאי. המלאי יורד רק כל עוד יוצא יותר משנכנס.',
        },
        { visual: text(t(rate)), correct: false, errorType: 'transformation', why: rate === ans + 1 ? 'כאן הכיוון כבר התהפך. הנקודה הקיצונית היא רגע לפני.' : 'זה הרגע שבו ההפרש בין הזרימות קיצוני. קצב השינוי אינו הכמות עצמה.' },
        { visual: text(t(late)), correct: false, errorType: 'encoding', why: late === 0 ? 'בתחילת התקופה המאגר רק מתחיל להשתנות.' : 'בסוף התקופה המאגר כבר בכיוון ההפוך.' },
      ],
      explanation: 'מלאי הוא סכום כל ההפרשים עד עכשיו. הוא עולה כשהזרימה פנימה גדולה מהזרימה החוצה, גם אם היא כבר יורדת. השיא בנקודת החצייה, לא בשיא הזרימה.',
    };
  }
}

/* ================= chains of influence ================= */

export function effects(rng: Rng, level: Level): Draft {
  const len = level + 2; // links on the main path
  const signs = Array.from({ length: len }, () => (rng.chance(0.5) ? 1 : -1) as 1 | -1);
  const product = signs.reduce<number>((p, s) => p * s, 1);
  const names = NAMES.slice(0, len + 1);
  const gap = 230 / len;
  const pos: P2[] = names.map((_, i) => [115 - i * gap, i % 2 ? 22 : -10]);
  const prims: Prim[] = [];
  for (let i = 0; i < len; i++) prims.push(...signedArrow(pos[i], pos[i + 1], signs[i]));
  // a side branch that does not lead to the target, to test path discipline
  if (level > 1) {
    const from = pos[1];
    const side: P2 = [from[0] - 12, from[1] + 52];
    prims.push(...signedArrow(from, side, rng.chance(0.5) ? 1 : -1), ...node(side, 'ז'));
  }
  names.forEach((nm, i) => prims.push(...node(pos[i], nm, i === 0 || i === len)));
  prims.push(...legend(level > 1 ? 98 : 60));
  const target = names[len];
  const up = `${target} יעלה`;
  const down = `${target} ירד`;
  const negatives = signs.filter((s) => s < 0).length;
  return {
    dim: '2D',
    prompt: `החצים מראים מי משפיע על מי. אם א עולה, מה יקרה ל${target}?`,
    stimulus: { kind: 'scene', box: [-140, -40, 280, level > 1 ? 148 : 110], prims, label: 'שרשרת השפעות' },
    options: [
      { visual: text(product > 0 ? up : down), correct: true, why: `בדרך מא ל${target} יש ${negatives} קשתות שליליות. ${negatives % 2 === 0 ? 'מספר זוגי: אותו כיוון.' : 'מספר אי-זוגי: כיוון הפוך.'}` },
      { visual: text(product > 0 ? down : up), correct: false, errorType: 'transformation', why: 'מינוס אחד בדרך נשכח או נספר פעמיים. ספרי שוב רק את הקשתות שבנתיב.' },
      { visual: text(`${target} לא ישתנה`), correct: false, errorType: 'encoding', why: `יש נתיב רציף מא ל${target}, ולכן השינוי מגיע.` },
      level > 1
        ? { visual: text('תלוי בענף הצדדי'), correct: false, errorType: 'wrong_rule', why: `הענף לז אינו מוביל ל${target}. רק הנתיב בין השניים קובע.` }
        : { visual: text('תלוי רק בקשת האחרונה'), correct: false, errorType: 'wrong_rule', why: 'כל הקשתות בנתיב קובעות יחד, לא רק האחרונה.' },
    ],
    explanation: 'הכפילי את הסימנים לאורך הנתיב: כל מינוס הופך כיוון. התעלמי מענפים שלא מגיעים ליעד. במערכת אמיתית יש גם עיכובים: ההשפעה מגיעה, אבל לא מיד.',
  };
}
