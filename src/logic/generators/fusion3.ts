// Fusion drills, batch 3 (fusions 21-30 in FUSIONS key order). Three are generated and checked by computation
// (spacing, weight, motif); the rest draw on curated banks in content/fusionDrills.ts.
import { CENTURY, MOTIVES, PHRASES, PURPOSE, RULES, SELFSIZE, UNDER } from '../../content/fusionDrills';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec } from '../types';
import type { Draft } from './index';
import { choice } from './social';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ================= emotional+systems: where the system needs a breath ================= */

const MORNING = ['השכמה', 'מקלחת', 'ארוחת בוקר', 'הלבשת הילדים', 'הכנת תיקים', 'יציאה מהבית', 'הסעה לגן', 'נסיעה לעבודה'];

export function fxSpacing(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 5 : level === 2 ? 6 : 7;
  for (;;) {
    const steps = MORNING.slice(0, n);
    // each step has a planned start and a real duration; the slack before the next step is start(next) - end(this)
    let t = 6 * 60 + 30;
    const rows = steps.map((s) => {
      const start = t;
      const planned = rng.pick([10, 15, 20]);
      t += planned;
      return { s, start, dur: planned + rng.int(-3, 4) };
    });
    const slack = rows.slice(0, -1).map((r, i) => rows[i + 1].start - (r.start + r.dur));
    const sorted = slack.slice().sort((a, b) => a - b);
    // one clear choke point: the tightest gap is negative and clearly worse than the next
    if (sorted[0] > -4 || sorted[1] - sorted[0] < (level === 3 ? 2 : 4)) continue;
    const at = slack.indexOf(sorted[0]);
    const longest = rows.reduce((a, b) => (b.dur > a.dur ? b : a));
    const after = (i: number) => `בין "${rows[i].s}" ל"${rows[i + 1].s}"`;
    const options: Option[] = [{ visual: text(after(at)), correct: true, why: `כאן "${rows[at].s}" נמשך יותר מהזמן שתוכנן לו, והלחץ מתגלגל לכל מה שאחריו.` }];
    options.push({ visual: text('לפני הכול: להשכים חמש דקות קודם'), correct: false, errorType: 'wrong_rule', why: 'מרווח בהתחלה נבלע עד שמגיעים לנקודת הדחיסה. מכניסים אותו במקום שבו הלחץ נוצר.' });
    const longIdx = rows.indexOf(longest);
    const second = slack.indexOf(sorted[1]);
    const alt = longIdx < n - 1 && longIdx !== at ? longIdx : second;
    options.push({ visual: text(after(alt)), correct: false, errorType: alt === longIdx ? 'transformation' : 'encoding', why: alt === longIdx ? 'זה הצעד הארוך, אבל הוא בתוך הזמן שתוכנן לו. הדחיסה במקום אחר.' : 'יש כאן מעט לחץ, אבל פחות מאשר בנקודה אחרת.' });
    const rest = [0, 1, 2, 3, 4].filter((i) => i < n - 1 && i !== at && i !== alt);
    const r = rng.pick(rest);
    options.push({ visual: text(after(r)), correct: false, errorType: 'encoding', why: 'בין שני הצעדים האלה יש מרווח מספיק.' });
    return {
      dim: '2D',
      prompt: 'בוקר של משפחה: מתי מתוכנן כל צעד, וכמה זמן הוא נמשך באמת. איפה להכניס חמש דקות קבועות של מרווח?',
      stimulus: { kind: 'verbal', mode: 'table', words: ['צעד|מתוכנן|נמשך בפועל', ...rows.map((x) => `${x.s}|${hhmm(x.start)}|${x.dur} דק'`)] },
      options,
      explanation: 'לכל צעד בודקים: מתי הוא מסתיים בפועל, ומתי מתחיל הבא. המקום שבו הצעד גולש הכי הרבה אל הבא הוא נקודת הדחיסה; שם המרווח עוצר את הגלגול.',
    };
  }
}

/* ================= existential+interpersonal: the question under the request ================= */

