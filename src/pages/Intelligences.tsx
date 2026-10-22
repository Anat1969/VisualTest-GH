import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { INTELLIGENCES, INTELLIGENCES_APP_URL, PROGRAMS, type Intelligence } from '../content/intelligences';
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
          <p className="small muted">נבנות לפי הסדר. כל אחת מקבלת מערך תרגול משלה.</p>
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
          <p className="small muted">ארבע האינטליגנציות הנוספות, ואחריהן המיזוגים שנוצרים מהן.</p>
        </div>
        <div className="intel-grid">
          {ext.map((i) => (
            <IntelCard key={i.id} i={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
