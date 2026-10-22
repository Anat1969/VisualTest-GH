// Technical understanding: gear trains, balance beams, intuitive physics.
import type { Rng } from '../rng';
import type { Level, Motion, Option, P2, Prim, SceneSpec, TextSpec } from '../types';
import type { Draft } from './index';

const text = (t: string, sub?: string): TextSpec => ({ kind: 'text', text: t, sub });
const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

/* ================= mechanics: gears and belts ================= */

type Link = 'mesh' | 'belt' | 'cross' | 'shaft';

interface Wheel {
  c: P2;
  r: number;
  teeth: number;
  label: string;
}

const TEETH = [8, 10, 12, 16, 20, 24];
/** Radius proportional to tooth count, so belt ratios and gear ratios read the same way. */
const radiusOf = (teeth: number) => teeth * 1.3;

/** Speed and direction of every wheel, given the first turns clockwise at speed 1. */
export function solveTrain(wheels: Wheel[], links: Link[]): { dir: number; speed: number }[] {
  const out = [{ dir: 1, speed: 1 }];
  for (let i = 1; i < wheels.length; i++) {
    const prev = out[i - 1];
    const a = wheels[i - 1];
    const b = wheels[i];
    const l = links[i - 1];
    if (l === 'shaft') out.push({ ...prev });
    else if (l === 'mesh') out.push({ dir: -prev.dir, speed: (prev.speed * a.teeth) / b.teeth });
    else out.push({ dir: l === 'cross' ? -prev.dir : prev.dir, speed: (prev.speed * a.teeth) / b.teeth });
  }
  return out;
}

function buildTrain(rng: Rng, level: Level): { wheels: Wheel[]; links: Link[] } {
  const plan: Link[] =
    level === 1
      ? Array.from({ length: rng.int(1, 2) }, () => 'mesh' as Link)
      : level === 2
        ? rng.shuffle(['mesh', rng.pick<Link>(['belt', 'cross']), ...(rng.chance(0.5) ? ['mesh' as Link] : [])])
        : rng.shuffle(['mesh', 'shaft', rng.pick<Link>(['belt', 'cross']), 'mesh']);
  // a shaft cannot be first or last in a chain drawing; keep it in the middle
  if (plan[0] === 'shaft') plan.push(plan.shift()!);
  if (plan[plan.length - 1] === 'shaft') plan.splice(1, 0, plan.pop()!);

  const wheels: Wheel[] = [];
  let teeth = rng.pick(TEETH);
  wheels.push({ c: [0, 0], r: radiusOf(teeth), teeth, label: LETTERS[0] });
  for (let i = 0; i < plan.length; i++) {
    const prev = wheels[i];
    const l = plan[i];
    teeth = rng.pick(TEETH.filter((t) => t !== prev.teeth));
    const r = radiusOf(teeth);
    let c: P2 = [0, 0];
    for (let tries = 0; tries < 30; tries++) {
      if (l === 'mesh') {
        const ang = (rng.int(-22, 22) * Math.PI) / 180;
        const dist = prev.r + r - 2.2;
        c = [prev.c[0] + dist * Math.cos(ang), prev.c[1] + dist * Math.sin(ang)];
      } else if (l === 'shaft') c = [prev.c[0] + prev.r + r + 26, prev.c[1]];
      else c = [prev.c[0] + prev.r + r + rng.int(26, 40), prev.c[1] + rng.int(-8, 8)];
      // keep clear of every wheel except the one it engages
      const clear = wheels.slice(0, -1).every((w) => Math.hypot(w.c[0] - c[0], w.c[1] - c[1]) > w.r + r + 6);
      if (clear) break;
    }
    wheels.push({ c, r, teeth, label: LETTERS[i + 1] });
  }
  return { wheels, links: plan };
}