export const fxUnder = (rng: Rng, level: Level) =>
  choice(rng, level, UNDER, 'מה השאלה שמתחת לבקשה?', 'חזרי על הבקשה במילים של האדם, ושאלי מה הכי מדאיג אותו בה. התשובה השנייה היא השאלה שצריך לענות עליה קודם.');

/* ================= existential+intrapersonal: sizing the self ================= */

const SIZE_TEXT = {
  shrink: 'להקטין את עצמי: זו טעות אחת בתוך עולם גדול, ומה הצעד הבא',
  grow: 'להגדיל את עצמי: אני האדם שצריך לקחת את זה עכשיו',
  shrinkOver: 'להקטין את עצמי עד הסוף: מי אני בכלל שאנסה',
  growOver: 'להגדיל את עצמי: הכול תלוי בי, ואם לא אצליח הכול יקרוס',
  ignore: 'להתעלם ולהמשיך כרגיל, כאילו לא קרה כלום',
};

export function fxSelfSize(rng: Rng, _level: Level): Draft {
  const s = rng.pick(SELFSIZE);
  const opp = s.dir === 'shrink' ? 'grow' : 'shrink';
  const over = s.dir === 'shrink' ? 'shrinkOver' : 'growOver';
  return {
    dim: '2D',
    prompt: 'באיזה גודל כדאי להיות ברגע הזה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [s.text] },
    options: [
      { visual: text(SIZE_TEXT[s.dir]), correct: true, why: s.why },
      { visual: text(SIZE_TEXT[opp]), correct: false, errorType: 'wrong_rule', why: s.dir === 'shrink' ? 'מול כישלון, להגדיל את העצמי מגדיל את הכאב.' : 'מול אחריות, להקטין את העצמי פירושו לוותר על התפקיד.' },
      { visual: text(SIZE_TEXT[over]), correct: false, errorType: 'transformation', why: 'הכיוון נכון, אבל המינון קיצוני. כיול הוא גודל מדויק, לא קצה.' },
      { visual: text(SIZE_TEXT.ignore), correct: false, errorType: 'encoding', why: 'התעלמות לא משנה את הגודל. היא משאירה את העצמי במקום הלא נכון.' },
    ],
    explanation: 'כישלון מבקש עצמי קטן: להעמיד את הטעות ביחס לעולם, ולהמשיך. אחריות מבקשת עצמי גדול: לקחת את המקום. השאלה היא באיזה גודל צריך להיות כדי לעשות את הצעד הבא.',
  };
}

/* ================= existential+kinesthetic: the weight of a commitment ================= */

const LOADS: { label: (n: number) => string; perYear: (n: number) => number; range: [number, number] }[] = [
  { label: (n) => `חוג ערב: ${n} שעות בשבוע`, perYear: (n) => n * 52, range: [2, 4] },
  { label: (n) => `נסיעה לעבודה: ${n} דקות כל יום עבודה, בכל כיוון`, perYear: (n) => Math.round((n * 2 * 220) / 60), range: [20, 45] },
  { label: (n) => `ועד הבית: ${n} שעות בחודש`, perYear: (n) => n * 12, range: [3, 10] },
  { label: (n) => `שיפוץ המטבח: ${n} סופי שבוע מלאים, פעם אחת`, perYear: (n) => n * 16, range: [2, 6] },
  { label: (n) => `טלפון לאמא: ${n} דקות כל ערב`, perYear: (n) => Math.round((n * 365) / 60), range: [10, 30] },
  { label: (n) => `התנדבות: יום אחד מלא כל ${n} שבועות`, perYear: (n) => Math.round((52 / n) * 8), range: [2, 6] },
];

