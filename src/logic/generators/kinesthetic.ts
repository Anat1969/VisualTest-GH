// Bodily-kinesthetic drills: hand laterality, body-relative paths, balance of stacked blocks.
import type { Rng } from '../rng';
import type { Level, Option, P2, Prim, SceneSpec } from '../types';
import type { Draft } from './index';

/* ================= hands ================= */

type Hand = 'right' | 'left';
type View = 'back' | 'palm';

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/**
 * A stylised hand, fingers up, in local coords (y down). Thumb on the left when `thumbLeft`.
 * Back view shows nails; palm view shows creases. Right-back and left-palm share an outline.
 */
function handPrims(thumbLeft: boolean, view: View, angle: number): Prim[] {
  const fingers: [number, number][] = [[-16, 30], [-5.5, 35], [5, 32], [15, 25]]; // x, length (index → pinky, thumb-left order)
  const parts: { pts: P2[]; kind: 'skin' | 'nail' | 'crease' | 'cuff' }[] = [];
  parts.push({ pts: rect(-21, 0, 42, 40), kind: 'skin' });
  for (const [x, len] of fingers) {
    parts.push({ pts: rect(x - 4.6, -len, 9.2, len + 4), kind: 'skin' });
    if (view === 'back') parts.push({ pts: rect(x - 3, -len + 1.5, 6, 6), kind: 'nail' });
  }
  // thumb: a slanted bar from the lower palm
  parts.push({ pts: [[-21, 30], [-21, 14], [-36, -2], [-42, 4], [-29, 22]], kind: 'skin' });
  if (view === 'back') parts.push({ pts: [[-38, -1], [-34, -5], [-39, -9], [-43, -5]].map(([x, y]) => [x + 2, y + 6] as P2), kind: 'nail' });
  if (view === 'palm') {
    parts.push({ pts: [[-18, 14], [-6, 10], [8, 12], [19, 8]], kind: 'crease' });
    parts.push({ pts: [[-19, 24], [-8, 20], [6, 24]], kind: 'crease' });
    parts.push({ pts: [[-12, 38], [-14, 28], [-20, 20]], kind: 'crease' });
  }
  parts.push({ pts: rect(-23, 40, 46, 14), kind: 'cuff' });

  const a = (angle * Math.PI) / 180;
  const tf = ([x, y]: P2): P2 => {
    const xx = thumbLeft ? x : -x;
    const yy = y - 10;
    return [xx * Math.cos(a) - yy * Math.sin(a), xx * Math.sin(a) + yy * Math.cos(a)];
  };
  return parts.map((p) => {
    const pts = p.pts.map(tf);
    if (p.kind === 'skin') return { p: 'line', closed: true, pts, fill: '#E9D8C4', tone: 'ink', w: 1.3 } as Prim;
    if (p.kind === 'nail') return { p: 'line', closed: true, pts, fill: '#FBF6EE', tone: 'ink', w: 0.9 } as Prim;
    if (p.kind === 'cuff') return { p: 'line', closed: true, pts, fill: 'stim', tone: 'ink', w: 1.3 } as Prim;
    return { p: 'line', pts, tone: 'muted', w: 1 } as Prim;
  });
}

const LABEL: Record<Hand, string> = { right: 'יד ימין', left: 'יד שמאל' };
const VLABEL: Record<View, string> = { back: 'גב היד', palm: 'כף היד' };