function trainPrims(wheels: Wheel[], links: Link[], spins: number[] | null, cover: number | null): Prim[] {
  const prims: Prim[] = [];
  // belts first (behind wheels)
  links.forEach((l, i) => {
    if (l !== 'belt' && l !== 'cross') return;
    const a = wheels[i];
    const b = wheels[i + 1];
    const top = (w: Wheel): P2 => [w.c[0], w.c[1] - w.r * 0.9];
    const bot = (w: Wheel): P2 => [w.c[0], w.c[1] + w.r * 0.9];
    if (l === 'belt') {
      prims.push({ p: 'line', pts: [top(a), top(b)], w: 2.2, tone: 'muted' });
      prims.push({ p: 'line', pts: [bot(a), bot(b)], w: 2.2, tone: 'muted' });
    } else {
      prims.push({ p: 'line', pts: [top(a), bot(b)], w: 2.2, tone: 'muted' });
      prims.push({ p: 'line', pts: [bot(a), top(b)], w: 2.2, tone: 'muted' });
    }
  });
  links.forEach((l, i) => {
    if (l !== 'shaft') return;
    const a = wheels[i].c;
    const b = wheels[i + 1].c;
    prims.push({ p: 'line', pts: [a, b], w: 5, tone: 'ink' });
    prims.push({ p: 'line', pts: [a, b], w: 2.4, tone: 'paper' });
    prims.push({ p: 'text', at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 12], text: 'ציר משותף', size: 9, tone: 'muted' });
  });
  for (let i = 0; i < wheels.length; i++) {
    const w = wheels[i];
    const spin = spins ? spins[i] : 0;
    const anim = spins ? { spin, c: w.c } : undefined;
    const isTarget = i === wheels.length - 1;
    const label = w.label;
    prims.push({ p: 'gear', c: w.c, r: w.r, teeth: w.teeth, fill: isTarget ? 'accentSoft' : 'stim', label, anim, when: cover === i ? 'reveal' : undefined });
    if (cover === i) {
      prims.push({ p: 'circle', c: w.c, r: w.r, fill: 'sunk', tone: 'line', w: 1, when: 'pre' });
      prims.push({ p: 'text', at: w.c, text: '?', size: w.r * 0.9, tone: 'muted', when: 'pre' });
      prims.push({ p: 'text', at: [w.c[0], w.c[1] - w.r - 11], text: w.label, size: 15, weight: 700, when: 'pre' });
    }
  }
  return prims;
}

function inputArrow(w: Wheel): Prim {
  const R = w.r + 7;
  const pts: P2[] = Array.from({ length: 12 }, (_, i) => {
    const a = (-150 + i * 9) * (Math.PI / 180);
    return [w.c[0] + R * Math.cos(a), w.c[1] + R * Math.sin(a)] as P2;
  });
  return { p: 'arrow', pts, tone: 'bad', w: 2 };
}

function boxOf(wheels: Wheel[]): [number, number, number, number] {
  const x0 = Math.min(...wheels.map((w) => w.c[0] - w.r)) - 18;
  const x1 = Math.max(...wheels.map((w) => w.c[0] + w.r)) + 18;
  const y0 = Math.min(...wheels.map((w) => w.c[1] - w.r)) - 30;
  const y1 = Math.max(...wheels.map((w) => w.c[1] + w.r)) + 22;
  const h = Math.max(y1 - y0, (x1 - x0) / 2.4);
  return [x0, (y0 + y1) / 2 - h / 2, x1 - x0, h];
}

const dirWord = (d: number) => (d > 0 ? 'עם כיוון השעון' : 'נגד כיוון השעון');
const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 0.01 ? String(Math.round(x)) : x.toFixed(2).replace(/0$/, ''));

