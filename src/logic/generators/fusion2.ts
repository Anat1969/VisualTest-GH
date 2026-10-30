// Fusion drills, batch 2 (fusions 11-20 in FUSIONS key order). Three are generated and checked by computation
// (branch, forecast, proportion); the rest draw on curated banks in content/fusionDrills.ts.
import {
  AROUSAL,
  BENEATH,
  BRANCH_PARTS,
  BRANCH_PLANS,
  CARRIERS,
  DOSES,
  MODULATE,
  RECOVERY,
  SEATING,
  STAGE_HELP,
  STAGE_LABEL,
  type Stage,
} from '../../content/fusionDrills';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec } from '../types';
import type { Draft } from './index';
import { choice } from './social';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ================= digital+systems: is the change run as a branch? ================= */

export function fxBranch(rng: Rng, level: Level): Draft {
  const plan = rng.pick(BRANCH_PLANS);
  const missing = rng.int(0, 3);
  const shown = [0, 1, 2, 3].filter((i) => i !== missing);
  // level 1 labels each line with its part; higher levels show the lines unlabeled and shuffled
  const lines = (level === 1 ? shown : rng.shuffle(shown)).map((i) => (level === 1 ? `${BRANCH_PARTS[i]}: ${plan.parts[i]}` : plan.parts[i]));
  return {
    dim: '2D',
    prompt: `השינוי: ${plan.title}. מה חסר בתוכנית כדי להריץ אותו כענף ניסיוני?`,
    stimulus: { kind: 'verbal', mode: 'sentences', words: lines },
    options: [
      { visual: text(BRANCH_PARTS[missing]), correct: true, why: `התוכנית לא אומרת ${BRANCH_PARTS[missing]}. בלי זה אין ענף, יש שינוי שקשה לבדוק או להחזיר.` },
      ...rng.shuffle(shown).slice(0, 2).map<Option>((i) => ({ visual: text(BRANCH_PARTS[i]), correct: false, errorType: 'encoding', why: `זה כתוב בתוכנית: "${plan.parts[i]}"` })),
      { visual: text('שום דבר, אפשר להתחיל'), correct: false, errorType: 'wrong_rule', why: 'ענף צריך ארבעה חלקים: מה משתנה, מה נמדד, מתי חוזרים ומה ייחשב הצלחה. אחד מהם חסר.' },
    ],
    explanation: 'שינוי בארגון או בבית מורץ כמו ענף בקוד: מגדירים מה משתנה, מה מודדים, נקודת חזרה, ותנאי מיזוג שנקבע מראש. מה שחסר הוא בדרך כלל מה שיפוצץ את השיחה בסוף.',
  };
}

/* ================= emotional+existential: the value under the reaction ================= */

export const fxValue = (rng: Rng, level: Level) =>
  choice(
    rng,
    level,
    BENEATH,
    'התגובה גדולה מהאירוע. איזה ערך עמוק נפגע כאן?',
    'כשהרגש חזק מהאירוע, שאלי מה האירוע מסמל. מגינים על הערך שנפגע, לא מרגיעים את הרגש.',
  );

/* ================= emotional+interpersonal: who carries the feeling for the group ================= */

export function fxCarrier(rng: Rng, _level: Level): Draft {
  const c = rng.pick(CARRIERS);
  return {
    dim: '2D',
    prompt: 'מה הצעד הנכון של מי שמנחה את השיחה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [c.text] },
    options: [
      { visual: text(c.answer), correct: true, why: c.why },
      { visual: text(c.silence), correct: false, errorType: 'wrong_rule', why: 'השתקת הנושא לא מטפלת ברגש. הרגש יעבור לנושא אחר בקבוצה.' },
      { visual: text(c.private), correct: false, errorType: 'transformation', why: 'זה מטפל באדם אחד, אבל הרגש שייך לכולם. בחדר הוא נשאר בלי מענה.' },
      { visual: text(c.agenda), correct: false, errorType: 'encoding', why: 'זה מתעלם מהרגש שבחדר. הוא יחזור בהזדמנות הבאה, חזק יותר.' },
    ],
    explanation: 'כשאדם אחד מבטא רגש וכולם שותקים, בדקי אם הוא נושא אותו בשביל כולם. משפט בלשון רבים מחזיר את הרגש לקבוצה ומוריד את המשקל מהנושא.',
  };
}

