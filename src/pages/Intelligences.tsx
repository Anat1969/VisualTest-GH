import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { INTELLIGENCES, INTELLIGENCES_APP_URL, PROGRAMS, type Intelligence } from '../content/intelligences';
import { FUSIONS, FUSION_NAMES, fusionKey, fusionSlug } from '../content/fusions';
import { FUSION_PROGRAMS } from '../content/fusionPrograms';
import '../components/intel/intel.css';

/** CSS variables that carry an intelligence's colour through a page. */
export function intelVars(i: Intelligence): CSSProperties {
  const [h, s] = i.hue.split(',').map((x) => x.trim());
  return {
    ['--intel' as string]: `hsl(${i.hue})`,
    ['--intel-wash' as string]: `hsla(${i.hue}, 0.12)`,
    ['--intel-ink' as string]: `hsl(${h}, ${s}, 34%)`,
  };
}

export function statusOf(i: Intelligence): { label: string; tone: string } {
  if (PROGRAMS[i.id]) return { label: 'מערך תרגול פעיל', tone: 'ok' };
  if (i.group === 'gardner') return { label: 'בבנייה', tone: 'accent' };
  return { label: 'בשלב הבא', tone: '' };
}

export function IntelCard({ i }: { i: Intelligence }) {
  const st = statusOf(i);
  return (
    <Link to={`/intelligences/${i.id}`} className={`intel-card ${PROGRAMS[i.id] ? '' : 'soon'}`} style={intelVars(i)}>
      <span className="intel-num">{i.number}</span>
      <span className="intel-name">{i.name}</span>
      <span className="intel-meta">
        {i.domain} · {i.keyword}
      </span>
      <span className={`tag ${st.tone}`}>{st.label}</span>
    </Link>
  );
}

export default function Intelligences() {
  const gardner = INTELLIGENCES.filter((i) => i.group === 'gardner');
  const ext = INTELLIGENCES.filter((i) => i.group === 'extension');
  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">בלוק ב · מיומנויות האינטליגנציות</span>
        <h1>אינטליגנציות</h1>
        <p className="lead">
          לצד המבחנים הסטנדרטיים: מערך תרגול לכל אינטליגנציה. כל מערך מפרק את האינטליגנציה למיומנויות, ולכל מיומנות תרגיל עם מפתח
          תשובות או כלי עבודה פתוח. השמות, התיאורים והצבעים זהים לאלה שבאפליקציית האינטליגנציות.
        </p>
        <a className="small" href={INTELLIGENCES_APP_URL} target="_blank" rel="noreferrer">
          לאפליקציית האינטליגנציות, שבה נוצרים המיזוגים
        </a>
      </header>

      <section className="stack" aria-labelledby="g-title">
        <div className="page-head">
          <h2 id="g-title">שמונה האינטליגנציות של גרדנר</h2>
          <p className="small muted">לכל אחת מערך תרגול: שלושה תרגילים עם מפתח תשובות ושני כלים פתוחים.</p>
        </div>
        <div className="intel-grid">
          {gardner.map((i) => (
            <IntelCard key={i.id} i={i} />
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="e-title">
        <div className="page-head">
          <h2 id="e-title">הרחבות</h2>
          <p className="small muted">ארבע האינטליגנציות הנוספות, באותו מבנה: שלושה תרגילים עם מפתח ושני כלים.</p>
        </div>
        <div className="intel-grid">
          {ext.map((i) => (
            <IntelCard key={i.id} i={i} />
          ))}
        </div>
      </section>

      <FusionRoom />
    </main>
  );
}

/** The 66 fusion pairs as a triangle: each cell is the meeting of two colours. Practice sets for fusions come next. */
function FusionRoom() {
  const all = INTELLIGENCES;
  const [sel, setSel] = useState<[number, number]>([1, 0]);
  const navigate = useNavigate();
  const a = all[sel[0]];
  const b = all[sel[1]];
  const name = FUSION_NAMES[fusionKey(a.id, b.id)];
  const key = fusionKey(a.id, b.id);
  const card = FUSIONS[key];
  const own = FUSION_PROGRAMS[key];
  const ownCount = Object.keys(FUSION_PROGRAMS).length;
  return (
    <section className="stack" aria-labelledby="f-title">
      <div className="page-head">
        <h2 id="f-title">חדר המיזוגים</h2>
        <p className="small muted" style={{ maxWidth: '64ch' }}>
          66 כרטיסי המיזוג מאפליקציית האינטליגנציות. לכל מיזוג דף משלו: הכרטיס, סבב משולב של תרגילי שתי האינטליגנציות, ואתגר יומי.
          תרגילים ייעודיים למיזוג נבנים בהדרגה. כרגע יש ל-<span className="num">{ownCount}</span> מיזוגים.
        </p>
      </div>
      <div className="fusion-room">
        <div className="fusion-tri" role="grid" aria-label="מפת המיזוגים">
          {all.map((x, i) => (
            <div key={x.id} className="fusion-row" role="row">
              <span className="fusion-lbl" style={{ color: `hsl(${x.hue})` }}>
                {x.number}
              </span>
              {all.slice(0, i).map((y, j) => {
                const on = sel[0] === i && sel[1] === j;
                const both = Boolean(FUSION_PROGRAMS[fusionKey(x.id, y.id)]);
                return (
                  <button
                    key={y.id}
                    role="gridcell"
                    className={`fusion-cell ${on ? 'on' : ''} ${both ? 'ready' : ''}`}
                    style={{ background: `linear-gradient(135deg, hsl(${x.hue}) 0 50%, hsl(${y.hue}) 50% 100%)` }}
                    aria-label={`${x.name} ו${y.name}: ${FUSION_NAMES[fusionKey(x.id, y.id)] ?? ''}`}
                    aria-pressed={on}
                    onClick={() => navigate(`/fusions/${fusionSlug(fusionKey(x.id, y.id))}`)}
                    onFocus={() => setSel([i, j])}
                    onMouseEnter={() => setSel([i, j])}
                  />
                );
              })}
            </div>
          ))}
          <div className="fusion-row" aria-hidden>
            <span className="fusion-lbl" />
            {all.slice(0, -1).map((y) => (
              <span key={y.id} className="fusion-lbl col" style={{ color: `hsl(${y.hue})` }}>
                {y.number}
              </span>
            ))}
          </div>
        </div>
        <article className="fusion-card" style={{ ['--fa' as string]: `hsl(${a.hue})`, ['--fb' as string]: `hsl(${b.hue})` }}>
          <span className="eyebrow">
            {a.number} × {b.number}
          </span>
          <h3>{name ?? 'מיזוג'}</h3>
          <p className="small">
            {a.name} ו{b.name}
          </p>
          {card && <p className="small">{card.definition}</p>}
          <span className={`tag ${own ? 'ok' : ''}`}>{own ? 'יש תרגילים ייעודיים' : 'סבב משולב ואתגר יומי'}</span>
          <Link className="btn primary" to={`/fusions/${fusionSlug(key)}`}>
            לדף המיזוג
          </Link>
        </article>
      </div>
    </section>
  );
}
