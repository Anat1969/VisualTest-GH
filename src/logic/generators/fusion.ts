// Fusion drills, batch 1: one keyed drill per fusion, each testing the combined ability in the card's definition.
// Six are generated and checked by computation (baseline, conditions, loop, feed, resolution, floors); four draw on curated banks.
import { BROKEN, CHANNEL_LABEL, DEFAULTS, FLOORS, FLOOR_LABEL, FLOOR_SENTENCES, LONG_MAIL, MESSAGES, MOTIONS, type Channel, type Floor } from '../../content/fusionDrills';
import type { Rng } from '../rng';
import type { Level, Option, TextSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ================= digital+emotional: which channel can carry it ================= */

export const channelOf = (level: number): Channel => (level <= 2 ? 'text' : level <= 4 ? 'voice' : 'meeting');

export function fxChannel(rng: Rng, level: Level): Draft {
  const pool = MESSAGES.filter((m) => (level === 1 ? m.level === 1 || m.level === 5 : level === 2 ? true : m.level >= 2 && m.level <= 4));
  const m = rng.pick(pool);
  const right = channelOf(m.level);
  const order: Channel[] = ['text', 'voice', 'meeting'];
  const idx = order.indexOf(right);
  const options: Option[] = [{ visual: text(CHANNEL_LABEL[right]), correct: true, why: m.why }];
  for (const c of order.filter((c) => c !== right))
    options.push({
      visual: text(CHANNEL_LABEL[c]),
      correct: false,
      errorType: order.indexOf(c) < idx ? 'encoding' : 'transformation',
      why: order.indexOf(c) < idx ? 'הערוץ צר מדי לרגש שבהודעה: הטון יילך לאיבוד בדרך.' : 'הערוץ כבד מדי להודעה הזו. הוא מעמיס על שני הצדדים בלי צורך.',
    });
  options.push({ visual: text(LONG_MAIL), correct: false, errorType: 'wrong_rule', why: 'יותר מילים לא מעבירות טון. מייל ארוך הוא אותו ערוץ צר, רק עמוס יותר.' });
  return {
    dim: '2D',
    prompt: 'באיזה ערוץ כדאי להעביר את המסר הזה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [m.text] },
    options,
    explanation: 'קודם מעריכים כמה רגש יש במסר, מ-1 עד 5. מידע עובר בטקסט; אי-הסכמה, ביקורת והתנצלות צריכות קול; כעס, בשורה קשה ופרידה צריכים מפגש.',
  };
}

/* ================= digital+existential: the loaded default ================= */

export function fxDefaults(rng: Rng, level: Level): Draft {
  const loaded = rng.pick(DEFAULTS.filter((d) => d.kind === 'loaded'));
  // harder levels use defaults that also make choices for the user, but in the user's interest
  const kinds: ('protective' | 'technical' | 'cosmetic')[] = level === 1 ? ['technical', 'cosmetic', 'cosmetic'] : level === 2 ? ['protective', 'technical', 'cosmetic'] : ['protective', 'protective', 'technical'];
  const unique: typeof DEFAULTS = [];
  for (const k of kinds) unique.push(rng.pick(DEFAULTS.filter((d) => d.kind === k && !unique.includes(d))));
  const why: Record<string, string> = {
    protective: 'גם כאן המערכת בחרה בשבילך, אבל לטובתך: היא מגינה עלייך, לא מרוויחה ממך.',
    technical: 'זו התאמה טכנית למכשיר. היא לא מניחה דבר על מה שאת רוצה.',
    cosmetic: 'בחירה נייטרלית של מראה. אין בה הנחה על רצונך.',
  };
  const settings = rng.shuffle([loaded, ...unique]);
  return {
    dim: '2D',
    prompt: 'במסך ההגדרות של אפליקציה חדשה. איזו ברירת מחדל מניחה עלייך משהו שלא בחרת, לטובת המערכת?',
    stimulus: { kind: 'verbal', mode: 'sentences', words: settings.map((s) => s.text) },
    options: [
      { visual: text(loaded.text), correct: true, why: 'המערכת החליטה בשמך על משהו שמשרת אותה, והשאירה לך לגלות ולבטל.' },
      ...unique.map<Option>((d) => ({
        visual: text(d.text),
        correct: false,
        errorType: d.kind === 'protective' ? 'wrong_rule' : d.kind === 'technical' ? 'transformation' : 'encoding',
        why: why[d.kind],
      })),
    ],
    explanation: 'לכל ברירת מחדל שאלי: מי מרוויח אם לא אשנה אותה? אם המערכת מרוויחה והמשתמשת צריכה לטרוח כדי לבטל, זו תפיסת אדם מקודדת.',
  };
}

/* ================= digital+interpersonal: the typed pulse ================= */

type Dim = 'length' | 'hour' | 'reply';
const DIM_LABEL: Record<Dim, string> = { length: 'אורך ההודעה', hour: 'שעת השליחה', reply: 'זמן התגובה' };

export function fxBaseline(rng: Rng, level: Level): Draft {
  const base = { length: rng.int(25, 45), hour: rng.int(8, 10), reply: rng.int(5, 15) };
  const noise = { length: level === 3 ? 6 : 3, hour: level === 3 ? 1 : 0, reply: level === 3 ? 4 : 2 };
  const days = ['א', 'ב', 'ג', 'ד', 'ה'].map((d) => ({
    d,
    length: base.length + rng.int(-noise.length, noise.length),
    hour: base.hour + rng.int(-noise.hour, noise.hour),
    reply: base.reply + rng.int(-noise.reply, noise.reply),
  }));
  const dim = rng.pick<Dim>(['length', 'hour', 'reply']);
  const today = { length: base.length + rng.int(-2, 2), hour: base.hour, reply: base.reply + rng.int(-1, 1) };
  if (dim === 'length') today.length = rng.int(1, 3);
  if (dim === 'hour') today.hour = rng.pick([1, 2, 23]);
  if (dim === 'reply') today.reply = base.reply * rng.int(10, 16);
  const fmt = (r: { length: number; hour: number; reply: number }) => `${r.length} מילים|${String(r.hour).padStart(2, '0')}:00|${r.reply} דק'`;
  const rows = ['יום|אורך|שעה|זמן תגובה', ...days.map((r) => `${r.d}|${fmt(r)}`), `היום|${fmt(today)}`];
  return {
    dim: '2D',
    prompt: 'אלה ההודעות של עמיתה בשבוע האחרון, ושל היום. מה בהודעה של היום שווה שאלה אישית?',
    stimulus: { kind: 'verbal', mode: 'table', words: rows },
    options: [
      { visual: text(DIM_LABEL[dim]), correct: true, why: `${DIM_LABEL[dim]} היום רחוק מכל מה שהיה בשבוע. זו חריגה מהבסיס שלה, כמו שינוי בטון דיבור.` },
      ...(['length', 'hour', 'reply'] as Dim[])
        .filter((x) => x !== dim)
        .map<Option>((x) => ({ visual: text(DIM_LABEL[x]), correct: false, errorType: 'encoding', why: `${DIM_LABEL[x]} היום בתוך הטווח הרגיל שלה. התנודה הזו קיימת גם בימים אחרים.` })),
      { visual: text('אין חריגה, הכול כרגיל'), correct: false, errorType: 'wrong_rule', why: 'יש חריגה. השוואה לבסיס של האדם עצמו, לא לנורמה כללית, מראה אותה.' },
    ],
    explanation: 'הבסיס הוא האדם עצמו: מה הטווח הרגיל שלו בכל ממד. חריגה היא ערך שיוצא מהטווח הזה, לא ערך שנראה מוזר באופן כללי.',
  };
}

/* ================= digital+intrapersonal: the exact combination ================= */

const CONDS = ['רעב', 'איחור', 'עייפות', 'רעש'];

export function fxConditions(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 6 : level === 2 ? 7 : 8;
  for (;;) {
    const [a, b] = rng.shuffle([0, 1, 2, 3]).slice(0, 2).sort();
    const log = Array.from({ length: n }, () => CONDS.map(() => rng.chance(0.5)));
    const fires = (r: boolean[], x: number, y: number) => r[x] && r[y];
    const reacted = log.map((r) => fires(r, a, b));
    // the rule must be the only pair (and no single condition) that explains the log
    const pairs = [0, 1, 2, 3].flatMap((x) => [0, 1, 2, 3].filter((y) => y > x).map((y) => [x, y] as const));
    const fitting = pairs.filter(([x, y]) => log.every((r, i) => fires(r, x, y) === reacted[i]));
    const singles = [0, 1, 2, 3].filter((x) => log.every((r, i) => r[x] === reacted[i]));
    const orFits = log.every((r, i) => (r[a] || r[b]) === reacted[i]);
    const pos = reacted.filter(Boolean).length;
    if (fitting.length !== 1 || singles.length || orFits || pos < 2 || pos > n - 2) continue;
    // a single condition that appears in every reaction (tempting), and an overlapping wrong pair
    const single = rng.pick([a, b]);
    const other = rng.pick(pairs.filter(([x, y]) => !(x === a && y === b) && (x === single || y === single)));
    const rows = [`יום|${CONDS.join('|')}|תגובה`, ...log.map((r, i) => `${i + 1}|${r.map((v) => (v ? 'כן' : '–')).join('|')}|${reacted[i] ? 'התעצבנתי' : '–'}`)];
    return {
      dim: '2D',
      prompt: 'יומן של שבוע: אילו תנאים היו בכל יום, ומתי הופיעה התגובה. איזה צירוף מדויק מפעיל אותה?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options: [
        { visual: text(`${CONDS[a]} וגם ${CONDS[b]}`), correct: true, why: `בכל יום שהיו בו ${CONDS[a]} ו${CONDS[b]} יחד הייתה תגובה, ובשום יום אחר לא.` },
        { visual: text(`רק ${CONDS[single]}`), correct: false, errorType: 'wrong_rule', why: `${CONDS[single]} הופיע בכל ימי התגובה, אבל גם בימים בלעדיה. תנאי אחד לא מספיק.` },
        { visual: text(`${CONDS[a]} או ${CONDS[b]}`), correct: false, errorType: 'transformation', why: 'כל אחד מהם לבד לא הפעיל תגובה. צריך את שניהם יחד.' },
        { visual: text(`${CONDS[other[0]]} וגם ${CONDS[other[1]]}`), correct: false, errorType: 'encoding', why: 'יש ימים שבהם הצירוף הזה הופיע בלי תגובה, או תגובה בלעדיו.' },
      ],
      explanation: 'בודקים כל צירוף מול כל שורה: הוא צריך להופיע בכל ימי התגובה, ולא באף יום אחר. כשנמצא הצירוף, מספיק לשנות תנאי אחד בו כדי לנטרל את התגובה.',
    };
  }
}

