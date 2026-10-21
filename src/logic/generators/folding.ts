import {
  FACE_COLORS,
  FACE_COLOR_NAMES,
  LOOKALIKE,
  NETS,
  allValidViewKeys,
  cubeFrames,
  makeLooks,
  oppositeOf,
  rotateUp,
  transformNet,
  viewFor,
  viewKey,
  viewSpec,
  type ViewKeyFace,
} from '../cubeNet';
import { CUBE_ROTATIONS } from '../geometry';
import { holesKey, pickPunches, randomFolds, unfold } from '../paper';
import type { Rng } from '../rng';
import type { FaceLook, Level, Motion, NetSpec, Option, P2, PaperHolesSpec, PaperStepsSpec } from '../types';
import type { Draft } from './index';

/* ---------------- 2D: fold, punch, unfold ---------------- */

export function paperFolding(rng: Rng, level: Level, motion: Motion): Draft {
  const foldCount = level;
  const folds = randomFolds(rng, foldCount, level > 1);
  const punches = pickPunches(rng, folds, level === 3 ? 2 : 1);
  const correct = unfold(folds, punches);
  const steps: PaperStepsSpec = { kind: 'paperSteps', folds, punches };
  const holes = (h: P2[]): PaperHolesSpec => ({ kind: 'paperHoles', holes: h });

  const candidates: Option[] = [];
  for (let i = 0; i < folds.length; i++) {
    candidates.push({
      visual: holes(unfold(folds, punches, i)),
      correct: false,
      errorType: 'transformation',
      why: `נפתח רק חלק מהקיפולים: קיפול ${i + 1} לא שוקף בפתיחה.`,
    });
    candidates.push({
      visual: holes(unfold(folds, punches, -1, i)),
      correct: false,
      errorType: 'wrong_rule',
      why: `קיפול ${i + 1} שוקף סביב קו שגוי. החור משתקף תמיד סביב קו הקיפול עצמו.`,
    });
  }
  const shiftDirs: P2[] = [[1 / 8, 0], [-1 / 8, 0], [0, 1 / 8], [0, -1 / 8]];
  for (const d of rng.shuffle(shiftDirs)) {
    const idx = rng.int(0, correct.length - 1);
    const moved = correct.map((p, j) => (j === idx ? ([p[0] + d[0], p[1] + d[1]] as P2) : p));
    if (moved.every((p) => p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1))
      candidates.push({
        visual: holes(moved),
        correct: false,
        errorType: 'encoding',
        why: 'מספר החורים נכון, אבל אחד מהם במקום שגוי. מיקום הניקוב נקלט לא מדויק.',
      });
  }
  candidates.push({
    visual: holes(correct.map(([x, y]) => [1 - x, y] as P2)),
    correct: false,
    errorType: 'transformation',
    why: 'התבנית הופכה משמאל לימין. הדף נפתח, לא התהפך.',
  });

  const used = new Set([holesKey(correct)]);
  const distractors: Option[] = [];
  const byType = rng.shuffle(candidates);
  for (const c of byType) {
    const k = holesKey((c.visual as PaperHolesSpec).holes);
    if (used.has(k) || !(c.visual as PaperHolesSpec).holes.length) continue;
    used.add(k);
    distractors.push(c);
    if (distractors.length === 3) break;
  }

  const n = correct.length;
  return {
    dim: '2D',
    prompt:
      motion === 'static'
        ? 'הדף קופל לפי הסדר ונוקב. איך ייראה הדף כשיפתחו אותו?'
        : 'צפי בקיפול ובניקוב. איך ייראה הדף כשיפתחו אותו?',
    stimulus: steps,
    dynamic: motion === 'dynamic' ? { kind: 'paperFold', steps, durationMs: level === 3 ? 900 : 1300 } : undefined,
    options: [{ visual: holes(correct), correct: true, why: `${n} חורים: כל ניקוב משתקף סביב כל קו קיפול שעבר דרכו.` }, ...distractors],
    explanation: `פתחי את הקיפולים בסדר הפוך, מהאחרון לראשון. בכל פתיחה, כל חור שנמצא על החלק המקופל מקבל חור תאום בצד השני של קו הקיפול. בסוף יש ${n} חורים.`,
  };
}

/* ---------------- 3D: cube nets ---------------- */

const lookName = (f: FaceLook) => (f.letter ? `האות ${f.letter}` : `הפאה ב${FACE_COLOR_NAMES[FACE_COLORS.indexOf(f.color)]}`);

