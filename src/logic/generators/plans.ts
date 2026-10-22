// Plans and elevations: a block building on a grid, read as top / front / side views.
import { I3, axisAngle, roundM } from '../geometry';
import type { Rng } from '../rng';
import { center3 } from '../shapes';
import type { Cubes3DSpec, Level, Motion, Option, Prim, SceneSpec, V3 } from '../types';
import type { Draft } from './index';

type Heights = number[][]; // [y][x], y = 0 is the front row

const SIZE: Record<Level, [number, number, number]> = { 1: [3, 2, 2], 2: [3, 3, 3], 3: [4, 3, 3] }; // w, d, max h

function randomHeights(rng: Rng, level: Level): Heights {
  const [w, d, hmax] = SIZE[level];
  return Array.from({ length: d }, () => Array.from({ length: w }, () => (rng.chance(level === 1 ? 0.2 : 0.28) ? 0 : rng.int(1, hmax))));
}

/** Elevation seen from a side: column heights, left to right as the viewer sees them. */
export function elevation(h: Heights, side: 'front' | 'back' | 'right' | 'left'): number[] {
  const d = h.length;
  const w = h[0].length;
  const colMax = (x: number) => Math.max(...h.map((row) => row[x]));
  const rowMax = (y: number) => Math.max(...h[y]);
  switch (side) {
    case 'front':
      return Array.from({ length: w }, (_, x) => colMax(x));
    case 'back':
      return Array.from({ length: w }, (_, x) => colMax(w - 1 - x));
    case 'right': // viewer at +x looking -x: screen right is the far side
      return Array.from({ length: d }, (_, y) => rowMax(y));
    case 'left':
      return Array.from({ length: d }, (_, y) => rowMax(d - 1 - y));
  }
}

/** Turn 90° counter-clockwise seen from above (same as a +90° turn about z): old (x, y) goes to (d-1-y, x). */
const rotate90 = (h: Heights): Heights => {
  const d = h.length;
  const w = h[0].length;
  return Array.from({ length: w }, (_, ny) => Array.from({ length: d }, (_, nx) => h[d - 1 - nx][ny]));
};

const mirrorTop = (h: Heights): Heights => h.map((row) => row.slice().reverse());

function cubesOf(h: Heights): V3[] {
  const out: V3[] = [];
  h.forEach((row, y) => row.forEach((n, x) => {
    for (let z = 0; z < n; z++) out.push([x, y, z]);
  }));
  return center3(out);
}

/* ---------- drawings ---------- */

const U = 10;

function elevationScene(cols: number[], hmax: number, span = cols.length): SceneSpec {
  const prims: Prim[] = [];
  cols.forEach((n, x) => {
    for (let z = 0; z < n; z++) prims.push({ p: 'rect', x: x * U, y: (hmax - 1 - z) * U, w: U, h: U, fill: 'stim', tone: 'ink', sw: 1.2 });
  });
  prims.push({ p: 'line', pts: [[-3, hmax * U], [cols.length * U + 3, hmax * U]], w: 1.6 });
  const w = cols.length * U;
  const size = Math.max(span * U, hmax * U) + 8;
  return { kind: 'scene', box: [w / 2 - size / 2, (hmax * U) / 2 - size / 2, size, size], prims, label: 'חזית' };
}

function topScene(h: Heights): SceneSpec {
  const d = h.length;
  const w = h[0].length;
  const prims: Prim[] = [];
  h.forEach((row, y) =>
    row.forEach((n, x) => {
      // front row (y = 0) at the bottom of the drawing
      const sy = (d - 1 - y) * U;
      prims.push({ p: 'rect', x: x * U, y: sy, w: U, h: U, fill: n ? 'stim' : 'paper', tone: n ? 'ink' : 'line', sw: n ? 1.2 : 0.6 });
      if (n) prims.push({ p: 'text', at: [x * U + U / 2, sy + U / 2], text: String(n), size: 5.5, weight: 700 });
    }),
  );
  const size = Math.max(w, d) * U + 8;
  return { kind: 'scene', box: [(w * U) / 2 - size / 2, (d * U) / 2 - size / 2, size, size], prims, label: 'תוכנית עם גובהי קומות' };
}

const key = (x: unknown) => JSON.stringify(x);

function distinctViews(h: Heights): boolean {
  const views = [elevation(h, 'front'), elevation(h, 'back'), elevation(h, 'right'), elevation(h, 'left')].map(key);
  return new Set(views).size === 4 && h.flat().filter((n) => n > 0).length >= 4;
}

