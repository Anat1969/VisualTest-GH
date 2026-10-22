import { useRef, useState } from 'react';
import { useLocal } from './local';

/* ================= stakeholder map ================= */

interface Person {
  id: number;
  name: string;
  x: number; // interest 0..1 (right = high, in RTL reading)
  y: number; // influence 0..1 (top = high)
}

const QUADRANTS = [
  { key: 'manage', title: 'לנהל מקרוב', sub: 'השפעה גבוהה, עניין גבוה', how: 'לשתף בהחלטות, לפגוש מוקדם.' },
  { key: 'satisfy', title: 'לשמור מרוצים', sub: 'השפעה גבוהה, עניין נמוך', how: 'לעדכן בתמצית, לא להעמיס.' },
  { key: 'inform', title: 'לעדכן', sub: 'השפעה נמוכה, עניין גבוה', how: 'לשתף במידע, להקשיב לרעיונות.' },
  { key: 'monitor', title: 'לעקוב', sub: 'השפעה נמוכה, עניין נמוך', how: 'מעקב קל, בלי מאמץ מיוחד.' },
];

const quadOf = (p: Person) => (p.y >= 0.5 ? (p.x >= 0.5 ? 0 : 1) : p.x >= 0.5 ? 2 : 3);

/** Place the people around a decision on a 2×2 of influence and interest; the quadrant suggests how to engage. */
export function StakeholderMap({ color }: { color: string }) {
  const [people, setPeople] = useLocal<Person[]>('merhav:stakeholders', []);
  const [name, setName] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    setPeople([...people, { id: Date.now(), name: n, x: 0.5, y: 0.5 }]);
    setName('');
  };
  const move = (e: React.PointerEvent) => {
    if (drag === null) return;
    const r = box.current!.getBoundingClientRect();
    // RTL: high interest on the right side of the page
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    setPeople(people.map((p) => (p.id === drag ? { ...p, x, y } : p)));
  };

  return (
    <div className="lab">
      <div className="row">
        <input className="grow" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="שם או תפקיד" aria-label="שם או תפקיד" />
        <button className="btn primary" onClick={add} disabled={!name.trim()}>
          הוספה
        </button>
        {people.length > 0 && (
          <button className="btn ghost" onClick={() => setPeople([])}>
            ניקוי
          </button>
        )}
      </div>
      <div className="stake-wrap">
        <span className="stake-axis y">השפעה</span>
        <div ref={box} className="stake" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} dir="ltr">
          {[1, 0, 3, 2].map((q) => (
            <div key={q} className="stake-q" dir="rtl">
              <strong>{QUADRANTS[q].title}</strong>
              <span className="xs muted">{QUADRANTS[q].sub}</span>
            </div>
          ))}
          {people.map((p) => (
            <button
              key={p.id}
              className={`stake-dot ${drag === p.id ? 'drag' : ''}`}
              style={{ left: `${p.x * 100}%`, top: `${(1 - p.y) * 100}%`, borderColor: color }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDrag(p.id);
              }}
              onDoubleClick={() => setPeople(people.filter((x) => x.id !== p.id))}
              aria-label={`${p.name}: ${QUADRANTS[quadOf(p)].title}. גרירה להזזה, לחיצה כפולה להסרה`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <span className="stake-axis x">עניין ←</span>
      </div>
      {people.length === 0 ? (
        <p className="small muted">המפה ריקה. הוסיפי את האנשים סביב החלטה אחת, וגררי כל אחד למקומו.</p>
      ) : (
        <ul className="stake-list">
          {QUADRANTS.map((q, i) => {
            const here = people.filter((p) => quadOf(p) === i);
            return here.length ? (
              <li key={q.key}>
                <strong>{q.title}:</strong> {here.map((p) => p.name).join(', ')}. <span className="muted">{q.how}</span>
              </li>
            ) : null;
          })}
        </ul>
      )}
    </div>
  );
}

/* ================= conversation prep ================= */

const FIELDS = [
  { key: 'goal', label: 'מה אני רוצה שיקרה בסוף השיחה', hint: 'תוצאה אחת, ניתנת לבדיקה.' },
  { key: 'theirs', label: 'מה הצד השני רוצה, לפי ההשערה שלי', hint: 'נסחי כאילו הוא אומר את זה.' },
  { key: 'fear', label: 'ממה הוא עלול לחשוש', hint: 'מה עלול להיות לו קשה לשמוע.' },
  { key: 'unsaid', label: 'מה כנראה לא ייאמר בקול', hint: 'צורך, עלבון ישן, לחץ מבחוץ.' },
  { key: 'open', label: 'משפט הפתיחה', hint: 'קצר, בלי התנצלות ובלי האשמה.' },
  { key: 'ask', label: 'שאלה אחת שאשאל ואקשיב לתשובה', hint: 'שאלה פתוחה שמתחילה ב"מה" או "איך".' },
  { key: 'success', label: 'מה ייחשב הצלחה גם אם לא אקבל הכול', hint: 'תוצאת ביניים סבירה.' },
] as const;

type Prep = Record<(typeof FIELDS)[number]['key'], string>;
const BLANK = Object.fromEntries(FIELDS.map((f) => [f.key, ''])) as Prep;

/** A one-page sheet before a hard conversation. Saved in this browser; printable. */
export function PrepSheet() {
  const [prep, setPrep] = useLocal<Prep>('merhav:prep', BLANK);
  const filled = FIELDS.filter((f) => prep[f.key].trim()).length;
  return (
    <div className="lab prep">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small muted">
          מולאו <span className="num">{filled}</span> מתוך <span className="num">{FIELDS.length}</span>
        </span>
        <div className="row">
          <button className="btn" onClick={() => window.print()}>
            הדפסה
          </button>
          <button className="btn ghost" onClick={() => setPrep(BLANK)}>
            דף חדש
          </button>
        </div>
      </div>
      {FIELDS.map((f) => (
        <label key={f.key} className="prep-field">
          <span className="small">
            <strong>{f.label}</strong> <span className="muted xs">{f.hint}</span>
          </span>
          <textarea rows={2} value={prep[f.key]} onChange={(e) => setPrep({ ...prep, [f.key]: e.target.value })} dir="rtl" />
        </label>
      ))}
      <p className="xs muted">השאלה החשובה בדף היא השנייה: אם קשה לנסח מה הצד השני רוצה, זה המקום להתחיל בו בשיחה.</p>
    </div>
  );
}
