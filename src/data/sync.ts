// Supabase RPC bridge. Tables are closed to direct access; visual_push/visual_pull are scoped by the sync key.
import type { MasteryRow } from '../logic/mastery';
import type { AttemptRow, QuestionRow, SessionRow } from './store';

const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
// Publishable key: safe in the browser by design. Data access is limited to the RPCs above.
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';

export interface RemotePayload {
  questions: QuestionRow[];
  attempts: AttemptRow[];
  sessions: SessionRow[];
  mastery: MasteryRow[];
}

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`שגיאת שרת (${res.status})`);
  return (await res.json()) as T;
}

export const pushRemote = (key: string, payload: RemotePayload) => rpc('visual_push', { p_key: key, p_payload: payload });

export async function pullRemote(key: string): Promise<RemotePayload> {
  const r = await rpc<RemotePayload>('visual_pull', { p_key: key });
  return {
    questions: r.questions ?? [],
    attempts: (r.attempts ?? []).map((a) => ({ ...a, created_at: new Date(a.created_at).toISOString() })),
    sessions: (r.sessions ?? []).map((s) => ({
      ...s,
      started_at: new Date(s.started_at).toISOString(),
      accuracy: Number(s.accuracy),
      throughput: Number(s.throughput),
    })),
    mastery: (r.mastery ?? []).map((m) => ({ ...m, last_date: m.last_date ? new Date(m.last_date).toISOString() : null })),
  };
}
