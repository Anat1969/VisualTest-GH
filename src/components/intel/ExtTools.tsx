import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS } from '../../content/extensions';
import { todayKey, useLocal } from './local';
import '../stimulus/verbal.css';

/* ================= 09 values compass ================= */

const VALUE_WORDS = ['משפחה', 'יושרה', 'צמיחה', 'יצירה', 'ביטחון', 'חופש', 'קהילה', 'בריאות', 'הרפתקה', 'הכרה', 'אמת', 'שקט'];

interface Compass {
  date: string;
  ranking: { v: string; wins: number }[];
}

/** Choose six values, then decide between them two at a time. The ranking that comes out is often not the one you expected. */
export function ValuesCompass({ color }: { color: string }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [idx, setIdx] = useState(0);
  const [wins, setWins] = useState<Record<string, number>>({});
  const [history, setHistory] = useLocal<Compass[]>('merhav:compass', []);
  const done = pairs.length > 0 && idx >= pairs.length;
  const ranking = useMemo(() => chosen.map((v) => ({ v, wins: wins[v] ?? 0 })).sort((a, b) => b.wins - a.wins), [chosen, wins]);

  const start = () => {
    const p: [string, string][] = [];
    chosen.forEach((a, i) => chosen.slice(i + 1).forEach((b) => p.push(Math.random() < 0.5 ? [a, b] : [b, a])));
    setPairs(p.sort(() => Math.random() - 0.5));
    setIdx(0);
    setWins({});
  };
  const pick = (v: string) => {
    setWins((w) => ({ ...w, [v]: (w[v] ?? 0) + 1 }));
    const next = idx + 1;
    setIdx(next);
    if (next === pairs.length) {
      const final = chosen.map((x) => ({ v: x, wins: (wins[x] ?? 0) + (x === v ? 1 : 0) })).sort((a, b) => b.wins - a.wins);
      setHistory([{ date: todayKey(), ranking: final }, ...history].slice(0, 12));
    }
  };
  const prev = history[done ? 1 : 0];

  if (!pairs.length)
    return (
      <div className="lab">
        <p className="small">בחרי שישה ערכים שחשובים לך (נבחרו {chosen.length}):</p>
        <div className="row">
          {VALUE_WORDS.map((v) => (
            <button
              key={v}
              className={`chip ${chosen.includes(v) ? 'on' : ''}`}
              aria-pressed={chosen.includes(v)}
              onClick={() => setChosen(chosen.includes(v) ? chosen.filter((x) => x !== v) : chosen.length < 6 ? [...chosen, v] : chosen)}
            >
              {v}
            </button>
          ))}
        </div>
        <button className="btn primary" disabled={chosen.length !== 6} onClick={start}>
          התחלת ההשוואות (15 זוגות)
        </button>
        {history[0] && (
          <p className="xs muted">
            בפעם האחרונה ({history[0].date}): {history[0].ranking.slice(0, 3).map((r) => r.v).join(', ')} בראש.
          </p>
        )}
      </div>
    );

  if (!done) {
    const [a, b] = pairs[idx];
    return (
      <div className="lab">
        <p className="small muted">
          זוג <span className="num">{idx + 1}</span> מתוך <span className="num">{pairs.length}</span>. אם היית חייבת לוותר על אחד מהם, על מה היית שומרת?
        </p>
        <div className="vs">
          <button className="vs-btn" onClick={() => pick(a)} style={{ borderColor: color }}>
            {a}
          </button>
          <span className="muted small">או</span>
          <button className="vs-btn" onClick={() => pick(b)} style={{ borderColor: color }}>
            {b}
          </button>
        </div>
        <div className="budget" aria-hidden>
          <span className="budget-fill" style={{ width: `${(idx / pairs.length) * 100}%`, background: color }} />
        </div>
      </div>
    );
  }

  return (
    <div className="lab">
      <ol className="compass">
        {ranking.map((r, i) => (
          <li key={r.v}>
            <span className="num">{i + 1}</span>
            <strong>{r.v}</strong>
            <span className="compass-bar">
              <span style={{ width: `${(r.wins / 5) * 100}%`, background: color }} />
            </span>
            <span className="xs muted num">{r.wins}/5</span>
          </li>
        ))}
      </ol>
      <p className="small">
        שאלה להמשך: על כמה מהשבוע האחרון הלכו שלושת הראשונים? פער בין הדירוג לזמן הוא מקום לבחירה.
        {prev && ` בפעם הקודמת (${prev.date}) הראשון היה ${prev.ranking[0].v}.`}
      </p>
      <button
        className="btn ghost"
        onClick={() => {
          setPairs([]);
          setChosen([]);
        }}
      >
        מצפן חדש
      </button>
    </div>
  );
}

