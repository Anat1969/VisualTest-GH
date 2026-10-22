import { useEffect, useMemo, useState } from 'react';
import { notes, stats, tokenize } from '../../logic/rhythm';
import { Score, Skyline } from './RhythmViz';

const KEY = 'merhav:rhythm-draft';

const SAMPLES: { label: string; text: string }[] = [
  {
    label: 'קצב אחיד',
    text: 'הבניין עומד בקצה הרחוב הראשי של העיר. הקירות שלו בנויים מאבן מקומית בהירה. החלונות פונים מערבה אל הים הפתוח. הגג שטוח ומכוסה בשכבה של חצץ.',
  },
  {
    label: 'קצב מנוגד',
    text: 'הבניין עומד בקצה הרחוב הראשי, במקום שבו העיר נגמרת והנוף נפתח אל הים, וכל מי שעובר שם עוצר לרגע בלי לדעת למה. האור. זה מה שעוצר אותם. אור מערבי, נמוך, שמחליק על האבן הבהירה ומאריך את הצללים עד המדרכה.',
  },
];

/** Paste or write a text and see its rhythm: skyline of sentence lengths, a word score, and notes. */
export function RhythmLab({ color, seed }: { color: string; seed: string }) {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(KEY) || seed;
    } catch {
      return seed;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, text);
    } catch {
      /* private mode */
    }
  }, [text]);

  const sents = useMemo(() => tokenize(text), [text]);
  const st = useMemo(() => stats(sents), [sents]);
  const tips = useMemo(() => notes(sents, st), [sents, st]);

  return (
    <div className="lab">
      <div className="lab-input">
        <label htmlFor="rhythm-text" className="small muted">
          טקסט לבדיקה: כתבי או הדביקי פסקה
        </label>
        <textarea id="rhythm-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} dir="rtl" />
        <div className="row">
          {SAMPLES.map((s) => (
            <button key={s.label} className="btn ghost" onClick={() => setText(s.text)}>
              דוגמה: {s.label}
            </button>
          ))}
          <button className="btn ghost" onClick={() => setText('')}>
            ניקוי
          </button>
        </div>
      </div>

      {!sents.length ? (
        <p className="muted small lab-empty">כתבי לפחות משפט אחד כדי לראות את הקצב.</p>
      ) : (
        <div className="lab-out">
          <div className="lab-metrics">
            <div>
              <span className="lab-big num">{st.sentences}</span>
              <span className="xs muted">משפטים</span>
            </div>
            <div>
              <span className="lab-big num">{st.avg.toFixed(1)}</span>
              <span className="xs muted">מילים למשפט</span>
            </div>
            <div>
              <span className="lab-big num">
                {st.shortest}–{st.longest}
              </span>
              <span className="xs muted">טווח אורכים</span>
            </div>
            <div>
              <span className="lab-big num">{Math.round(st.variety * 100)}%</span>
              <span className="xs muted">גיוון בקצב</span>
            </div>
          </div>
          <figure className="lab-fig">
            <figcaption className="xs muted">קו הרקיע של הטקסט: גובה כל מגדל הוא מספר המילים במשפט</figcaption>
            <Skyline sents={sents} color={color} />
          </figure>
          <figure className="lab-fig">
            <figcaption className="xs muted">פרטיטורה: כל מילה היא פס באורך המילה; רווח רחב מסמן הפסקה של פסיק</figcaption>
            <Score sents={sents} color={color} />
          </figure>
          {tips.length > 0 && (
            <ul className="lab-notes">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <p className="xs muted">הספים כאן הם כללי אצבע של האפליקציה לכתיבה ברורה, לא נתון מחקרי.</p>
        </div>
      )}
    </div>
  );
}
