import { useEffect, useState } from 'react';
import { COMPRESS_TASKS } from '../../content/verbal';
import { wordCount } from '../../logic/rhythm';

const KEY = 'merhav:compress-done';

function readDone(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

/** Say the same in fewer words: a word budget, a live count, and a model answer to compare with. */
export function CompressLab({ color }: { color: string }) {
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState<number[]>(readDone);
  const task = COMPRESS_TASKS[idx];
  const n = wordCount(draft);
  const orig = wordCount(task.long);
  const within = n > 0 && n <= task.target;

  useEffect(() => {
    setDraft('');
    setShown(false);
  }, [idx]);

  const markDone = () => {
    const next = Array.from(new Set([...done, idx]));
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const fill = Math.min(1, n / orig);
  const budget = task.target / orig;

  return (
    <div className="lab">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small muted">
          משימה <span className="num">{idx + 1}</span> מתוך <span className="num">{COMPRESS_TASKS.length}</span> · הושלמו{' '}
          <span className="num">{done.length}</span>
        </span>
        <div className="row">
          <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            הקודמת
          </button>
          <button className="btn ghost" disabled={idx === COMPRESS_TASKS.length - 1} onClick={() => setIdx(idx + 1)}>
            הבאה
          </button>
        </div>
      </div>
      <blockquote className="compress-src">
        {task.long}
        <span className="xs muted">
          {' '}
          (<span className="num">{orig}</span> מילים)
        </span>
      </blockquote>
      <label htmlFor="compress-text" className="small">
        אותו מידע, עד <strong className="num">{task.target}</strong> מילים:
      </label>
      <textarea id="compress-text" value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} dir="rtl" />

      <div className="budget" role="meter" aria-valuenow={n} aria-valuemin={0} aria-valuemax={orig} aria-label="מספר מילים מול התקציב">
        <span className="budget-fill" style={{ width: `${fill * 100}%`, background: within ? color : n > task.target ? 'var(--bad)' : color }} />
        <span className="budget-mark" style={{ insetInlineStart: `${budget * 100}%` }} />
      </div>
      <p className={`small ${n > task.target ? '' : 'muted'}`} style={n > task.target ? { color: 'var(--bad)' } : undefined} aria-live="polite">
        <span className="num">{n}</span> מילים{n === 0 ? '' : within ? ' · בתוך התקציב. בדקי שלא אבד מידע.' : ` · עוד ${n - task.target} מעל התקציב`}
      </p>
      <div className="row">
        <button className="btn" onClick={() => setShown(true)}>
          נוסח לדוגמה
        </button>
        <button className="btn primary" disabled={!within} onClick={markDone}>
          {done.includes(idx) ? 'הושלמה' : 'סימון כהושלמה'}
        </button>
      </div>
      {shown && (
        <p className="compress-model">
          {task.model}{' '}
          <span className="xs muted">
            (<span className="num">{wordCount(task.model)}</span> מילים). יש יותר מנוסח טוב אחד.
          </span>
        </p>
      )}
    </div>
  );
}
