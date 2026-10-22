// Interpersonal and intrapersonal drills.
import { DISTORTIONS, DISTORTION_HOW, DISTORTION_ITEMS, GRANULARITY, NEEDS, TONE, UNSAID, type ChoiceItem, type Distortion } from '../../content/social';
import type { Rng } from '../rng';
import type { Level, Option, Prim, SceneSpec, TextSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });

/* ================= perspective taking (director task) ================= */

interface Obj {
  n: number;
  col: number; // 0 = my left
  row: number; // 0 = top
  size: 1 | 2 | 3;
}

const SIZE_R = { 1: 3.2, 2: 5, 3: 7 } as const;

function shelfScene(objs: Obj[], closed: Set<string>, cols: number, rows: number): SceneSpec {
  const W = 22;
  const H = 20;
  const prims: Prim[] = [];
  // the director, on the far side
  prims.push({ p: 'circle', c: [(cols * W) / 2, -24], r: 6, fill: 'stim', w: 1.2 });
  prims.push({ p: 'line', closed: true, pts: [[(cols * W) / 2 - 13, -8], [(cols * W) / 2 + 13, -8], [(cols * W) / 2 + 9, -16], [(cols * W) / 2 - 9, -16]], fill: 'stim', w: 1.2 });
  prims.push({ p: 'text', at: [(cols * W) / 2 + 30, -18], text: 'המנהל', size: 6, anchor: 'start', tone: 'muted' });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const isClosed = closed.has(`${c},${r}`);
      prims.push({ p: 'rect', x: c * W, y: r * H, w: W, h: H, fill: isClosed ? '#D9D3C7' : 'paper', tone: 'ink', sw: 1 });
      if (isClosed) prims.push({ p: 'line', pts: [[c * W + 2, r * H + 3], [c * W + W - 2, r * H + 3]], w: 2.4, tone: 'ink' });
    }
  for (const o of objs) {
    const cx = o.col * W + W / 2;
    const cy = o.row * H + H / 2 + 2;
    prims.push({ p: 'circle', c: [cx, cy], r: SIZE_R[o.size], fill: 'accentSoft', tone: 'accent', w: 1.2 });
    prims.push({ p: 'text', at: [cx, cy], text: String(o.n), size: 5.5, weight: 700 });
  }
  prims.push({ p: 'text', at: [(cols * W) / 2, rows * H + 9], text: 'את', size: 6, tone: 'muted' });
  return { kind: 'scene', box: [-12, -38, cols * W + 24, rows * H + 54], prims, label: 'מדפים: תא אפור סגור מצד המנהל' };
}

export function perspective(rng: Rng, level: Level): Draft {
  const cols = 4;
  const rows = 3;
  for (;;) {
    const cells = rng.shuffle(Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols)] as const));
    const count = level === 1 ? 5 : 6;
    const objs: Obj[] = cells.slice(0, count).map(([col, row], i) => ({ n: i + 1, col, row, size: rng.pick([1, 2, 3] as const) }));
    const closed = new Set(cells.slice(0, count).filter(() => rng.chance(0.35)).map(([c, r]) => `${c},${r}`));
    if (!closed.size) continue;
    const seen = (o: Obj) => !closed.has(`${o.col},${o.row}`);
    type Pick = (set: Obj[], mirror: boolean) => Obj | undefined;
    const unique = (set: Obj[], f: (o: Obj) => number) => {
      const best = Math.min(...set.map(f));
      const at = set.filter((o) => f(o) === best);
      return at.length === 1 ? at[0] : undefined;
    };
    let ask = '';
    let pick: Pick;
    if (level === 1) {
      ask = 'את העיגול הקטן ביותר';
      pick = (set) => unique(set, (o) => o.size);
    } else if (level === 2) {
      const side = rng.pick(['left', 'right'] as const);
      ask = `את העיגול ${side === 'left' ? 'השמאלי' : 'הימני'} ביותר`;
      // the director faces me: his left is my right
      pick = (set, mirror) => unique(set, (o) => ((side === 'left') !== mirror ? o.col : -o.col));
    } else {
      const side = rng.pick(['left', 'right'] as const);
      ask = `את העיגול הקטן ביותר בצד ${side === 'left' ? 'השמאלי' : 'הימני'} שלו`;
      pick = (set, mirror) => {
        const half = set.filter((o) => ((side === 'left') !== mirror ? o.col < cols / 2 : o.col >= cols / 2));
        return half.length ? unique(half, (o) => o.size) : undefined;
      };
    }
    const visible = objs.filter(seen);
    const correct = pick(visible, true);
    const egocentric = pick(objs, true); // ignores what he can't see
    const unmirrored = level > 1 ? pick(visible, false) : undefined; // forgets that he faces me
    if (!correct || !egocentric || egocentric === correct) continue;
    if (level > 1 && (!unmirrored || unmirrored === correct || unmirrored === egocentric)) continue;
    const taken = new Set([correct, egocentric, unmirrored].filter(Boolean));
    const rest = rng.shuffle(objs.filter((o) => !taken.has(o)));
    const opts: Option[] = [
      { visual: text(`עיגול ${correct.n}`), correct: true, why: 'מבין העיגולים שהמנהל רואה, זה מה שהוא מתאר, מנקודת המבט שלו.' },
      { visual: text(`עיגול ${egocentric.n}`), correct: false, errorType: 'wrong_rule', why: `עיגול ${egocentric.n} נמצא בתא סגור מצדו. הוא לא רואה אותו, ולכן לא יכול להתכוון אליו.` },
    ];
    if (unmirrored) opts.push({ visual: text(`עיגול ${unmirrored.n}`), correct: false, errorType: 'transformation', why: 'זה נכון מנקודת המבט שלך. המנהל עומד מולך, ולכן ימין ושמאל שלו הפוכים.' });
    for (const o of rest) {
      if (opts.length === 4) break;
      opts.push({ visual: text(`עיגול ${o.n}`), correct: false, errorType: 'encoding', why: 'העיגול הזה לא מתאים לתיאור.' });
    }
    return {
      dim: '2D',
      prompt: `המנהל עומד מהצד השני של המדפים ומבקש: "הזיזי ${ask}". לאיזה עיגול הוא מתכוון? תאים אפורים סגורים מהצד שלו.`,
      stimulus: shelfScene(objs, closed, cols, rows),
      options: opts,
      explanation: 'קודם מחקי בדמיון את כל מה שבתאים הסגורים: הוא לא רואה אותם. אחר כך עברי לצד שלו: מולך, ימין ושמאל מתחלפים.',
    };
  }
}

