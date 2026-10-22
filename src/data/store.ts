// Local-first store (localStorage) with background sync to Supabase.
import { useSyncExternalStore } from 'react';
import { initialMastery, type MasteryRow } from '../logic/mastery';
import type { Dim, ErrorType, Level, Mode, Motion, TestType } from '../logic/types';
import { newSyncKey } from '../auth/syncKey';
import { pullRemote, pushRemote, type RemotePayload } from './sync';

export interface QuestionRow {
  id: string;
  test_type: TestType;
  level: Level;
  dim: Dim;
  motion: Motion;
  params: { seed: number };
  correct_answer: number;
  explanation: string;
}

export interface AttemptRow {
  id: string;
  session_id: string;
  question_id: string;
  answer: number | null;
  time_ms: number;
  correct: boolean;
  error_type: ErrorType | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  started_at: string;
  mode: Mode;
  types: TestType[];
  level: Level | null;
  item_count: number;
  accuracy: number;
  throughput: number; // correct answers per minute
  data: { levels: Partial<Record<TestType, Level>>; events?: unknown[]; durationMs?: number };
}

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

export interface State {
  questions: Record<string, QuestionRow>;
  attempts: AttemptRow[];
  sessions: SessionRow[];
  mastery: MasteryRow[];
  syncKey: string;
  unsynced: string[]; // session ids not yet pushed
  sync: { status: SyncStatus; at?: string; error?: string };
}

const KEY = 'merhav:v1';

/** Data saved before a test type existed has no level rows for it: add them as fresh rows. */
function withAllTypes(rows: MasteryRow[]): MasteryRow[] {
  const have = new Set(rows.map((r) => `${r.test_type}:${r.level}`));
  return [...rows, ...initialMastery().filter((r) => !have.has(`${r.test_type}:${r.level}`))];
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      return { ...s, mastery: withAllTypes(s.mastery), sync: { status: 'idle' } };
    }
  } catch {
    /* fall through to a fresh state */
  }
  return {
    questions: {},
    attempts: [],
    sessions: [],
    mastery: initialMastery(),
    syncKey: newSyncKey(),
    unsynced: [],
    sync: { status: 'idle' },
  };
}

let state: State = typeof localStorage === 'undefined' ? (null as unknown as State) : load();
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  try {
    const { sync: _sync, ...persist } = state;
    void _sync;
    localStorage.setItem(KEY, JSON.stringify(persist));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

export const getState = () => state;

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
  );
}

export function recordSession(session: SessionRow, questions: QuestionRow[], attempts: AttemptRow[], mastery: MasteryRow[]) {
  const qs = { ...state.questions };
  for (const q of questions) qs[q.id] = q;
  set({
    questions: qs,
    attempts: [...state.attempts, ...attempts],
    sessions: [...state.sessions, session],
    mastery,
    unsynced: [...state.unsynced, session.id],
  });
  void syncNow();
}

/* ---------------- sync ---------------- */

function payloadFor(sessionIds: string[]): RemotePayload {
  const ids = new Set(sessionIds);
  const attempts = state.attempts.filter((a) => ids.has(a.session_id));
  const qids = new Set(attempts.map((a) => a.question_id));
  return {
    sessions: state.sessions.filter((s) => ids.has(s.id)),
    attempts,
    questions: Object.values(state.questions).filter((q) => qids.has(q.id)),
    mastery: state.mastery,
  };
}

function merge(remote: RemotePayload) {
  const questions = { ...state.questions };
  for (const q of remote.questions) questions[q.id] ??= q;
  const aIds = new Set(state.attempts.map((a) => a.id));
  const sIds = new Set(state.sessions.map((s) => s.id));
  const sessions = [...state.sessions, ...remote.sessions.filter((s) => !sIds.has(s.id))].sort((a, b) =>
    a.started_at.localeCompare(b.started_at),
  );
  const mastery = state.mastery.map((m) => {
    const r = remote.mastery.find((x) => x.test_type === m.test_type && x.level === m.level);
    if (!r || !r.last_date) return m;
    return !m.last_date || r.last_date > m.last_date ? { ...m, ...r, streak: Number(r.streak) } : m;
  });
  set({ questions, attempts: [...state.attempts, ...remote.attempts.filter((a) => !aIds.has(a.id))], sessions, mastery });
}

let syncing: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    set({ sync: { status: 'syncing' } });
    try {
      if (state.unsynced.length) {
        const pending = state.unsynced.slice();
        await pushRemote(state.syncKey, payloadFor(pending));
        set({ unsynced: state.unsynced.filter((id) => !pending.includes(id)) });
      } else {
        await pushRemote(state.syncKey, { sessions: [], attempts: [], questions: [], mastery: state.mastery });
      }
      merge(await pullRemote(state.syncKey));
      set({ sync: { status: 'ok', at: new Date().toISOString() } });
    } catch (e) {
      set({ sync: { status: 'error', error: e instanceof Error ? e.message : String(e) } });
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Adopt a code from another device: push local history under it, then merge its data. */
export async function adoptSyncKey(key: string) {
  const all = state.sessions.map((s) => s.id);
  set({ syncKey: key, unsynced: Array.from(new Set([...state.unsynced, ...all])) });
  await syncNow();
}

export function resetLocal() {
  set({ questions: {}, attempts: [], sessions: [], mastery: initialMastery(), unsynced: [], syncKey: newSyncKey() });
}
