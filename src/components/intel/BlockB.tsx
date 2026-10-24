import { Link } from 'react-router-dom';
import { INTELLIGENCES, PROGRAMS } from '../../content/intelligences';
import type { MasteryRow } from '../../logic/mastery';
import { byType, type Joined } from '../../logic/diagnostics';
import { currentLevel, rowOf } from '../../logic/mastery';
import { ERROR_LABEL, type ErrorType, type Level } from '../../logic/types';
import { pct } from '../ui/States';
import { intelVars } from '../../pages/Intelligences';
import './intel.css';

const ERRORS: ErrorType[] = ['encoding', 'transformation', 'wrong_rule', 'timeout'];

/** Block B at a glance: per intelligence, each keyed drill with its level (progress) or accuracy and main error (diagnosis). */
export function BlockBSummary({ rows, mastery, mode }: { rows: Joined[]; mastery: MasteryRow[]; mode: 'levels' | 'diagnosis' }) {
  const intels = INTELLIGENCES.filter((i) => PROGRAMS[i.id]);
  const practiced = intels.filter((i) => PROGRAMS[i.id]!.skills.some((s) => s.drill && byType(rows, s.drill).n));
  const list = mode === 'diagnosis' ? practiced : intels;

  if (!list.length)
    return (
      <p className="small muted">
        עוד אין תשובות בתרגילי האינטליגנציות. <Link to="/intelligences">לבחירת אינטליגנציה</Link>
      </p>
    );

  return (
    <div className="bb-grid">
      {list.map((i) => (
        <article key={i.id} className="bb-card" style={intelVars(i)}>
          <Link to={`/intelligences/${i.id}`} className="bb-head">
            <span className="bb-num">{i.number}</span>
            <strong>{i.name}</strong>
          </Link>
          <ul className="bb-list">
            {PROGRAMS[i.id]!.skills
              .filter((s) => s.drill)
              .map((s) => {
                const t = s.drill!;
                const st = byType(rows, t);
                const top = ERRORS.filter((e) => st.errors[e]).sort((a, b) => st.errors[b] - st.errors[a])[0];
                return (
                  <li key={s.id}>
                    <span className="bb-skill">{s.name}</span>
                    {mode === 'levels' ? (
                      <span className="bb-ladder" aria-label={`רמה ${currentLevel(mastery, t)} מתוך 3`}>
                        {([1, 2, 3] as Level[]).map((l) => (
                          <span key={l} className={rowOf(mastery, t, l).status} />
                        ))}
                        <span className="num xs">{currentLevel(mastery, t)}</span>
                      </span>
                    ) : st.n ? (
                      <span className="bb-stat">
                        <span className="num">{pct(st.accuracy)}</span>
                        <span className="xs muted">
                          {st.n} פריטים{top ? ` · בעיקר ${ERROR_LABEL[top]}` : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="xs muted">לא תורגל</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </article>
      ))}
    </div>
  );
}
