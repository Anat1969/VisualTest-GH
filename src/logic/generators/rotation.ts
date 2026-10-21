import { CUBE_ROTATIONS, I3, axisAngle, mulM, roundM } from '../geometry';
import type { Rng } from '../rng';
import { mirror3, mutate2, mutate3, randomPolycube, randomPolyomino } from '../shapes';
import type { Cubes3DSpec, Level, Motion, Option, Poly2DSpec, V3 } from '../types';
import type { Draft } from './index';

const CW = (deg: number) => (deg >= 0 ? `${deg}° עם כיוון השעון` : `${-deg}° נגד כיוון השעון`);

/* ---------------- 2D ---------------- */

const CELLS_2D: Record<Level, number> = { 1: 5, 2: 6, 3: 7 };

function randomAngle(rng: Rng, level: Level): number {
  if (level === 1) return rng.pick([90, 180, 270]);
  if (level === 2) return rng.pick([45, 90, 135, 180, 225, 270, 315]);
  return rng.pick([30, 60, 105, 120, 150, 165, 195, 210, 240, 255, 300, 330]);
}

export function rotation2D(rng: Rng, level: Level, motion: Motion): Draft {
  const cells = randomPolyomino(rng, CELLS_2D[level]);
  const base = level === 1 ? 0 : rng.pick([0, 15, 30, 45, 60]);
  const poly = (angle: number, mirror = false, c = cells): Poly2DSpec => ({ kind: 'poly2d', cells: c, angle, mirror });

  if (motion === 'static') {
    const delta = randomAngle(rng, level);
    const mutated = mutate2(rng, cells);
    const m1 = randomAngle(rng, level);
    const m2 = (m1 + rng.pick([90, 180, 270])) % 360;
    const correct: Option = {
      visual: poly(base + delta),
      correct: true,
      why: `זו צורת המקור לאחר סיבוב של ${CW(delta)}.`,
    };
    const distractors: Option[] = [
      {
        visual: poly(base + m1, true),
        correct: false,
        errorType: 'wrong_rule',
        why: 'זו תמונת ראי של המקור. שיקוף אי אפשר לקבל על ידי סיבוב.',
      },
      {
        visual: poly(base + randomAngle(rng, level), false, mutated),
        correct: false,
        errorType: 'encoding',
        why: 'משבצת אחת הוזזה. הצורה דומה, אבל אינה זהה למקור.',
      },
      level === 1
        ? {
            visual: poly(base + m2, true),
            correct: false,
            errorType: 'wrong_rule',
            why: 'גם זו תמונת ראי, בזווית אחרת.',
          }
        : {
            visual: poly(base + randomAngle(rng, level), true, mutated),
            correct: false,
            errorType: 'encoding',
            why: 'צורה שונה ומשוקפת: גם משבצת הוזזה וגם הכיוון הפוך.',
          },
    ];
    return {
      dim: '2D',
      prompt: 'איזו מהצורות היא צורת המקור לאחר סיבוב בלבד, ללא שיקוף?',
      stimulus: poly(base),
      options: [correct, ...distractors],
      explanation: `הצורה הנכונה מתקבלת מסיבוב של ${CW(delta)}. כדי להבחין בשיקוף, בחרי משבצת קצה ובדקי אם היא נמצאת מימין או משמאל לזרוע הארוכה, אחרי שסובבת.`,
    };
  }

  // dynamic: shape turns by `a`, pauses, then "continues" by `x` in the same direction
  const dir = rng.pick([1, -1]);
  const a = level === 1 ? 90 : level === 2 ? rng.pick([45, 90]) : rng.pick([30, 60, 75]);
  const x = level === 1 ? 90 : level === 2 ? rng.pick([45, 90, 135]) : rng.pick([60, 105, 120, 150]);
  const durationMs = level === 3 ? 900 : level === 2 ? 1200 : 1600;
  const final = base + dir * (a + x);
  const m360 = (v: number) => ((v % 360) + 360) % 360;
  const taken = [a + x, a - x].map(m360);
  const wrongTotal = [a, a + 2 * x, a + x + 90, a + x + 180].find((t) => !taken.includes(m360(t)))!;
  const options: Option[] = [
    { visual: poly(final), correct: true, why: `המשך תנועה של ${x}° באותו כיוון.` },
    {
      visual: poly(base + dir * (a - x)),
      correct: false,
      errorType: 'transformation',
      why: 'הסיבוב הומשך בכיוון ההפוך.',
    },
    {
      visual: poly(base + dir * wrongTotal),
      correct: false,
      errorType: 'transformation',
      why: wrongTotal === a ? 'זה המצב בנקודת העצירה. הסיבוב לא הומשך.' : 'זווית ההמשך שגויה.',
    },
    { visual: poly(final, true), correct: false, errorType: 'wrong_rule', why: 'הזווית נכונה, אבל זו תמונת ראי.' },
  ];
  return {
    dim: '2D',
    prompt: `הצורה מסתובבת ונעצרת. היא תמשיך להסתובב באותו כיוון עוד ${x}°. איך תיראה בסוף?`,
    stimulus: poly(base + dir * a),
    dynamic: { kind: 'rotate2d', base: poly(0), from: base, to: base + dir * a, reveal: final, durationMs },
    options,
    explanation: `הצורה הסתובבה ${CW(dir * a)} ותמשיך עוד ${x}° באותו כיוון, כלומר סך הכול ${CW(dir * (a + x))} מנקודת ההתחלה. עקבי אחרי משבצת קצה אחת לאורך התנועה.`,
  };
}