/* ================= digital+kinesthetic: the wrong line in a movement ================= */

export function fxMotion(rng: Rng, level: Level): Draft {
  const m = rng.pick(MOTIONS);
  const others = rng.shuffle(m.lines.map((_, i) => i).filter((i) => i !== m.bug && i !== m.decoy.line)).slice(0, 2);
  // level 1 shows each line's text on the option; higher levels give the line number only
  const opt = (i: number) => text(`שורה ${i + 1}`, level === 1 ? m.lines[i] : undefined);
  return {
    dim: '2D',
    prompt: `המטרה: ${m.goal}. איזו פקודה ברצף התנועה סותרת את המטרה?`,
    stimulus: { kind: 'verbal', mode: 'sentences', words: m.lines },
    options: [
      { visual: opt(m.bug), correct: true, why: m.why },
      { visual: opt(m.decoy.line), correct: false, errorType: 'wrong_rule', why: m.decoy.why },
      ...others.map<Option>((i) => ({ visual: opt(i), correct: false, errorType: 'encoding', why: 'הפקודה הזו תומכת במטרה או ניטרלית לה. היא לא הבאג.' })),
    ],
    explanation: 'קוראים את התנועה כקוד: כל שורה צריכה לשרת את המטרה. מחפשים את התנאי ("אם...") או הקיצור שסותר אותה, ומתקנים רק אותו.',
  };
}