/* ================= emotional+intrapersonal: forecasting one's own weather ================= */

const TIMES = ['בוקר', 'צהריים', 'ערב'];
const PEOPLE = ['מנהלת', 'צוות', 'משפחה'];

export function fxForecast(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 6 : level === 2 ? 7 : 8;
  for (;;) {
    const t = rng.int(0, 2);
    const p = rng.int(0, 2);
    const log = Array.from({ length: n }, () => [rng.int(0, 2), rng.int(0, 2)] as const);
    const fired = log.map(([a, b]) => a === t && b === p);
    const pos = fired.filter(Boolean).length;
    // both parts must matter: the time alone and the person alone each appear on a day without the feeling
    const timeAlone = log.some(([a, b]) => a === t && b !== p);
    const personAlone = log.some(([a, b]) => a !== t && b === p);
    if (pos < 2 || pos > n - 3 || !timeAlone || !personAlone) continue;
    const otherT = rng.pick([0, 1, 2].filter((x) => x !== t));
    const rows = ['יום|שעה|עם מי|לחץ', ...log.map(([a, b], i) => `${i + 1}|${TIMES[a]}|${PEOPLE[b]}|${fired[i] ? 'כן' : '–'}`)];
    return {
      dim: '2D',
      prompt: 'יומן של שבועיים: מתי הופיע לחץ. מתי לא כדאי לקבוע את השיחה החשובה של השבוע הבא?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options: [
        { visual: text(`ב${TIMES[t]}, עם ה${PEOPLE[p]}`), correct: true, why: `הלחץ הופיע בכל פעם שהיו ${TIMES[t]} ו${PEOPLE[p]} יחד, ורק אז.` },
        { visual: text(`בכל ${TIMES[t]}`), correct: false, errorType: 'wrong_rule', why: `היו ימים של ${TIMES[t]} בלי לחץ. השעה לבד לא מספיקה.` },
        { visual: text(`בכל פגישה עם ה${PEOPLE[p]}`), correct: false, errorType: 'transformation', why: `היו פגישות עם ה${PEOPLE[p]} בלי לחץ. האדם לבד לא מספיק.` },
        { visual: text(`ב${TIMES[otherT]}, עם ה${PEOPLE[p]}`), correct: false, errorType: 'encoding', why: 'בצירוף הזה לא הופיע לחץ ביומן.' },
      ],
      explanation: 'חזאות עצמית מחפשת צירוף, לא גורם אחד: מתי וגם עם מי. כשהצירוף ידוע, קובעים החלטות חשובות מחוץ לחלון הסערה.',
    };
  }
}

/* ================= emotional+kinesthetic: channel the arousal into one movement ================= */

export function fxArousal(rng: Rng, _level: Level): Draft {
  const a = rng.pick(AROUSAL);
  return {
    dim: '2D',
    prompt: 'מה הכי עוזר ברגע הזה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [a.text] },
    options: [
      { visual: text(a.move), correct: true, why: 'תנועה אחת, מדויקת וחזקה, נותנת לעוררות כתובת. האנרגיה נשארת, אבל עובדת בשבילך.' },
      { visual: text('לנשום עמוק ולנסות להירגע לגמרי לפני שמתחילים'), correct: false, errorType: 'wrong_rule', why: 'ניסיון לכבות את העוררות דקה לפני רגע חשוב נכשל בדרך כלל ומעלה את הלחץ. מתעלים אותה, לא מכבים.' },
      { visual: text('לקפוץ, לנער את הידיים, להתמתח ולהסתובב, הכול יחד'), correct: false, errorType: 'transformation', why: 'הרבה תנועות מפוזרות מפזרות גם את הקשב. ההבדל הוא בתנועה אחת מדויקת.' },
      { visual: text('להסתכל בטלפון עד הרגע האחרון, כדי לא לחשוב על זה'), correct: false, errorType: 'encoding', why: 'הסחת דעת לא מטפלת בגוף. העוררות נשארת בלי כתובת.' },
    ],
    explanation: 'הלב הדופק הוא אותה עוררות של התרגשות. תנועה אחת, חזקה ומוגדרת (לחיצה, הידוק, הזדקפות) הופכת אותה לדריכות.',
  };
}

/* ================= emotional+linguistic: the dose of a hard message ================= */