export function mechanics(rng: Rng, level: Level, motion: Motion): Draft {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { wheels, links } = buildTrain(rng, level);
    const sol = solveTrain(wheels, links);
    const last = sol[sol.length - 1];
    if (Math.abs(last.speed - 1) < 0.05) continue; // need "faster" or "slower" to be decidable
    const target = wheels[wheels.length - 1];
    const options: Option[] =
      level < 3
        ? (() => {
            const sp = (s: number) => (s > 1 ? 'מהר יותר' : 'לאט יותר');
            const inv = last.speed > 1 ? 0.5 : 2;
            return [
              { visual: text(dirWord(last.dir), sp(last.speed)), correct: true, why: 'הכיוון והמהירות נכונים.' },
              { visual: text(dirWord(-last.dir), sp(last.speed)), correct: false, errorType: 'transformation', why: 'הכיוון הפוך. כל מגע בין שני גלגלי שיניים הופך כיוון; רצועה ישרה שומרת עליו ורצועה מוצלבת הופכת.' },
              { visual: text(dirWord(last.dir), sp(inv)), correct: false, errorType: 'wrong_rule', why: 'המהירות הפוכה. גלגל קטן מסתובב מהר יותר מגלגל גדול שמניע אותו.' },
              { visual: text(dirWord(-last.dir), sp(inv)), correct: false, errorType: 'encoding', why: 'גם הכיוון וגם המהירות הפוכים.' },
            ] as Option[];
          })()
        : (() => {
            const turns = last.speed;
            const alt = rng.shuffle([1 / turns, turns * 2, turns / 2].filter((v) => Math.abs(v - turns) > 0.05 && Math.abs(v - 1) > 0.01));
            return [
              { visual: text(`${fmt(turns)} סיבובים`, dirWord(last.dir)), correct: true, why: 'יחס ההעברה ממכפלת היחסים בכל שלב, והכיוון ממספר ההיפוכים.' },
              { visual: text(`${fmt(turns)} סיבובים`, dirWord(-last.dir)), correct: false, errorType: 'transformation', why: 'מספר הסיבובים נכון, הכיוון הפוך.' },
              { visual: text(`${fmt(alt[0])} סיבובים`, dirWord(last.dir)), correct: false, errorType: 'wrong_rule', why: 'יחס ההעברה חושב הפוך או לא הוכפל בכל שלב. בציר משותף שני הגלגלים מסתובבים יחד.' },
              { visual: text(`${fmt(alt[1] ?? turns * 3)} סיבובים`, dirWord(-last.dir)), correct: false, errorType: 'encoding', why: 'גם היחס וגם הכיוון שגויים.' },
            ] as Option[];
          })();
    if (new Set(options.map((o) => JSON.stringify(o.visual))).size < 4) continue;

    const base: Prim[] = trainPrims(wheels, links, null, null);
    const stim: SceneSpec = { kind: 'scene', box: boxOf(wheels), prims: [...base, inputArrow(wheels[0])], label: 'מערכת גלגלי שיניים' };
    const spins = sol.map((s) => s.dir * s.speed * 120);
    const dyn: SceneSpec = { ...stim, prims: [...trainPrims(wheels, links, spins, wheels.length - 1), inputArrow(wheels[0])] };
    const toothNote = level === 3 ? ' מספר השיניים: ' + wheels.map((w) => `${w.label} ${w.teeth}`).join(', ') + '.' : '';
    return {
      dim: '2D',
      prompt:
        (level < 3
          ? `גלגל ${wheels[0].label} מסתובב עם כיוון השעון. איך יסתובב גלגל ${target.label} ביחס אליו?`
          : `גלגל ${wheels[0].label} עושה סיבוב אחד עם כיוון השעון. כמה סיבובים יעשה גלגל ${target.label}, ובאיזה כיוון?`) + toothNote,
      stimulus: stim,
      dynamic: motion === 'dynamic' ? { kind: 'scene', scene: dyn, durationMs: 2200, revealMs: 2200 } : undefined,
      options,
      explanation:
        'כיוון: כל מגע ישיר בין גלגלי שיניים הופך את הכיוון, רצועה ישרה שומרת עליו, רצועה מוצלבת הופכת, וציר משותף שומר. מהירות: יחס השיניים (או הקטרים) בין המניע למונע; גלגל קטן מסתובב מהר יותר.',
    };
  }
  throw new Error('mechanics: could not build an item');
}

/* ================= statics: balance beam ================= */

interface Load {
  pos: number; // negative = left of the pivot
  w: number;
}

function beamScene(loads: Load[], unknown: { pos: number } | null, extra: Prim[] = []): SceneSpec {
  const U = 18;
  const prims: Prim[] = [
    { p: 'line', closed: true, pts: [[0, 6], [-12, 30], [12, 30]], fill: 'stim', w: 1.4 },
    { p: 'line', pts: [[-40, 30], [40, 30]], w: 1.4, tone: 'muted' },
    { p: 'rect', x: -5 * U, y: 0, w: 10 * U, h: 6, fill: 'ink', tone: 'ink', sw: 0.5, rx: 1 },
  ];
  for (let k = -5; k <= 5; k++) if (k) prims.push({ p: 'line', pts: [[k * U, 6], [k * U, 9]], w: 1, tone: 'muted' });
  for (let k = -5; k <= 5; k++) if (k) prims.push({ p: 'text', at: [k * U, -7], text: String(Math.abs(k)), size: 8, tone: 'muted', weight: 500 });
  const hang = (pos: number, label: string, h: number, fill: string) => {
    const x = pos * U;
    prims.push({ p: 'line', pts: [[x, 6], [x, 26]], w: 1, tone: 'ink' });
    prims.push({ p: 'rect', x: x - 9, y: 26, w: 18, h, fill, tone: 'ink', sw: 1.2, rx: 2 });
    prims.push({ p: 'text', at: [x, 26 + h / 2], text: label, size: 10, weight: 700 });
  };
  for (const l of loads) hang(l.pos, String(l.w), 12 + l.w * 1.6, 'stim');
  if (unknown) hang(unknown.pos, '?', 22, 'accentSoft');
  return { kind: 'scene', box: [-5.7 * U, -18, 11.4 * U, 92], prims: [...prims, ...extra], label: 'קורה על ציר' };
}

