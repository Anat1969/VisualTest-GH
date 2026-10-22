import { useMemo, useState } from 'react';
import { useLocal } from './local';

/* ================= chain checker ================= */

type Kind = 'fact' | 'assumption' | 'inference';
interface Step {
  text: string;
  kind: Kind;
}

const KIND_LABEL: Record<Kind, string> = { fact: 'עובדה', assumption: 'הנחה', inference: 'מסקנה' };
const NEXT: Record<Kind, Kind> = { fact: 'assumption', assumption: 'inference', inference: 'fact' };

const EXAMPLE: Step[] = [
  { text: 'המכירות ירדו ב-3 החודשים האחרונים.', kind: 'fact' },
  { text: 'הירידה נובעת מהמחיר.', kind: 'assumption' },
  { text: 'לכן צריך להוריד מחיר.', kind: 'inference' },
  { text: 'הורדת מחיר תחזיר את המכירות לרמה הקודמת.', kind: 'inference' },
];

/** Mark each link of a reasoning chain as fact, assumption or inference; see what rests on the first assumption. */
export function ChainLab({ color }: { color: string }) {
  const [steps, setSteps] = useLocal<Step[]>('merhav:chain', EXAMPLE);
  const [draft, setDraft] = useState('');
  const first = steps.findIndex((s) => s.kind === 'assumption');
  const assumptions = steps.filter((s) => s.kind === 'assumption').length;

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setSteps([...steps, { text: t, kind: 'inference' }]);
    setDraft('');
  };

  return (
    <div className="lab">
      <ol className="chain">
        {steps.map((s, i) => {
          const dependent = first >= 0 && i > first;
          return (
            <li key={i} className={`chain-step ${s.kind} ${i === first ? 'first' : ''} ${dependent ? 'dep' : ''}`} style={{ ['--c' as string]: color }}>
              <button className="chain-kind" onClick={() => setSteps(steps.map((x, j) => (j === i ? { ...x, kind: NEXT[x.kind] } : x)))} aria-label={`סוג: ${KIND_LABEL[s.kind]}. לחיצה מחליפה`}>
                {KIND_LABEL[s.kind]}
              </button>
              <span className="chain-text">{s.text}</span>
              <button className="btn ghost sm" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="מחיקת החוליה">
                הסרה
              </button>
              {i === first && <span className="chain-flag">כאן השרשרת נשענת על הנחה. אם היא שגויה, כל מה שמתחתיה נופל.</span>}
            </li>
          );
        })}
      </ol>
      {!steps.length && <p className="small muted">השרשרת ריקה. כתבי את הטענה הראשונה.</p>}
      <div className="row">
        <input className="grow" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="חוליה נוספת בשרשרת" aria-label="חוליה נוספת" />
        <button className="btn primary" onClick={add} disabled={!draft.trim()}>
          הוספה
        </button>
        <button className="btn ghost" onClick={() => setSteps([])}>
          ניקוי
        </button>
        <button className="btn ghost" onClick={() => setSteps(EXAMPLE)}>
          דוגמה
        </button>
      </div>
      <p className="small" aria-live="polite">
        {first < 0
          ? 'אין הנחות מסומנות. בדקי שוב: כל "בגלל" שלא נמדד הוא הנחה.'
          : `${assumptions === 1 ? 'הנחה אחת' : `${assumptions} הנחות`}. ${steps.length - first - 1} חוליות תלויות בהנחה הראשונה. שאלה לבדיקה: איך הייתי יודעת שההנחה הזו שגויה?`}
      </p>
    </div>
  );
}

/* ================= pattern lab ================= */

function analyze(xs: number[]) {
  const rows: number[][] = [xs];
  while (rows.length < 5 && rows[rows.length - 1].length > 1) {
    const r = rows[rows.length - 1];
    const d = r.slice(1).map((v, i) => v - r[i]);
    rows.push(d);
    if (d.length >= 2 && d.every((v) => v === d[0])) break;
  }
  const last = rows[rows.length - 1];
  const constDiff = rows.length > 1 && last.length >= 2 && last.every((v) => v === last[0]);
  let next: number | null = null;
  let rule = '';
  if (constDiff) {
    // extrapolate from the constant row back up
    let add = last[0];
    for (let k = rows.length - 2; k >= 0; k--) add = rows[k][rows[k].length - 1] + add;
    next = add;
    rule = rows.length === 2 ? `הפרש קבוע של ${last[0]}` : `הפרש ${rows.length - 1 === 2 ? 'שני' : 'שלישי'} קבוע: ההפרשים עצמם גדלים באופן קבוע`;
  }
  const ratios = xs.every((v) => v !== 0) ? xs.slice(1).map((v, i) => v / xs[i]) : [];
  const constRatio = ratios.length >= 2 && ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9);
  if (!constDiff && constRatio) {
    next = xs[xs.length - 1] * ratios[0];
    rule = `יחס קבוע: כל איבר כפול ${+ratios[0].toFixed(3)}`;
  }
  const fib = xs.length >= 4 && xs.slice(2).every((v, i) => v === xs[i] + xs[i + 1]);
  if (next === null && fib) {
    next = xs[xs.length - 1] + xs[xs.length - 2];
    rule = 'כל איבר הוא סכום שני הקודמים';
  }
  return { rows, ratios, constRatio, next, rule };
}

/** Type a sequence; see its difference triangle and ratio row, and what they predict. */
export function PatternLab({ color }: { color: string }) {
  const [raw, setRaw] = useLocal('merhav:pattern', '2, 5, 10, 17, 26');
  const xs = useMemo(
    () =>
      raw
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(Number)
        .filter(Number.isFinite),
    [raw],
  );
  const a = useMemo(() => (xs.length >= 3 ? analyze(xs) : null), [xs]);

  return (
    <div className="lab">
      <label className="small" htmlFor="pattern-in">
        סדרה (מופרדת בפסיקים):
      </label>
      <input id="pattern-in" dir="ltr" value={raw} onChange={(e) => setRaw(e.target.value)} className="num" />
      {!a ? (
        <p className="small muted">צריך לפחות שלושה מספרים.</p>
      ) : (
        <>
          <div className="tri" dir="ltr" role="table" aria-label="משולש ההפרשים">
            {a.rows.map((r, k) => (
              <div key={k} className="tri-row" role="row" style={{ paddingInlineStart: `${k * 1.6}rem` }}>
                <span className="tri-label" role="rowheader">
                  {k === 0 ? 'סדרה' : `הפרש ${k}`}
                </span>
                {r.map((v, i) => (
                  <span key={i} role="cell" className={`tri-cell ${k > 0 && r.every((x) => x === r[0]) ? 'const' : ''}`} style={k > 0 && r.every((x) => x === r[0]) ? { borderColor: color } : undefined}>
                    {+v.toFixed(3)}
                  </span>
                ))}
              </div>
            ))}
            {a.ratios.length > 0 && (
              <div className="tri-row ratio" role="row">
                <span className="tri-label" role="rowheader">
                  יחס
                </span>
                {a.ratios.map((v, i) => (
                  <span key={i} role="cell" className={`tri-cell ${a.constRatio ? 'const' : ''}`}>
                    ×{+v.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="small" aria-live="polite">
            {a.next !== null ? (
              <>
                {a.rule}. האיבר הבא: <strong className="num">{+a.next.toFixed(3)}</strong>
              </>
            ) : (
              'אין כלל אחד פשוט. נסי לפצל לשתי סדרות שזורות: איברים במקומות זוגיים ואי-זוגיים.'
            )}
          </p>
        </>
      )}
    </div>
  );
}