/* ================= digital+linguistic: which floor each speaker is on ================= */

export function fxFloors(rng: Rng, level: Level): Draft {
  const floors: Floor[] = ['why', 'what', 'how'];
  for (;;) {
    const fa = rng.pick(floors);
    const fb = rng.pick(floors.filter((f) => f !== fa && (level === 1 ? Math.abs(floors.indexOf(f) - floors.indexOf(fa)) === 2 : true)));
    if (!fb) continue;
    const a = rng.pick(FLOOR_SENTENCES.filter((s) => s.floor === fa));
    const b = rng.pick(FLOOR_SENTENCES.filter((s) => s.floor === fb));
    const pair = (x: Floor, y: Floor) => `דנה: ${FLOOR_LABEL[x]} · יוסי: ${FLOOR_LABEL[y]}`;
    const third = floors.find((f) => f !== fa && f !== fb)!;
    return {
      dim: '2D',
      prompt: 'דנה ויוסי מתווכחים בישיבה. על איזו קומה כל אחד מהם מדבר?',
      stimulus: { kind: 'verbal', mode: 'sentences', words: [`דנה: "${a.text}"`, `יוסי: "${b.text}"`] },
      options: [
        { visual: text(pair(fa, fb)), correct: true, why: 'הם מדברים בקומות שונות, ולכן הוויכוח לא מתקדם. צריך לבחור קומה אחת.' },
        { visual: text(pair(fb, fa)), correct: false, errorType: 'transformation', why: 'הקומות הפוכות. בדקי: "למה" מדבר על תוצאה, "מה" על שלבים, "איך" על חומרים ומידות.' },
        { visual: text(`שניהם: ${FLOOR_LABEL[fa]}. ויכוח אמיתי`), correct: false, errorType: 'wrong_rule', why: 'הם לא באותה קומה. זה לא ויכוח על אותה שאלה, אלא אי-התאמה בין קומות.' },
        { visual: text(pair(fa, third)), correct: false, errorType: 'encoding', why: `המשפט של יוסי הוא ${FLOOR_LABEL[fb]}, לא ${FLOOR_LABEL[third]}.` },
      ],
      explanation: 'מטרה עונה על "למה" (תוצאה, ערך). תהליך עונה על "מה קודם למה" (שלבים, סדר). ביצוע עונה על "איך" (חומר, מידה, פרט). ויכוח בין קומות לא נגמר עד שמסכימים על הקומה.',
    };
  }
}

