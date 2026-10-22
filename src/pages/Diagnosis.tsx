import { useMemo, useState } from 'react';
import { Empty, Meter, pct } from '../components/ui/States';
import { useStore } from '../data/store';
import { byType, byVariant, joinAttempts, statOf, type Stat } from '../logic/diagnostics';
import { ERROR_LABEL, TEST_TYPES, TYPE_LABEL, TYPE_VARIANTS, type Dim, type ErrorType, type Motion } from '../logic/types';
import './run.css';

const COLS: { dim: Dim; motion: Motion; label: string }[] = [
  { dim: '2D', motion: 'static', label: '2D סטטי' },
  { dim: '2D', motion: 'dynamic', label: '2D דינמי' },
  { dim: '3D', motion: 'static', label: '3D סטטי' },
  { dim: '3D', motion: 'dynamic', label: '3D דינמי' },
];
const ERRORS: ErrorType[] = ['encoding', 'transformation', 'wrong_rule', 'timeout'];

function heatColor(s: Stat) {
  if (!s.n) return { background: 'transparent', color: 'var(--ink-3)' };
  if (s.accuracy >= 0.8) return { background: 'var(--ok-soft)', color: 'var(--ok)' };
  if (s.accuracy >= 0.7) return { background: '#F1EAD6', color: 'var(--warn)' };
  return { background: 'var(--bad-soft)', color: 'var(--bad)' };
}

export default function Diagnosis() {
  const { attempts, questions, sessions } = useStore((s) => s);
  const [range, setRange] = useState<'14' | 'all'>('all');
  const rows = useMemo(() => {
    const all = joinAttempts(attempts, questions, sessions).filter((r) => r.mode !== 'explain');
    if (range === 'all') return all;
    const cut = Date.now() - 14 * 86400000;
    return all.filter((r) => Date.parse(r.created_at) >= cut);
  }, [attempts, questions, sessions, range]);

  const total = statOf(rows);

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">אבחון</span>
        <h1>חוזקות ונקודות עיוורון</h1>
        <p className="lead">דיוק והספק לכל סוג, סוגי הטעויות, ומפה של כל השילובים. פריטי מצב הסבר אינם נכללים.</p>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <button aria-pressed={range === 'all'} onClick={() => setRange('all')}>
            כל התקופה
          </button>
          <button aria-pressed={range === '14'} onClick={() => setRange('14')}>
            14 ימים אחרונים
          </button>
        </div>
      </header>

      {!total.n ? (
        <Empty title="אין עדיין נתונים לאבחון" action={{ to: '/practice', label: 'לתרגול ראשון' }}>
          האבחון נבנה מתשובות בתרגול, במבחן ובסימולציה.
        </Empty>
      ) : (
        <>
          <section className="grid-2">
            {TEST_TYPES.map((t) => {
              const s = byType(rows, t);
              return (
                <article key={t} className="card">
                  <h3>{TYPE_LABEL[t]}</h3>
                  {s.n ? (
                    <>
                      <div className="kpis">
                        <div className="kpi">
                          <span className="label">דיוק</span>
                          <span className="value num">{pct(s.accuracy)}</span>
                        </div>
                        <div className="kpi">
                          <span className="label">הספק</span>
                          <span className="value num">{s.throughput.toFixed(1)}</span>
                          <span className="xs muted">נכונות לדקה</span>
                        </div>
                      </div>
                      <p className="xs muted">
                        <span className="num">{s.n}</span> פריטים · זמן ממוצע <span className="num">{s.avgSec.toFixed(1)}</span> שניות
                      </p>
                      <div className="bars" aria-label="אחוזי טעויות לפי סוג טעות">
                        {ERRORS.map((e) => {
                          const share = s.n ? s.errors[e] / s.n : 0;
                          return (
                            <div key={e} className="bar-row">
                              <span>{ERROR_LABEL[e]}</span>
                              <Meter value={share} label={ERROR_LABEL[e]} />
                              <span className="num small">{pct(share)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="small muted">אין נתונים בטווח הזה.</p>
                  )}
                </article>
              );
            })}
          </section>

          <section className="card">
            <h2>מפת חוזקות</h2>
            <p className="small muted">ירוק: 80% ומעלה. חרדל: 70% עד 80%. אדום: מתחת ל-70%. ריק: אין נתונים.</p>
            <div className="table-wrap">
              <div className="heat" role="table" aria-label="דיוק לפי סוג, ממד ותנועה">
                <span className="h" />
                {COLS.map((c) => (
                  <span key={c.label} className="h" role="columnheader">
                    {c.label}
                  </span>
                ))}
                {TEST_TYPES.map((t) => (
                  <div key={t} style={{ display: 'contents' }} role="row">
                    <span className="rowh" role="rowheader">
                      {TYPE_LABEL[t]}
                    </span>
                    {COLS.map((c) => {
                      const s = byVariant(rows, t, c.dim, c.motion);
                      if (!TYPE_VARIANTS[t].some(([d, m]) => d === c.dim && m === c.motion))
                        return (
                          <span key={c.label} className="cell na" role="cell" aria-label="לא קיים בסוג הזה">
                            <small>לא קיים</small>
                          </span>
                        );
                      return (
                        <span key={c.label} className="cell" style={heatColor(s)} role="cell">
                          <span className="num">{s.n ? pct(s.accuracy) : '–'}</span>
                          <small className="num">{s.n ? `${s.n} פריטים` : ''}</small>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