export function hands(rng: Rng, level: Level): Draft {
  const hand: Hand = rng.pick(['right', 'left']);
  const view: View = rng.pick(['back', 'palm']);
  const angles = level === 1 ? [0, 90, 270] : level === 2 ? [45, 90, 135, 180, 225, 270, 315] : [30, 60, 120, 150, 180, 210, 240, 300, 330];
  const angle = rng.pick(angles);
  // right-back and left-palm put the thumb on the left (fingers up)
  const thumbLeft = (hand === 'right') === (view === 'back');
  const stim: SceneSpec = { kind: 'scene', box: [-62, -62, 124, 124], prims: handPrims(thumbLeft, view, angle), label: 'יד מסובבת' };
  const combos: [Hand, View][] = [['right', 'back'], ['right', 'palm'], ['left', 'back'], ['left', 'palm']];
  const options: Option[] = combos.map(([h, v]) => {
    const text = { kind: 'text', text: LABEL[h], sub: VLABEL[v] } as const;
    if (h === hand && v === view) return { visual: text, correct: true, why: `${LABEL[hand]}, ${VLABEL[view]}: ${view === 'back' ? 'רואים ציפורניים' : 'רואים קמטים בכף'} והאגודל ${thumbLeft ? 'משמאל' : 'מימין'} כשהאצבעות למעלה.` };
    if (h !== hand && v !== view)
      return { visual: text, correct: false, errorType: 'encoding', why: `לשתי האפשרויות אותו קו מתאר. ההבדל בפרטים: ${view === 'back' ? 'יש ציפורניים, כלומר רואים את גב היד' : 'יש קמטים, כלומר רואים את כף היד'}.` };
    if (h !== hand) return { visual: text, correct: false, errorType: 'transformation', why: 'היד הלא נכונה: דמייני את היד שלך באותה תנוחה ובדקי באיזה צד האגודל.' };
    return { visual: text, correct: false, errorType: 'wrong_rule', why: `הצד הלא נכון של היד: ${view === 'back' ? 'הציפורניים' : 'הקמטים'} מראים מאיזה צד מסתכלים.` };
  });
  return {
    dim: '2D',
    prompt: 'איזו יד זו, ומאיזה צד רואים אותה?',
    stimulus: stim,
    options,
    explanation:
      'סובבי בדמיון את היד שלך עד שתתאים לתמונה: האצבעות לכיוון האצבעות, האגודל לכיוון האגודל. אחר כך בדקי פרטים: ציפורניים הן גב היד, קמטים הם כף היד. ההרגשה בגוף בזמן הסיבוב היא חלק מהכלי.',
  };
}

/* ================= body-relative path ================= */

type Cmd = { kind: 'fwd'; n: number } | { kind: 'turn'; dir: 'R' | 'L' | 'U' };