/* ================= digital+logical: the broken floor ================= */

export function fxBroken(rng: Rng, level: Level): Draft {
  const c = rng.pick(BROKEN);
  // at the hardest level the tempting answer is always the top floor (the inference), which is where people look first
  const decoy = c.broken === 3 ? 0 : 3;
  return {
    dim: '2D',
    prompt: `הטענה: "${c.claim}" באיזו קומה היא נשברת?`,
    stimulus: { kind: 'verbal', mode: 'sentences', words: c.floors.map((f, i) => `${FLOORS[i]}: ${f}`) },
    options: FLOORS.map<Option>((f, i) =>
      i === c.broken
        ? { visual: text(f), correct: true, why: c.why }
        : {
            visual: text(f),
            correct: false,
            errorType: i === decoy && level > 1 ? 'wrong_rule' : 'encoding',
            why: i === 3 ? 'ההסקה נראית סבירה בהינתן מה שמתחתיה. השבר נמצא בקומה נמוכה יותר.' : `הקומה "${f}" תקינה בסיפור הזה.`,
          },
    ),
    explanation: 'לפני שמתווכחים עם ההיגיון, בודקים מלמטה למעלה: מה נמדד, איך הגיע, מי סיכם. טיעון שנשבר בקומה נמוכה לא יתוקן בוויכוח על המסקנה.',
  };
}

/* ================= digital+musical: the step that changes ================= */

const STEPS = ['קפה', 'מקלחת', 'לבוש', 'כלב', 'מיילים', 'נסיעה', 'חדשות', 'ארוחת בוקר', 'ספורט', 'קריאה', 'הכנת תיק', 'השקיית עציצים'];

