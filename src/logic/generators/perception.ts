// Perception: hidden figures (embedded shape) and perceptual speed (spot the identical pattern).
import type { Rng } from '../rng';
import type { Level, Motion, Option, P2, Prim, SceneSpec } from '../types';
import type { Draft } from './index';

/* ---------------- hidden figure ---------------- */

type Seg = [number, number, number, number]; // lattice segment x1,y1,x2,y2
const DIRS: P2[] = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];

/** Unit steps, direction-normalised, so containment can be tested as a set inclusion. */
function units(segs: Seg[]): Set<string> {
  const out = new Set<string>();
  for (const [x1, y1, x2, y2] of segs) {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    for (let i = 0; i < n; i++) {
      const a: P2 = [x1 + dx * i, y1 + dy * i];
      const b: P2 = [a[0] + dx, a[1] + dy];
      out.add(a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`);
    }
  }
  return out;
}

const shift = (segs: Seg[], dx: number, dy: number): Seg[] => segs.map(([a, b, c, d]) => [a + dx, b + dy, c + dx, d + dy]);
const bounds = (segs: Seg[]) => {
  const xs = segs.flatMap((s) => [s[0], s[2]]);
  const ys = segs.flatMap((s) => [s[1], s[3]]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
const normalize = (segs: Seg[]) => {
  const b = bounds(segs);
  return shift(segs, -b.x0, -b.y0);
};
const mirror = (segs: Seg[]): Seg[] => normalize(segs.map(([a, b, c, d]) => [-a, b, -c, d]));
const rot90 = (segs: Seg[]): Seg[] => normalize(segs.map(([a, b, c, d]) => [-b, a, -d, c]));
const keyOf = (segs: Seg[]) => [...units(normalize(segs))].sort().join(' ');

/** Does `fig` contain `target` at its own size and orientation, anywhere? */
export function contains(fig: Seg[], target: Seg[], grid: number): boolean {
  const f = units(fig);
  const t = normalize(target);
  const b = bounds(t);
  for (let dx = 0; dx + b.x1 <= grid; dx++)
    for (let dy = 0; dy + b.y1 <= grid; dy++) {
      const u = units(shift(t, dx, dy));
      if ([...u].every((k) => f.has(k))) return true;
    }
  return false;
}

function randomTarget(rng: Rng, n: number): Seg[] {
  for (;;) {
    const segs: Seg[] = [];
    let p: P2 = [0, 0];
    let prevDir = -1;
    for (let i = 0; i < n; i++) {
      const di = rng.pick([0, 1, 2, 3, 4, 5, 6, 7].filter((d) => d !== prevDir && d !== (prevDir + 4) % 8));
      const d = DIRS[di];
      const len = rng.int(1, 2);
      const q: P2 = [p[0] + d[0] * len, p[1] + d[1] * len];
      segs.push([p[0], p[1], q[0], q[1]]);
      p = q;
      prevDir = di;
    }
    const t = normalize(segs);
    const b = bounds(t);
    if (b.x1 > 3 || b.y1 > 3 || b.x1 < 1 || b.y1 < 1) continue;
    if (units(t).size < n + 1) continue;
    const k = keyOf(t);
    // must look different when mirrored or turned, or those distractors would be correct
    if (keyOf(mirror(t)) === k || keyOf(rot90(t)) === k || keyOf(rot90(rot90(t))) === k) continue;
    return t;
  }
}

function noise(rng: Rng, grid: number, count: number): Seg[] {
  const out: Seg[] = [];
  while (out.length < count) {
    const x = rng.int(0, grid);
    const y = rng.int(0, grid);
    const d = rng.pick(DIRS);
    const len = rng.int(1, 2);
    const q: P2 = [x + d[0] * len, y + d[1] * len];
    if (q[0] < 0 || q[1] < 0 || q[0] > grid || q[1] > grid) continue;
    out.push([x, y, q[0], q[1]]);
  }
  return out;
}

function embed(rng: Rng, part: Seg[], grid: number, extra: number): Seg[] {
  const b = bounds(part);
  const dx = rng.int(0, grid - b.x1);
  const dy = rng.int(0, grid - b.y1);
  return [...noise(rng, grid, extra), ...shift(part, dx, dy)];
}

function figScene(segs: Seg[], grid: number, label: string): SceneSpec {
  const S = 10;
  const prims: Prim[] = [
    { p: 'rect', x: -4, y: -4, w: grid * S + 8, h: grid * S + 8, fill: 'paper', tone: 'line', sw: 0.6, rx: 2 },
    ...segs.map((s) => ({ p: 'line', pts: [[s[0] * S, s[1] * S], [s[2] * S, s[3] * S]], w: 1.5 }) as Prim),
  ];
  return { kind: 'scene', box: [-8, -8, grid * S + 16, grid * S + 16], prims, label };
}

/** Change one segment of the target, keeping it a connected-looking figure. */
function alter(rng: Rng, t: Seg[]): Seg[] {
  const out = t.map((s) => s.slice() as Seg);
  const i = rng.int(0, out.length - 1);
  const [x1, y1] = out[i];
  const d = rng.pick(DIRS);
  out[i] = [x1, y1, x1 + d[0], y1 + d[1]];
  return normalize(out);
}

const HIDDEN: Record<Level, { grid: number; segs: number; extra: number }> = {
  1: { grid: 4, segs: 3, extra: 4 },
  2: { grid: 5, segs: 4, extra: 7 },
  3: { grid: 6, segs: 5, extra: 11 },
};

export function hiddenFigure(rng: Rng, level: Level): Draft {
  const { grid, segs, extra } = HIDDEN[level];
  for (let attempt = 0; attempt < 200; attempt++) {
    const t = randomTarget(rng, segs);
    const variants: { part: Seg[]; errorType: Option['errorType']; why: string }[] = [
      { part: mirror(t), errorType: 'wrong_rule', why: 'בתוך הצורה הזו מופיעה תמונת הראי של הדוגמה, לא הדוגמה עצמה.' },
      { part: rot90(t), errorType: 'transformation', why: 'כאן הדוגמה מופיעה מסובבת. היא צריכה להופיע באותו כיוון ובאותו גודל.' },
      { part: alter(rng, t), errorType: 'encoding', why: 'כאן מופיעה צורה דומה, אבל קו אחד שונה מהדוגמה.' },
    ];
    const correct = embed(rng, t, grid, extra);
    if (!contains(correct, t, grid)) continue;
    const distractors = variants.map((v) => ({ ...v, fig: embed(rng, v.part, grid, extra) }));
    if (distractors.some((d) => contains(d.fig, t, grid) || keyOf(d.part) === keyOf(t))) continue;
    return {
      dim: '2D',
      prompt: 'באיזו מהצורות מסתתרת הדוגמה, באותו גודל ובאותו כיוון?',
      stimulus: figScene(t, Math.max(3, bounds(t).x1, bounds(t).y1), 'דוגמה'),
      options: [
        { visual: figScene(correct, grid, 'צורה מורכבת'), correct: true, why: 'הדוגמה מופיעה כאן בשלמותה, בלי סיבוב או שיקוף.' },
        ...distractors.map((d) => ({ visual: figScene(d.fig, grid, 'צורה מורכבת'), correct: false, errorType: d.errorType, why: d.why }) as Option),
      ],
      explanation: 'חפשי קודם את החלק הייחודי בדוגמה, למשל זווית חדה או קו אלכסוני, ובדקי ממנו הלאה. קווים נוספים מסביב לא משנים: הדוגמה צריכה להופיע כולה, באותו כיוון.',
    };
  }
  throw new Error('hidden: could not build an item');
}

/* ---------------- perceptual speed ---------------- */

const SPEED: Record<Level, { n: number; diffs: number; flashMs: number }> = {
  1: { n: 4, diffs: 2, flashMs: 2600 },
  2: { n: 5, diffs: 1, flashMs: 2100 },
  3: { n: 6, diffs: 1, flashMs: 1600 },
};

function patternScene(cells: boolean[], n: number, extra: Prim[] = []): SceneSpec {
  const S = 10;
  const prims: Prim[] = [];
  cells.forEach((on, i) => {
    const x = (i % n) * S;
    const y = Math.floor(i / n) * S;
    prims.push({ p: 'rect', x: x + 0.8, y: y + 0.8, w: S - 1.6, h: S - 1.6, fill: on ? 'ink' : 'paper', tone: on ? 'ink' : 'line', sw: 0.5, rx: 1 });
  });
  return { kind: 'scene', box: [-3, -3, n * S + 6, n * S + 6], prims: [...prims, ...extra], label: 'דפוס משבצות' };
}

const flip = (cells: boolean[], idx: number[]) => cells.map((c, i) => (idx.includes(i) ? !c : c));
const mirrorCells = (cells: boolean[], n: number) => cells.map((_, i) => cells[Math.floor(i / n) * n + (n - 1 - (i % n))]);

export function perceptualSpeed(rng: Rng, level: Level, motion: Motion): Draft {
  const { n, diffs, flashMs } = SPEED[level];
  for (;;) {
    const cells = Array.from({ length: n * n }, () => rng.chance(0.45));
    const mir = mirrorCells(cells, n);
    if (mir.every((c, i) => c === cells[i])) continue;
    const used = new Set([cells.join()]);
    const pickFlip = () => {
      for (;;) {
        const idx = rng.shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, diffs);
        const f = flip(cells, idx);
        if (!used.has(f.join())) {
          used.add(f.join());
          return f;
        }
      }
    };
    const distractors: Option[] = [
      { visual: patternScene(pickFlip(), n), correct: false, errorType: 'encoding', why: `${diffs === 1 ? 'משבצת אחת שונה' : 'שתי משבצות שונות'} מהדוגמה.` },
      { visual: patternScene(pickFlip(), n), correct: false, errorType: 'encoding', why: `${diffs === 1 ? 'משבצת אחת שונה' : 'שתי משבצות שונות'} מהדוגמה.` },
    ];
    if (level === 3 && !used.has(mir.join())) {
      used.add(mir.join());
      distractors.push({ visual: patternScene(mir, n), correct: false, errorType: 'wrong_rule', why: 'זו תמונת הראי של הדוגמה: ימין ושמאל התחלפו.' });
    } else distractors.push({ visual: patternScene(pickFlip(), n), correct: false, errorType: 'encoding', why: 'משבצת שונה מהדוגמה.' });

    const base = patternScene(cells, n);
    const hiddenNote: Prim = { p: 'text', at: [(n * 10) / 2, (n * 10) / 2], text: 'הדוגמה הוסתרה', size: n * 1.6, tone: 'muted', when: 'pause' };
    const veil: Prim = { p: 'rect', x: -3, y: -3, w: n * 10 + 6, h: n * 10 + 6, fill: 'sunk', tone: 'none', when: 'pause' };
    return {
      dim: '2D',
      prompt: motion === 'static' ? 'איזו מהאפשרויות זהה לדוגמה? מהר ומדויק.' : 'זכרי את הדוגמה. היא תוסתר בעוד רגע. איזו אפשרות זהה לה?',
      stimulus: base,
      dynamic: motion === 'dynamic' ? { kind: 'scene', scene: { ...base, prims: [...base.prims, veil, hiddenNote] }, durationMs: flashMs, revealMs: 300 } : undefined,
      options: [{ visual: base, correct: true, why: 'זהה לדוגמה, משבצת אחר משבצת.' }, ...distractors],
      explanation: 'סרקי באותו סדר בכל פעם, למשל שורה אחר שורה מלמעלה. השוואה של שורה אחת בכל האפשרויות מהירה יותר מבדיקה של כל אפשרות עד הסוף.',
    };
  }
}