const moment = (loads: Load[]) => loads.reduce((s, l) => s + l.pos * l.w, 0);

export function statics(rng: Rng, level: Level): Draft {
  for (let attempt = 0; attempt < 400; attempt++) {
    const nLeft = level === 1 ? 1 : 2;
    const nRight = level === 3 ? 1 : level === 2 ? rng.int(0, 1) : 0;
    const used = new Set<number>();
    const put = (side: -1 | 1): Load | null => {
      for (let i = 0; i < 10; i++) {
        const pos = side * rng.int(1, 5);
        if (!used.has(pos)) {
          used.add(pos);
          return { pos, w: rng.int(1, 6) };
        }
      }
      return null;
    };
    const loads = [...Array.from({ length: nLeft }, () => put(-1)), ...Array.from({ length: nRight }, () => put(1))];
    if (loads.some((l) => !l)) continue;
    const L = loads as Load[];
    const m = -moment(L); // the unknown must supply this moment on the right (positive side)
    if (m <= 0) continue;

    if (level < 3) {
      const pos = rng.int(1, 5);
      if (used.has(pos) || m % pos !== 0) continue;
      const w = m / pos;
      if (w > 12) continue;
      const sumLeft = L.filter((l) => l.pos < 0).reduce((s, l) => s + l.w, 0) - L.filter((l) => l.pos > 0).reduce((s, l) => s + l.w, 0);
      const inverted = Math.round((m / pos) * (pos / Math.max(1, Math.abs(L[0].pos))) * 10) / 10;
      const cands = [
        { v: sumLeft, errorType: 'wrong_rule' as const, why: 'זה איזון של משקלים בלבד. במנוף, משקל כפול מרחק מהציר (מומנט) הוא שצריך להתאזן.' },
        { v: inverted, errorType: 'transformation' as const, why: 'היחס בין המרחקים חושב הפוך: רחוק יותר מהציר צריך משקל קטן יותר.' },
        { v: w + rng.pick([-2, -1, 1, 2]), errorType: 'encoding' as const, why: 'קרוב, אבל החישוב או קריאת המרחקים לא מדויקים.' },
        { v: w * 2, errorType: 'encoding' as const, why: 'כפול מהנדרש: הקורה תיפול ימינה.' },
      ];
      const seen = new Set([w]);
      const picked = cands.filter((c) => c.v > 0 && !seen.has(c.v) && (seen.add(c.v), true)).slice(0, 3);
      if (picked.length < 3) continue;
      return {
        dim: '2D',
        prompt: 'איזה משקל צריך לתלות במקום המסומן כדי שהקורה תהיה מאוזנת? המספרים על הקורה הם מרחקים מהציר.',
        stimulus: beamScene(L, { pos }),
        options: [
          { visual: text(`${w} ק״ג`), correct: true, why: `המומנט משמאל הוא ${m}. ${m} חלקי מרחק ${pos} = ${w}.` },
          ...picked.map((c) => ({ visual: text(`${c.v} ק״ג`), correct: false, errorType: c.errorType, why: c.why }) as Option),
        ],
        explanation: 'קורה מאוזנת כשסכום (משקל × מרחק) משמאל לציר שווה לסכום מימין. חשבי את הצד הידוע, וחלקי במרחק של המקום המסומן.',
      };
    }

    // level 3: where to hang a known weight
    const w = rng.int(2, 6);
    if (m % w !== 0) continue;
    const pos = m / w;
    if (pos < 1 || pos > 5 || used.has(pos)) continue;
    const cands = [
      { v: Math.round((L.reduce((s, l) => s + (l.pos < 0 ? l.w : -l.w), 0) / w) * 10) / 10, errorType: 'wrong_rule' as const, why: 'כאן איזנו משקלים במקום מומנטים.' },
      { v: 6 - pos, errorType: 'transformation' as const, why: 'המרחק נמדד מקצה הקורה במקום מהציר.' },
      { v: pos + rng.pick([-1, 1]), errorType: 'encoding' as const, why: 'מקום סמוך: המומנט לא יתאזן בדיוק.' },
      { v: pos * 2, errorType: 'encoding' as const, why: 'רחוק פי שניים מהנדרש.' },
    ];
    const seen = new Set([pos]);
    const picked = cands.filter((c) => c.v > 0 && c.v <= 5 && !seen.has(c.v) && (seen.add(c.v), true)).slice(0, 3);
    if (picked.length < 3) continue;
    return {
      dim: '2D',
      prompt: `באיזה מרחק מימין לציר צריך לתלות משקל של ${w} ק״ג כדי שהקורה תהיה מאוזנת?`,
      stimulus: beamScene(L, null),
      options: [
        { visual: text(`במרחק ${pos}`), correct: true, why: `המומנט החסר הוא ${m}, ו-${w} × ${pos} = ${m}.` },
        ...picked.map((c) => ({ visual: text(`במרחק ${c.v}`), correct: false, errorType: c.errorType, why: c.why }) as Option),
      ],
      explanation: 'חשבי את המומנט נטו: משקל × מרחק לכל צד. המשקל החדש צריך לספק בדיוק את ההפרש: מרחק = הפרש המומנטים ÷ המשקל.',
    };
  }
  throw new Error('statics: could not build an item');
}