export function cubeNet(rng: Rng, level: Level, motion: Motion): Draft {
  const cells = transformNet(rng.pick(NETS), rng.int(0, 3), rng.chance(0.5));
  // root = a face with the most neighbours, so the fold animation stays compact
  const deg = cells.map((c) => cells.filter((d) => Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) === 1).length);
  const root = deg.indexOf(Math.max(...deg));
  const frames = cubeFrames(cells, root);
  const oriented = level === 3;
  const looks = makeLooks(rng, oriented);
  const net: NetSpec = { kind: 'net', cells, root, faces: looks };

  if (level === 1) {
    const target = rng.int(0, 5);
    const opp = oppositeOf(frames, target);
    const adjacent = rng.shuffle([0, 1, 2, 3, 4, 5].filter((i) => i !== target && i !== opp)).slice(0, 3);
    const highlighted: NetSpec = { ...net, highlight: target };
    return {
      dim: '3D',
      prompt: 'מקפלים את הפריסה לקובייה. איזו פאה תהיה מול הפאה המסומנת?',
      stimulus: highlighted,
      dynamic: motion === 'dynamic' ? { kind: 'netFold', net: highlighted, pauseAt: 0.55, durationMs: 1800 } : undefined,
      options: [
        { visual: { kind: 'swatch', face: looks[opp] }, correct: true, why: 'זו הפאה הנגדית.' },
        ...adjacent.map<Option>((i) => ({
          visual: { kind: 'swatch', face: looks[i] },
          correct: false,
          errorType: 'transformation',
          why: 'פאה זו צמודה לפאה המסומנת, לא מולה.',
        })),
      ],
      explanation:
        'בפריסה, שתי פאות שיש ביניהן בדיוק פאה אחת בשורה ישרה יהיו נגדיות. פאות שנוגעות זו בזו בצלע, או בפינה של צורת L, יהיו צמודות.',
    };
  }

  const valid = allValidViewKeys(frames, oriented);
  const rot = rng.pick(CUBE_ROTATIONS);
  const v = viewFor(frames, rot);
  const used = new Set([viewKey(v, oriented)]);
  const cands: { view: Record<'top' | 'front' | 'right', ViewKeyFace>; looks: FaceLook[]; errorType: Option['errorType']; why: string }[] = [];
  const slots = ['top', 'front', 'right'] as const;

  for (const s of slots) {
    const opp = oppositeOf(frames, v[s].id);
    const others = slots.filter((o) => o !== s);
    const o = rng.pick(others);
    cands.push({
      view: { ...v, [o]: { id: opp, up: v[o].up } },
      looks,
      errorType: 'wrong_rule',
      why: `${lookName(looks[v[s].id])} ו${lookName(looks[opp])} נגדיות בקובייה, ולכן לא יכולות להיראות יחד.`,
    });
  }
  for (const [a, b] of [['top', 'front'], ['front', 'right'], ['top', 'right']] as const) {
    cands.push({
      view: { ...v, [a]: { id: v[b].id, up: v[a].up }, [b]: { id: v[a].id, up: v[b].up } },
      looks,
      errorType: 'transformation',
      why: 'הפאות הנכונות, אבל בסדר הפוך: זו תמונת ראי של הקובייה.',
    });
  }
  if (oriented) {
    for (const s of slots) {
      const q = rng.pick([1, 2, 3]);
      cands.push({
        view: { ...v, [s]: { id: v[s].id, up: rotateUp(s, v[s].up, q) } },
        looks,
        errorType: 'transformation',
        why: `${lookName(looks[v[s].id])} מסובבת ${q * 90}° ביחס לכיוון האמיתי שלה על הקובייה.`,
      });
    }
    const s = rng.pick(slots);
    const fid = v[s].id;
    const swapped = looks.map((f) => (f.id === fid ? { ...f, letter: LOOKALIKE[f.letter!] } : f));
    cands.push({
      view: v,
      looks: swapped,
      errorType: 'encoding',
      why: `האות ${LOOKALIKE[looks[fid].letter!]} לא מופיעה בפריסה. היא דומה ל${looks[fid].letter}, אבל שונה.`,
    });
  }

  const distractors: Option[] = [];
  for (const c of rng.shuffle(cands)) {
    const isLookSwap = c.looks !== looks;
    const k = viewKey(c.view, oriented) + (isLookSwap ? '*' : '');
    if (used.has(k)) continue;
    if (!isLookSwap && valid.has(viewKey(c.view, oriented))) continue;
    used.add(k);
    distractors.push({ visual: viewSpec(c.view, c.looks), correct: false, errorType: c.errorType, why: c.why });
    if (distractors.length === 3) break;
  }

  return {
    dim: '3D',
    prompt: oriented
      ? 'איזו קובייה אפשר לקבל מקיפול הפריסה? שימי לב גם לכיוון האותיות.'
      : 'איזו קובייה אפשר לקבל מקיפול הפריסה?',
    stimulus: net,
    dynamic: motion === 'dynamic' ? { kind: 'netFold', net, pauseAt: 0.5, durationMs: level === 3 ? 1300 : 1700 } : undefined,
    options: [{ visual: viewSpec(v, looks), correct: true, why: 'שלוש הפאות צמודות זו לזו בפריסה, בסדר ובכיוון הנכונים.' }, ...distractors],
    explanation: oriented
      ? 'בדקי שלושה דברים: אין זוג פאות נגדיות, סדר הפאות סביב הפינה נכון, וכל אות פונה לצלע הנכונה. צלע משותפת בפריסה נשארת משותפת בקובייה.'
      : 'קודם פסלי קוביות עם שתי פאות נגדיות. אחר כך בדקי את סדר שלוש הפאות סביב הפינה: עם כיוון השעון או נגדו.',
  };
}
