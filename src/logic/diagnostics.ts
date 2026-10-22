// Diagnosis: accuracy, throughput and error mix per type and per variant; next-session recommendation.
import type { AttemptRow, QuestionRow, SessionRow } from '../data/store';
import { currentLevel, type MasteryRow } from './mastery';
import type { Dim, ErrorType, Level, Mode, Motion, TestType } from './types';
import { TEST_TYPES, TYPE_LABEL } from './types';

export interface Stat {
  n: number;
  correct: number;
  accuracy: number;
  avgSec: number;
  throughput: number; // correct per minute
  errors: Record<ErrorType, number>;
}

const empty = (): Stat => ({
  n: 0,
  correct: 0,
  accuracy: 0,
  avgSec: 0,
  throughput: 0,
  errors: { encoding: 0, transformation: 0, wrong_rule: 0, timeout: 0 },
});

export function statOf(attempts: AttemptRow[]): Stat {
  const s = empty();
  let ms = 0;
  for (const a of attempts) {
    s.n++;
    if (a.correct) s.correct++;
    else if (a.error_type) s.errors[a.error_type]++;
    ms += a.time_ms;
  }
  if (s.n) {
    s.accuracy = s.correct / s.n;
    s.avgSec = ms / s.n / 1000;
    s.throughput = ms ? s.correct / (ms / 60000) : 0;
  }
  return s;
}

export interface Joined extends AttemptRow {
  q: QuestionRow;
  mode: Mode;
}

export function joinAttempts(attempts: AttemptRow[], questions: Record<string, QuestionRow>, sessions: SessionRow[]): Joined[] {
  const modeOf = new Map(sessions.map((s) => [s.id, s.mode]));
  return attempts
    .filter((a) => questions[a.question_id])
    .map((a) => ({ ...a, q: questions[a.question_id], mode: modeOf.get(a.session_id) ?? 'practice' }));
}

export function byType(rows: Joined[], type: TestType) {
  return statOf(rows.filter((r) => r.q.test_type === type));
}

export function byVariant(rows: Joined[], type: TestType, dim: Dim, motion: Motion) {
  return statOf(rows.filter((r) => r.q.test_type === type && r.q.dim === dim && r.q.motion === motion));
}

export interface Recommendation {
  title: string;
  reason: string;
  mode: Mode;
  types: TestType[];
  level?: Level;
}

const DAY = 86400000;

export function recommend(rows: Joined[], sessions: SessionRow[], mastery: MasteryRow[], now = Date.now()): Recommendation {
  if (!sessions.length)
    return {
      title: 'היכרות: רוטציה מנטלית במצב הסבר',
      reason: 'עוד אין נתונים. מצב הסבר מציג את ההיגיון של כל פריט, בלי זמן.',
      mode: 'explain',
      types: ['rotation'],
      level: 1,
    };

  const recent = rows.filter((r) => now - Date.parse(r.created_at) < 14 * DAY && r.mode !== 'explain');
  let weakest: { type: TestType; label: string; acc: number } | null = null;
  for (const type of TEST_TYPES)
    for (const dim of ['2D', '3D'] as Dim[])
      for (const motion of ['static', 'dynamic'] as Motion[]) {
        const s = byVariant(recent, type, dim, motion);
        if (s.n >= 4 && s.accuracy < 0.7 && (!weakest || s.accuracy < weakest.acc))
          weakest = { type, label: `${dim} ${motion === 'static' ? 'סטטי' : 'דינמי'}`, acc: s.accuracy };
      }
  if (weakest)
    return {
      title: `תרגול ממוקד: ${TYPE_LABEL[weakest.type]}`,
      reason: `הדיוק ב${TYPE_LABEL[weakest.type]} ${weakest.label} עומד על ${Math.round(weakest.acc * 100)}%. תרגול עם משוב מיידי יחזק את נקודת התורפה.`,
      mode: 'practice',
      types: [weakest.type],
      level: currentLevel(mastery, weakest.type),
    };

  const streaking = TEST_TYPES.find((t) => mastery.some((m) => m.test_type === t && m.status === 'open' && m.streak === 1));
  if (streaking)
    return {
      title: `מבחן: ${TYPE_LABEL[streaking]}, רמה ${currentLevel(mastery, streaking)}`,
      reason: 'סשן אחד נוסף עם 80% ומעלה יעלה אותך רמה.',
      mode: 'exam',
      types: [streaking],
      level: currentLevel(mastery, streaking),
    };

  const last = (t: TestType) => Math.max(0, ...sessions.filter((s) => s.types.includes(t)).map((s) => Date.parse(s.started_at)));
  const recentTypes = TEST_TYPES.filter((t) => now - last(t) < 3 * DAY);
  if (recentTypes.length >= 4)
    return {
      title: 'סימולציה מעורבת',
      reason: `${recentTypes.length} סוגים תורגלו בימים האחרונים. סבב מעורב בזמן קצוב מדמה את תנאי המבחן.`,
      mode: 'simulation',
      types: [...TEST_TYPES],
    };

  const stale = TEST_TYPES.slice().sort((a, b) => last(a) - last(b))[0];
  return {
    title: `תרגול: ${TYPE_LABEL[stale]}`,
    reason: last(stale) ? 'זה הסוג שתורגל הכי מזמן. כך נשמר רצף בכל הסוגים.' : 'עוד לא תרגלת את הסוג הזה. כדאי להתחיל בו כדי שהאבחון יכסה את כל התחומים.',
    mode: 'practice',
    types: [stale],
    level: currentLevel(mastery, stale),
  };
}