/* ================= intuitive physics ================= */

type PhysScenario = 'water' | 'tube' | 'cliff' | 'pendulum';

const SCEN: Record<Level, PhysScenario[]> = {
  1: ['water', 'cliff'],
  2: ['water', 'tube', 'cliff'],
  3: ['tube', 'pendulum', 'water'],
};
const DYN: Record<Level, PhysScenario[]> = { 1: ['cliff', 'tube'], 2: ['tube', 'cliff', 'pendulum'], 3: ['pendulum', 'tube'] };

const box: [number, number, number, number] = [0, 0, 120, 120];
const scene = (prims: Prim[], label: string): SceneSpec => ({ kind: 'scene', box, prims, label });
const pathPrim = (pts: P2[]): Prim => ({ p: 'line', pts, w: 2.4, tone: 'accent', dash: true });

function rot(p: P2, c: P2, a: number): P2 {
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
}

/** Water in a tilted rectangular glass: polygon of the water for a surface given by angle (radians, screen). */
function waterPoly(glass: P2[], surfaceAngle: number, fill: number): P2[] {
  const n: P2 = [Math.sin(surfaceAngle), -Math.cos(surfaceAngle)]; // "up" normal of the surface
  const clip = (c: number) => {
    const out: P2[] = [];
    for (let i = 0; i < glass.length; i++) {
      const a = glass[i];
      const b = glass[(i + 1) % glass.length];
      const fa = c - (a[0] * n[0] + a[1] * n[1]);
      const fb = c - (b[0] * n[0] + b[1] * n[1]);
      if (fa >= 0) out.push(a);
      if (fa * fb < 0) out.push([a[0] + (b[0] - a[0]) * (fa / (fa - fb)), a[1] + (b[1] - a[1]) * (fa / (fa - fb))]);
    }
    return out;
  };
  const area = (p: P2[]) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
  const total = area(glass);
  const proj = glass.map((p) => p[0] * n[0] + p[1] * n[1]);
  let lo = Math.min(...proj);
  let hi = Math.max(...proj);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (area(clip(mid)) < fill * total) lo = mid;
    else hi = mid;
  }
  return clip((lo + hi) / 2);
}