export function fxDose(rng: Rng, _level: Level): Draft {
  const d = rng.pick(DOSES);
  return {
    dim: '2D',
    prompt: 'איזה ניסוח אומר את האמת ומשאיר את השומע עם כוח לפעול?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [d.text] },
    options: [
      { visual: text(d.right), correct: true, why: 'האמת נאמרת במלואה, ויחד איתה צעד ברור שהשומע יכול לעשות.' },
      { visual: text(d.crushing), correct: false, errorType: 'transformation', why: 'האמת שם, אבל במינון שמרסק. השומע יוצא בלי כוח לתקן.' },
      { visual: text(d.dishonest), correct: false, errorType: 'wrong_rule', why: 'זה מרכך על חשבון האמת. השומע יפעל לפי תמונה שגויה.' },
      { visual: text(d.vague), correct: false, errorType: 'encoding', why: 'זה לא אומר כלום. אין כאן אמת, וגם אין צעד.' },
    ],
    explanation: 'מינון לא מוותר על האמת. הוא מחליט כמה ממנה ובאיזה סדר: עובדה, מה עובד, וצעד אחד הבא.',
  };
}

/* ================= emotional+logical: proportion in lived units ================= */

const COSTS: { label: (n: number) => string; per: number; range: [number, number] }[] = [
  { label: (n) => `מנוי שלא ביטלת: ${n} ₪ לחודש`, per: 12, range: [30, 90] },
  { label: (n) => `קפה בדרך לעבודה: ${n} ₪ ליום עבודה`, per: 220, range: [12, 22] },
  { label: (n) => `קנס חניה: ${n} ₪, פעם אחת`, per: 1, range: [250, 1000] },
  { label: (n) => `עמלת בנק: ${n} ₪ לרבעון`, per: 4, range: [40, 120] },
  { label: (n) => `תיקון ברכב: ${n} ₪, פעם אחת`, per: 1, range: [600, 2400] },
  { label: (n) => `שליחויות אוכל: ${n} ₪ לשבוע`, per: 52, range: [60, 160] },
];

export function fxProportion(rng: Rng, level: Level): Draft {
  for (;;) {
    const picks = rng.shuffle(COSTS).slice(0, 4).map((c) => {
      const n = rng.int(c.range[0], c.range[1]);
      return { c, n, year: n * c.per };
    });
    const byYear = picks.slice().sort((a, b) => b.year - a.year);
    const byRaw = picks.slice().sort((a, b) => b.n - a.n);
    // the biggest number on the page must not be the biggest yearly cost; gaps keep the key unambiguous
    if (byRaw[0] === byYear[0] || byYear[0].year < byYear[1].year * (level === 3 ? 1.15 : 1.4)) continue;
    const fmt = (x: number) => x.toLocaleString('he-IL');
    return {
      dim: '2D',
      prompt: 'ארבעה דברים מעצבנים בכסף. על איזה מהם שווה להשקיע את מירב הכעס, כלומר: מה עולה לך הכי הרבה בשנה?',
      stimulus: { kind: 'verbal', mode: 'sentences', words: picks.map((p) => p.c.label(p.n)) },
      options: picks.map<Option>((p) =>
        p === byYear[0]
          ? { visual: text(p.c.label(p.n)), correct: true, why: `בשנה זה כ-${fmt(p.year)} ₪, יותר מכל האחרים.` }
          : {
              visual: text(p.c.label(p.n)),
              correct: false,
              errorType: p === byRaw[0] ? 'wrong_rule' : p === byYear[1] ? 'encoding' : 'transformation',
              why: p === byRaw[0] ? `זה המספר הגדול בדף, אבל בשנה זה רק כ-${fmt(p.year)} ₪. מספר בלי יחידה מטעה.` : `בשנה זה כ-${fmt(p.year)} ₪.`,
            },
      ),
      explanation: 'מתרגמים כל מספר ליחידה חיה ומשותפת, כאן שקלים בשנה (חודש ×12, יום עבודה ×220, שבוע ×52, רבעון ×4). עוצמת הרגש צריכה ללכת אחרי הגודל האמיתי, לא אחרי המספר שקופץ לעין.',
    };
  }
}

/* ================= emotional+musical: one small step at the right moment ================= */