/* ---------------- 3D ---------------- */

const CUBES_3D: Record<Level, number> = { 1: 7, 2: 8, 3: 10 };
const VERTICAL_TURNS = [axisAngle([0, 0, 1], 90), axisAngle([0, 0, 1], 180), axisAngle([0, 0, 1], 270)].map((m) =>
  m.map(Math.round),
);

function randomRot3(rng: Rng, level: Level) {
  if (level === 1) return rng.pick(VERTICAL_TURNS);
  const r = rng.pick(CUBE_ROTATIONS.slice(1));
  if (level === 2) return r;
  return roundM(mulM(axisAngle(rng.pick<V3>([[0, 0, 1], [1, 0, 0]]), rng.pick([-35, -25, 25, 35])), r));
}

export function rotation3D(rng: Rng, level: Level, motion: Motion): Draft {
  const cubes = randomPolycube(rng, CUBES_3D[level]);
  const mutated = mutate3(rng, cubes);
  const mirrored = mirror3(cubes);
  const spec = (c: V3[], rot = I3): Cubes3DSpec => ({ kind: 'cubes3d', cubes: c, rot });

  if (motion === 'static') {
    const [r1, r2] = level === 1 ? rng.shuffle(VERTICAL_TURNS) : [randomRot3(rng, level), randomRot3(rng, level)];
    const options: Option[] = [
      { visual: spec(cubes, randomRot3(rng, level)), correct: true, why: 'זו אותה צורה, מסובבת במרחב.' },
      {
        visual: spec(mirrored, r1),
        correct: false,
        errorType: 'wrong_rule',
        why: 'זו תמונת הראי של הצורה. אין סיבוב במרחב שהופך אותה למקור.',
      },
      {
        visual: spec(mutated, randomRot3(rng, level)),
        correct: false,
        errorType: 'encoding',
        why: 'הזרוע האחרונה פונה לכיוון אחר. הצורה דומה, אבל שונה.',
      },
      {
        visual: spec(level === 1 ? mirrored : mirror3(mutated), r2),
        correct: false,
        errorType: level === 1 ? 'wrong_rule' : 'encoding',
        why: level === 1 ? 'זו שוב תמונת ראי, מזווית אחרת.' : 'צורה שונה: גם משוקפת וגם עם זרוע מוזזת.',
      },
    ];
    return {
      dim: '3D',
      prompt: 'איזו מהצורות היא צורת המקור לאחר סיבוב במרחב?',
      stimulus: spec(cubes),
      options,
      explanation:
        'השוו את רצף הזרועות: אורך כל זרוע וכיוון הפנייה ביניהן. בצורה משוקפת הרצף זהה, אבל פנייה אחת מתהפכת משמאל לימין.',
    };
  }

  const axis: V3 = level === 1 ? [0, 0, 1] : level === 2 ? rng.pick<V3>([[0, 0, 1], [1, 0, 0]]) : rng.pick<V3>([[1, 0, 0], [0, 1, 0]]);
  const dir = rng.pick([1, -1]);
  const a = 90;
  const x = 90;
  const otherAxis: V3 = [axis[2], axis[0], axis[1]];
  const turn = (deg: number) => roundM(axisAngle(axis, deg));
  const durationMs = level === 3 ? 1000 : level === 2 ? 1300 : 1700;
  const options: Option[] = [
    { visual: spec(cubes, turn(dir * (a + x))), correct: true, why: 'המשך הסיבוב באותו ציר ובאותו כיוון.' },
    { visual: spec(cubes, I3), correct: false, errorType: 'transformation', why: 'הסיבוב הומשך בכיוון ההפוך וחזר לנקודת ההתחלה.' },
    {
      visual: spec(cubes, roundM(mulM(axisAngle(otherAxis, dir * x), turn(dir * a)))),
      correct: false,
      errorType: 'transformation',
      why: 'הסיבוב הומשך סביב ציר אחר.',
    },
    { visual: spec(mirrored, turn(dir * (a + x))), correct: false, errorType: 'wrong_rule', why: 'הזווית נכונה, אבל זו תמונת ראי.' },
  ];
  const axisName = axis[2] ? 'הציר האנכי' : axis[0] ? 'ציר שמאל־ימין' : 'ציר עומק';
  return {
    dim: '3D',
    prompt: `הצורה מסתובבת סביב ${axisName} ונעצרת. היא תמשיך באותו כיוון עוד ${x}°. איך תיראה בסוף?`,
    stimulus: spec(cubes, turn(dir * a)),
    dynamic: { kind: 'rotate3d', base: spec(cubes), axis, from: 0, to: dir * a, reveal: dir * (a + x), durationMs },
    options,
    explanation: `הצורה מסתובבת סביב ${axisName}. אחרי ${a + x}° בסך הכול, זרוע שפנתה קדימה פונה לאחור. קבעי זרוע אחת כעוגן ועקבי אחריה.`,
  };
}