function waterItem(rng: Rng, level: Level): { stim: SceneSpec; options: Option[]; prompt: string; explanation: string } {
  const tilt = ((rng.pick([1, -1]) * rng.int(level === 3 ? 30 : 18, level === 3 ? 45 : 32)) * Math.PI) / 180;
  const c: P2 = [60, 70];
  const glass = ([[-18, -32], [18, -32], [18, 32], [-18, 32]] as P2[]).map(([x, y]) => rot([c[0] + x, c[1] + y], c, tilt));
  const fill = 0.5;
  const draw = (surface: number, f = fill): SceneSpec =>
    scene(
      [
        { p: 'line', pts: [[10, 112], [110, 112]], w: 1.2, tone: 'muted' },
        { p: 'line', closed: true, pts: waterPoly(glass, surface, f), fill: 'water', tone: 'none', w: 0 },
        { p: 'line', closed: true, pts: glass, w: 2, fill: 'none' },
      ],
      'כוס מוטה עם מים',
    );
  const stim = scene(
    [
      { p: 'line', closed: true, pts: ([[-18, -32], [18, -32], [18, 32], [-18, 32]] as P2[]).map(([x, y]) => [c[0] + x, c[1] + y] as P2), w: 2 },
      { p: 'line', closed: true, pts: waterPoly(([[-18, -32], [18, -32], [18, 32], [-18, 32]] as P2[]).map(([x, y]) => [c[0] + x, c[1] + y] as P2), 0, fill), fill: 'water', tone: 'none', w: 0 },
      { p: 'arrow', pts: [[92, 40], [102, 52], [98, 68]], tone: 'bad', w: 1.8 },
    ],
    'כוס זקופה עם מים',
  );
  return {
    stim,
    prompt: `מטים את הכוס ב-${Math.round(Math.abs((tilt * 180) / Math.PI))}°. איך ייראו המים?`,
    options: [
      { visual: draw(0), correct: true, why: 'פני המים נשארים אופקיים, בכל זווית של הכוס.' },
      { visual: draw(tilt), correct: false, errorType: 'wrong_rule', why: 'פני המים כאן מקבילים לתחתית הכוס. כוח הכובד מושך אנכית, ולכן פני המים אופקיים.' },
      { visual: draw(tilt / 2), correct: false, errorType: 'transformation', why: 'פני המים נוטים חלקית. הם אופקיים לגמרי.' },
      { visual: draw(0, 0.75), correct: false, errorType: 'encoding', why: 'פני המים אופקיים, אבל כמות המים גדלה. הנפח לא משתנה בהטיה.' },
    ],
    explanation: 'נוזל במנוחה מסדר את פניו בניצב לכוח הכובד: תמיד אופקי, בלי קשר לצורת הכלי או לזווית שלו. הנפח נשמר.',
  };
}

function tubeItem(rng: Rng, motion: Motion) {
  // ball moves through a circular tube (seen from above, no gravity in the plane) and exits
  const C: P2 = [60, 60];
  const R = 30;
  const start = rng.pick([90, 180, 0, 270]);
  const span = rng.pick([90, 180, 270]);
  const dir = rng.pick([1, -1]);
  const angAt = (k: number) => ((start + dir * span * k) * Math.PI) / 180;
  const arc: P2[] = Array.from({ length: 30 }, (_, i) => [C[0] + R * Math.cos(angAt(i / 29)), C[1] + R * Math.sin(angAt(i / 29))] as P2);
  const exit = arc[arc.length - 1];
  const a = angAt(1);
  const tangent: P2 = [-Math.sin(a) * dir, Math.cos(a) * dir];
  const radial: P2 = [Math.cos(a), Math.sin(a)];
  const L = 34;
  const end = (v: P2): P2[] => [exit, [exit[0] + v[0] * L, exit[1] + v[1] * L]];
  const curve: P2[] = Array.from({ length: 12 }, (_, i) => {
    const t = ((start + dir * (span + (i * 60) / 11)) * Math.PI) / 180;
    return [C[0] + R * Math.cos(t), C[1] + R * Math.sin(t)] as P2;
  });
  const skew: P2 = [tangent[0] * 0.7 + radial[0] * 0.7, tangent[1] * 0.7 + radial[1] * 0.7];
  const tube: Prim[] = [
    { p: 'line', pts: arc, w: 7, tone: 'line' },
    { p: 'line', pts: arc, w: 4.4, tone: 'paper' },
  ];
  const draw = (path: P2[]): SceneSpec => scene([...tube, pathPrim(path), { p: 'circle', c: exit, r: 3, fill: 'ink', w: 0 }], 'צינור מעוקל, מבט מלמעלה');
  const ballPlay: Prim = { p: 'circle', c: arc[0], r: 3.4, fill: 'ink', w: 0, anim: { path: arc, revealPath: end(tangent) } };
  return {
    stim: scene([...tube, { p: 'circle', c: arc[0], r: 3.4, fill: 'ink', w: 0 }, { p: 'arrow', pts: [arc[2], arc[6]], tone: 'bad', w: 1.6 }], 'צינור מעוקל, מבט מלמעלה'),
    dyn: motion === 'dynamic' ? scene([...tube, ballPlay], 'כדור בצינור') : undefined,
    prompt: 'כדור נורה לתוך צינור מעוקל שמונח על שולחן (מבט מלמעלה). באיזה מסלול ינוע אחרי היציאה?',
    options: [
      { visual: draw(end(tangent)), correct: true, why: 'ביציאה אין עוד כוח שמכופף את המסלול, והכדור ממשיך בקו ישר בכיוון התנועה האחרון.' },
      { visual: draw(curve), correct: false, errorType: 'wrong_rule', why: 'אין "זיכרון" של עיקול. בלי הדופן, אין כוח שימשיך לכופף את המסלול.' },
      { visual: draw(end(radial)), correct: false, errorType: 'transformation', why: 'הכדור לא נזרק החוצה מהמרכז. הוא ממשיך בכיוון שבו נע ברגע היציאה.' },
      { visual: draw(end(skew)), correct: false, errorType: 'encoding', why: 'קו ישר נכון, אבל בזווית שגויה: הכיוון הוא המשיק לצינור בנקודת היציאה.' },
    ] as Option[],
    explanation: 'חוק ההתמדה: גוף ממשיך בקו ישר כל עוד אין כוח שפועל עליו. הדופן היא שכופפה את המסלול; ביציאה המסלול ממשיך במשיק.',
  };
}

