// Naturalist drills: procedural leaves (classify, discriminate) and food webs.
import { FOOD_WEBS } from '../../content/nature';
import type { Rng } from '../rng';
import type { Level, Option, P2, Prim, SceneSpec, TextSpec } from '../types';
import type { Draft } from './index';

export type LeafShape = 'oval' | 'lance' | 'round' | 'heart';
export type Margin = 'smooth' | 'serrated' | 'lobed';
export type Venation = 'pinnate' | 'palmate' | 'parallel';

export interface Leaf {
  shape: LeafShape;
  margin: Margin;
  venation: Venation;
  teeth: number; // for serrated margins
  veins: number; // side veins for pinnate
  hue: number; // noise, not an attribute
  tilt: number; // noise, not an attribute
}

export const SHAPE_LABEL: Record<LeafShape, string> = { oval: 'אליפטי', lance: 'מוארך וצר', round: 'עגול', heart: 'דמוי לב' };
export const MARGIN_LABEL: Record<Margin, string> = { smooth: 'שפה חלקה', serrated: 'שפה משוננת', lobed: 'שפה מאונה' };
export const VEIN_LABEL: Record<Venation, string> = { pinnate: 'עורקים נוצתיים', palmate: 'עורקים מהבסיס', parallel: 'עורקים מקבילים' };

const SHAPES: LeafShape[] = ['oval', 'lance', 'round', 'heart'];
const MARGINS: Margin[] = ['smooth', 'serrated', 'lobed'];
const VEINS: Venation[] = ['pinnate', 'palmate', 'parallel'];

function halfWidth(l: Leaf, t: number): number {
  const s = Math.sin(Math.PI * t);
  let w: number;
  switch (l.shape) {
    case 'oval':
      w = 13 * s ** 0.9;
      break;
    case 'lance':
      w = 7.5 * s ** 0.7 * (1 - 0.35 * t);
      break;
    case 'round':
      w = 16 * s ** 0.6;
      break;
    case 'heart':
      w = 15 * Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.7 * (1 + 0.25 * (1 - t));
      break;
  }
  if (l.margin === 'serrated') {
    const saw = Math.abs(((t * l.teeth) % 1) - 0.5) * 2; // 0..1 triangle
    w *= 0.93 + 0.12 * saw;
  }
  if (l.margin === 'lobed') w *= 0.7 + 0.3 * Math.abs(Math.sin(2.5 * Math.PI * t));
  return w;
}

/** Leaf drawn in a 100-unit box, base at the bottom. */
export function leafPrims(l: Leaf): Prim[] {
  const L = 62;
  const N = 90;
  const base = l.shape === 'heart' ? -4 : 0;
  const right: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    right.push([halfWidth(l, t), base - t * (L - base)]);
  }
  const left = right.slice().reverse().map(([x, y]) => [-x, y] as P2);
  const outline = [[0, 0] as P2, ...right, ...left];
  const prims: Prim[] = [];
  const green = `hsl(${l.hue}, 38%, 52%)`;
  const dark = `hsl(${l.hue}, 40%, 28%)`;
  prims.push({ p: 'line', pts: [[0, 0], [0, 14]], w: 2, tone: dark }); // stalk
  prims.push({ p: 'line', closed: true, pts: outline, fill: green, tone: dark, w: 1.2 });
  if (l.venation === 'pinnate') {
    prims.push({ p: 'line', pts: [[0, base], [0, -L + 4]], w: 1.2, tone: dark });
    for (let k = 1; k <= l.veins; k++) {
      const t = k / (l.veins + 1);
      const y = base - t * (L - base);
      const w = halfWidth(l, Math.min(1, t + 0.08)) * 0.82;
      prims.push({ p: 'line', pts: [[0, y], [w, y - 7]], w: 0.8, tone: dark });
      prims.push({ p: 'line', pts: [[0, y], [-w, y - 7]], w: 0.8, tone: dark });
    }
  } else if (l.venation === 'palmate') {
    for (const a of [-55, -28, 0, 28, 55]) {
      const r = (a * Math.PI) / 180;
      const len = L * (a === 0 ? 0.92 : 0.6);
      prims.push({ p: 'line', pts: [[0, base], [Math.sin(r) * len * 0.55, base - Math.cos(r) * len]], w: 0.9, tone: dark });
    }
  } else {
    for (const f of [-0.5, -0.2, 0.2, 0.5, 0]) {
      const pts: P2[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = 0.04 + (i / 20) * 0.9;
        pts.push([halfWidth(l, t) * f * 1.1, base - t * (L - base)]);
      }
      prims.push({ p: 'line', pts, w: 0.8, tone: dark });
    }
  }
  return prims;
}

