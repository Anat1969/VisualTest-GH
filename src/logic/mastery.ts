// Level progression: 80%+ in two consecutive sessions moves up; under 70% in one session moves down.
import type { Level, TestType } from './types';
import { LEVELS, TEST_TYPES } from './types';

export type MasteryStatus = 'locked' | 'open' | 'passed';

export interface MasteryRow {
  test_type: TestType;
  level: Level;
  status: MasteryStatus;
  streak: number;
  last_date: string | null;
}

export const PASS = 0.8;
export const DROP = 0.7;
export const MIN_ITEMS_FOR_RULE = 4;

export function initialMastery(): MasteryRow[] {
  return TEST_TYPES.flatMap((t) =>
    LEVELS.map((level) => ({ test_type: t, level, status: level === 1 ? 'open' : 'locked', streak: 0, last_date: null }) as MasteryRow),
  );
}

export const rowOf = (rows: MasteryRow[], type: TestType, level: Level) =>
  rows.find((r) => r.test_type === type && r.level === level)!;

/** The lowest level that is open and not yet passed; 3 once everything is passed. */
export function currentLevel(rows: MasteryRow[], type: TestType): Level {
  for (const l of LEVELS) if (rowOf(rows, type, l).status === 'open') return l;
  return 3;
}

export const isMastered = (rows: MasteryRow[], type: TestType) => rowOf(rows, type, 3).status === 'passed';

export type LevelEvent =
  | { kind: 'up'; type: TestType; from: Level; to: Level }
  | { kind: 'down'; type: TestType; from: Level; to: Level }
  | { kind: 'mastered'; type: TestType }
  | { kind: 'streak'; type: TestType; level: Level }
  | { kind: 'hold'; type: TestType; level: Level }
  | { kind: 'off-level'; type: TestType; level: Level };

export function applyResult(
  rows: MasteryRow[],
  type: TestType,
  level: Level,
  accuracy: number,
  date: string,
): { rows: MasteryRow[]; event: LevelEvent } {
  const next = rows.map((r) => ({ ...r }));
  const cur = currentLevel(next, type);
  const row = rowOf(next, type, level);
  if (level !== cur || row.status !== 'open') {
    row.last_date = date;
    return { rows: next, event: { kind: 'off-level', type, level } };
  }
  row.last_date = date;
  if (accuracy >= PASS) {
    row.streak += 1;
    if (row.streak >= 2) {
      row.status = 'passed';
      row.streak = 0;
      if (level < 3) {
        const up = rowOf(next, type, (level + 1) as Level);
        up.status = 'open';
        up.streak = 0;
        up.last_date = date;
        return { rows: next, event: { kind: 'up', type, from: level, to: (level + 1) as Level } };
      }
      return { rows: next, event: { kind: 'mastered', type } };
    }
    return { rows: next, event: { kind: 'streak', type, level } };
  }
  row.streak = 0;
  if (accuracy < DROP && level > 1) {
    row.status = 'locked';
    const down = rowOf(next, type, (level - 1) as Level);
    down.status = 'open';
    down.streak = 0;
    down.last_date = date;
    return { rows: next, event: { kind: 'down', type, from: level, to: (level - 1) as Level } };
  }
  return { rows: next, event: { kind: 'hold', type, level } };
}