function cliffItem(rng: Rng, motion: Motion) {
  const h = rng.int(45, 70);
  const edge: P2 = [42, 112 - h];
  const v = rng.int(18, 30); // horizontal reach factor
  const parabola: P2[] = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return [edge[0] + v * 2.2 * t, edge[1] + h * t * t] as P2;
  });
  const land = parabola[parabola.length - 1];
  const ground: Prim[] = [
    { p: 'line', closed: true, pts: [[0, edge[1]], edge, [edge[0], 112], [0, 112]], fill: 'sunk', w: 1.4 },
    { p: 'line', pts: [[0, 112], [120, 112]], w: 1.4 },
  ];
  const draw = (path: P2[]): SceneSpec => scene([...ground, pathPrim(path), { p: 'circle', c: edge, r: 3.4, fill: 'ink', w: 0 }], 'כדור בקצה שולחן');
  const roadRunner: P2[] = [edge, [land[0], edge[1]], [land[0], 112]];
  const straight: P2[] = [edge, land];
  const back: P2[] = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return [edge[0] + v * 1.6 * Math.sin(t * 2.2), edge[1] + h * t] as P2;
  });
  const roll: P2[] = [[6, edge[1] - 3.4], [edge[0], edge[1] - 3.4]];
  return {
    stim: scene([...ground, { p: 'circle', c: [edge[0] - 14, edge[1] - 3.4], r: 3.4, fill: 'ink', w: 0 }, { p: 'arrow', pts: [[edge[0] - 30, edge[1] - 12], [edge[0] - 12, edge[1] - 12]], tone: 'bad', w: 1.6 }], 'כדור מתגלגל על שולחן'),
    dyn:
      motion === 'dynamic'
        ? scene([...ground, { p: 'circle', c: roll[0], r: 3.4, fill: 'ink', w: 0, anim: { path: roll, revealPath: parabola.map(([x, y]) => [x, y - 3.4] as P2) } }], 'כדור מתגלגל לקצה')
        : undefined,
    prompt: 'כדור מתגלגל במהירות קבועה ויוצא מקצה השולחן. באיזה מסלול ייפול?',
    options: [
      { visual: draw(parabola), correct: true, why: 'המהירות האופקית נשמרת והנפילה מואצת: מסלול פרבולי.' },
      { visual: draw(roadRunner), correct: false, errorType: 'wrong_rule', why: 'אין שלב שבו הכדור "מרחף" ואז נופל. הנפילה מתחילה מיד ביציאה מהשולחן.' },
      { visual: draw(straight), correct: false, errorType: 'encoding', why: 'קו ישר אלכסוני מתעלם מהתאוצה: הנפילה מהירה יותר ככל שהזמן עובר, ולכן המסלול מתעקל.' },
      { visual: draw(back), correct: false, errorType: 'transformation', why: 'הכדור לא חוזר לכיוון השולחן. אין כוח אופקי שמושך אותו אחורה.' },
    ] as Option[],
    explanation: 'שתי תנועות בלתי תלויות: אופקית במהירות קבועה, ואנכית מואצת בגלל הכובד. השילוב יוצר פרבולה שמתחילה אופקית ומתכופפת למטה.',
  };
}