export function plans(rng: Rng, level: Level, motion: Motion): Draft {
  let h: Heights = randomHeights(rng, level);
  for (let i = 0; i < 200 && !distinctViews(h); i++) h = randomHeights(rng, level);
  const hmax = Math.max(...h.flat());
  const span = Math.max(h.length, h[0].length);
  const elev = (cols: number[]) => elevationScene(cols, hmax, span);
  const building: Cubes3DSpec = { kind: 'cubes3d', cubes: cubesOf(h), rot: I3, front: true };
  const bump = (cols: number[]): number[] => {
    const out = cols.slice();
    const i = rng.int(0, out.length - 1);
    out[i] = out[i] >= hmax ? out[i] - 1 : out[i] + 1;
    return out;
  };

  if (motion === 'dynamic') {
    // the building turns 90° counter-clockwise (seen from above), stopping half way
    const turned = rotate90(h);
    const front = elevation(turned, 'front');
    const options: Option[] = [
      { visual: elev(front), correct: true, why: 'אחרי רבע סיבוב נגד כיוון השעון, הצד השמאלי של הבניין פונה לחזית.' },
      { visual: elev(elevation(h, 'front')), correct: false, errorType: 'transformation', why: 'זו החזית לפני הסיבוב. הבניין המשיך להסתובב.' },
      { visual: elev(elevation(turned, 'back')), correct: false, errorType: 'wrong_rule', why: 'זה המבט מאחור, כלומר הסיבוב בכיוון ההפוך.' },
      { visual: elev(bump(front)), correct: false, errorType: 'encoding', why: 'הכיוון נכון, אבל גובה של עמודה אחת שגוי.' },
    ];
    if (new Set(options.map((o) => key(o.visual))).size < 4) return plans(rng, level, 'static');
    return {
      dim: '3D',
      prompt: 'הבניין מסתובב נגד כיוון השעון (במבט מלמעלה) ונעצר באמצע. הוא ישלים רבע סיבוב. איך תיראה החזית?',
      stimulus: { ...building, rot: roundM(axisAngle([0, 0, 1], 45)) },
      dynamic: { kind: 'rotate3d', base: building, axis: [0, 0, 1], from: 0, to: 45, reveal: 90, durationMs: level === 3 ? 1100 : 1500 },
      options,
      explanation: 'ברבע סיבוב נגד כיוון השעון (במבט מלמעלה), הצד שהיה משמאל עובר לחזית. החזית מראה לכל עמודה את הגובה המרבי לאורכה.',
    };
  }

  if (level === 3) {
    const top = topScene(h);
    const wrongCell = h.map((row) => row.slice());
    const cells = wrongCell.flatMap((row, y) => row.map((n, x) => [x, y, n] as const)).filter(([, , n]) => n > 0);
    const [cx, cy, cn] = rng.pick(cells);
    wrongCell[cy][cx] = cn >= hmax ? cn - 1 : cn + 1;
    const options: Option[] = [
      { visual: top, correct: true, why: 'כל משבצת מסומנת במספר הקומות שמעליה.' },
      { visual: topScene(mirrorTop(h)), correct: false, errorType: 'wrong_rule', why: 'זו תמונת ראי של התוכנית: ימין ושמאל התחלפו.' },
      { visual: topScene(rotate90(h)), correct: false, errorType: 'transformation', why: 'התוכנית מסובבת ברבע סיבוב. החזית צריכה להיות בתחתית התוכנית.' },
      { visual: topScene(wrongCell), correct: false, errorType: 'encoding', why: 'המבנה נכון, אבל מספר הקומות במשבצת אחת שגוי.' },
    ];
    if (new Set(options.map((o) => key(o.visual))).size < 4) return plans(rng, 2, 'static');
    return {
      dim: '3D',
      prompt: 'איזו תוכנית מתארת את הבניין? המספר בכל משבצת הוא מספר הקומות, והחזית בתחתית התוכנית.',
      stimulus: building,
      options,
      explanation: 'עמדי בחזית והסתכלי מלמעלה: השורה הקרובה אלייך היא התחתונה בתוכנית. ספרי קומות לכל עמודה, כולל עמודות מוסתרות מאחור.',
    };
  }

  const side = level === 1 ? 'front' : 'right';
  const target = elevation(h, side);
  const options: Option[] = [
    { visual: elev(target), correct: true, why: side === 'front' ? 'זה המבט מהחזית: הגובה המרבי בכל עמודה.' : 'זה המבט מימין: הגובה המרבי בכל שורה, מהחזית (משמאל) לאחור (מימין).' },
    {
      visual: elev(elevation(h, side === 'front' ? 'back' : 'left')),
      correct: false,
      errorType: 'wrong_rule',
      why: side === 'front' ? 'זה המבט מאחור: הסדר הפוך משמאל לימין.' : 'זה המבט משמאל: הסדר הפוך.',
    },
    {
      visual: elev(elevation(h, side === 'front' ? 'right' : 'front')),
      correct: false,
      errorType: 'transformation',
      why: side === 'front' ? 'זה המבט מהצד הימני, לא מהחזית.' : 'זה המבט מהחזית, לא מימין.',
    },
    { visual: elev(bump(target)), correct: false, errorType: 'encoding', why: 'הצד נכון, אבל עמודה אחת בגובה שגוי. בדקי גם בלוקים שמוסתרים מאחור.' },
  ];
  if (new Set(options.map((o) => key(o.visual))).size < 4) return plans(rng, level, motion);
  return {
    dim: '3D',
    prompt: side === 'front' ? 'איך נראה הבניין במבט מהחזית (לפי החץ)?' : 'איך נראה הבניין במבט מהצד הימני?',
    stimulus: building,
    options,
    explanation:
      'במבט ישר (חזית או צד) רואים לכל עמודה רק את הגובה המרבי שלה, גם אם הבלוק הגבוה נמצא מאחור. בצד ימין, החזית נמצאת משמאל למתבונן.',
  };
}