/* ================= 09 ten-ten-ten ================= */

const HORIZONS = ['בעוד 10 דקות', 'בעוד 10 חודשים', 'בעוד 10 שנים'];
interface TTT {
  decision: string;
  options: [string, string];
  notes: string[][];
  scores: number[][];
}
const BLANK_TTT: TTT = { decision: '', options: ['', ''], notes: [['', '', ''], ['', '', '']], scores: [[0, 0, 0], [0, 0, 0]] };

/** One decision, two options, three horizons. When the short and the long horizon disagree, the decision is about values, not facts. */
export function TenTenTen({ color }: { color: string }) {
  const [s, setS] = useLocal<TTT>('merhav:101010', BLANK_TTT);
  const set = (f: (d: TTT) => void) => {
    const copy: TTT = structuredClone(s);
    f(copy);
    setS(copy);
  };
  const total = (o: number, from = 0) => s.scores[o].slice(from).reduce((a, b) => a + b, 0);
  const shortWin = Math.sign(s.scores[0][0] - s.scores[1][0]);
  const longWin = Math.sign(s.scores[0][2] - s.scores[1][2]);
  const ready = s.options.every((o) => o.trim());

  return (
    <div className="lab">
      <input value={s.decision} onChange={(e) => set((d) => void (d.decision = e.target.value))} placeholder="ההחלטה, במשפט אחד" aria-label="ההחלטה" />
      <div className="ttt">
        {[0, 1].map((o) => (
          <div key={o} className="ttt-col" style={{ borderColor: o === 0 ? color : 'var(--line-strong)' }}>
            <input value={s.options[o]} onChange={(e) => set((d) => void (d.options[o] = e.target.value))} placeholder={o === 0 ? 'אפשרות א' : 'אפשרות ב'} aria-label={o === 0 ? 'אפשרות א' : 'אפשרות ב'} />
            {HORIZONS.map((h, k) => (
              <label key={h} className="ttt-cell">
                <span className="xs muted">{h}, איך ארגיש?</span>
                <textarea rows={2} value={s.notes[o][k]} onChange={(e) => set((d) => void (d.notes[o][k] = e.target.value))} dir="rtl" />
                <span className="row xs">
                  <input type="range" min={-2} max={2} value={s.scores[o][k]} onChange={(e) => set((d) => void (d.scores[o][k] = +e.target.value))} aria-label={`${h}: טוב או רע`} />
                  <span className="num">{s.scores[o][k] > 0 ? `+${s.scores[o][k]}` : s.scores[o][k]}</span>
                </span>
              </label>
            ))}
            <span className="small">
              סך הכול <strong className="num">{total(o)}</strong>
            </span>
          </div>
        ))}
      </div>
      <p className="small" aria-live="polite">
        {!ready
          ? 'כתבי את שתי האפשרויות כדי לקבל סיכום.'
          : shortWin !== 0 && longWin !== 0 && shortWin !== longWin
            ? `הטווח הקצר מעדיף את "${shortWin > 0 ? s.options[0] : s.options[1]}", והארוך את "${longWin > 0 ? s.options[0] : s.options[1]}". כאן ההחלטה היא על ערכים: למה את מוכנה לחכות.`
            : total(0) === total(1)
              ? 'שתי האפשרויות שקולות. מה היית בוחרת אם אף אחד לא היה יודע?'
              : `"${total(0) > total(1) ? s.options[0] : s.options[1]}" עדיפה בכל הטווחים יחד.`}
      </p>
      <button className="btn ghost" onClick={() => setS(BLANK_TTT)}>
        החלטה חדשה
      </button>
    </div>
  );
}

