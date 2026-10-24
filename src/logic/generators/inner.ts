// Existential and emotional drills.
import { CONCEPTS, INTENSITY, PREMISES, REGULATION, SIGNALS, VALUES } from '../../content/extensions';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec } from '../types';
import type { Draft } from './index';
import { choice } from './social';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ---------- existential ---------- */

export const values = (rng: Rng, level: Level) =>
  choice(rng, level, VALUES, 'איזה ערך מנחה את ההחלטה?', 'שאלי מה האדם מוכן לשלם בשבילו. ערך נחשף במחיר: במה ויתרו, ובשם מה.');

export const premise = (rng: Rng, level: Level) =>
  choice(
    rng,
    level,
    PREMISES,
    'על איזו הנחה סמויה נשען הטיעון?',
    'הנחה סמויה היא המשפט שחסר בין הנתון למסקנה. נסי להשלים: "X, ו____, לכן Y". מה שממלא את החסר הוא ההנחה.',
  );

export const concept = (rng: Rng, level: Level) =>
  choice(rng, level, CONCEPTS, 'איזה מושג מתאר את זה בדיוק?', 'מושגים קרובים נבדלים בשאלה אחת: האם אפשר לסמן שהושג? האם זה עומד במחיר? האם זה תלוי בנעימות?');

/* ---------- emotional: intensity scale ---------- */

export function intensity(rng: Rng, level: Level): Draft {
  const fam = rng.pick(INTENSITY);
  // level 1: a wide gap around the answer; level 3: the middle of the scale, where words are closest
  const i = level === 1 ? rng.pick([0, 2]) : level === 2 ? rng.pick([0, 1, 2]) : 1;
  const [a, b, c] = fam.words.slice(i, i + 3);
  const outside = fam.words.filter((_, k) => k < i || k > i + 2);
  const other = rng.pick(INTENSITY.filter((f) => f !== fam));
  const strongerOut = fam.words.slice(i + 3);
  const options: Option[] = [
    { visual: text(b), correct: true, why: `${b} חזקה מ${a} וחלשה מ${c}.` },
    ...outside.map<Option>((w) => ({
      visual: text(w),
      correct: false,
      errorType: strongerOut.includes(w) ? 'transformation' : 'encoding',
      why: strongerOut.includes(w) ? `${w} חזקה יותר גם מ${c}.` : `${w} חלשה יותר גם מ${a}.`,
    })),
    { visual: text(other.words[i + 1]), correct: false, errorType: 'wrong_rule', why: `${other.words[i + 1]} שייכת למשפחה אחרת (${other.family}). העוצמה דומה, הרגש אחר.` },
  ];
  return {
    dim: '2D',
    prompt: `סולם של ${fam.family}, מהחלש לחזק. איזו מילה חסרה באמצע?`,
    stimulus: { kind: 'verbal', mode: 'gap', words: [a, '?', c] },
    options,
    explanation: `הסולם: ${fam.words.join(', ')}. שם מדויק לעוצמה עוזר לבחור תגובה מתאימה: לרוגז ולזעם יש דרכי טיפול שונות.`,
  };
}

export const regulation = (rng: Rng, level: Level) =>
  choice(rng, level, REGULATION, 'מה הדרך המתאימה ביותר להתמודד עכשיו?', 'התאימי את הדרך למצב: עוררות גבוהה דורשת גוף (נשימה), כעס דורש הפסקה לפני פעולה, אובדן דורש קבלה לפני תכנון.');

export const signal = (rng: Rng, level: Level) =>
  choice(rng, level, SIGNALS, 'מה הרגש מסמן, ואיזו פעולה הוא מציע?', 'פחד מסמן אי-ודאות, כעס גבול שנחצה, עצב אובדן, אשמה מעשה שצריך תיקון, קנאה רצון. הפעולה עונה לסימן, לא לרגש.');
