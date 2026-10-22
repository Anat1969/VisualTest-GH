import { useMemo, useState } from 'react';
import { MARGIN_LABEL, SHAPE_LABEL, VEIN_LABEL, leafScene, type Leaf } from '../../logic/generators/naturalist';
import { Scene } from '../stimulus/Scene';
import { todayKey, useLocal } from './local';

/* ================= dichotomous key builder ================= */

const SPECIMENS: (Leaf & { name: string })[] = [
  { name: 'א', shape: 'oval', margin: 'serrated', venation: 'pinnate', teeth: 10, veins: 5, hue: 108, tilt: -8 },
  { name: 'ב', shape: 'lance', margin: 'smooth', venation: 'parallel', teeth: 8, veins: 4, hue: 96, tilt: 6 },
  { name: 'ג', shape: 'round', margin: 'smooth', venation: 'palmate', teeth: 8, veins: 4, hue: 120, tilt: -4 },
  { name: 'ד', shape: 'heart', margin: 'serrated', venation: 'palmate', teeth: 11, veins: 4, hue: 132, tilt: 10 },
  { name: 'ה', shape: 'oval', margin: 'smooth', venation: 'pinnate', teeth: 8, veins: 6, hue: 84, tilt: 0 },
  { name: 'ו', shape: 'lance', margin: 'serrated', venation: 'pinnate', teeth: 12, veins: 5, hue: 108, tilt: -12 },
  { name: 'ז', shape: 'round', margin: 'lobed', venation: 'palmate', teeth: 8, veins: 4, hue: 96, tilt: 8 },
  { name: 'ח', shape: 'heart', margin: 'smooth', venation: 'pinnate', teeth: 8, veins: 4, hue: 120, tilt: -6 },
];

type Attr = 'shape' | 'margin' | 'venation';
interface Question {
  attr: Attr;
  value: string;
}
type KeyNode = { q?: Question; yes?: KeyNode; no?: KeyNode };

const LABELS: Record<Attr, Record<string, string>> = { shape: SHAPE_LABEL, margin: MARGIN_LABEL, venation: VEIN_LABEL };
const ask = (q: Question) => `${q.attr === 'shape' ? 'עלה' : ''} ${LABELS[q.attr][q.value]}?`.trim();

function splits(set: number[]): Question[] {
  const out: Question[] = [];
  for (const attr of ['shape', 'margin', 'venation'] as Attr[]) {
    const vals = new Set(set.map((i) => SPECIMENS[i][attr]));
    if (vals.size > 1) for (const value of vals) out.push({ attr, value });
  }
  return out;
}

function stats(node: KeyNode, set: number[], depth = 0): { leaves: number; questions: number; maxDepth: number } {
  if (!node.q || set.length <= 1) return { leaves: set.length <= 1 ? 1 : 0, questions: 0, maxDepth: depth };
  const yes = set.filter((i) => SPECIMENS[i][node.q!.attr] === node.q!.value);
  const no = set.filter((i) => !yes.includes(i));
  const a = stats(node.yes ?? {}, yes, depth + 1);
  const b = stats(node.no ?? {}, no, depth + 1);
  return { leaves: a.leaves + b.leaves, questions: 1 + a.questions + b.questions, maxDepth: Math.max(a.maxDepth, b.maxDepth) };
}