/* ================= curated choice drills ================= */

function choice(rng: Rng, level: Level, bank: ChoiceItem[], prompt: string, explanation: string): Draft {
  const item = rng.pick(bank);
  const far = rng.pick(bank.filter((b) => b !== item && b.answer !== item.near.text && !item.others.includes(b.answer))).answer;
  const options: Option[] = [
    { visual: text(item.answer), correct: true, why: item.why },
    ...(level === 1
      ? [{ visual: text(far), correct: false, errorType: 'encoding', why: 'זה לא קשור למה שנאמר כאן.' } as Option]
      : [{ visual: text(item.near.text), correct: false, errorType: 'wrong_rule', why: item.near.why } as Option]),
    ...item.others.map<Option>((o) => ({ visual: text(o), correct: false, errorType: 'encoding', why: 'אין לכך סימן במה שנאמר.' })),
  ];
  return { dim: '2D', prompt, stimulus: { kind: 'verbal', mode: 'quote', words: [item.text] }, options, explanation };
}

export const unsaid = (rng: Rng, level: Level) =>
  choice(rng, level, UNSAID, 'מה הדובר צריך או מרגיש, מעבר למה שנאמר?', 'הקשיבי לפער: בין מילים לתזמון, בין מילים לגוף, ולמה שחוזר. מה שחוזר או מרוכך הוא בדרך כלל החשוב.');

export const tone = (rng: Rng, level: Level) =>
  choice(rng, level, TONE, 'מה הכוונה האמיתית של המשפט?', 'שאלי מה המשפט עושה, לא רק מה הוא אומר: מבקש, מבקר, מפרגן או עוקץ. מילים קטנות כמו "הפעם", "כמה" ו"אולי" משנות כוונה.');

export function distortion(rng: Rng, level: Level): Draft {
  const item = rng.pick(DISTORTION_ITEMS);
  const others = rng.shuffle((Object.keys(DISTORTIONS) as Distortion[]).filter((d) => d !== item.kind && d !== item.near));
  const picks: Distortion[] = level === 1 ? others.slice(0, 3) : [item.near, ...others.slice(0, 2)];
  return {
    dim: '2D',
    prompt: 'איזו הטיית חשיבה מופיעה במשפט?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [item.text] },
    options: [
      { visual: text(DISTORTIONS[item.kind], DISTORTION_HOW[item.kind]), correct: true, why: DISTORTION_HOW[item.kind] },
      ...picks.map<Option>((d) => ({
        visual: text(DISTORTIONS[d], DISTORTION_HOW[d]),
        correct: false,
        errorType: d === item.near ? 'wrong_rule' : 'encoding',
        why: d === item.near ? `קרוב, אבל ${DISTORTIONS[d]} פירושו: ${DISTORTION_HOW[d]} כאן המוקד אחר.` : `${DISTORTIONS[d]}: ${DISTORTION_HOW[d]}`,
      })),
    ],
    explanation: 'זיהוי ההטיה הוא הצעד הראשון לנסח מחדש: מה העובדה, ומה הפרשנות שהודבקה לה?',
  };
}

export function granularity(rng: Rng, level: Level): Draft {
  const item = rng.pick(GRANULARITY);
  const far = rng.pick(GRANULARITY.filter((g) => g !== item && g.answer !== item.near && !item.others.includes(g.answer) && g.answer !== item.answer)).answer;
  return {
    dim: '2D',
    prompt: 'איזו מילה מתארת בדיוק הכי רב את הרגש במצב הזה?',
    stimulus: { kind: 'verbal', mode: 'quote', words: [item.text] },
    options: [
      { visual: text(item.answer), correct: true, why: item.why },
      level === 1 ? { visual: text(far), correct: false, errorType: 'encoding', why: 'זה רגש של מצב אחר.' } : { visual: text(item.near), correct: false, errorType: 'wrong_rule', why: item.nearWhy },
      ...item.others.map<Option>((o) => ({ visual: text(o), correct: false, errorType: 'encoding', why: 'אין לכך סימן במצב המתואר.' })),
    ],
    explanation: 'שמות רגשות מדויקים עוזרים לבחור תגובה: אשמה מזמינה תיקון, בושה מזמינה חמלה עצמית, תסכול מזמין שינוי דרך.',
  };
}

export const need = (rng: Rng, level: Level) =>
  choice(rng, level, NEEDS, 'איזה צורך עומד מאחורי התחושה?', 'מאחורי כל רגש עומד צורך שמולא או לא מולא. ניסוח הצורך הופך תלונה לבקשה שאפשר לפעול לפיה.');

