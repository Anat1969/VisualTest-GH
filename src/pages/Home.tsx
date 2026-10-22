import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cubes3D } from '../components/stimulus/Cubes3D';
import { pct } from '../components/ui/States';
import { useStore } from '../data/store';
import { byType, dailyMix, joinAttempts, readiness, recommend, statOf, typeTrend, weekRhythm } from '../logic/diagnostics';
import { axisAngle, mulM } from '../logic/geometry';
import { currentLevel, isMastered, rowOf } from '../logic/mastery';
import { makeRng } from '../logic/rng';
import type { SessionConfig } from '../logic/session';
import { randomPolycube } from '../logic/shapes';
import { CATEGORIES, ERROR_HINT, ERROR_LABEL, MODE_LABEL, TEST_TYPES, TYPE_LABEL, type ErrorType, type Level, type TestType } from '../logic/types';
import './home.css';

const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const EMBLEM = randomPolycube(makeRng(1969), 9);
const TILT = mulM(axisAngle([1, 0, 0], -12), axisAngle([0, 1, 0], 8));

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

/** The signature: a Shepard–Metzler figure turning slowly on the drafting board. */
function Emblem() {
  const [angle, setAngle] = useState(24);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setAngle(24 + ((now - start) / 1000) * 14);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="emblem board" aria-hidden>
      <Cubes3D spec={{ kind: 'cubes3d', cubes: EMBLEM, rot: TILT }} rot={mulM(axisAngle([0, 0, 1], angle), TILT)} />
    </div>
  );
}

