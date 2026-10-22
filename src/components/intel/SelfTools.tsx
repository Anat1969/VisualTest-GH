import { useMemo, useState } from 'react';
import { useStore } from '../../data/store';
import { byType, joinAttempts } from '../../logic/diagnostics';
import { ALL_TYPES, TYPE_LABEL, type TestType } from '../../logic/types';
import { mean, todayKey, useLocal } from './local';

/* ================= daily check-in ================= */

interface Entry {
  energy: number;
  mood: number;
  focus: number;
  note: string;
}
const DIMS = [
  { key: 'energy', label: 'אנרגיה', tone: 'var(--accent)' },
  { key: 'mood', label: 'מצב רוח', tone: 'var(--intel)' },
  { key: 'focus', label: 'ריכוז', tone: 'var(--ink-2)' },
] as const;

/** Three sliders and a line, once a day. The 14-day chart shows patterns a single day hides. */
export function CheckIn() {
  const [log, setLog] = useLocal<Record<string, Entry>>('merhav:checkin', {});
  const today = todayKey();
  const [entry, setEntry] = useState<Entry>(log[today] ?? { energy: 3, mood: 3, focus: 3, note: '' });
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 13 + i);
        return todayKey(d);
      }),
    [],
  );
  const saved = Boolean(log[today]);
  const filled = days.filter((d) => log[d]);
  const X = (i: number) => 10 + i * (280 / 13);
  const Y = (v: number) => 90 - (v - 1) * 20;

  // the strongest link between two dimensions over the period, in plain words
  const insight = useMemo(() => {
    if (filled.length < 5) return null;
    const best = DIMS.map((d) => ({ d, avg: mean(filled.map((k) => log[k][d.key])) })).sort((a, b) => a.avg - b.avg)[0];
    return `ב-${filled.length} הימים האחרונים שנרשמו, ${best.d.label} נמוך מהשאר בממוצע (${best.avg.toFixed(1)}). מה קורה בימים שבהם הוא גבוה?`;
  }, [filled, log]);

  return (
    <div className="lab">
      {DIMS.map((d) => (
        <label key={d.key} className="checkin-row">
          <span className="small">{d.label}</span>
          <input type="range" min={1} max={5} value={entry[d.key]} onChange={(e) => setEntry({ ...entry, [d.key]: +e.target.value })} aria-label={d.label} />
          <span className="num">{entry[d.key]}</span>
        </label>
      ))}
      <input value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} placeholder="משפט אחד: מה השפיע היום?" aria-label="הערה" />
      <div className="row">
        <button className="btn primary" onClick={() => setLog({ ...log, [today]: entry })}>
          {saved ? 'עדכון היום' : 'שמירה להיום'}
        </button>
        <span className="xs muted">{saved ? 'נשמר להיום.' : 'עוד לא נרשם היום.'}</span>
      </div>
      <svg viewBox="0 0 300 110" className="checkin-chart" aria-label="14 הימים האחרונים">
        {[1, 2, 3, 4, 5].map((v) => (
          <line key={v} x1="6" x2="294" y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
        ))}
        {DIMS.map((d) => {
          const pts = days.map((k, i) => (log[k] ? `${X(i)},${Y(log[k][d.key])}` : null)).filter(Boolean);
          return (
            <g key={d.key}>
              <polyline points={pts.join(' ')} fill="none" stroke={d.tone} strokeWidth="2" strokeLinejoin="round" />
              {days.map((k, i) => log[k] && <circle key={k} cx={X(i)} cy={Y(log[k][d.key])} r="2.4" fill={d.tone} />)}
            </g>
          );
        })}
        {days.map((k, i) => (
          <text key={k} x={X(i)} y="106" fontSize="6" textAnchor="middle" fill={k === today ? 'var(--ink)' : 'var(--ink-3)'}>
            {+k.slice(8)}
          </text>
        ))}
      </svg>
      <div className="row xs">
        {DIMS.map((d) => (
          <span key={d.key} className="legend-dot" style={{ ['--c' as string]: d.tone }}>
            {d.label}
          </span>
        ))}
      </div>
      <p className="small">{insight ?? <span className="muted">אחרי חמישה ימים רשומים תופיע כאן תובנה ראשונה.</span>}</p>
    </div>
  );
}

/* ================= calibration ================= */

interface Guess {
  type: TestType;
  guess: number;
  actual: number;
  at: string;
}

/** Guess your accuracy in each drill you practised, then compare with the real numbers from this app. */
export function Calibration({ color }: { color: string }) {
  const { attempts, questions, sessions } = useStore((s) => s);
  const rows = useMemo(() => joinAttempts(attempts, questions, sessions).filter((r) => r.mode !== 'explain'), [attempts, questions, sessions]);
  const practiced = useMemo(() => ALL_TYPES.map((t) => ({ t, s: byType(rows, t) })).filter((x) => x.s.n >= 5), [rows]);
  const [guesses, setGuesses] = useState<Partial<Record<TestType, number>>>({});
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useLocal<Guess[]>('merhav:calibration', []);

  if (!practiced.length)
    return (
      <div className="lab">
        <p className="small muted">הכלי משווה הערכה למציאות, ולכן צריך נתונים: לפחות 5 שאלות בתרגיל אחד. תרגלי משהו, וחזרי לכאן.</p>
      </div>
    );

  const reveal = () => {
    setRevealed(true);
    const now = new Date().toISOString();
    setHistory([...history, ...practiced.map(({ t, s }) => ({ type: t, guess: (guesses[t] ?? 70) / 100, actual: s.accuracy, at: now }))].slice(-200));
  };
  const gaps = history.map((h) => h.guess - h.actual);
  const bias = gaps.length ? mean(gaps) : 0;

  return (
    <div className="lab">
      <p className="small">כמה אחוזים מהשאלות את חושבת שענית נכון? הזיזי לפני שאת חושפת.</p>
      <ul className="calib">
        {practiced.map(({ t, s }) => {
          const g = guesses[t] ?? 70;
          return (
            <li key={t}>
              <span className="small">{TYPE_LABEL[t]}</span>
              <input type="range" min={0} max={100} step={5} value={g} disabled={revealed} onChange={(e) => setGuesses({ ...guesses, [t]: +e.target.value })} aria-label={`הערכה: ${TYPE_LABEL[t]}`} />
              <span className="calib-bar" aria-hidden>
                <span className="calib-guess" style={{ insetInlineStart: `${g}%`, background: color }} />
                {revealed && <span className="calib-actual" style={{ insetInlineStart: `${s.accuracy * 100}%` }} />}
              </span>
              <span className="num small">
                {g}%{revealed && ` · בפועל ${Math.round(s.accuracy * 100)}%`}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="row">
        {!revealed ? (
          <button className="btn primary" onClick={reveal}>
            חשיפה
          </button>
        ) : (
          <button className="btn" onClick={() => setRevealed(false)}>
            הערכה חדשה
          </button>
        )}
      </div>
      {history.length >= practiced.length && (
        <p className="small" aria-live="polite">
          {Math.abs(bias) < 0.05
            ? 'ההערכות שלך קרובות למציאות. זה כיול טוב.'
            : bias > 0
              ? `בממוצע את מעריכה את עצמך ב-${Math.round(bias * 100)} נקודות מעל הביצוע. כדאי לבדוק איפה הביטחון גבוה מהדיוק.`
              : `בממוצע את מעריכה את עצמך ב-${Math.round(-bias * 100)} נקודות מתחת לביצוע. את יודעת יותר ממה שנדמה לך.`}{' '}
          <span className="xs muted">({history.length} הערכות)</span>
        </p>
      )}
    </div>
  );
}
