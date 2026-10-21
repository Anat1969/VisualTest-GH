import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Meter, pct } from '../components/ui/States';
import { useStore } from '../data/store';
import { byType, joinAttempts, recommend } from '../logic/diagnostics';
import { currentLevel, isMastered, rowOf } from '../logic/mastery';
import type { SessionConfig } from '../logic/session';
import { MODE_LABEL, TEST_TYPES, TYPE_LABEL, type Level, type TestType } from '../logic/types';
import './run.css';

export default function Home() {
  const navigate = useNavigate();
  const { attempts, questions, sessions, mastery } = useStore((s) => s);
  const rows = useMemo(() => joinAttempts(attempts, questions, sessions), [attempts, questions, sessions]);
  const rec = useMemo(() => recommend(rows, sessions, mastery), [rows, sessions, mastery]);

  const levels = Object.fromEntries(TEST_TYPES.map((t) => [t, currentLevel(mastery, t)])) as Record<TestType, Level>;
  const start = () => {
    const config: SessionConfig = {
      mode: rec.mode,
      types: rec.types,
      levels: rec.level && rec.types.length === 1 ? { ...levels, [rec.types[0]]: rec.level } : levels,
    };
    navigate('/run', { state: config });
  };
  const last = sessions[sessions.length - 1];

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">מרחב · אימון חשיבה מרחבית</span>
        <h1>הסשן הבא</h1>
      </header>

      <section className="card accent" aria-labelledby="rec-title">
        <span className="tag accent">{MODE_LABEL[rec.mode]}</span>
        <h2 id="rec-title">{rec.title}</h2>
        <p className="lead">{rec.reason}</p>
        <div className="row">
          <button className="btn primary lg" onClick={start}>
            התחלת הסשן המומלץ
          </button>
          <Link className="btn lg" to="/practice">
            בחירה אחרת
          </Link>
        </div>
      </section>

      <section className="grid-2" aria-label="מצב לפי סוג">
        {TEST_TYPES.map((t) => {
          const s = byType(rows.filter((r) => r.mode !== 'explain'), t);
          const cur = currentLevel(mastery, t);
          const streak = rowOf(mastery, t, cur).streak;
          return (
            <article key={t} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{TYPE_LABEL[t]}</h3>
                <span className="tag">{isMastered(mastery, t) ? 'המסלול הושלם' : `רמה ${cur} מתוך 3`}</span>
              </div>
              <div className="ladder" aria-label="סולם רמות">
                {([1, 2, 3] as Level[]).map((l) => {
                  const st = rowOf(mastery, t, l).status;
                  return (
                    <div key={l} className={`rung ${st}`}>
                      <strong>רמה {l}</strong>
                      <span className="xs">{st === 'passed' ? 'עברת' : st === 'open' ? 'בתרגול' : 'נעולה'}</span>
                    </div>
                  );
                })}
              </div>
              {s.n ? (
                <>
                  <div className="row small" style={{ justifyContent: 'space-between' }}>
                    <span>דיוק כולל</span>
                    <span className="num">{pct(s.accuracy)}</span>
                  </div>
                  <Meter value={s.accuracy} label={`דיוק ב${TYPE_LABEL[t]}`} />
                  <p className="xs muted">
                    {streak === 1 ? 'סשן אחד מעל 80% ברצף. עוד אחד לעלייה.' : 'נדרשים שני סשנים רצופים מעל 80% לעלייה.'}
                  </p>
                </>
              ) : (
                <p className="small muted">עוד לא תרגלת את הסוג הזה.</p>
              )}
            </article>
          );
        })}
      </section>

      <section className="grid-3" aria-label="מעבר מהיר">
        <Link to="/practice?sub=explain" className="card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3>הסבר</h3>
          <p className="small muted">בלי זמן, עם ניתוח של כל אפשרות.</p>
        </Link>
        <Link to="/exam" className="card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3>מבחן</h3>
          <p className="small muted">זמן קצוב, בלי משוב, סיכום בסוף.</p>
        </Link>
        <Link to="/simulation" className="card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3>סימולציה מעורבת</h3>
          <p className="small muted">שני הסוגים בסבב אחד.</p>
        </Link>
      </section>

      {last && (
        <p className="small muted">
          סשן אחרון: {new Date(last.started_at).toLocaleDateString('he-IL')} · {MODE_LABEL[last.mode]} · דיוק{' '}
          <span className="num">{pct(last.accuracy)}</span> ·{' '}
          <Link to={`/summary/${last.id}`}>לסיכום</Link>
        </p>
      )}
    </main>
  );
}
