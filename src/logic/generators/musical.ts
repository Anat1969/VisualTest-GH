// Musical-rhythmic drills: hear a rhythm or melody, then pick its notation.
import type { Rng } from '../rng';
import type { AudioSpec, Level, Option, Prim, SceneSpec } from '../types';
import type { Draft } from './index';

const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];

/* ---------- drawings ---------- */

export function beatGrid(hits: boolean[], perBar = hits.length): SceneSpec {
  const W = 10;
  const prims: Prim[] = [];
  hits.forEach((on, i) => {
    const x = i * W + Math.floor(i / perBar) * 4;
    prims.push({ p: 'rect', x: x + 1, y: 0, w: W - 2, h: 14, fill: on ? 'ink' : 'paper', tone: on ? 'ink' : 'line', sw: 0.6, rx: 2 });
    if (i % 4 === 0) prims.push({ p: 'line', pts: [[x + 1, 18], [x + W - 1, 18]], w: 0.8, tone: 'muted' });
  });
  const w = hits.length * W + Math.floor((hits.length - 1) / perBar) * 4;
  return { kind: 'scene', box: [-4, -8, w + 8, 34], prims, label: 'תיווי קצב' };
}

function contourScene(ranks: number[]): SceneSpec {
  const max = Math.max(...ranks);
  const min = Math.min(...ranks);
  const H = 40;
  const W = 16;
  const pts = ranks.map((r, i) => [i * W, H - ((r - min) / Math.max(1, max - min)) * H] as [number, number]);
  const prims: Prim[] = [
    { p: 'line', pts: [[-6, H + 6], [(ranks.length - 1) * W + 6, H + 6]], w: 0.8, tone: 'line' },
    { p: 'line', pts, w: 1.8, tone: 'accent' },
    ...pts.map((c) => ({ p: 'circle', c, r: 3, fill: 'ink', w: 0 }) as Prim),
  ];
  const w = (ranks.length - 1) * W;
  return { kind: 'scene', box: [-12, -10, w + 24, H + 22], prims, label: 'קו מנגינה' };
}

/* ---------- rhythm memory ---------- */

function randomHits(rng: Rng, n: number): boolean[] {
  for (;;) {
    const h = Array.from({ length: n }, (_, i) => i === 0 || rng.chance(0.42));
    const count = h.filter(Boolean).length;
    if (count >= Math.round(n * 0.35) && count <= Math.round(n * 0.7)) return h;
  }
}

const audioOf = (hits: boolean[], bpm: number, repeat: number, label: string): AudioSpec => ({
  kind: 'audio',
  bpm,
  steps: hits.length,
  notes: hits.flatMap((on, i) => (on ? [{ step: i, midi: i % 4 === 0 ? 79 : 72 }] : [])),
  repeat,
  label,
});

export function beat(rng: Rng, level: Level): Draft {
  const n = level === 1 ? 8 : level === 2 ? 12 : 16;
  for (;;) {
    const hits = randomHits(rng, n);
    const key = (h: boolean[]) => h.map((x) => (x ? 1 : 0)).join('');
    const reversed = hits.slice().reverse();
    const rotated = [...hits.slice(1), hits[0]];
    const shifted = hits.slice();
    const idx = rng.pick(hits.map((on, i) => (on && i > 0 && !hits[i - 1] ? i : -1)).filter((i) => i > 0));
    if (idx === undefined) continue;
    shifted[idx] = false;
    shifted[idx - 1] = true;
    const all = [hits, reversed, rotated, shifted].map(key);
    if (new Set(all).size < 4) continue;
    return {
      dim: '2D',
      prompt: 'האזיני לקצב (הוא מושמע פעמיים). איזה תיווי מתאים לו? כל ריבוע הוא פעמה; ריבוע מלא הוא צליל.',
      stimulus: audioOf(hits, level === 3 ? 120 : 100, 2, 'קצב'),
      options: [
        { visual: beatGrid(hits), correct: true, why: 'זה הקצב ששמעת, פעמה אחר פעמה.' },
        { visual: beatGrid(shifted), correct: false, errorType: 'encoding', why: 'צליל אחד הוקדם בפעמה אחת.' },
        { visual: beatGrid(rotated), correct: false, errorType: 'transformation', why: 'כל הקצב זז בפעמה אחת: הפתיחה לא במקום.' },
        { visual: beatGrid(reversed), correct: false, errorType: 'wrong_rule', why: 'זה הקצב הפוך בזמן, מהסוף להתחלה.' },
      ],
      explanation: 'עגני את הקצב בצליל הראשון (הגבוה, בתחילת כל רבע), וספרי פעמות בין צליל לצליל. קבוצות קטנות של 4 פעמות קלות לזכירה.',
    };
  }
}

/* ---------- melody contour ---------- */

