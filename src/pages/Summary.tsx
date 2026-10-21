import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OPTION_LABELS } from '../components/item/ItemView';
import { Visual } from '../components/stimulus/Visual';
import { Empty, pct } from '../components/ui/States';
import { useStore } from '../data/store';
import { statOf } from '../logic/diagnostics';
import { generateItem } from '../logic/generators';
import type { LevelEvent } from '../logic/mastery';
import { ERROR_HINT, ERROR_LABEL, MODE_LABEL, TYPE_LABEL, type ErrorType } from '../logic/types';
import './run.css';

function eventText(e: LevelEvent): string {
  const t = TYPE_LABEL[e.type];
  switch (e.kind) {
    case 'up':
      return `${t}: עלית לרמה ${e.to}.`;
    case 'down':
      return `${t}: חזרה לרמה ${e.to}. זה חלק מהמסלול, לא כישלון: הבסיס מתחזק לפני שממשיכים.`;
    case 'mastered':
      return `${t}: עברת את רמה 3 פעמיים ברצף. המסלול הושלם לסוג הזה.`;
    case 'streak':
      return `${t}: סשן ראשון מעל 80% ברמה ${e.level}. עוד אחד כזה ותעלי רמה.`;
    case 'hold':
      return `${t}: נשארת ברמה ${e.level}. בין 70% ל-80% הרמה נשמרת והרצף מתאפס.`;
    case 'off-level':
      return `${t}: הסשן היה ברמה ${e.level}, שאינה הרמה הנוכחית שלך, ולכן לא שינה את הרמה.`;
  }
}

export default function Summary() {
  const { id } = useParams();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const attempts = useStore((s) => s.attempts);
  const questions = useStore((s) => s.questions);

  const rows = useMemo(() => attempts.filter((a) => a.session_id === id), [attempts, id]);
  const review = useMemo(
    () =>
      rows.map((a) => {
        const q = questions[a.question_id];
        const item = q ? generateItem({ type: q.test_type, dim: q.dim, motion: q.motion }, q.level, q.params.seed) : null;
        return { a, item };
      }),
    [rows, questions],
  );

  if (!session) return <main className="page"><Empty title="הסשן לא נמצא" action={{ to: '/progress', label: 'להיסטוריה' }} /></main>;

  const stat = statOf(rows);
  const events = (session.data.events ?? []) as LevelEvent[];
  const mistakes = review.filter((r) => !r.a.correct);
  const topError = (Object.entries(stat.errors) as [ErrorType, number][]).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">סיכום · {MODE_LABEL[session.mode]}</span>
        <h1>{stat.accuracy >= 0.8 ? 'סשן חזק' : stat.accuracy >= 0.7 ? 'סשן יציב' : 'סשן לימודי'}</h1>
        <p className="lead">{session.types.map((t) => TYPE_LABEL[t]).join(' ו')}</p>
      </header>

      <section className="kpis" aria-label="מדדי הסשן">
        <div className="kpi">
          <span className="label">דיוק</span>
          <span className="value num">{pct(stat.accuracy)}</span>
        </div>
        <div className="kpi">
          <span className="label">תשובות נכונות</span>
          <span className="value num">
            {stat.correct}/{stat.n}
          </span>
        </div>
        <div className="kpi">
          <span className="label">זמן ממוצע לפריט</span>
          <span className="value num">{stat.avgSec.toFixed(1)}</span>
          <span className="xs muted">שניות</span>
        </div>
        <div className="kpi">
          <span className="label">הספק</span>
          <span className="value num">{stat.throughput.toFixed(1)}</span>
          <span className="xs muted">נכונות לדקה</span>
        </div>
      </section>

      {events.length > 0 && (
        <section className="card accent">
          <h2>המסלול</h2>
          <ul className="stack">
            {events.map((e, i) => (
              <li key={i}>{eventText(e)}</li>
            ))}
          </ul>
        </section>
      )}

      {topError && topError[1] > 0 && (
        <section className="card">
          <h2>הטעות המרכזית: {ERROR_LABEL[topError[0]]}</h2>
          <p>{ERROR_HINT[topError[0]]}</p>
        </section>
      )}

      <section className="stack">
        <h2>{mistakes.length ? `טעויות (${mistakes.length})` : 'אין טעויות'}</h2>
        {mistakes.map(({ a, item }) =>
          item ? (
            <article key={a.id} className="card review-item">
              <div className="board thumb">
                <Visual spec={item.options[item.correctIndex].visual} label="התשובה הנכונה" />
              </div>
              <div className="stack">
                <div className="row">
                  <span className="tag">{TYPE_LABEL[item.type]}</span>
                  <span className="tag">
                    {item.dim} · {item.motion === 'static' ? 'סטטי' : 'דינמי'}
                  </span>
                  {a.error_type && <span className="tag bad">{ERROR_LABEL[a.error_type]}</span>}
                </div>
                <p className="small">{item.prompt}</p>
                <p className="small">
                  התשובה הנכונה: <strong>{OPTION_LABELS[item.correctIndex]}</strong>
                  {a.answer !== null ? ` · בחרת: ${OPTION_LABELS[a.answer]}` : ' · לא נבחרה תשובה'}
                </p>
                {a.answer !== null && <p className="small muted">{item.options[a.answer].why}</p>}
                <p className="small muted">{item.explanation}</p>
              </div>
            </article>
          ) : null,
        )}
      </section>

      <div className="row">
        <Link className="btn primary lg" to="/">
          לדף הבית
        </Link>
        <Link className="btn lg" to="/diagnosis">
          לאבחון
        </Link>
      </div>
    </main>
  );
}