/* ---------------- home: readiness, rhythm, per-type trend ---------------- */

/**
 * Readiness index (0–100), internal to this app and not an exam score:
 * half from level progress (passed levels + current streak), half from recent accuracy.
 */
export function readiness(rows: Joined[], mastery: MasteryRow[], now = Date.now()) {
  const recent = rows.filter((r) => now - Date.parse(r.created_at) < 21 * DAY && r.mode !== 'explain');
  const perType = TEST_TYPES.map((t) => {
    const rs = mastery.filter((m) => m.test_type === t);
    const passed = rs.filter((m) => m.status === 'passed').length;
    const streak = rs.find((m) => m.status === 'open')?.streak ?? 0;
    const progress = Math.min(1, (passed + streak * 0.5) / 3);
    const s = statOf(recent.filter((r) => r.q.test_type === t));
    return { type: t, progress, accuracy: s.n ? s.accuracy : 0, n: s.n, score: 0.5 * progress + 0.5 * (s.n ? s.accuracy : 0) };
  });
  const score = Math.round((perType.reduce((a, b) => a + b.score, 0) / perType.length) * 100);
  return { score, perType };
}

/** Accuracy per session for one type (sessions with at least 2 items of it), oldest first. */
export function typeTrend(rows: Joined[], type: TestType, limit = 8): number[] {
  const bySession = new Map<string, { c: number; n: number; at: string }>();
  for (const r of rows) {
    if (r.q.test_type !== type || r.mode === 'explain') continue;
    const s = bySession.get(r.session_id) ?? { c: 0, n: 0, at: r.created_at };
    s.n++;
    if (r.correct) s.c++;
    bySession.set(r.session_id, s);
  }
  return [...bySession.values()]
    .filter((s) => s.n >= 2)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-limit)
    .map((s) => s.c / s.n);
}

export function weekRhythm(sessions: SessionRow[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const list = sessions.filter((s) => {
      const t = Date.parse(s.started_at);
      return t >= d.getTime() && t < next.getTime();
    });
    return { date: d, count: list.length, isToday: d.toDateString() === now.toDateString(), future: d > now };
  });
  const minutes = Math.round(
    sessions.filter((s) => Date.parse(s.started_at) >= start.getTime()).reduce((m, s) => m + (s.data.durationMs ?? 0), 0) / 60000,
  );
  // consecutive days with practice, ending today or yesterday
  const daySet = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  if (!daySet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { days, minutes, streak };
}

/** Three types to mix into a short daily round: untried first, then the weakest. */
export function dailyMix(rows: Joined[]): TestType[] {
  const recent = rows.filter((r) => r.mode !== 'explain');
  const scored = TEST_TYPES.map((t) => {
    const s = statOf(recent.filter((r) => r.q.test_type === t));
    return { t, key: s.n < 4 ? -1 + s.n / 10 : s.accuracy };
  }).sort((a, b) => a.key - b.key);
  return scored.slice(0, 3).map((x) => x.t);
}
