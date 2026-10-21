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
  const bothRecent = TEST_TYPES.every((t) => now - last(t) < 3 * DAY);
  if (bothRecent)
    return {
      title: 'סימולציה מעורבת',
      reason: 'שני הסוגים תורגלו לאחרונה. סבב מעורב בזמן קצוב מדמה את תנאי המבחן.',
      mode: 'simulation',
      types: [...TEST_TYPES],
    };

  const stale = TEST_TYPES.slice().sort((a, b) => last(a) - last(b))[0];
  return {
    title: `תרגול: ${TYPE_LABEL[stale]}`,
    reason: 'זה הסוג שתורגל הכי מזמן. שמירה על רצף בשני הסוגים.',
    mode: 'practice',
    types: [stale],
    level: currentLevel(mastery, stale),
  };
}