/** Build a yes/no key that tells eight leaves apart. A good key asks few questions and splits evenly. */
export function KeyBuilder({ color }: { color: string }) {
  const [root, setRoot] = useState<KeyNode>({});
  const all = SPECIMENS.map((_, i) => i);
  const s = stats(root, all);
  const done = s.leaves === SPECIMENS.length;

  const update = (path: ('yes' | 'no')[], q: Question | undefined) => {
    const copy: KeyNode = structuredClone(root);
    let n = copy;
    for (const p of path) n = n[p] ??= {};
    if (q) Object.assign(n, { q, yes: {}, no: {} });
    else {
      delete n.q;
      delete n.yes;
      delete n.no;
    }
    setRoot(copy);
  };

  const Node = ({ node, set, path }: { node: KeyNode; set: number[]; path: ('yes' | 'no')[] }) => {
    if (set.length === 1)
      return (
        <div className="key-leaf" style={{ borderColor: color }}>
          <Scene spec={leafScene(SPECIMENS[set[0]])} label={`עלה ${SPECIMENS[set[0]].name}`} />
          <strong>{SPECIMENS[set[0]].name}</strong>
        </div>
      );
    if (!node.q) {
      const opts = splits(set);
      return (
        <div className="key-open">
          <div className="key-thumbs">
            {set.map((i) => (
              <span key={i} className="key-thumb">
                <Scene spec={leafScene(SPECIMENS[i])} label={`עלה ${SPECIMENS[i].name}`} />
                <span className="xs">{SPECIMENS[i].name}</span>
              </span>
            ))}
          </div>
          <select defaultValue="" onChange={(e) => e.target.value && update(path, JSON.parse(e.target.value))} aria-label="שאלה לפיצול הקבוצה">
            <option value="" disabled>
              {opts.length ? 'בחרי שאלה שמפצלת את הקבוצה' : 'אי אפשר להבחין בין אלה לפי התכונות'}
            </option>
            {opts.map((q) => {
              const yes = set.filter((i) => SPECIMENS[i][q.attr] === q.value).length;
              return (
                <option key={q.attr + q.value} value={JSON.stringify(q)}>
                  {ask(q)} ({yes} מול {set.length - yes})
                </option>
              );
            })}
          </select>
        </div>
      );
    }
    const yes = set.filter((i) => SPECIMENS[i][node.q!.attr] === node.q!.value);
    const no = set.filter((i) => !yes.includes(i));
    return (
      <div className="key-node">
        <div className="key-q">
          <strong>{ask(node.q)}</strong>
          <button className="btn ghost sm" onClick={() => update(path, undefined)}>
            ביטול
          </button>
        </div>
        <div className="key-branches">
          <div>
            <span className="key-tag">כן</span>
            <Node node={node.yes ?? {}} set={yes} path={[...path, 'yes']} />
          </div>
          <div>
            <span className="key-tag">לא</span>
            <Node node={node.no ?? {}} set={no} path={[...path, 'no']} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="lab">
      <Node node={root} set={all} path={[]} />
      <p className="small" aria-live="polite">
        {done
          ? `המפתח מבחין בין כל ${SPECIMENS.length} העלים: ${s.questions} שאלות, עד ${s.maxDepth} שאלות לעלה. המינימום האפשרי לשמונה הוא 3 בכל ענף: נסי להגיע אליו בשאלות שמפצלות חצי-חצי.`
          : `הובחנו ${s.leaves} מתוך ${SPECIMENS.length}. שאלה טובה מחלקת את הקבוצה לשני חלקים שווים בערך.`}{' '}
        {s.questions > 0 && (
          <button className="btn ghost sm" onClick={() => setRoot({})}>
            התחלה מחדש
          </button>
        )}
      </p>
    </div>
  );
}

/* ================= observation journal ================= */

interface Obs {
  id: number;
  date: string;
  what: string;
  where: string;
  form: string;
  differs: string;
}

/** Notice, describe, compare. A short entry trains the eye more than a long one. */
export function ObservationJournal() {
  const [list, setList] = useLocal<Obs[]>('merhav:observations', []);
  const [draft, setDraft] = useState({ what: '', where: '', form: '', differs: '' });
  const streak = useMemo(() => {
    const days = new Set(list.map((o) => o.date));
    let n = 0;
    const d = new Date();
    while (days.has(todayKey(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [list]);
  const ok = draft.what.trim() && draft.differs.trim();

  return (
    <div className="lab">
      <div className="obs-form">
        <input value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} placeholder="מה ראיתי (צמח, ציפור, חרק, ענן)" aria-label="מה ראיתי" />
        <input value={draft.where} onChange={(e) => setDraft({ ...draft, where: e.target.value })} placeholder="איפה" aria-label="איפה" />
        <input value={draft.form} onChange={(e) => setDraft({ ...draft, form: e.target.value })} placeholder="צורה, צבע, תנועה: שלוש מילים" aria-label="תיאור" />
        <input value={draft.differs} onChange={(e) => setDraft({ ...draft, differs: e.target.value })} placeholder="במה זה שונה ממשהו דומה לו?" aria-label="במה זה שונה" />
        <button
          className="btn primary"
          disabled={!ok}
          onClick={() => {
            setList([{ id: Date.now(), date: todayKey(), ...draft }, ...list]);
            setDraft({ what: '', where: '', form: '', differs: '' });
          }}
        >
          רישום
        </button>
      </div>
      <p className="xs muted">
        <span className="num">{list.length}</span> תצפיות · רצף של <span className="num">{streak}</span> ימים. השדה החשוב הוא האחרון: ההבחנה בין דומים היא לב החשיבה הנטורליסטית.
      </p>
      {list.length === 0 ? (
        <p className="small muted">היומן ריק. תצפית אחת ביום, אפילו בחלון, מספיקה.</p>
      ) : (
        <ul className="obs-list">
          {list.slice(0, 12).map((o) => (
            <li key={o.id}>
              <span className="xs muted num">{o.date}</span>
              <strong>{o.what}</strong>
              {o.where && <span className="muted"> · {o.where}</span>}
              {o.form && <span> · {o.form}</span>}
              <span className="obs-diff">שונה: {o.differs}</span>
              <button className="btn ghost sm" onClick={() => setList(list.filter((x) => x.id !== o.id))} aria-label="מחיקה">
                מחיקה
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