export function fxLoop(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 5 : level === 2 ? 6 : 7;
  for (;;) {
    const base = rng.shuffle(STEPS).slice(0, n);
    const at = rng.int(1, n - 2);
    const spare = STEPS.filter((s) => !base.includes(s));
    const days = Array.from({ length: 4 }, (_, d) => {
      const row = base.slice();
      if (d > 0) row[at] = spare[(d - 1) % spare.length];
      return row;
    });
    // at level 3, one constant step also moves position on one day: it is still the same step, not the variable one
    let moved: string | null = null;
    if (level === 3) {
      const k = [0, 1, 2, 3].find((x) => x !== at && x + 1 !== at && x + 1 < n);
      if (k === undefined) continue;
      const d = rng.int(1, 3);
      [days[d][k], days[d][k + 1]] = [days[d][k + 1], days[d][k]];
      moved = days[0][k];
    }
    const neighbor = base[at + 1] ?? base[at - 1];
    if (neighbor === moved) continue;
    const rows = [`יום|${base.map((_, i) => i + 1).join('|')}`, ...days.map((r, d) => `${'אבגד'[d]}|${r.join('|')}`)];
    const options: Option[] = [
      { visual: text(`צעד ${at + 1}`), correct: true, why: `בצעד ${at + 1} התוכן מתחלף כל יום. זה החלק המשתנה של הלופ; כל השאר חוזר.` },
      { visual: text(`צעד ${base.indexOf(neighbor) + 1}`), correct: false, errorType: 'encoding', why: 'הצעד הזה זהה בכל הימים. הוא שכן של המשתנה, לא המשתנה עצמו.' },
      { visual: text('אין צעד משתנה, זו שגרה קבועה'), correct: false, errorType: 'wrong_rule', why: 'יש צעד אחד שמתחלף כל יום. בלי לזהות אותו אי אפשר לתת לו מקום קבוע.' },
    ];
    if (moved) options.push({ visual: text(`צעד ${base.indexOf(moved) + 1}`), correct: false, errorType: 'transformation', why: 'הצעד הזה החליף מקום ביום אחד, אבל התוכן שלו זהה. זו הזזה, לא שינוי.' });
    else options.push({ visual: text('צעד 1'), correct: false, errorType: 'transformation', why: 'הצעד הראשון קבוע. הוא הפעימה שמתחילה את הלופ.' });
    if (new Set(options.map((o) => (o.visual as TextSpec).text)).size < 4) continue;
    return {
      dim: '2D',
      prompt: 'ארבעה בקרים של אותה שגרה. איזה צעד הוא החלק המשתנה של הלופ?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options,
      explanation: 'עוברים עמודה-עמודה: עמודה שבה התוכן זהה בכל הימים היא החלק החוזר. עמודה שמתחלפת היא החלק המשתנה, ושם כדאי לקבוע מקום או זמן קבוע.',
    };
  }
}

/* ================= digital+naturalist: reading the ranking ================= */

interface Post {
  name: string;
  topic: string;
  likes: number;
  age: number; // hours
}
type Rule = 'topic' | 'likes' | 'recent';
const RULE_LABEL: Record<Rule, string> = {
  topic: 'מקדם פריטים מהנושא שעליו לחצת',
  likes: 'מסדר לפי מספר הלייקים',
  recent: 'מסדר לפי מה שהכי חדש',
};
const TOPICS = ['בישול', 'ספורט', 'עיצוב', 'טיולים'];

export function fxFeed(rng: Rng, level: Level): Draft {
  for (;;) {
    const posts: Post[] = Array.from({ length: 8 }, (_, i) => ({ name: `פריט ${'אבגדהוזח'[i]}`, topic: rng.pick(TOPICS), likes: rng.int(10, 900), age: rng.int(1, 48) }));
    const before = posts.slice().sort((a, b) => b.likes - a.likes);
    const clicked = rng.pick(before.slice(3));
    const rule = level === 1 ? 'topic' : rng.pick<Rule>(['topic', 'topic', 'recent']);
    const after =
      rule === 'topic'
        ? posts.slice().sort((a, b) => Number(b.topic === clicked.topic) - Number(a.topic === clicked.topic) || b.likes - a.likes)
        : posts.slice().sort((a, b) => a.age - b.age);
    const same = (x: Post[], y: Post[]) => x.every((p, i) => p === y[i]);
    if (same(before, after)) continue;
    const topicCount = posts.filter((p) => p.topic === clicked.topic).length;
    if (topicCount < 2 || topicCount > 4) continue;
    // the clicked topic must not already lead the feed, or the change would be invisible
    if (before.slice(0, 3).filter((p) => p.topic === clicked.topic).length > 1) continue;
    // the visible change must be explained by one rule only
    const byTopic = posts.slice().sort((a, b) => Number(b.topic === clicked.topic) - Number(a.topic === clicked.topic) || b.likes - a.likes);
    const byRecent = posts.slice().sort((a, b) => a.age - b.age);
    if (same(byTopic, byRecent)) continue;
    const show = (list: Post[]) => list.slice(0, 5).map((p) => `${p.name} · ${p.topic} · ${p.likes} לייקים · לפני ${p.age} שע'`);
    const rows = ['לפני|אחרי', ...show(before).map((b, i) => `${b}|${show(after)[i]}`)];
    const options: Option[] = [
      { visual: text(RULE_LABEL[rule]), correct: true, why: rule === 'topic' ? `אחרי הלחיצה על ${clicked.name} (${clicked.topic}), כל פריטי ה${clicked.topic} עלו לראש.` : 'אחרי הלחיצה הסדר נקבע לפי גיל הפריט: החדש ביותר למעלה.' },
      { visual: text(RULE_LABEL.likes), correct: false, errorType: 'encoding', why: 'כך היה הסדר לפני הלחיצה. אחריה הוא השתנה, ולכן משהו אחר נכנס לדירוג.' },
      { visual: text(RULE_LABEL[rule === 'topic' ? 'recent' : 'topic']), correct: false, errorType: 'transformation', why: rule === 'topic' ? 'הפריטים שעלו אינם החדשים ביותר. מה שמשותף להם הוא הנושא.' : 'הפריטים שעלו אינם מהנושא שנלחץ. מה שמשותף להם הוא שהם חדשים.' },
      { visual: text('אקראי, אין חוקיות'), correct: false, errorType: 'wrong_rule', why: 'יש חוקיות שאפשר לקרוא מהשינוי. עקבות הם בדיוק הדרך לזהות אותה.' },
    ];
    return {
      dim: '2D',
      prompt: `לחצת על ${clicked.name} (${clicked.topic}). מה הפיד לפני ואחרי מגלה על מנגנון הדירוג?`,
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options,
      explanation: 'משווים לפני ואחרי: מה עלה, ומה משותף למה שעלה. המכנה המשותף הוא המשתנה שהאלגוריתם מגיב אליו, וכך אפשר להזין אותו בכוונה.',
    };
  }
}