function walk(cmds: Cmd[], startHeading = 0): P2[] {
  // headings: 0 up, 1 right, 2 down, 3 left (screen)
  const D: P2[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let h = startHeading;
  let p: P2 = [0, 0];
  const pts: P2[] = [p];
  for (const c of cmds) {
    if (c.kind === 'turn') h = (h + (c.dir === 'R' ? 1 : c.dir === 'L' ? 3 : 2)) % 4;
    else {
      p = [p[0] + D[h][0] * c.n, p[1] + D[h][1] * c.n];
      pts.push(p);
    }
  }
  return pts;
}

function pathScene(pts: P2[]): SceneSpec {
  const S = 12;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(3, Math.max(...xs) - x0);
  const h = Math.max(3, Math.max(...ys) - y0);
  const prims: Prim[] = [];
  for (let gx = 0; gx <= w; gx++) prims.push({ p: 'line', pts: [[(x0 + gx) * S, y0 * S], [(x0 + gx) * S, (y0 + h) * S]], w: 0.4, tone: 'line' });
  for (let gy = 0; gy <= h; gy++) prims.push({ p: 'line', pts: [[x0 * S, (y0 + gy) * S], [(x0 + w) * S, (y0 + gy) * S]], w: 0.4, tone: 'line' });
  prims.push({ p: 'line', pts: pts.map(([x, y]) => [x * S, y * S] as P2), w: 2.4, tone: 'accent' });
  prims.push({ p: 'circle', c: [0, 0], r: 3.6, fill: 'paper', tone: 'ink', w: 1.6 });
  const end = pts[pts.length - 1];
  prims.push({ p: 'rect', x: end[0] * S - 3.2, y: end[1] * S - 3.2, w: 6.4, h: 6.4, fill: 'ink', tone: 'ink', sw: 0 });
  const size = Math.max(w, h) * S + 20;
  return { kind: 'scene', box: [(x0 + w / 2) * S - size / 2, (y0 + h / 2) * S - size / 2, size, size], prims, label: 'מסלול' };
}

const say = (c: Cmd) => (c.kind === 'fwd' ? `${c.n} ${c.n === 1 ? 'צעד' : 'צעדים'} קדימה` : c.dir === 'R' ? 'פנייה ימינה' : c.dir === 'L' ? 'פנייה שמאלה' : 'פנייה לאחור');
const key = (pts: P2[]) => pts.map((p) => p.join(',')).join(';');

export function path(rng: Rng, level: Level): Draft {
  const moves = level === 1 ? 3 : level === 2 ? 4 : 5;
  for (;;) {
    const cmds: Cmd[] = [];
    for (let i = 0; i < moves; i++) {
      if (i > 0) cmds.push({ kind: 'turn', dir: level === 3 && rng.chance(0.2) ? 'U' : rng.pick(['R', 'L'] as const) });
      cmds.push({ kind: 'fwd', n: rng.int(1, 3) });
    }
    const pts = walk(cmds);
    const swapped = walk(cmds.map((c) => (c.kind === 'turn' && c.dir !== 'U' ? { kind: 'turn', dir: c.dir === 'R' ? 'L' : 'R' } : c)));
    const fwdIdx = cmds.map((c, i) => (c.kind === 'fwd' ? i : -1)).filter((i) => i > 0);
    const j = rng.pick(fwdIdx);
    const miscount = walk(cmds.map((c, i) => (i === j && c.kind === 'fwd' ? { kind: 'fwd', n: c.n === 3 ? 2 : c.n + 1 } : c)));
    const rotated = walk(cmds, 1);
    if (new Set([pts, swapped, miscount, rotated].map(key)).size < 4) continue;
    if (Math.max(...pts.map((p) => Math.abs(p[0]) + Math.abs(p[1]))) < 2) continue;
    return {
      dim: '2D',
      prompt: 'את עומדת בעיגול ופנייך למעלה. הולכים לפי ההוראות; פניות הן לפי הגוף שלך. איזה מסלול ייווצר?',
      stimulus: { kind: 'verbal', mode: 'sentences', words: cmds.map(say) },
      options: [
        { visual: pathScene(pts), correct: true, why: 'כל פנייה נעשית ביחס לכיוון שאליו את פונה באותו רגע.' },
        { visual: pathScene(swapped), correct: false, errorType: 'wrong_rule', why: 'ימין ושמאל התחלפו. כשהולכים למטה בדף, ימין של הגוף הוא שמאל של הדף.' },
        { visual: pathScene(miscount), correct: false, errorType: 'encoding', why: 'מספר הצעדים באחד הקטעים שגוי.' },
        { visual: pathScene(rotated), correct: false, errorType: 'transformation', why: 'הכיוון ההתחלתי שגוי: מתחילים בפנים למעלה.' },
      ],
      explanation: 'עקבי אחרי הגוף, לא אחרי הדף: בכל פנייה דמייני שאת מסתובבת במקום. אפשר לסובב את הראש או את הדף, וזה בדיוק המהלך הגופני שהתרגיל מאמן.',
    };
  }
}

/* ================= balance ================= */

interface Block {
  x: number; // left edge
  w: number;
}

/** Index of the first block (from the top) that tips, or -1 when the tower stands. Margin is how close it is. */
export function tipping(stack: Block[]): { at: number; margin: number; topOnly: boolean } {
  let worst = Infinity;
  for (let j = stack.length - 1; j >= 1; j--) {
    const above = stack.slice(j);
    const mass = above.reduce((m, b) => m + b.w, 0);
    const com = above.reduce((s, b) => s + (b.x + b.w / 2) * b.w, 0) / mass;
    const lo = Math.max(stack[j].x, stack[j - 1].x);
    const hi = Math.min(stack[j].x + stack[j].w, stack[j - 1].x + stack[j - 1].w);
    const margin = Math.min(com - lo, hi - com);
    if (margin < 0) {
      // would a check of block j alone have passed?
      const own = stack[j].x + stack[j].w / 2;
      return { at: j, margin, topOnly: own >= lo && own <= hi };
    }
    worst = Math.min(worst, margin);
  }
  return { at: -1, margin: worst, topOnly: false };
}

function randomStack(rng: Rng, n: number): Block[] {
  const s: Block[] = [{ x: 0, w: rng.pick([3, 4, 5]) }];
  for (let i = 1; i < n; i++) {
    const prev = s[i - 1];
    const w = rng.pick([2, 3, 4, 5]);
    const x = prev.x + rng.int(-w + 1, prev.w - 1) + rng.pick([0, 0.5]);
    s.push({ x, w });
  }
  return s;
}

function towerScene(stack: Block[]): SceneSpec {
  const S = 10;
  const prims: Prim[] = stack.map((b, i) => ({ p: 'rect', x: b.x * S, y: -(i + 1) * S, w: b.w * S, h: S, fill: i % 2 ? 'stim' : '#C9D4DF', tone: 'ink', sw: 1.2 }) as Prim);
  const xs = stack.flatMap((b) => [b.x, b.x + b.w]);
  const x0 = Math.min(...xs) * S - 8;
  const x1 = Math.max(...xs) * S + 8;
  prims.unshift({ p: 'line', pts: [[x0 - 10, 0], [x1 + 10, 0]], w: 2 });
  const H = stack.length * S + 14;
  const size = Math.max(x1 - x0 + 20, H + 10);
  return { kind: 'scene', box: [(x0 + x1) / 2 - size / 2, -H + (H - size) / 2 + 4, size, size], prims, label: 'מגדל קוביות' };
}

export function balance(rng: Rng, level: Level): Draft {
  const n = level + 2;
  let stable: Block[] | null = null;
  const falls: { s: Block[]; t: ReturnType<typeof tipping> }[] = [];
  for (let i = 0; i < 4000 && (!stable || falls.length < 3); i++) {
    const s = randomStack(rng, n);
    const t = tipping(s);
    if (t.at === -1 && t.margin > 0.25 && !stable) stable = s;
    else if (t.at !== -1 && t.margin < -0.25 && falls.length < 3) {
      // at the hardest level prefer towers that fool a block-by-block check
      if (level === 3 && falls.length < 2 && !t.topOnly) continue;
      falls.push({ s, t });
    }
  }
  if (!stable || falls.length < 3) return balance(rng, Math.max(1, level - 1) as Level);
  return {
    dim: '2D',
    prompt: 'איזה מגדל יישאר עומד? הקוביות מחומר אחיד, וכל קובייה מונחת על זו שמתחתיה.',
    stimulus: { kind: 'verbal', mode: 'note', words: ['בדקי כל קומה: מרכז הכובד של כל מה שמעליה צריך ליפול על משטח המגע.'] },
    options: [
      { visual: towerScene(stable), correct: true, why: 'בכל קומה, מרכז הכובד של מה שמעליה נופל בתוך משטח המגע.' },
      ...falls.map<Option>(({ s, t }) => ({
        visual: towerScene(s),
        correct: false,
        errorType: t.topOnly ? 'wrong_rule' : t.at === s.length - 1 ? 'encoding' : 'transformation',
        why: t.topOnly
          ? `כל קובייה לבדה נראית נתמכת, אבל יחד, מרכז הכובד של הקוביות שמעל קומה ${t.at} יוצא מחוץ למשטח המגע. צריך לחשב את כל מה שמעל.`
          : `הקובייה בקומה ${t.at + 1} בולטת יותר מדי: מרכז הכובד שלה ושל מה שמעליה מחוץ למשטח המגע.`,
      })),
    ],
    explanation: 'מגדל עומד כל עוד בכל קומה, מרכז הכובד של כל הקוביות שמעליה נמצא מעל משטח המגע. גם ממש בקצה הוא עדיין עומד; מעבר לו, הוא נופל.',
  };
}