/* ================= 10 breathing pacer ================= */

const PATTERNS = [
  { id: 'box', name: 'קופסה 4-4-4-4', phases: [['שאיפה', 4], ['החזקה', 4], ['נשיפה', 4], ['החזקה', 4]] as [string, number][] },
  { id: 'long', name: 'נשיפה ארוכה 4-6', phases: [['שאיפה', 4], ['נשיפה', 6]] as [string, number][] },
  { id: '478', name: '4-7-8', phases: [['שאיפה', 4], ['החזקה', 7], ['נשיפה', 8]] as [string, number][] },
];

/** A circle that grows on the in-breath and shrinks on the out-breath. Follow it for two minutes. */
export function BreathPacer({ color }: { color: string }) {
  const [pid, setPid] = useLocal('merhav:breath', 'long');
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const t0 = useRef(0);
  const pat = PATTERNS.find((p) => p.id === pid) ?? PATTERNS[1];
  const cycle = pat.phases.reduce((a, [, s]) => a + s, 0);

  useEffect(() => {
    if (!running) return;
    t0.current = performance.now() - t * 1000;
    let raf = 0;
    const tick = () => {
      setT((performance.now() - t0.current) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  let within = t % cycle;
  let phase = pat.phases[0];
  let size = 0.35;
  let prevSize = 0.35;
  for (const ph of pat.phases) {
    if (within < ph[1]) {
      phase = ph;
      const f = within / ph[1];
      size = ph[0] === 'שאיפה' ? 0.35 + 0.65 * f : ph[0] === 'נשיפה' ? 1 - 0.65 * f : prevSize;
      break;
    }
    within -= ph[1];
    prevSize = ph[0] === 'שאיפה' ? 1 : ph[0] === 'נשיפה' ? 0.35 : prevSize;
  }
  if (!running && t === 0) size = 0.35;
  const left = Math.ceil(phase[1] - within);
  const cycles = Math.floor(t / cycle);

  return (
    <div className="lab">
      <div className="row">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            className={`chip ${pid === p.id ? 'on' : ''}`}
            aria-pressed={pid === p.id}
            onClick={() => {
              setPid(p.id);
              setT(0);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="breath" aria-live="off">
        <span className="breath-ring" />
        <span className="breath-dot" style={{ transform: `scale(${size})`, background: color }} />
        <span className="breath-label">{running || t ? `${phase[0]} · ${left}` : 'מוכנה?'}</span>
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => setRunning(!running)}>
          {running ? 'הפסקה' : t ? 'המשך' : 'התחלה'}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setRunning(false);
            setT(0);
          }}
        >
          איפוס
        </button>
        <span className="small muted">
          <span className="num">{cycles}</span> מחזורים · <span className="num">{Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, '0')}</span>
        </span>
      </div>
      <p className="xs muted">נשיפה ארוכה מהשאיפה מאיטה את הדופק. שתי דקות מספיקות כדי להרגיש שינוי. אם מסתחרר, חוזרים לנשימה רגילה.</p>
    </div>
  );
}

/* ================= 10 emotion translator ================= */

const FAMILIES: { name: string; signal: string; action: string }[] = [
  { name: 'פחד', signal: 'אי-ודאות או סכנה', action: 'להתכונן, לברר, לבקש עזרה' },
  { name: 'כעס', signal: 'גבול שנחצה', action: 'לנסח גבול ולבקש שינוי' },
  { name: 'עצב', signal: 'אובדן של משהו יקר', action: 'לתת מקום, לחפש קרבה' },
  { name: 'אשמה', signal: 'מעשה שפגע', action: 'לתקן ולהתנצל' },
  { name: 'בושה', signal: 'פחד מדחייה', action: 'לשתף מישהו בטוח' },
  { name: 'קנאה', signal: 'רצון שלא מומש', action: 'לנסח מה את רוצה' },
  { name: 'שעמום', signal: 'חוסר אתגר', action: 'לחפש אתגר או משמעות' },
  { name: 'שמחה', signal: 'צורך שמולא', action: 'לשים לב מה גרם לה, ולחזור לזה' },
];
interface Entry {
  id: number;
  date: string;
  fam: string;
  word: string;
  level: number;
  action: string;
}

/** Name it, rate it, read its signal, choose one action. The record shows which emotions return and what helps. */
export function EmotionTranslator({ color }: { color: string }) {
  const [list, setList] = useLocal<Entry[]>('merhav:translator', []);
  const [fam, setFam] = useState(FAMILIES[0].name);
  const [word, setWord] = useState('');
  const [level, setLevel] = useState(5);
  const [action, setAction] = useState('');
  const f = FAMILIES.find((x) => x.name === fam)!;
  const counts = useMemo(() => FAMILIES.map((x) => ({ n: x.name, c: list.filter((e) => e.fam === x.name).length })).filter((x) => x.c), [list]);

  return (
    <div className="lab">
      <div className="row">
        {FAMILIES.map((x) => (
          <button key={x.name} className={`chip ${fam === x.name ? 'on' : ''}`} aria-pressed={fam === x.name} onClick={() => setFam(x.name)}>
            {x.name}
          </button>
        ))}
      </div>
      <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="המילה המדויקת (למשל: מתוסכלת, נעלבת, נרגשת)" aria-label="המילה המדויקת" />
      <label className="checkin-row">
        <span className="small">עוצמה</span>
        <input type="range" min={1} max={10} value={level} onChange={(e) => setLevel(+e.target.value)} aria-label="עוצמה" />
        <span className="num">{level}</span>
      </label>
      <p className="translator-signal" style={{ borderColor: color }}>
        <strong>{fam}</strong> מסמן בדרך כלל: {f.signal}. כיוון לפעולה: {f.action}.
      </p>
      <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="פעולה אחת שאעשה היום" aria-label="פעולה אחת" />
      <button
        className="btn primary"
        disabled={!action.trim()}
        onClick={() => {
          setList([{ id: Date.now(), date: todayKey(), fam, word: word.trim(), level, action: action.trim() }, ...list].slice(0, 60));
          setWord('');
          setAction('');
        }}
      >
        רישום
      </button>
      {counts.length > 0 && (
        <p className="xs muted">
          ברישומים שלך: {counts.map((x) => `${x.n} ${x.c}`).join(' · ')}
        </p>
      )}
      {list.length === 0 ? (
        <p className="small muted">אין עדיין רישומים.</p>
      ) : (
        <ul className="obs-list">
          {list.slice(0, 6).map((e) => (
            <li key={e.id}>
              <span className="xs muted num">{e.date}</span>
              <strong>
                {e.word || e.fam} ({e.level})
              </strong>
              <span className="obs-diff">פעולה: {e.action}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= 11 step debugger ================= */

interface Frame {
  line: number;
  vars: Record<string, number | string>;
}
interface Program {
  name: string;
  lines: string[];
  frames: () => Frame[];
}

const PROGRAMS: Program[] = [
  {
    name: 'סכום זוגיים',
    lines: ['s = 0', 'for i in 1..6:', '    if i % 2 == 0:', '        s = s + i', 'print(s)'],
    frames: () => {
      const f: Frame[] = [{ line: 0, vars: { s: 0 } }];
      let s = 0;
      for (let i = 1; i <= 6; i++) {
        f.push({ line: 1, vars: { s, i } });
        f.push({ line: 2, vars: { s, i } });
        if (i % 2 === 0) {
          s += i;
          f.push({ line: 3, vars: { s, i } });
        }
      }
      f.push({ line: 4, vars: { s, פלט: s } });
      return f;
    },
  },
  {
    name: 'החלפה',
    lines: ['a = 3', 'b = 8', 't = a', 'a = b', 'b = t', 'print(a, b)'],
    frames: (): Frame[] => [
      { line: 0, vars: { a: 3 } },
      { line: 1, vars: { a: 3, b: 8 } },
      { line: 2, vars: { a: 3, b: 8, t: 3 } },
      { line: 3, vars: { a: 8, b: 8, t: 3 } },
      { line: 4, vars: { a: 8, b: 3, t: 3 } },
      { line: 5, vars: { a: 8, b: 3, t: 3, פלט: '8 3' } },
    ],
  },
  {
    name: 'חציה עד 1',
    lines: ['x = 40', 'steps = 0', 'while x > 1:', '    x = x // 2', '    steps = steps + 1', 'print(steps)'],
    frames: () => {
      let x = 40;
      let steps = 0;
      const f: Frame[] = [
        { line: 0, vars: { x } },
        { line: 1, vars: { x, steps } },
      ];
      while (x > 1) {
        f.push({ line: 2, vars: { x, steps } });
        x = Math.floor(x / 2);
        f.push({ line: 3, vars: { x, steps } });
        steps++;
        f.push({ line: 4, vars: { x, steps } });
      }
      f.push({ line: 2, vars: { x, steps } });
      f.push({ line: 5, vars: { x, steps, פלט: steps } });
      return f;
    },
  },
];

/** Step through a short program one line at a time and watch the variables. Guess first, then step. */
export function StepDebugger({ color }: { color: string }) {
  const [pi, setPi] = useState(0);
  const [k, setK] = useState(0);
  const prog = PROGRAMS[pi];
  const frames = useMemo(() => prog.frames(), [prog]);
  const fr = frames[k];
  const prev = frames[k - 1]?.vars ?? {};

  return (
    <div className="lab">
      <div className="row">
        {PROGRAMS.map((p, i) => (
          <button
            key={p.name}
            className={`chip ${pi === i ? 'on' : ''}`}
            aria-pressed={pi === i}
            onClick={() => {
              setPi(i);
              setK(0);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="dbg">
        <pre className="vb-code" dir="ltr">
          {prog.lines.map((l, i) => (
            <span key={i} className={`vb-code-line ${fr.line === i ? 'cur' : ''}`} style={fr.line === i ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}>
              <span className="vb-code-n">{i + 1}</span>
              {l}
            </span>
          ))}
        </pre>
        <table className="vb-table dbg-vars" dir="ltr">
          <tbody>
            {Object.entries(fr.vars).map(([n, v]) => (
              <tr key={n} className={prev[n] !== v ? 'changed' : ''}>
                <th>{n}</th>
                <td className="num">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button className="btn ghost" disabled={k === 0} onClick={() => setK(k - 1)}>
          צעד אחורה
        </button>
        <button className="btn primary" disabled={k === frames.length - 1} onClick={() => setK(k + 1)}>
          צעד קדימה
        </button>
        <button className="btn ghost" onClick={() => setK(0)}>
          להתחלה
        </button>
        <span className="small muted">
          צעד <span className="num">{k + 1}</span> מתוך <span className="num">{frames.length}</span>
        </span>
      </div>
      <p className="xs muted">לפני כל צעד, נסי לנחש מה ישתנה בטבלה. משתנה שהשתנה מסומן.</p>
    </div>
  );
}

/* ================= 11 query lab ================= */

type Field = 'color' | 'size' | 'price' | 'stock';
interface QCond {
  on: boolean;
  not: boolean;
  value: string;
}
const FIELD_LABEL: Record<Field, string> = { color: 'צבע', size: 'גודל', price: 'מחיר מעל', stock: 'במלאי' };
const FIELD_VALUES: Record<Field, string[]> = { color: ['כחול', 'אדום', 'ירוק'], size: ['S', 'M', 'L'], price: ['50', '100', '200', '300'], stock: ['כן'] };

/** Build a filter and see which rows pass, live. The way to feel AND, OR and NOT. */
export function QueryLab({ color }: { color: string }) {
  const [join, setJoin] = useState<'and' | 'or'>('and');
  const [c, setC] = useState<Record<Field, QCond>>({
    color: { on: true, not: false, value: 'כחול' },
    size: { on: false, not: false, value: 'S' },
    price: { on: true, not: false, value: '100' },
    stock: { on: false, not: false, value: 'כן' },
  });
  const test = (f: Field, r: (typeof PRODUCTS)[number]) => {
    const v = c[f].value;
    const raw = f === 'color' ? r.color === v : f === 'size' ? r.size === v : f === 'price' ? r.price > Number(v) : r.stock;
    return c[f].not ? !raw : raw;
  };
  const active = (Object.keys(c) as Field[]).filter((f) => c[f].on);
  const pass = (r: (typeof PRODUCTS)[number]) => (!active.length ? true : join === 'and' ? active.every((f) => test(f, r)) : active.some((f) => test(f, r)));
  const n = PRODUCTS.filter(pass).length;
  const phrase = active.map((f) => `${c[f].not ? 'לא ' : ''}${FIELD_LABEL[f]}${f === 'stock' ? '' : ` ${c[f].value}`}`).join(join === 'and' ? ' וגם ' : ' או ');

  return (
    <div className="lab">
      <div className="q-conds">
        {(Object.keys(c) as Field[]).map((f) => (
          <div key={f} className={`q-cond ${c[f].on ? 'on' : ''}`}>
            <label className="row xs">
              <input type="checkbox" checked={c[f].on} onChange={(e) => setC({ ...c, [f]: { ...c[f], on: e.target.checked } })} />
              {FIELD_LABEL[f]}
            </label>
            {f !== 'stock' && (
              <select value={c[f].value} onChange={(e) => setC({ ...c, [f]: { ...c[f], value: e.target.value } })} aria-label={FIELD_LABEL[f]}>
                {FIELD_VALUES[f].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            )}
            <label className="row xs">
              <input type="checkbox" checked={c[f].not} onChange={(e) => setC({ ...c, [f]: { ...c[f], not: e.target.checked } })} />
              לא
            </label>
          </div>
        ))}
      </div>
      <div className="row">
        <button className={`chip ${join === 'and' ? 'on' : ''}`} aria-pressed={join === 'and'} onClick={() => setJoin('and')}>
          וגם
        </button>
        <button className={`chip ${join === 'or' ? 'on' : ''}`} aria-pressed={join === 'or'} onClick={() => setJoin('or')}>
          או
        </button>
        <span className="small">
          {phrase || 'בלי סינון'}: <strong className="num">{n}</strong> שורות
        </span>
      </div>
      <div className="vb-table-wrap">
        <table className="vb-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>צבע</th>
              <th>גודל</th>
              <th>מחיר</th>
              <th>מלאי</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((r) => (
              <tr key={r.name} className={pass(r) ? 'hit' : 'miss'} style={pass(r) ? { boxShadow: `inset -4px 0 0 ${color}` } : undefined}>
                <td>{r.name}</td>
                <td>{r.color}</td>
                <td>{r.size}</td>
                <td className="num">{r.price}</td>
                <td>{r.stock ? 'כן' : 'לא'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= 12 stock simulator ================= */

/** A stock that steers toward a target, but sees itself with a delay. Raise the delay and watch it overshoot. */
export function StockSim({ color }: { color: string }) {
  const [target, setTarget] = useState(60);
  const [speed, setSpeed] = useState(0.3);
  const [delay, setDelay] = useState(0);
  const [drain, setDrain] = useState(5);
  const N = 60;
  const series = useMemo(() => {
    const s: number[] = [20];
    for (let t = 1; t < N; t++) {
      const seen = s[Math.max(0, t - 1 - delay)];
      const inflow = Math.max(0, drain + speed * (target - seen));
      s.push(Math.max(0, s[t - 1] + inflow - drain));
    }
    return s;
  }, [target, speed, delay, drain]);
  const max = Math.max(100, ...series);
  const X = (i: number) => (i / (N - 1)) * 300;
  const Y = (v: number) => 120 - (v / max) * 110;
  const peak = Math.max(...series);
  const overshoot = peak > target * 1.03;
  const settled = Math.abs(series[N - 1] - target) < target * 0.03;

  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number, step = 1, fmt = (n: number) => String(n)) => (
    <label className="checkin-row">
      <span className="small">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} aria-label={label} />
      <span className="num">{fmt(v)}</span>
    </label>
  );

  return (
    <div className="lab">
      {slider('יעד', target, setTarget, 20, 90)}
      {slider('מהירות תיקון', speed, setSpeed, 0.05, 0.9, 0.05, (n) => n.toFixed(2))}
      {slider('עיכוב במידע', delay, setDelay, 0, 8)}
      {slider('ניקוז קבוע', drain, setDrain, 0, 15)}
      <svg viewBox="-4 -4 308 134" className="sim-chart" aria-label="המלאי לאורך זמן" style={{ direction: 'ltr' }}>
        <line x1="0" x2="300" y1={Y(target)} y2={Y(target)} stroke="var(--ink-3)" strokeDasharray="4 3" />
        <polyline points={series.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="0" x2="300" y1="120" y2="120" stroke="var(--line-strong)" />
        <text x="298" y={Y(target) - 4} fontSize="8" textAnchor="end" fill="var(--ink-3)">
          יעד
        </text>
      </svg>
      <p className="small" aria-live="polite">
        {overshoot
          ? `המלאי חורג מהיעד עד ${Math.round(peak)}${settled ? ' ואז מתייצב' : ' ומתנדנד'}. העיכוב גורם למערכת לתקן לפי תמונה ישנה.`
          : settled
            ? 'המלאי מגיע ליעד בלי לחרוג. זו לולאה מאזנת בלי עיכוב משמעותי.'
            : 'המלאי עוד בדרך ליעד. תיקון איטי בטוח, אבל לוקח זמן.'}
      </p>
      <p className="xs muted">נסי: עיכוב 4 ומהירות 0.5. אחר כך הורידי את המהירות. במערכות עם עיכוב, תיקון עדין מנצח תיקון חזק.</p>
    </div>
  );
}

/* ================= 12 loop mapper ================= */

const EXAMPLE_LINKS = 'אוכלוסייה + לידות\nלידות + אוכלוסייה\nאוכלוסייה + צפיפות\nצפיפות - לידות';

/** Write links as "A + B" or "A - B". The map finds every loop and says whether it reinforces or balances. */
export function LoopMapper({ color }: { color: string }) {
  const [raw, setRaw] = useLocal('merhav:loops', EXAMPLE_LINKS);
  const { nodes, links, loops, bad } = useMemo(() => {
    const links: { a: string; b: string; s: 1 | -1 }[] = [];
    const bad: string[] = [];
    for (const line of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const m = line.match(/^(.+?)\s+([+\-−])\s+(.+)$/);
      if (!m) bad.push(line);
      else links.push({ a: m[1].trim(), b: m[3].trim(), s: m[2] === '+' ? 1 : -1 });
    }
    const nodes = Array.from(new Set(links.flatMap((l) => [l.a, l.b])));
    // simple cycles, each found once from its smallest node index
    const loops: { path: string[]; sign: number }[] = [];
    const out = (n: string) => links.filter((l) => l.a === n);
    const walk = (start: string, cur: string, path: string[], sign: number) => {
      for (const l of out(cur)) {
        if (l.b === start) loops.push({ path: [...path], sign: sign * l.s });
        else if (!path.includes(l.b) && nodes.indexOf(l.b) > nodes.indexOf(start) && path.length < 8) walk(start, l.b, [...path, l.b], sign * l.s);
      }
    };
    nodes.forEach((n) => walk(n, n, [n], 1));
    return { nodes, links, loops, bad };
  }, [raw]);

  const R = 70;
  const pos = new Map(nodes.map((n, i) => [n, [R * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, nodes.length)), R * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, nodes.length))] as [number, number]]));

  return (
    <div className="lab">
      <div className="loop-grid">
        <label className="stack">
          <span className="small">קשר בכל שורה: "גורם + מושפע" (אותו כיוון) או "גורם - מושפע" (כיוון הפוך)</span>
          <textarea rows={7} value={raw} onChange={(e) => setRaw(e.target.value)} dir="rtl" />
          {bad.length > 0 && <span className="xs" style={{ color: 'var(--bad)' }}>לא הובנו: {bad.join(' · ')}</span>}
        </label>
        <svg viewBox="-115 -100 230 200" className="loop-map" aria-label="מפת הקשרים">
          <defs>
            <marker id="lm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-2)" />
            </marker>
          </defs>
          {links.map((l, i) => {
            const a = pos.get(l.a)!;
            const b = pos.get(l.b)!;
            const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const ux = (b[0] - a[0]) / d;
            const uy = (b[1] - a[1]) / d;
            const bend = links.some((o) => o.a === l.b && o.b === l.a) ? 10 : 0;
            const mx = (a[0] + b[0]) / 2 - uy * bend;
            const my = (a[1] + b[1]) / 2 + ux * bend;
            return (
              <g key={i}>
                <path
                  d={`M${a[0] + ux * 20} ${a[1] + uy * 20} Q${mx} ${my} ${b[0] - ux * 22} ${b[1] - uy * 22}`}
                  fill="none"
                  stroke={l.s > 0 ? 'var(--ink-2)' : 'var(--bad)'}
                  strokeDasharray={l.s > 0 ? undefined : '4 3'}
                  strokeWidth="1.4"
                  markerEnd="url(#lm-arrow)"
                />
                <text x={mx - uy * 6} y={my + ux * 6 + 3} fontSize="10" fontWeight="700" textAnchor="middle" fill={l.s > 0 ? 'var(--ink)' : 'var(--bad)'}>
                  {l.s > 0 ? '+' : '−'}
                </text>
              </g>
            );
          })}
          {nodes.map((n) => {
            const [x, y] = pos.get(n)!;
            return (
              <g key={n}>
                <circle cx={x} cy={y} r="19" fill="var(--surface)" stroke={color} strokeWidth="1.6" />
                <text x={x} y={y + 3} fontSize="7.5" textAnchor="middle" fill="var(--ink)">
                  {n.length > 9 ? n.slice(0, 8) + '…' : n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {loops.length === 0 ? (
        <p className="small muted">אין עדיין לולאה סגורה. לולאה נוצרת כשאפשר לחזור לגורם דרך החצים.</p>
      ) : (
        <ul className="stake-list">
          {loops.map((l, i) => (
            <li key={i}>
              <strong>{l.sign > 0 ? 'לולאה מחזקת' : 'לולאה מאזנת'}:</strong> {[...l.path, l.path[0]].join(' ← ')}.{' '}
              <span className="muted">{l.sign > 0 ? 'שינוי חוזר מוגבר: צמיחה או קריסה.' : 'שינוי חוזר הפוך: המערכת שואפת ליציבות.'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