/* ================= digital+spatial: where detail pays ================= */

const ELEMENTS = ['כרכוב הגג', 'דלת הכניסה', 'מעקה המרפסת', 'ספסל בחזית', 'שלט הבניין', 'חלון הקומה העליונה'];

export function fxResolution(rng: Rng, level: Level): Draft {
  for (;;) {
    const els = rng.shuffle(ELEMENTS).slice(0, 4).map((name) => ({ name, dist: rng.int(2, 40), dwell: rng.int(1, 30), size: rng.int(1, 20) }));
    const value = (e: (typeof els)[number]) => e.dwell / e.dist;
    const best = els.reduce((a, b) => (value(b) > value(a) ? b : a));
    const longest = els.reduce((a, b) => (b.dwell > a.dwell ? b : a));
    const closest = els.reduce((a, b) => (b.dist < a.dist ? b : a));
    const biggest = els.reduce((a, b) => (b.size > a.size ? b : a));
    const picks = [best, longest, closest, biggest];
    if (new Set(picks).size < 4) continue;
    const sorted = els.map(value).sort((a, b) => b - a);
    if (sorted[0] / sorted[1] < (level === 3 ? 1.15 : 1.5)) continue;
    const rows = ['פריט|מרחק צפייה|משך מבט|שטח', ...els.map((e) => `${e.name}|${e.dist} מ'|${e.dwell} שנ'|${e.size} מ"ר`)];
    return {
      dim: '2D',
      prompt: 'תקציב הפירוט מספיק לפריט אחד בחזית. איפה הפירוט ישתלם ביותר?',
      stimulus: { kind: 'verbal', mode: 'table', words: rows },
      options: [
        { visual: text(best.name), correct: true, why: `כאן המבט ארוך ביחס למרחק: ${best.dwell} שניות מ-${best.dist} מטר. שם העין נעצרת ומבחינה בפרט.` },
        { visual: text(biggest.name), correct: false, errorType: 'wrong_rule', why: 'הפריט הגדול ביותר, אבל גודל אינו תשומת לב. פירוט משתלם היכן שמסתכלים, לא היכן שיש שטח.' },
        { visual: text(longest.name), correct: false, errorType: 'transformation', why: `המבט ארוך, אבל ממרחק ${longest.dist} מטר פירוט עדין לא נראה.` },
        { visual: text(closest.name), correct: false, errorType: 'encoding', why: `קרוב, אבל המבט עליו קצר (${closest.dwell} שניות). רוב העוברים לא יעצרו לראות.` },
      ],
      explanation: 'פירוט הוא משאב. שווים אותו מול משך המבט חלקי המרחק: מבט ארוך מקרוב מצדיק פירוט; מבט קצר או רחוק מבזבז אותו.',
    };
  }
}