export function leafScene(l: Leaf): SceneSpec {
  const prims = leafPrims(l);
  const a = (l.tilt * Math.PI) / 180;
  const rot = ([x, y]: P2): P2 => [x * Math.cos(a) - (y + 24) * Math.sin(a), x * Math.sin(a) + (y + 24) * Math.cos(a)];
  const turned = prims.map((p) => (p.p === 'line' ? { ...p, pts: p.pts.map(rot) } : p));
  return { kind: 'scene', box: [-50, -50, 100, 100], prims: turned, label: 'עלה' };
}

function randomLeaf(rng: Rng, fixed: Partial<Leaf> = {}): Leaf {
  return {
    shape: rng.pick(SHAPES),
    margin: rng.pick(MARGINS),
    venation: rng.pick(VEINS),
    teeth: rng.int(7, 12),
    veins: rng.int(4, 6),
    hue: rng.pick([84, 96, 108, 120, 132]),
    tilt: rng.int(-18, 18),
    ...fixed,
  };
}

type Attr = 'shape' | 'margin' | 'venation';
const VALUES: Record<Attr, string[]> = { shape: SHAPES, margin: MARGINS, venation: VEINS };
const LABELS: Record<Attr, Record<string, string>> = { shape: SHAPE_LABEL, margin: MARGIN_LABEL, venation: VEIN_LABEL };

function groupScene(leaves: Leaf[]): SceneSpec {
  const prims: Prim[] = [];
  leaves.forEach((l, i) => {
    const dx = (i % 4) * 100 - 150;
    const sc = leafScene(l);
    for (const p of sc.prims) {
      if (p.p === 'line') prims.push({ ...p, pts: p.pts.map(([x, y]) => [x + dx, y] as P2) });
    }
  });
  return { kind: 'scene', box: [-200, -52, 400, 104], prims, label: 'קבוצת עלים' };
}

/* ---------- discover the rule ---------- */

export function taxon(rng: Rng, level: Level): Draft {
  for (;;) {
    const attrs = rng.shuffle<Attr>(['margin', 'venation', 'shape']);
    const ruleAttrs: Attr[] = level === 3 ? attrs.slice(0, 2) : [level === 1 ? rng.pick<Attr>(['margin', 'venation']) : 'shape'];
    const rule: Partial<Leaf> = Object.fromEntries(ruleAttrs.map((a) => [a, rng.pick(VALUES[a])]));
    const fits = (l: Leaf) => ruleAttrs.every((a) => l[a] === (rule as Leaf)[a]);
    const group = Array.from({ length: 4 }, () => randomLeaf(rng, rule));
    // the rule must be the only thing the group shares
    const free = (['shape', 'margin', 'venation'] as Attr[]).filter((a) => !ruleAttrs.includes(a));
    if (free.some((a) => new Set(group.map((g) => g[a])).size < 2)) continue;
    const answer = randomLeaf(rng, rule);
    const wrong: Option[] = [];
    const vkey = (l: Leaf) => JSON.stringify(leafScene(l));
    const used = new Set([vkey(answer)]);
    for (let i = 0; i < 60 && wrong.length < 3; i++) {
      const l = randomLeaf(rng);
      if (fits(l) || used.has(vkey(l))) continue;
      const partial = level === 3 && ruleAttrs.some((a) => l[a] === (rule as Leaf)[a]);
      const looksAlike = free.some((a) => group.filter((g) => g[a] === l[a]).length >= 3);
      if (level === 3 && wrong.length < 2 && !partial) continue;
      used.add(vkey(l));
      wrong.push({
        visual: leafScene(l),
        correct: false,
        errorType: partial ? 'wrong_rule' : looksAlike ? 'transformation' : 'encoding',
        why: partial
          ? 'העלה מקיים רק חלק מהכלל. כל עלי הקבוצה מקיימים את שני התנאים יחד.'
          : `ל${'עלה הזה'} ${ruleAttrs.map((a) => LABELS[a][l[a]]).join(' ו')}, והכלל דורש ${ruleAttrs.map((a) => LABELS[a][(rule as Leaf)[a]]).join(' ו')}.`,
      });
    }
    if (wrong.length < 3) continue;
    const ruleText = ruleAttrs.map((a) => LABELS[a][(rule as Leaf)[a]]).join(' וגם ');
    return {
      dim: '2D',
      prompt: 'ארבעת העלים למעלה שייכים לאותה קבוצה לפי כלל מסוים. איזה עלה נוסף שייך אליה?',
      stimulus: groupScene(group),
      options: [{ visual: leafScene(answer), correct: true, why: `הכלל: ${ruleText}.` }, ...wrong],
      explanation: `הכלל: ${ruleText}. חפשי את מה שמשותף לכל העלים בקבוצה, והתעלמי ממה שמשתנה ביניהם: צבע, זווית, ותכונות שאינן קבועות.`,
    };
  }
}