function pendulumItem(rng: Rng, motion: Motion) {
  const pivot: P2 = [60, 12];
  const L = 52;
  const amp = (rng.int(35, 50) * Math.PI) / 180;
  const atBottom = rng.chance(0.5);
  const side = rng.pick([1, -1]);
  const ang = atBottom ? 0 : side * amp;
  const bob: P2 = [pivot[0] + L * Math.sin(ang), pivot[1] + L * Math.cos(ang)];
  const g = 112;
  const fallStraight: P2[] = [bob, [bob[0], g]];
  const vx = side * 40;
  const projectile: P2[] = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    return [bob[0] - vx * t * (atBottom ? 1 : 0.6), bob[1] + (g - bob[1]) * t * t] as P2;
  });
  const arcCont: P2[] = Array.from({ length: 12 }, (_, i) => {
    const a = ang - side * (i / 11) * amp * (atBottom ? 1 : 1.2);
    return [pivot[0] + L * Math.sin(a), pivot[1] + L * Math.cos(a)] as P2;
  });
  const tangentLine: P2[] = [bob, [bob[0] - side * 40, bob[1]]];
  const rig: Prim[] = [
    { p: 'line', pts: [[30, 12], [90, 12]], w: 2 },
    { p: 'line', pts: [pivot, bob], w: 1, tone: 'muted', dash: true },
    { p: 'line', pts: [[0, g], [120, g]], w: 1.2, tone: 'muted' },
  ];
  const draw = (path: P2[]): SceneSpec => scene([...rig, pathPrim(path), { p: 'circle', c: bob, r: 4, fill: 'ink', w: 0 }], 'מטוטלת שהחוט שלה נחתך');
  // the bob swings into the cut point from the side it is coming from
  const [a0, a1] = atBottom ? [side * amp, 0] : [0, side * amp];
  const swing: P2[] = Array.from({ length: 16 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 15;
    return [pivot[0] + L * Math.sin(a), pivot[1] + L * Math.cos(a)] as P2;
  });
  const where = atBottom ? 'בנקודה הנמוכה ביותר' : 'בנקודה הגבוהה ביותר, כשהיא נעצרת לרגע';
  const options: Option[] = atBottom
    ? [
        { visual: draw(projectile), correct: true, why: 'בנקודה הנמוכה המהירות אופקית ומרבית: הגוף ממשיך אופקית ונופל בפרבולה.' },
        { visual: draw(fallStraight), correct: false, errorType: 'wrong_rule', why: 'נפילה ישרה מתאימה לגוף בלי מהירות. כאן הגוף נע במהירות מרבית.' },
        { visual: draw(arcCont), correct: false, errorType: 'transformation', why: 'בלי החוט אין כוח שמכופף את המסלול לקשת.' },
        { visual: draw(tangentLine), correct: false, errorType: 'encoding', why: 'הכיוון ההתחלתי נכון, אבל הכובד ממשיך לפעול והמסלול מתעקל למטה.' },
      ]
    : [
        { visual: draw(fallStraight), correct: true, why: 'בנקודת הקיצון המהירות היא אפס, ולכן הגוף נופל ישר למטה.' },
        { visual: draw(projectile), correct: false, errorType: 'wrong_rule', why: 'פרבולה דורשת מהירות התחלתית. בנקודת הקיצון הגוף עומד לרגע.' },
        { visual: draw(arcCont), correct: false, errorType: 'transformation', why: 'בלי החוט אין כוח שמחזיר את הגוף בקשת.' },
        { visual: draw(tangentLine), correct: false, errorType: 'encoding', why: 'אין מהירות אופקית בנקודת הקיצון.' },
      ];
  return {
    stim: draw([]),
    dyn:
      motion === 'dynamic'
        ? scene([rig[0], rig[2], { p: 'circle', c: swing[0], r: 4, fill: 'ink', w: 0, anim: { path: swing, revealPath: atBottom ? projectile : fallStraight } }], 'מטוטלת בתנועה')
        : undefined,
    prompt: `החוט של המטוטלת נחתך ${where}. באיזה מסלול ינוע הגוף?`,
    options,
    explanation: 'ברגע החיתוך הגוף שומר על המהירות שהייתה לו באותו רגע, ומשם רק הכובד פועל. בקיצון המהירות אפס, ובנקודה הנמוכה היא אופקית ומרבית.',
  };
}

export function physics(rng: Rng, level: Level, motion: Motion): Draft {
  const kind = rng.pick(motion === 'dynamic' ? DYN[level] : SCEN[level]);
  const it =
    kind === 'water' ? { ...waterItem(rng, level), dyn: undefined as SceneSpec | undefined } : kind === 'tube' ? tubeItem(rng, motion) : kind === 'cliff' ? cliffItem(rng, motion) : pendulumItem(rng, motion);
  return {
    dim: '2D',
    prompt: it.prompt,
    stimulus: it.stim,
    dynamic: it.dyn ? { kind: 'scene', scene: it.dyn, durationMs: 1400, revealMs: 1100 } : undefined,
    options: it.options,
    explanation: it.explanation,
  };
}