export function fxModulation(rng: Rng, _level: Level): Draft {
  const m = rng.pick(MODULATE);
  return {
    dim: '2D',
    prompt: 'איזה צעד אחד ישנה את מצב החדר?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [m.text] },
    options: [
      { visual: text(m.one), correct: true, why: 'צעד אחד קטן בפרמטר אחד (קצב, עוצמה, מיקום) מושך את כולם לטונליות חדשה.' },
      { visual: text(m.match), correct: false, errorType: 'wrong_rule', why: 'הצטרפות לעוצמה מגבירה אותה. מודולציה זזה צעד אחד הצידה, לא חזק יותר.' },
      { visual: text(m.all), correct: false, errorType: 'transformation', why: 'הרבה שינויים בבת אחת לא נקלטים בחדר טעון. צריך צעד אחד.' },
      { visual: text(m.wait), correct: false, errorType: 'encoding', why: 'בלי צעד, החדר נשאר באותה טונליות או מסלים.' },
    ],
    explanation: 'במוזיקה מעבר בין טונליות עובר דרך צליל משותף אחד. בחדר זה עובד אותו דבר: צעד קטן אחד בפרמטר אחד, ברגע מדויק.',
  };
}

/* ================= emotional+naturalist: what help the recovery stage can take ================= */

export function fxRecovery(rng: Rng, level: Level): Draft {
  const r = rng.pick(RECOVERY);
  const stages: Stage[] = ['shock', 'anger', 'rebuild'];
  const far = (s: Stage) => Math.abs(stages.indexOf(s) - stages.indexOf(r.stage)) === 2;
  // level 3 asks for the stage itself, which needs the reading before the help
  const label = (s: Stage) => (level === 3 ? `${STAGE_LABEL[s]}: ${STAGE_HELP[s]}` : STAGE_HELP[s]);
  return {
    dim: '2D',
    prompt: level === 3 ? 'באיזה שלב האדם או המקום נמצאים, ואיזו עזרה מתאימה לשלב הזה?' : 'איזו עזרה הם יכולים לקבל עכשיו?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [r.text] },
    options: [
      { visual: text(label(r.stage)), correct: true, why: r.why },
      ...stages
        .filter((s) => s !== r.stage)
        .map<Option>((s) => ({
          visual: text(label(s)),
          correct: false,
          errorType: far(s) ? 'transformation' : 'encoding',
          why: `זו עזרה לשלב ה${STAGE_LABEL[s]}. כאן השלב הוא ${STAGE_LABEL[r.stage]}.`,
        })),
      { visual: text('לא להתערב, ולחכות שיבקשו'), correct: false, errorType: 'wrong_rule', why: 'בכל שלב יש עזרה שאפשר לקבל. ההמתנה משאירה אותם לבד דווקא כשקשה.' },
    ],
    explanation: 'התאוששות עוברת שלבים, כמו יער אחרי שריפה: הלם, כעס, תחילת בנייה. עזרה שמתאימה לשלב אחר לא נקלטת, גם כשהיא טובה.',
  };
}

/* ================= emotional+spatial: the geometry of a hard talk ================= */

export function fxSeating(rng: Rng, _level: Level): Draft {
  const s = rng.pick(SEATING);
  return {
    dim: '2D',
    prompt: 'איפה ואיך כדאי לשבת או לעמוד בשיחה הזו?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [s.text] },
    options: [
      { visual: text(s.right), correct: true, why: s.why },
      { visual: text('מול מול, משני צדי שולחן, עם קשר עין ישיר'), correct: false, errorType: 'wrong_rule', why: 'ישיבה חזיתית היא גאומטריה של עימות. הגוף קורא אותה כמשא ומתן.' },
      { visual: text('את עומדת והוא יושב, כדי לשמור על סמכות'), correct: false, errorType: 'transformation', why: 'הפרש הגובה מגביר איום. בשיחה טעונה מוותרים עליו.' },
      { visual: text('במטבחון המשרדי, תוך כדי שאנשים עוברים'), correct: false, errorType: 'encoding', why: 'בלי פרטיות קשה לומר את הדבר הקשה, וקשה לשמוע אותו.' },
    ],
    explanation: 'הסידור במרחב מכייל את השיחה לפני המילה הראשונה: צד לצד או בזווית, מול נוף או חפץ משותף, ובתנועה כשאפשר.',
  };
}