export function fxWeight(rng: Rng, level: Level): Draft {
  for (;;) {
    const picks = rng.shuffle(LOADS).slice(0, 4).map((l) => {
      const n = rng.int(l.range[0], l.range[1]);
      return { l, n, hours: l.perYear(n) };
    });
    const byHours = picks.slice().sort((a, b) => b.hours - a.hours);
    if (byHours[0].hours < byHours[1].hours * (level === 3 ? 1.15 : 1.35)) continue;
    return {
      dim: '2D',
      prompt: 'ארבע התחייבויות. איזו מהן הכי כבדה לסחוב לאורך שנה, בשעות?',
      stimulus: { kind: 'verbal', mode: 'sentences', words: picks.map((p) => p.l.label(p.n)) },
      options: picks.map<Option>((p, i) =>
        p === byHours[0]
          ? { visual: text(p.l.label(p.n)), correct: true, why: `בשנה זה כ-${p.hours} שעות, יותר מכל האחרות.` }
          : {
              visual: text(p.l.label(p.n)),
              correct: false,
              errorType: p === byHours[1] ? 'encoding' : i % 2 ? 'transformation' : 'wrong_rule',
              why: `בשנה זה כ-${p.hours} שעות.`,
            },
      ),
      explanation: 'משקל של התחייבות נמדד במה שסוחבים לאורך זמן, לא בגודל של פעם אחת. מתרגמים הכול לשעות בשנה, ואז שואלים אם המשמעות שווה את המשקל.',
    };
  }
}

/* ================= existential+linguistic: the world inside a phrase ================= */

export const fxPhrase = (rng: Rng, level: Level) =>
  choice(rng, level, PHRASES, 'איזו תפיסת עולם מסתתרת בביטוי?', 'מסמנים את הפועל ושואלים: איזה עולם הוא מניח? "להרוג", "לנצח", "למכור" ו"להשקיע" מביאים איתם עולם שלם.');

/* ================= existential+logical: archaeology of rules ================= */

export function fxRule(rng: Rng, level: Level): Draft {
  const r = rng.pick(RULES);
  const label = (i: number) => `למה ${i + 1}`;
  return {
    dim: '2D',
    prompt: `הכלל: "${r.rule}" שואלים "למה?" שוב ושוב. באיזו שכבה העובדה שהצדיקה את הכלל כבר לא נכונה היום?`,
    stimulus: { kind: 'verbal', mode: 'sentences', words: r.whys.map((w, i) => `${label(i)}: ${w}`) },
    options: r.whys.map<Option>((w, i) =>
      i === r.broken
        ? { visual: text(label(i), level === 1 ? w : undefined), correct: true, why: r.why }
        : {
            visual: text(label(i), level === 1 ? w : undefined),
            correct: false,
            errorType: i === 0 ? 'wrong_rule' : i < r.broken ? 'encoding' : 'transformation',
            why: i === 0 ? 'זו התכלית המוצהרת. היא עדיין נשמעת סבירה, ולכן לא שם מחפשים.' : i < r.broken ? 'השכבה הזו עדיין נשענת על השכבה שמתחתיה. החפירה צריכה להמשיך.' : 'החפירה הלכה עמוק מדי. השבר נמצא בשכבה קודמת.',
          },
    ),
    explanation: 'כלל הוא שכבות של "למה". בכל שכבה שואלים אם התשובה עדיין נכונה היום. השכבה הראשונה שכבר לא נכונה היא המקום שבו הכלל איבד את הבסיס שלו.',
  };
}

/* ================= existential+musical: the motif across stories ================= */

const ACTS = ['עבר לעיר חדשה', 'לימד אחרים', 'בנה משהו בידיים', 'עזב עבודה בטוחה', 'טיפל במישהו חולה', 'פתח עסק', 'כתב מכתבים', 'הקים קבוצה', 'נסע רחוק', 'למד מקצוע חדש', 'שיחק כדורגל', 'ניהל תקציב'];

