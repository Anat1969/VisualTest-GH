import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, pct } from '../components/ui/States';
import { adoptSyncKey, resetLocal, syncNow, useStore } from '../data/store';
import { formatKey, isValidSyncKey, parseKey } from '../auth/syncKey';
import { joinAttempts } from '../logic/diagnostics';
import { rowOf } from '../logic/mastery';
import { BlockBSummary } from '../components/intel/BlockB';
import { MODE_LABEL, TEST_TYPES, TYPE_LABEL, type Level } from '../logic/types';
import './run.css';

function Trend({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 600;
  const h = 120;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - v * h;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`-8 -8 ${w + 16} ${h + 16}`} className="stim-svg" role="img" aria-label="מגמת דיוק לאורך הסשנים" style={{ direction: 'ltr' }}>
      {[0.7, 0.8].map((v) => (
        <g key={v}>
          <line x1={0} x2={w} y1={y(v)} y2={y(v)} stroke={v === 0.8 ? 'var(--ok)' : 'var(--bad)'} strokeDasharray="4 4" strokeWidth={1} />
          <text x={w} y={y(v) - 4} fontSize={11} textAnchor="end" fill="var(--ink-3)">
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
      ))}
    </svg>
  );
}

export default function Progress() {
  const { sessions, mastery, syncKey, sync, unsynced, attempts, questions } = useStore((s) => s);
  const rows = useMemo(() => joinAttempts(attempts, questions, sessions).filter((r) => r.mode !== 'explain'), [attempts, questions, sessions]);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const scored = sessions.filter((s) => s.mode !== 'explain');

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(syncKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('קוד סנכרון', syncKey);
    }
  };

  const syncLabel =
    sync.status === 'syncing'
      ? 'מסנכרן'
      : sync.status === 'ok'
        ? `מסונכרן${sync.at ? ` · ${new Date(sync.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}`
        : sync.status === 'error'
          ? 'הסנכרון נכשל. הנתונים שמורים במכשיר וישלחו בפעם הבאה.'
          : unsynced.length
            ? `${unsynced.length} סשנים ממתינים לשליחה`
            : 'מוכן';

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">התקדמות</span>
        <h1>מסלול הרמות</h1>
        <p className="lead">עלייה אחרי שני סשנים רצופים עם 80% ומעלה. ירידה אחרי סשן אחד מתחת ל-70%.</p>
      </header>

      <section className="grid-2">
        {TEST_TYPES.map((t) => (
          <article key={t} className="card">
            <h3>{TYPE_LABEL[t]}</h3>
            <div className="ladder">
              {([1, 2, 3] as Level[]).map((l) => {
                const r = rowOf(mastery, t, l);
                return (
                  <div key={l} className={`rung ${r.status}`}>
                    <strong>רמה {l}</strong>
                    <span className="xs">{r.status === 'passed' ? 'עברת' : r.status === 'open' ? `בתרגול · רצף ${r.streak}` : 'נעולה'}</span>
                    <span className="xs muted">{r.last_date ? new Date(r.last_date).toLocaleDateString('he-IL') : ' '}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="stack" aria-labelledby="bb-prog">
        <div className="page-head">
          <h2 id="bb-prog">בלוק ב: האינטליגנציות</h2>
          <p className="small muted">אותם כללי מעבר: שני סשנים רצופים עם 80% ומעלה מעלים רמה.</p>
        </div>
        <BlockBSummary rows={rows} mastery={mastery} mode="levels" />
      </section>

      {scored.length >= 2 && (
        <section className="card">
          <h2>מגמת דיוק</h2>
          <Trend values={scored.map((s) => s.accuracy)} />
        </section>
      )}

      <section className="stack">
        <h2>היסטוריית סשנים</h2>
        {!sessions.length ? (
          <Empty title="עוד אין סשנים" action={{ to: '/', label: 'לסשן הראשון' }} />
        ) : (
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>מצב</th>
                  <th>סוגים</th>
                  <th>רמה</th>
                  <th>דיוק</th>
                  <th>הספק</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions
                  .slice()
                  .reverse()
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="num">{new Date(s.started_at).toLocaleDateString('he-IL')}</td>
                      <td>{MODE_LABEL[s.mode]}</td>
                      <td>{s.types.map((t) => TYPE_LABEL[t]).join(', ')}</td>
                      <td className="num">{s.level ?? 'לפי סוג'}</td>
                      <td className="num">{pct(s.accuracy)}</td>
                      <td className="num">{s.throughput.toFixed(1)}</td>
                      <td>
                        <Link to={`/summary/${s.id}`}>סיכום</Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card flat" aria-labelledby="sync-title">
        <h2 id="sync-title">שמירה וסנכרון</h2>
        <p className="small">
          הנתונים נשמרים במכשיר ובענן. אין צורך בהרשמה: קוד הסנכרון מזהה אותך. כדי להמשיך במכשיר אחר, העתיקי את הקוד והזיני אותו שם.
        </p>
        <div className="row">
          <code className="num" style={{ fontSize: 'var(--fs-sm)', background: 'var(--surface-sunk)', padding: '6px 10px', borderRadius: 6 }}>
            {formatKey(syncKey)}
          </code>
          <button className="btn" onClick={copyKey}>
            {copied ? 'הקוד הועתק' : 'העתקת הקוד'}
          </button>
          <button className="btn ghost" onClick={() => void syncNow()} disabled={sync.status === 'syncing'}>
            סנכרון עכשיו
          </button>
        </div>
        <p className={`small ${sync.status === 'error' ? '' : 'muted'}`} role="status" style={sync.status === 'error' ? { color: 'var(--bad)' } : undefined}>
          {syncLabel}
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const k = parseKey(code);
            if (isValidSyncKey(k)) {
              void adoptSyncKey(k);
              setCode('');
            }
          }}
        >
          <label className="small" htmlFor="code">
            קוד ממכשיר אחר
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            placeholder="xxxx-xxxx-xxxx-..."
            style={{ minHeight: 44, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 6, font: 'inherit', flex: '1 1 220px' }}
          />
          <button className="btn" type="submit" disabled={!isValidSyncKey(parseKey(code))}>
            חיבור
          </button>
        </form>
        <details>
          <summary className="small">איפוס הנתונים במכשיר</summary>
          <p className="small muted">יוצר קוד חדש ומתחיל מאפס. הנתונים הקודמים נשארים בענן תחת הקוד הישן.</p>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('לאפס את כל הנתונים במכשיר הזה?')) resetLocal();
            }}
          >
            איפוס
          </button>
        </details>
      </section>
    </main>
  );
}