/** Readiness drawn as an architect's scale ruler. */
function ScaleRuler({ value }: { value: number }) {
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  return (
    <div className="ruler" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="מדד מוכנות">
      <svg viewBox="0 0 400 44" preserveAspectRatio="none" style={{ direction: 'ltr' }}>
        <rect x="0" y="6" width="400" height="18" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1" />
        <rect x="0" y="6" width={value * 4} height="18" fill="var(--accent)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={t * 4} x2={t * 4} y1={24} y2={t % 25 === 0 ? 34 : 29} stroke="var(--ink)" strokeWidth={t % 25 === 0 ? 1.4 : 0.8} />
            {t % 25 === 0 && (
              <text x={Math.min(392, Math.max(8, t * 4))} y={42} fontSize="8" textAnchor="middle" fill="var(--ink-3)">
                {t}
              </text>
            )}
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect key={i} x={i * 40} y="6" width="20" height="4" fill={i % 2 ? 'transparent' : 'var(--ink)'} opacity="0.85" />
        ))}
      </svg>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="spark-empty xs muted">{values.length ? 'סשן אחד' : 'אין עדיין מגמה'}</span>;
  const w = 80;
  const h = 22;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 2 - v * (h - 4);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} style={{ direction: 'ltr' }} aria-label="מגמת דיוק">
      <line x1="0" x2={w} y1={y(0.8)} y2={y(0.8)} stroke="var(--ok)" strokeDasharray="2 2" strokeWidth="0.8" />
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { attempts, questions, sessions, mastery } = useStore((s) => s);
  const rows = useMemo(() => joinAttempts(attempts, questions, sessions), [attempts, questions, sessions]);
  const rec = useMemo(() => recommend(rows, sessions, mastery), [rows, sessions, mastery]);
  const ready = useMemo(() => readiness(rows, mastery), [rows, mastery]);
  const rhythm = useMemo(() => weekRhythm(sessions), [sessions]);
  const mix = useMemo(() => dailyMix(rows), [rows]);

  const levels = Object.fromEntries(TEST_TYPES.map((t) => [t, currentLevel(mastery, t)])) as Record<TestType, Level>;
  const go = (config: SessionConfig) => navigate('/run', { state: config });
  const startRec = () =>
    go({ mode: rec.mode, types: rec.types, levels: rec.level && rec.types.length === 1 ? { ...levels, [rec.types[0]]: rec.level } : levels });

  const scored = rows.filter((r) => r.mode !== 'explain');
  const total = statOf(scored);
  const typeStats = TEST_TYPES.map((t) => ({ t, s: byType(scored, t) })).filter((x) => x.s.n >= 6);
  const strongest = typeStats.slice().sort((a, b) => b.s.accuracy - a.s.accuracy)[0];
  const weakest = typeStats.slice().sort((a, b) => a.s.accuracy - b.s.accuracy)[0];
  const topError = (Object.entries(total.errors) as [ErrorType, number][]).sort((a, b) => b[1] - a[1])[0];
  const tried = TEST_TYPES.filter((t) => scored.some((r) => r.q.test_type === t)).length;
  const last = sessions[sessions.length - 1];

  return (
    <main className="home">
      {/* ---------- hero ---------- */}
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">
            {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1>
            {greeting()}, ענת.
            <span className="hero-sub">{rec.title}</span>
          </h1>
          <p className="lead">{rec.reason}</p>
          <div className="row hero-actions">
            <button className="btn primary lg" onClick={startRec}>
              התחלת {MODE_LABEL[rec.mode]}
            </button>
            <button className="btn lg" onClick={() => go({ mode: 'practice', types: mix, levels })} title={mix.map((t) => TYPE_LABEL[t]).join(', ')}>
              סבב יומי קצר
            </button>
          </div>
          <p className="xs muted">
            הסבב היומי משלב שלושה סוגים: {mix.map((t) => TYPE_LABEL[t]).join(', ')}. עשרה פריטים עם משוב.
          </p>

          <div className="readiness">
            <div className="row readiness-head">
              <span className="readiness-num num">{ready.score}</span>
              <div className="stack" style={{ gap: 2 }}>
                <strong>מדד מוכנות</strong>
                <span className="xs muted">
                  מדד פנימי: חצי מהתקדמות ברמות, חצי מדיוק בשלושת השבועות האחרונים. לא ציון של מבחן.
                </span>
              </div>
            </div>
            <ScaleRuler value={ready.score} />
            <span className="xs muted">
              <span className="num">{tried}</span> מתוך <span className="num">{TEST_TYPES.length}</span> סוגים תורגלו
            </span>
          </div>
        </div>
        <Emblem />
      </section>

      {/* ---------- rhythm ---------- */}
      <section className="rhythm" aria-label="קצב שבועי">
        <div className="days">
          {rhythm.days.map((d, i) => (
            <div key={i} className={`day ${d.count ? 'on' : ''} ${d.isToday ? 'today' : ''} ${d.future ? 'future' : ''}`}>
              <span className="xs">{DAY_LETTERS[i]}</span>
              <span className="dot" aria-label={`${d.count} סשנים`}>
                {d.count > 1 ? d.count : ''}
              </span>
            </div>
          ))}
        </div>
        <div className="rhythm-stats">
          <div>
            <span className="big num">{rhythm.streak}</span>
            <span className="xs muted">ימים ברצף</span>
          </div>
          <div>
            <span className="big num">{rhythm.minutes}</span>
            <span className="xs muted">דקות השבוע</span>
          </div>
          <div>
            <span className="big num">{total.n ? pct(total.accuracy) : '–'}</span>
            <span className="xs muted">דיוק כולל</span>
          </div>
        </div>
      </section>

      {/* ---------- map ---------- */}
      <section className="map" aria-labelledby="map-title">
        <div className="map-head">
          <h2 id="map-title">מפת המיומנויות</h2>
          <p className="small muted">ארבעה תחומים, עשרה סוגים. לכל סוג רמה, דיוק ומגמה. לחיצה פותחת תרגול.</p>
        </div>
        {CATEGORIES.map((c) => (
          <div key={c.id} className="domain">
            <div className="domain-head">
              <h3>{c.label}</h3>
              <p className="xs muted">{c.blurb}</p>
            </div>
            <div className="tiles">
              {c.types.map((t) => {
                const s = byType(scored, t);
                const cur = currentLevel(mastery, t);
                const done = isMastered(mastery, t);
                const streak = rowOf(mastery, t, cur).streak;
                return (
                  <Link key={t} to={`/practice?type=${t}`} className="tile">
                    <div className="tile-top">
                      <strong>{TYPE_LABEL[t]}</strong>
                      {!s.n ? <span className="tag accent">חדש</span> : done ? <span className="tag ok">הושלם</span> : null}
                    </div>
                    <div className="tile-level">
                      <span className="lvl-num">{cur}</span>
                      <div className="lvl-bars" aria-label={`רמה ${cur} מתוך 3`}>
                        {([1, 2, 3] as Level[]).map((l) => (
                          <span key={l} className={rowOf(mastery, t, l).status} />
                        ))}
                      </div>
                    </div>
                    <div className="tile-foot">
                      <span className="num small">{s.n ? pct(s.accuracy) : '–'}</span>
                      <Spark values={typeTrend(rows, t)} />
                    </div>
                    <span className="xs muted tile-note">{streak === 1 ? 'עוד סשן אחד מעל 80% לעלייה' : s.n ? `${s.n} פריטים` : 'מתחילים ברמה 1'}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ---------- insights ---------- */}
      <section className="insights" aria-label="תובנות">
        <article className="insight">
          <span className="eyebrow">החוזקה</span>
          {strongest ? (
            <p>
              <strong>{TYPE_LABEL[strongest.t]}</strong> עם <span className="num">{pct(strongest.s.accuracy)}</span>. אם הרמה מאפשרת, זה הזמן לעלות במבחן.
            </p>
          ) : (
            <p className="muted small">תופיע אחרי שישה פריטים לפחות באותו סוג.</p>
          )}
        </article>
        <article className="insight">
          <span className="eyebrow">נקודת התורפה</span>
          {weakest && weakest !== strongest ? (
            <p>
              <strong>{TYPE_LABEL[weakest.t]}</strong> עם <span className="num">{pct(weakest.s.accuracy)}</span>.{' '}
              <Link to={`/library#lib-${weakest.t}`}>אסטרטגיות בספרייה</Link>
            </p>
          ) : (
            <p className="muted small">צריך נתונים בשני סוגים לפחות כדי להשוות.</p>
          )}
        </article>
        <article className="insight">
          <span className="eyebrow">דפוס הטעות</span>
          {topError && topError[1] > 0 ? (
            <p>
              <strong>{ERROR_LABEL[topError[0]]}</strong>. {ERROR_HINT[topError[0]]}
            </p>
          ) : (
            <p className="muted small">עוד אין טעויות לנתח.</p>
          )}
        </article>
      </section>

      {/* ---------- shortcuts ---------- */}
      <section className="shortcuts" aria-label="מעבר מהיר">
        <Link to="/practice?sub=explain" className="shortcut">
          <strong>הסבר</strong>
          <span className="xs muted">בלי זמן, עם ניתוח של כל אפשרות</span>
        </Link>
        <Link to="/exam" className="shortcut">
          <strong>מבחן</strong>
          <span className="xs muted">זמן קצוב, סיכום בסוף</span>
        </Link>
        <Link to="/simulation" className="shortcut">
          <strong>סימולציה מעורבת</strong>
          <span className="xs muted">בחירת תחומים, כמו ביום מבחן</span>
        </Link>
        <Link to="/diagnosis" className="shortcut">
          <strong>אבחון</strong>
          <span className="xs muted">מפת חוזקות וסוגי טעויות</span>
        </Link>
      </section>

      {last && (
        <p className="small muted last">
          סשן אחרון: {new Date(last.started_at).toLocaleDateString('he-IL')} · {MODE_LABEL[last.mode]} · דיוק{' '}
          <span className="num">{pct(last.accuracy)}</span> · <Link to={`/summary/${last.id}`}>לסיכום</Link>
        </p>
      )}
    </main>
  );
}
