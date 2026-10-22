import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../data/store';
import { currentLevel, rowOf } from '../logic/mastery';
import { ITEMS_PER_MODE, SECONDS_PER_ITEM, type SessionConfig } from '../logic/session';
import type { Level, Mode, TestType } from '../logic/types';
import { LEVELS, TEST_TYPES, TYPE_LABEL } from '../logic/types';

const COPY: Record<'practice' | 'exam' | 'simulation', { eyebrow: string; title: string; lead: string }> = {
  practice: {
    eyebrow: 'תרגול',
    title: 'תרגול עם משוב מיידי',
    lead: 'בלי זמן. אחרי כל פריט מוצגים התשובה, סוג הטעות וההסבר. מצב הסבר מוסיף ניתוח של כל האפשרויות והצגה חוזרת של התנועה.',
  },
  exam: {
    eyebrow: 'מבחן',
    title: 'מבחן בזמן קצוב',
    lead: 'זמן קבוע לכל פריט, בלי משוב בדרך. בסוף מוצג סיכום מלא עם כל הטעויות.',
  },
  simulation: {
    eyebrow: 'סימולציה',
    title: 'סימולציה מעורבת',
    lead: 'שני סוגי המבחן בסבב אחד, כל סוג ברמה הנוכחית שלך, בזמן קצוב. כך נראה יום מבחן.',
  },
};

export default function Setup({ mode }: { mode: 'practice' | 'exam' | 'simulation' }) {
  const mastery = useStore((s) => s.mastery);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialType = (params.get('type') as TestType) || 'rotation';
  const [type, setType] = useState<TestType>(TEST_TYPES.includes(initialType) ? initialType : 'rotation');
  const [sub, setSub] = useState<Mode>(params.get('sub') === 'explain' ? 'explain' : 'practice');
  const cur = currentLevel(mastery, type);
  const [levelChoice, setLevelChoice] = useState<Level | null>(null);
  const level = levelChoice ?? cur;
  const copy = COPY[mode];

  const levels = useMemo(
    () => Object.fromEntries(TEST_TYPES.map((t) => [t, currentLevel(mastery, t)])) as Record<TestType, Level>,
    [mastery],
  );

  const start = () => {
    const config: SessionConfig =
      mode === 'simulation'
        ? { mode: 'simulation', types: [...TEST_TYPES], levels }
        : { mode: mode === 'practice' ? sub : 'exam', types: [type], levels: { ...levels, [type]: level } };
    navigate('/run', { state: config });
  };

  const effMode: Mode = mode === 'practice' ? sub : mode;
  const count = ITEMS_PER_MODE[effMode];

  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
      </header>

      <section className="card" aria-label="הגדרת הסשן">
        {mode === 'practice' && (
          <div className="stack">
            <span className="small muted">מצב</span>
            <div className="seg">
              <button aria-pressed={sub === 'explain'} onClick={() => setSub('explain')}>
                הסבר
              </button>
              <button aria-pressed={sub === 'practice'} onClick={() => setSub('practice')}>
                תרגול
              </button>
            </div>
          </div>
        )}

        {mode !== 'simulation' ? (
          <>
            <div className="stack">
              <span className="small muted">סוג מבחן</span>
              <div className="seg">
                {TEST_TYPES.map((t) => (
                  <button
                    key={t}
                    aria-pressed={type === t}
                    onClick={() => {
                      setType(t);
                      setLevelChoice(null);
                    }}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="stack">
              <span className="small muted">רמה</span>
              <div className="seg">
                {LEVELS.map((l) => (
                  <button key={l} aria-pressed={level === l} onClick={() => setLevelChoice(l)}>
                    רמה {l}
                    {l === cur ? ' (שלך)' : rowOf(mastery, type, l).status === 'passed' ? ' (עברת)' : ''}
                  </button>
                ))}
              </div>
              {level !== cur && (
                <p className="xs muted">רמה זו אינה הרמה הנוכחית שלך. הסשן יישמר באבחון, אבל לא ישנה את הרמה.</p>
              )}
            </div>
          </>
        ) : (
          <div className="grid-2">
            {TEST_TYPES.map((t) => (
              <div key={t} className="card flat">
                <strong>{TYPE_LABEL[t]}</strong>
                <span className="muted small">רמה {levels[t]}</span>
              </div>
            ))}
          </div>
        )}

        <p className="small muted">
          {count} פריטים
          {effMode === 'exam' || effMode === 'simulation'
            ? `, ${mode === 'simulation' ? 'זמן לפי רמת כל סוג' : `${SECONDS_PER_ITEM[level]} שניות לפריט`} (הערכת עבודה)`
            : ', ללא הגבלת זמן'}
          . תמהיל של 2D ו-3D, סטטי ודינמי.
        </p>
        <div className="row">
          <button className="btn primary lg" onClick={start}>
            התחלה
          </button>
        </div>
      </section>
    </main>
  );
}
