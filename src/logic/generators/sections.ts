import { CAM_SHAPES } from '../camera';
import { dot, norm } from '../geometry';
import type { Rng } from '../rng';
import {
  SOLID_LABEL,
  drawSolidWithPlane,
  faceShapes,
  makeSolid,
  polyArea,
  section,
  shapeName,
  shapePrims,
  signature,
  similar,
  support,
  type Plane,
  type Solid,
  type SolidName,
} from '../solids';
import type { Level, Motion, Option, P2, SceneSpec, V3 } from '../types';
import type { Draft } from './index';

const SOLIDS: Record<Level, SolidName[]> = {
  1: ['cube', 'box', 'cylinder'],
  2: ['cube', 'box', 'triPrism', 'pyramid', 'cylinder'],
  3: ['cone', 'pyramid', 'cube', 'triPrism', 'cylinder'],
};

const AXES: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]];
const OBLIQUE: V3[] = [[1, 0, 1], [0, 1, 1], [1, 1, 1], [1, 1, 2], [2, 0, 1], [1, 2, 0], [-1, 1, 1]];
const STEEP: V3[] = [[1, 2, 3], [3, 1, 2], [0, 1, 3], [1, 0, 2], [3, 0, 1], [2, -1, 3]];

function normals(level: Level): V3[] {
  if (level === 1) return AXES;
  if (level === 2) return [...AXES, ...OBLIQUE];
  return [...OBLIQUE, ...STEEP, [0, 0, 1]];
}

function randomPlane(rng: Rng, s: Solid, level: Level): { pl: Plane; poly: P2[] } | null {
  for (let i = 0; i < 40; i++) {
    const n = norm(rng.pick(normals(level)));
    if (Math.abs(dot(n, CAM_SHAPES.c)) < 0.3) continue; // plane seen edge-on is unreadable
    const [lo, hi] = support(s, n);
    const centered = level === 1 && rng.chance(0.5);
    const d = centered ? (lo + hi) / 2 : (lo + hi) / 2 + (rng.next() - 0.5) * 0.7 * (hi - lo);
    const pl = { n, d };
    const { poly } = section(s, pl);
    if (poly.length >= 3 && polyArea(poly) > 0.35 && signature(poly).aspect > 0.22) return { pl, poly };
  }
  return null;
}

const scene = (poly: P2[]): SceneSpec => ({ kind: 'scene', box: [-1.25, -1.25, 2.5, 2.5], prims: shapePrims(poly), label: 'צורת חתך' });

function stretch(poly: P2[], f: number): P2[] {
  return poly.map(([x, y]) => [x * f, y] as P2);
}

export function sections(rng: Rng, level: Level, motion: Motion): Draft {
  for (let attempt = 0; attempt < 60; attempt++) {
    const s = makeSolid(rng.pick(SOLIDS[level]));
    const main = randomPlane(rng, s, level);
    if (!main) continue;
    const sig = signature(main.poly);
    const taken = [sig];
    const fresh = (poly: P2[]) => {
      const g = signature(poly);
      if (g.aspect < 0.22 || g.aspect > 4.5) return false;
      if (taken.some((t) => similar(t, g))) return false;
      taken.push(g);
      return true;
    };
    const distractors: Option[] = [];

    // encoding: the right kind of shape, wrong proportions
    for (const f of rng.shuffle([1.5, 0.62, 1.8])) {
      const poly = stretch(main.poly, f);
      if (fresh(poly)) {
        distractors.push({ visual: scene(poly), correct: false, errorType: 'encoding', why: `סוג הצורה נכון, אבל הפרופורציות לא: החתך האמיתי הוא ${shapeName(main.poly)} ביחסים אחרים.` });
        break;
      }
    }
    // wrong rule: a face of the solid instead of the cut
    for (const poly of rng.shuffle(faceShapes(s))) {
      if (distractors.length >= 2) break;
      if (fresh(poly)) {
        distractors.push({ visual: scene(poly), correct: false, errorType: 'wrong_rule', why: `זו צורה של פאה של ה${SOLID_LABEL[s.name]}, לא של החתך. החתך נקבע לפי המקום והזווית של המישור.` });
        break;
      }
    }
    // transformation: the same solid cut in another direction
    for (let i = 0; i < 40 && distractors.length < 3; i++) {
      const other = randomPlane(rng, s, (Math.min(3, level + 1) as Level));
      if (other && fresh(other.poly))
        distractors.push({ visual: scene(other.poly), correct: false, errorType: 'transformation', why: `זה חתך של אותו גוף במישור אחר (${shapeName(other.poly)}). כיוון המישור שונה מזה שבשרטוט.` });
    }
    if (distractors.length < 3) continue;

    const { prims, box } = drawSolidWithPlane(s, main.pl, motion === 'dynamic');
    const stim: SceneSpec = { kind: 'scene', box, prims, label: `${SOLID_LABEL[s.name]} ומישור חותך` };
    const name = shapeName(main.poly);
    return {
      dim: '3D',
      prompt: motion === 'static' ? `המישור חותך את ה${SOLID_LABEL[s.name]}. איזו צורה יש לחתך?` : `המישור נכנס ונעצר בתוך ה${SOLID_LABEL[s.name]}. איזו צורה יש לחתך?`,
      stimulus: { ...stim, prims: prims.map((p) => ({ ...p, anim: undefined })) },
      dynamic: motion === 'dynamic' ? { kind: 'scene', scene: stim, durationMs: 1700, revealMs: 500 } : undefined,
      options: [{ visual: scene(main.poly), correct: true, why: `החתך הוא ${name}.` }, ...distractors.slice(0, 3)],
      explanation: `ספרי כמה פאות המישור חוצה: זה מספר הצלעות של החתך. בגוף עגול, מישור ניצב לציר נותן עיגול, מישור נטוי נותן אליפסה, ומישור שחוצה גם את הבסיס מוסיף צלע ישרה. כאן החתך הוא ${name}.`,
    };
  }
  throw new Error('sections: could not build an item');
}