/* ---------- the fine difference ---------- */

export function specimen(rng: Rng, level: Level): Draft {
  for (;;) {
    const base = randomLeaf(rng, level === 1 ? { margin: 'serrated' } : {});
    const odd = { ...base };
    let what = '';
    const kinds = [
      base.margin === 'serrated' ? 'teeth' : null,
      base.venation === 'pinnate' ? 'veins' : null,
      level < 3 ? 'margin' : null,
      level === 3 ? 'shape' : null,
    ].filter(Boolean) as string[];
    if (!kinds.length) continue;
    const kind = rng.pick(kinds);
    if (kind === 'teeth') {
      odd.teeth = base.teeth + (level === 1 ? 4 : 2) * rng.pick([1, -1]);
      what = 'מספר השיניים בשפת העלה';
    } else if (kind === 'veins') {
      odd.veins = base.veins + rng.pick([1, -1]);
      what = 'מספר העורקים הצדדיים';
    } else if (kind === 'margin') {
      odd.margin = rng.pick(MARGINS.filter((m) => m !== base.margin));
      what = 'צורת השפה';
    } else {
      const near: Record<LeafShape, LeafShape> = { oval: 'round', round: 'oval', lance: 'oval', heart: 'round' };
      odd.shape = near[base.shape];
      what = 'צורת העלה';
    }
    const tilts = rng.shuffle([-16, -6, 5, 14]);
    const same = [0, 1, 2].map((i) => ({ ...base, tilt: tilts[i] }));
    odd.tilt = tilts[3];
    return {
      dim: '2D',
      prompt: 'שלושה עלים זהים במבנה, ואחד שונה. איזה? (הזווית והגוון אינם חלק מהמבנה)',
      stimulus: { kind: 'verbal', mode: 'note', words: ['השווי מבנה: צורה, שפה, עורקים. התעלמי מזווית.'] },
      options: [
        { visual: leafScene(odd), correct: true, why: `השוני: ${what}.` },
        ...same.map<Option>((l) => ({ visual: leafScene(l), correct: false, errorType: 'encoding', why: 'העלה הזה זהה במבנה לשניים אחרים. הזווית שונה, המבנה לא.' })),
      ],
      explanation: 'השוואה טובה נעשית לפי רשימה קבועה: צורה, שפה, עורקים, ובסוף ספירה. ספירת שיניים או עורקים מגלה הבדלים שהעין מחמיצה.',
    };
  }
}

/* ---------- food webs ---------- */

const text = (t: string): TextSpec => ({ kind: 'text', text: t });

