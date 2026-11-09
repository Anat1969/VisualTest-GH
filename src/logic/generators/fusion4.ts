// Fusion drills, batch 4 (fusions 31-40 in FUSIONS key order). Four are generated and checked by computation
// (tempo, keystone, assumption, agentless); the rest draw on curated banks in content/fusionDrills.ts.
import { ACTIVE, AGENTLESS, ASSUMPTIONS, GAMING, HANDS, LOADED, SECOND_CHAIR, SOURCE, TICS } from '../../content/fusionDrills';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec } from '../types';
import type { Draft } from './index';
import { choice } from './social';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ================= interpersonal+intrapersonal: whose feeling is this ================= */

export const fxSource = (rng: Rng, level: Level) =>
  choice(rng, level, SOURCE, 'הרגש הזה שלך, או שקלטת אותו מהחדר?', 'שאלי בשקט: האם הרגשתי ככה לפני השיחה? אם לא, הרגש הוא כנראה מידע על הצד השני, ואפשר לנסח לו אותו במשפט אחד.');

/* ================= interpersonal+kinesthetic: the listening hand ================= */

export const fxHands = (rng: Rng, level: Level) =>
  choice(rng, level, HANDS, 'מה הידיים מסגירות על מצב הרוח?', 'מסתכלים על קצב, כוח והיסוס, לא על המילים. תנועה חזקה ורועשת היא לחץ שיוצא; עצירות ומחיקות הן היסוס; רעד הוא עוררות.');

/* ================= interpersonal+linguistic: the loaded word ================= */

export function fxLoaded(rng: Rng, _level: Level): Draft {
  const l = rng.pick(LOADED);
  return {
    dim: '2D',
    prompt: 'אחרי המשפט הזה הצד השני הזיז את הכיסא והשפיל מבט. באיזו מילה השיחה נתקעה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [l.line] },
    options: [
      { visual: text(l.loaded), correct: true, why: `${l.why} במקומה: "${l.swap}".` },
      ...l.others.slice(0, 3).map<Option>((w, i) => ({
        visual: text(w),
        correct: false,
        errorType: i === 0 ? 'wrong_rule' : 'encoding',
        why: i === 0 ? 'זה נושא השיחה. הנושא קשה, אבל לא הוא סגר אותה.' : 'מילה נייטרלית. היא לא מאשימה ולא מכלילה.',
      })),
    ],
    explanation: 'מחפשים את המילה ששופטת, מכלילה או מקטינה: "שוב", "תמיד", "פשוט", "ברור". מחליפים אותה במילה שמתארת את המקרה הזה בלבד.',
  };
}

/* ================= interpersonal+logical: the unchecked assumption ================= */

export function fxAssumption(rng: Rng, _level: Level): Draft {
  const a = rng.pick(ASSUMPTIONS);
  const order = rng.shuffle(a.items.map((_, i) => i));
  const rows = ['הנחה|מי אמר|נבדקה לאחרונה', ...order.map((i) => `${a.items[i].text}|${a.items[i].by}|${a.items[i].checked}`)];
  return {
    dim: '2D',
    prompt: `ההחלטה: ${a.decision} על איזו הנחה היא נשענת בלי שאיש בדק אותה?`,
    stimulus: { kind: 'verbal', mode: 'table', words: rows },
    options: order.map<Option>((i) =>
      i === a.unchecked
        ? { visual: text(a.items[i].text), correct: true, why: `${a.items[i].by} אמר את זה, ואיש לא בדק מאז. ההחלטה כולה נשענת על משהו שלא נבדק.` }
        : {
            visual: text(a.items[i].text),
            correct: false,
            errorType: a.items[i].checked.includes('חודש') ? 'wrong_rule' : 'encoding',
            why: `ההנחה הזו נבדקה ${a.items[i].checked}.`,
          },
    ),
    explanation: 'לכל הנחה רושמים מי אמר אותה ומתי נבדקה. ההנחה המסוכנת היא זו שכולם מניחים ואיש לא בדק, כמו האדם השקט בחדר.',
  };
}

