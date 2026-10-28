import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PROGRAMS, type Intelligence } from '../../content/intelligences';
import './intel.css';

// Small and shared: kept out of the Intelligences page so the home page does not load the 66 fusion cards.
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