export function ecology(rng: Rng, level: Level): Draft {
  for (;;) {
    const web = rng.pick(FOOD_WEBS);
    const eats = (a: string, b: string) => web.eats.some(([x, y]) => x === a && y === b);
    const removed = rng.pick(web.species.map((s) => s.name));
    // one-step effects for level 1, cascades through a middle species for higher levels
    const effects: { who: string; dir: 'up' | 'down'; how: string }[] = [];
    for (const s of web.species.map((x) => x.name)) {
      if (s === removed) continue;
      if (eats(s, removed)) effects.push({ who: s, dir: 'down', how: `${s} אוכלים ${removed}. כשהמזון נעלם, הם מתמעטים.` });
      else if (eats(removed, s)) effects.push({ who: s, dir: 'up', how: `${removed} אוכלים ${s}. כשהטורף נעלם, ${s} מתרבים.` });
      else if (level > 1) {
        const mid = web.species.map((x) => x.name).find((m) => eats(removed, m) && eats(m, s));
        if (mid) effects.push({ who: s, dir: 'down', how: `${removed} אוכלים ${mid}, ו${mid} אוכלים ${s}. בלי ${removed}, ${mid} מתרבים ואוכלים יותר ${s}.` });
      }
    }
    const pool = effects.filter((e) => (level === 1 ? !e.how.includes(', ו') : level === 3 ? e.how.includes(', ו') : true));
    if (!pool.length) continue;
    // skip species with conflicting influences (both a direct and an indirect effect)
    const e = rng.pick(pool);
    if (effects.filter((x) => x.who === e.who).length > 1) continue;
    const opts: Option[] = [
      { visual: text(e.dir === 'up' ? 'יגדל' : 'יקטן'), correct: true, why: e.how },
      { visual: text(e.dir === 'up' ? 'יקטן' : 'יגדל'), correct: false, errorType: 'transformation', why: 'הכיוון הפוך. עקבי אחרי החצים: מי אוכל את מי.' },
      { visual: text('לא ישתנה'), correct: false, errorType: 'encoding', why: 'יש קשר: ' + e.how },
      { visual: text('ייעלם מיד'), correct: false, errorType: 'wrong_rule', why: 'קיצוני מדי. בטווח הקצר האוכלוסייה משתנה, לא נעלמת.' },
    ];
    return {
      dim: '2D',
      prompt: `נניח ש${removed} נעלמים מהאזור. מה יקרה בטווח הקצר לאוכלוסיית ה${e.who}? החץ מצביע ממי שנאכל אל מי שאוכל.`,
      stimulus: webScene(web, removed),
      options: opts,
      explanation: 'טורף שנעלם משחרר את טרפו; מזון שנעלם מדלדל את אוכליו. ובשרשרת: היעלמות של טורף-על מגדילה את הטורף שמתחתיו, וזה מקטין את הטרף שלו.',
    };
  }
}

function webScene(web: (typeof FOOD_WEBS)[number], removed: string): SceneSpec {
  const levels = Math.max(...web.species.map((s) => s.level)) + 1;
  const pos = new Map<string, P2>();
  for (let lv = 0; lv < levels; lv++) {
    const row = web.species.filter((s) => s.level === lv);
    row.forEach((s, i) => pos.set(s.name, [((i + 1) / (row.length + 1)) * 300 - 150, 70 - lv * 55]));
  }
  const prims: Prim[] = [];
  for (const [eater, food] of web.eats) {
    const a = pos.get(food)!;
    const b = pos.get(eater)!;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / d;
    const uy = (b[1] - a[1]) / d;
    prims.push({ p: 'arrow', pts: [[a[0] + ux * 16, a[1] + uy * 12], [b[0] - ux * 16, b[1] - uy * 12]], tone: 'muted', w: 1.4 });
  }
  for (const s of web.species) {
    const [x, y] = pos.get(s.name)!;
    const gone = s.name === removed;
    prims.push({ p: 'rect', x: x - 34, y: y - 11, w: 68, h: 22, rx: 11, fill: gone ? 'bad' : 'paper', tone: gone ? 'bad' : 'ink', sw: 1.2 });
    prims.push({ p: 'text', at: [x, y], text: s.name, size: 9, tone: gone ? '#fff' : 'ink' });
  }
  return { kind: 'scene', box: [-170, -15 - (levels - 1) * 55 + 70 - 30, 340, levels * 55 + 30], prims, label: 'רשת מזון' };
}
