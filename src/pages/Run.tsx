import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ItemView } from '../components/item/ItemView';
import { Empty, ErrorState, Meter } from '../components/ui/States';
import { getState, recordSession, type AttemptRow, type QuestionRow, type SessionRow } from '../data/store';
import { applyResult, MIN_ITEMS_FOR_RULE, type LevelEvent } from '../logic/mastery';
import { hashString } from '../logic/rng';
import { buildItems, isTimed, secondsFor, type SessionConfig } from '../logic/session';
import type { Item } from '../logic/types';
import { INTEL_TYPES, MODE_LABEL, TYPE_LABEL } from '../logic/types';
import './run.css';

interface Answer {
  index: number; // -1 = timeout
  ms: number;
}

const WEEK = 7 * 86400000;
const DYNAMIC_GRACE_MS = 4000;

export default function Run() {
  const { state } = useLocation() as { state: SessionConfig | null };
  const navigate = useNavigate();
  const { items, buildError } = useMemo<{ items: Item[]; buildError: string | null }>(() => {
    if (!state) return { items: [], buildError: null };
    try {
      const s = getState();
      const now = Date.now();
      const recent = new Set(s.attempts.filter((a) => now - Date.parse(a.created_at) < WEEK).map((a) => a.question_id));
      return { items: buildItems(state, recent), buildError: null };
    } catch (e) {
      return { items: [], buildError: e instanceof Error ? e.message : String(e) };
    }
  }, [state]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(Answer | null)[]>([]);
  const startedAt = useRef(new Date().toISOString());
  const itemStart = useRef(performance.now());
  const [remaining, setRemaining] = useState<number | null>(null);

  const item = items[idx];
  const timed = state ? isTimed(state.mode) : false;
  const showFeedback = state ? state.mode === 'practice' || state.mode === 'explain' : false;
  const answer = answers[idx] ?? null;

  useEffect(() => {
    itemStart.current = performance.now();
    if (!timed || !item) return;
    // the animation before the question point does not count against answer time
    const limit = secondsFor(item.type, item.level) * 1000 + (item.dynamic ? DYNAMIC_GRACE_MS : 0);
    setRemaining(limit);
    const t = setInterval(() => {
      const left = limit - (performance.now() - itemStart.current);
      setRemaining(Math.max(0, left));
    }, 200);
    return () => clearInterval(t);
  }, [idx, item, timed]);

  const finish = useCallback(
    (all: (Answer | null)[]) => {
      if (!state) return;
      const sessionId = `s-${Date.now().toString(36)}-${hashString(String(Math.random()))}`;
      const now = new Date().toISOString();
      const questions: QuestionRow[] = items.map((it) => ({
        id: it.id,
        test_type: it.type,
        level: it.level,
        dim: it.dim,
        motion: it.motion,
        params: { seed: it.seed },
        correct_answer: it.correctIndex,
        explanation: it.explanation,
      }));
      const attempts: AttemptRow[] = items.map((it, i) => {
        const a = all[i] ?? { index: -1, ms: 0 };
        const correct = a.index === it.correctIndex;
        return {
          id: `${sessionId}-${i}`,
          session_id: sessionId,
          question_id: it.id,
          answer: a.index >= 0 ? a.index : null,
          time_ms: Math.round(a.ms),
          correct,
          error_type: correct ? null : a.index < 0 ? 'timeout' : (it.options[a.index].errorType ?? null),
          created_at: now,
        };
      });
      const totalMs = attempts.reduce((s, a) => s + a.time_ms, 0);
      const nCorrect = attempts.filter((a) => a.correct).length;

      let mastery = getState().mastery;
      const events: LevelEvent[] = [];
      if (state.mode !== 'explain')
        for (const t of state.types) {
          const its = attempts.filter((_, i) => items[i].type === t);
          if (its.length < MIN_ITEMS_FOR_RULE) continue;
          const acc = its.filter((a) => a.correct).length / its.length;
          const r = applyResult(mastery, t, state.levels[t], acc, now);
          mastery = r.rows;
          events.push(r.event);
        }

      const session: SessionRow = {
        id: sessionId,
        started_at: startedAt.current,
        mode: state.mode,
        types: state.types,
        level: state.types.length === 1 ? state.levels[state.types[0]] : null,
        item_count: items.length,
        accuracy: nCorrect / items.length,
        throughput: totalMs ? nCorrect / (totalMs / 60000) : 0,
        data: { levels: state.levels, events, durationMs: totalMs },
      };
      recordSession(session, questions, attempts, mastery);
      navigate(`/summary/${sessionId}`, { replace: true });
    },
    [items, navigate, state],
  );

  const submit = useCallback(
    (index: number) => {
      if (answers[idx]) return;
      const next = answers.slice();
      next[idx] = { index, ms: performance.now() - itemStart.current };
      setAnswers(next);
      if (!showFeedback) {
        if (idx + 1 < items.length) setIdx(idx + 1);
        else finish(next);
      }
    },
    [answers, idx, items.length, showFeedback, finish],
  );

  useEffect(() => {
    if (timed && remaining === 0 && !answers[idx]) submit(-1);
  }, [remaining, timed, answers, idx, submit]);

  if (!state) return <main className="page"><Empty title="אין סשן פעיל" action={{ to: '/', label: 'לדף הבית' }}>בחרי סוג מבחן ומצב כדי להתחיל.</Empty></main>;
  if (buildError) return <main className="page"><ErrorState title="יצירת הפריטים נכשלה" detail={buildError} onRetry={() => navigate(0)} /></main>;
  if (!item) return <main className="page"><ErrorState title="לא נוצרו פריטים" /></main>;

  const isLast = idx + 1 >= items.length;
  const secLeft = remaining === null ? null : Math.ceil(remaining / 1000);

  return (
    <main className="page run">
      <header className="run-head">
        <div className="row">
          <span className="tag accent">{MODE_LABEL[state.mode]}</span>
          <span className="tag">{TYPE_LABEL[item.type]}</span>
          <span className="tag">רמה {item.level}</span>
          {!INTEL_TYPES.includes(item.type) && (
            <span className="tag">
              {item.dim} · {item.motion === 'static' ? 'סטטי' : 'דינמי'}
            </span>
          )}
        </div>
        <div className="row run-meta">
          <span className="small num">
            {idx + 1} / {items.length}
          </span>
          {secLeft !== null && (
            <span className={`timer num ${secLeft <= 5 ? 'low' : ''}`} aria-live="off" aria-label={`נותרו ${secLeft} שניות`}>
              {secLeft}
            </span>
          )}
          <button
            className="btn ghost"
            onClick={() => {
              if (window.confirm('לצאת מהסשן? ההתקדמות בסשן הזה לא תישמר.')) navigate('/');
            }}
          >
            יציאה
          </button>
        </div>
      </header>
      <Meter value={(idx + (answer ? 1 : 0)) / items.length} label="התקדמות בסשן" />

      <ItemView
        key={item.id + idx}
        item={item}
        answer={answer ? answer.index : null}
        showFeedback={showFeedback}
        explainMode={state.mode === 'explain'}
        allowReplay={!timed}
        onAnswer={submit}
      />

      {showFeedback && answer && (
        <div className="row run-next">
          <button className="btn primary lg" autoFocus onClick={() => (isLast ? finish(answers) : setIdx(idx + 1))}>
            {isLast ? 'סיום וסיכום' : 'לפריט הבא'}
          </button>
        </div>
      )}
    </main>
  );
}