/* ================= interpersonal+musical: the half-beat delay ================= */

export function fxTempo(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 5 : 6;
  for (;;) {
    const base = rng.int(15, 30) / 10; // seconds
    const spread = level === 3 ? 0.3 : 0.2;
    const times = Array.from({ length: n }, () => Math.round((base + (rng.next() * 2 - 1) * spread) * 10) / 10);
    const at = rng.int(1, n - 1);
    const delay = level === 1 ? rng.int(15, 25) / 10 : level === 2 ? rng.int(9, 13) / 10 : rng.int(6, 8) / 10;
    times[at] = Math.round((base + delay) * 10) / 10;
    const rest = times.filter((_, i) => i !== at);
    if (times[at] - Math.max(...rest) < 0.4) continue;
    const longestOther = rest.indexOf(Math.max(...rest));
    const otherIdx = times.findIndex((t, i) => i !== at && t === rest[longestOther]);
    const topics = ['איך היה היום', 'מה תרצי לאכול', 'מתי נצא', 'איך בעבודה', 'מה עם אבא', 'מה התוכניות לשבת'];
    const rows = ['שאלה|זמן עד התשובה', ...times.map((t, i) => `${topics[i]}|${t.toFixed(1)} שנ'`)];
    const third = rng.pick(times.map((_, i) => i).filter((i) => i !== at && i !== otherIdx));
    const options: Option[] = [
      { visual: text(topics[at]), correct: true, why: `${times[at].toFixed(1)} שניות, כשהקצב הרגיל שלה סביב ${base.toFixed(1)}. זו ההשהיה ששווה שאלה.` },
      { visual: text(topics[otherIdx]), correct: false, errorType: 'encoding', why: 'זה בטווח הרגיל שלה. תנודה קטנה כזו קורית גם בשאלות אחרות.' },
      { visual: text('אין סטייה, הקצב קבוע'), correct: false, errorType: 'wrong_rule', why: 'יש תשובה אחת שמאחרת בבירור מהקצב שלה.' },
    ];
    options.push({ visual: text(topics[third]), correct: false, errorType: 'transformation', why: 'בקצב הרגיל שלה. אין כאן השהיה.' });
    return {
      dim: '2D',
      prompt: 'כמה זמן עבר בין כל שאלה שלך לתשובה של אמך. באיזו שאלה היא איחרה בחצי פעימה?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options,
      explanation: 'אחרי שלוש שאלות מכירים את הקצב של אדם. סטייה ממנו, ולא מהקצב שלך, היא הסימן. השהיה פתאומית שווה שאלה עדינה.',
    };
  }
}

/* ================= interpersonal+naturalist: the keystone person ================= */

const MEMBERS = ['רונית', 'אבי', 'דנה', 'יוסי', 'מיכל'];

export function fxKeystone(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 6 : 8;
  for (;;) {
    const key = rng.int(0, MEMBERS.length - 1);
    const absent = Array.from({ length: n }, () => rng.int(0, MEMBERS.length - 1));
    const broke = absent.map((a) => a === key);
    const keyCount = broke.filter(Boolean).length;
    if (keyCount < 2 || keyCount > n - 2) continue;
    // another member also absent on several days, but without breakdowns
    const counts = MEMBERS.map((_, m) => absent.filter((a) => a === m).length);
    const decoy = counts.map((c, m) => (m === key ? -1 : c)).indexOf(Math.max(...counts.map((c, m) => (m === key ? -1 : c))));
    if (counts[decoy] < 2) continue;
    const loud = rng.pick(MEMBERS.map((_, m) => m).filter((m) => m !== key && m !== decoy));
    const rows = ['שבוע|מי חסר|איך הלך', ...absent.map((a, i) => `${i + 1}|${MEMBERS[a]}|${broke[i] ? 'הכול השתבש' : 'רגיל'}`)];
    return {
      dim: '2D',
      prompt: 'יומן של צוות: מי חסר בכל שבוע, ואיך הלך. מי האדם השקט שמחזיק את הקשרים?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options: [
        { visual: text(MEMBERS[key]), correct: true, why: `בכל שבוע ש${MEMBERS[key]} חסר הכול השתבש, ובשבועות האחרים לא. זה מין המפתח של הצוות.` },
        { visual: text(MEMBERS[decoy]), correct: false, errorType: 'wrong_rule', why: `${MEMBERS[decoy]} חסר הכי הרבה פעמים, אבל הצוות הסתדר בלעדיו.` },
        { visual: text(MEMBERS[loud]), correct: false, errorType: 'encoding', why: 'ההיעדרות שלו לא קשורה לשבועות שבהם הכול השתבש.' },
        { visual: text('אף אחד, זה מקרי'), correct: false, errorType: 'transformation', why: 'הקשר מלא: כל שיבוש היה בשבוע של היעדרות אחת מסוימת.' },
      ],
      explanation: 'מין מפתח מזהים לפי מה שקורה כשהוא חסר, לא לפי כמה הוא בולט. מחפשים את ההיעדרות שתמיד מביאה שיבוש.',
    };
  }
}