export function contour(rng: Rng, level: Level): Draft {
  const n = level + 3;
  for (;;) {
    const ranks: number[] = [rng.int(2, 6)];
    while (ranks.length < n) {
      const step = rng.pick(level === 1 ? [-2, -1, 1, 2] : [-3, -2, -1, 1, 2, 3]);
      const next = ranks[ranks.length - 1] + step;
      if (next >= 0 && next < PENTA.length) ranks.push(next);
    }
    const inverted = ranks.map((r) => PENTA.length - 1 - r);
    const reversed = ranks.slice().reverse();
    const changed = ranks.slice();
    const k = rng.int(1, n - 1);
    changed[k] = ranks[k - 1] + (ranks[k - 1] - ranks[k]); // mirror one step's direction
    if (changed[k] < 0 || changed[k] >= PENTA.length) continue;
    // compare shapes, not absolute pitch: a contour is the up/down pattern with its sizes
    const shape = (r: number[]) => r.map((x) => x - Math.min(...r)).join(',');
    if (new Set([ranks, inverted, reversed, changed].map(shape)).size < 4) continue;
    const audio: AudioSpec = { kind: 'audio', bpm: level === 3 ? 110 : 90, steps: n * 2, notes: ranks.map((r, i) => ({ step: i * 2, midi: PENTA[r], len: 2 })), repeat: 2, label: 'מנגינה' };
    return {
      dim: '2D',
      prompt: 'האזיני למנגינה. איזה קו מתאר את העליות והירידות שלה?',
      stimulus: audio,
      options: [
        { visual: contourScene(ranks), correct: true, why: 'העליות והירידות תואמות, צליל אחר צליל.' },
        { visual: contourScene(inverted), correct: false, errorType: 'wrong_rule', why: 'הקו הפוך: כל עלייה הפכה לירידה.' },
        { visual: contourScene(reversed), correct: false, errorType: 'transformation', why: 'זו המנגינה מהסוף להתחלה.' },
        { visual: contourScene(changed), correct: false, errorType: 'encoding', why: `צליל ${k + 1} הולך בכיוון הפוך.` },
      ],
      explanation: 'עקבי רק אחרי הכיוון בין צליל לצליל: למעלה, למטה, ובאיזה גודל. אפשר לסמן ביד בזמן ההאזנה.',
    };
  }
}

/* ---------- deviation ---------- */

export function deviation(rng: Rng, level: Level): Draft {
  const per = level === 1 ? 4 : 8;
  for (;;) {
    const motif = randomHits(rng, per);
    const pitches = motif.map((on, i) => (on ? PENTA[(i * 3 + 2) % 6 + 1] : 0));
    const bar = rng.int(2, 4); // 1-based; bar 1 is always the model
    const notes: AudioSpec['notes'] = [];
    let changedWhat = '';
    for (let b = 0; b < 4; b++) {
      const h = motif.slice();
      const pitch = pitches.slice();
      if (b === bar - 1) {
        if (level === 1) {
          const i = rng.pick(h.map((on, j) => (on && j > 0 ? j : -1)).filter((j) => j > 0));
          if (i === undefined) break;
          h[i] = false;
          changedWhat = 'צליל אחד חסר';
        } else if (level === 2) {
          const i = rng.pick(h.map((on, j) => (on && j > 0 && !h[j - 1] ? j : -1)).filter((j) => j > 0));
          if (i === undefined) break;
          h[i] = false;
          h[i - 1] = true;
          pitch[i - 1] = pitch[i];
          changedWhat = 'צליל אחד הוקדם';
        } else {
          const i = rng.pick(h.map((on, j) => (on && j > 0 ? j : -1)).filter((j) => j > 0));
          if (i === undefined) break;
          pitch[i] = PENTA[Math.min(PENTA.length - 1, PENTA.indexOf(pitch[i]) + 2)];
          changedWhat = 'צליל אחד גבוה יותר, באותו קצב';
        }
      }
      h.forEach((on, i) => on && notes.push({ step: b * per + i, midi: pitch[i] || 72 }));
    }
    if (!changedWhat) continue;
    const opt = (k: number): Option =>
      k === bar
        ? { visual: { kind: 'text', text: `תיבה ${k}` }, correct: true, why: `בתיבה ${k}: ${changedWhat}.` }
        : k === 1
          ? { visual: { kind: 'text', text: 'תיבה 1' }, correct: false, errorType: 'wrong_rule', why: 'התיבה הראשונה היא הדגם. השינוי בא אחריה.' }
          : { visual: { kind: 'text', text: `תיבה ${k}` }, correct: false, errorType: 'encoding', why: `תיבה ${k} זהה לדגם.` };
    return {
      dim: '2D',
      prompt: 'ארבע תיבות חוזרות על אותו דגם, ובאחת מהן יש שינוי. באיזו?',
      stimulus: { kind: 'audio', bpm: level === 3 ? 120 : 100, steps: per * 4, notes, repeat: 1, label: 'ארבע תיבות' },
      options: [1, 2, 3, 4].map(opt),
      explanation: 'הקשיבי לתיבה הראשונה כאל דגם, וספרי תיבות בקול. שינוי בקצב נשמע כ"מעידה"; שינוי בגובה נשמע כצבע אחר באותו מקום.',
    };
  }
}