export function fxMotif(rng: Rng, level: Level): Draft {
  const per = level === 1 ? 3 : level === 2 ? 4 : 5;
  for (;;) {
    const pool = rng.shuffle(ACTS);
    const motif = pool[0];
    const twice = pool[1];
    const rest = pool.slice(2);
    const a = rng.shuffle([motif, twice, ...rest.slice(0, per - 2)]);
    const b = rng.shuffle([motif, twice, ...rest.slice(per - 2, 2 * per - 4)]);
    const c = rng.shuffle([motif, ...rest.slice(2 * per - 4, 3 * per - 5)]);
    if (new Set([...a, ...b, ...c]).size !== [...a, ...b, ...c].length - 3) continue;
    // the first action of the first story is salient but not shared (the tempting answer)
    const first = a.find((x) => x !== motif && x !== twice);
    const once = c.find((x) => x !== motif);
    if (!first || !once) continue;
    const story = (i: number, xs: string[]) => `סיפור ${i}: ${xs.join(', ')}.`;
    return {
      dim: '2D',
      prompt: 'שלושה סיפורים של אדם אחד, מתקופות שונות בחייו. מה המוטיב שחוזר בכולם?',
      stimulus: { kind: 'verbal', mode: 'sentences', words: [story(1, a), story(2, b), story(3, c)] },
      options: [
        { visual: text(motif), correct: true, why: 'הפעולה הזו מופיעה בכל שלושת הסיפורים. זה המוטיב שאפשר להחזיר לו.' },
        { visual: text(twice), correct: false, errorType: 'wrong_rule', why: 'חוזר בשני סיפורים, אבל לא בשלישי. מוטיב עובר דרך כולם.' },
        { visual: text(first), correct: false, errorType: 'transformation', why: 'זה בולט בסיפור הראשון, אבל לא חוזר.' },
        { visual: text(once), correct: false, errorType: 'encoding', why: 'מופיע רק בסיפור אחד.' },
      ],
      explanation: 'מקשיבים לפעולה, לא לנושא. מה שחוזר בכל התקופות הוא המוטיב, ואותו מחזירים לאדם במשפט אחד כתשובה לשאלה מה היה הטעם.',
    };
  }
}

/* ================= existential+naturalist: telling motives apart ================= */

export const fxMotive = (rng: Rng, level: Level) =>
  choice(rng, level, MOTIVES, 'מה מניע את האדם, לפי הסימן ההתנהגותי?', 'מניעים נשמעים דומים. מחפשים פרט התנהגותי אחד שמבחין ביניהם, ולפיו משבצים את האדם במקום שבו ישגשג.');

/* ================= existential+spatial: the eye of a hundred years ================= */

export function fxCentury(rng: Rng, _level: Level): Draft {
  const c = rng.pick(CENTURY);
  return {
    dim: '2D',
    prompt: 'מה כדאי להתחיל כבר השנה, בשביל מי שישתמש במקום בעוד חמישים שנה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [c.text] },
    options: [
      { visual: text(c.right), correct: true, why: 'צעד קטן שאפשר להתחיל היום, ושגדל עם הזמן לצורך של הדור הבא.' },
      { visual: text(c.trend), correct: false, errorType: 'wrong_rule', why: 'זה עונה לאופנה של היום. בעוד חמישים שנה זה כבר יוחלף.' },
      { visual: text(c.grand), correct: false, errorType: 'transformation', why: 'הכיוון לטווח ארוך, אבל זה לא צעד שאפשר להתחיל בו היום.' },
      { visual: text(c.off), correct: false, errorType: 'encoding', why: 'זה לא קשור למה שהאדם בעתיד יצטרך.' },
    ],
    explanation: 'מדמיינים אדם אחד במקום בעוד חמישים שנה, ושואלים מה הוא יצטרך. בוחרים צעד שאפשר להתחיל היום ושהזמן עובד לטובתו: עצים, מרווחים, רצועות פתוחות.',
  };
}

/* ================= existential+systems: the purpose read from the output ================= */

export const fxPurpose = (rng: Rng, level: Level) =>
  choice(rng, level, PURPOSE, 'מה התכלית האמיתית של המערכת, לפי מה שהיא מייצרת בפועל?', 'מתעלמים מהמטרה המוצהרת ורושמים מה המערכת מייצרת בפועל. זו התכלית שלה. אחר כך בוחרים אם רוצים אותה.');