/* ================= interpersonal+spatial: the second chair ================= */

export const fxChair = (rng: Rng, level: Level) =>
  choice(rng, level, SECOND_CHAIR, 'מה רואה האדם שיושב מולך, ואת לא?', 'לפני שמתיישבים, עומדים רגע מאחורי הכיסא של הצד השני: אור, גובה, מסך ושעון משנים את מה שהוא מצליח לראות ולומר.');

/* ================= interpersonal+systems: how people will game it ================= */

export const fxGaming = (rng: Rng, level: Level) =>
  choice(rng, level, GAMING, 'מה הדרך הקלה ביותר לעמוד ביעד בלי לעשות את מה שרצית?', 'לכל יעד שואלים: מה הדרך הקלה לסמן וי? אנשים בוחרים בדרך הקלה. מתקנים את המדד לפני שהוא יוצא לשטח.');

/* ================= intrapersonal+kinesthetic: the small repeated movement ================= */

export const fxTic = (rng: Rng, level: Level) =>
  choice(rng, level, TICS, 'ממה התנועה הקטנה הזו מרחיקה אותך?', 'שמים לב מתי התנועה מופיעה, לא רק מה היא. תנועה שמופיעה דווקא לפני משימה אחת היא הימנעות ממנה.');

/* ================= intrapersonal+linguistic: the sentence with no actor ================= */

export function fxAgentless(rng: Rng, level: Level): Draft {
  const hidden = rng.pick(AGENTLESS);
  // level 3 uses active sentences whose subject is not "I", which look impersonal but still name who acted
  const pool = level === 3 ? ACTIVE.filter((s) => !s.startsWith('אני') && !/^(טעיתי|שכחתי|שלחתי|לא הגשתי)/.test(s)) : ACTIVE;
  const others = rng.shuffle(pool).slice(0, 3);
  const all = rng.shuffle([hidden, ...others]);
  return {
    dim: '2D',
    prompt: 'שורות ממיילים שכתבת השבוע. באיזו מהן אין מי שעושה את הפעולה?',
    stimulus: { kind: 'verbal', mode: 'sentences', words: all },
    options: all.map<Option>((s) =>
      s === hidden
        ? { visual: text(s), correct: true, why: 'אין כאן מי שעשה. בדקי מי עשה את זה באמת, ואם זו את, נסי לכתוב בגוף ראשון.' }
        : {
            visual: text(s),
            correct: false,
            errorType: /^(החלטנו|הצוות|המנהלת)/.test(s) ? 'wrong_rule' : 'encoding',
            why: /^(החלטנו|הצוות|המנהלת)/.test(s) ? 'יש כאן מי שעושה: קבוצה או אדם אחר. זה לא משפט בלי עושה.' : 'כתוב כאן מי עשה את הפעולה.',
          },
    ),
    explanation: 'משפט סביל בלי עושה ("הוחלט", "נעשו טעויות") מסתיר מי אחראי. כשהוא מופיע אצלך, הוא רמז למה שקשה לך לקחת על עצמך.',
  };
}
