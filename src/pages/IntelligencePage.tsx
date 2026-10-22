import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TOOLS } from '../components/intel/registry';
import { Skyline } from '../components/intel/RhythmViz';
import { Empty, pct } from '../components/ui/States';
import { INTELLIGENCES_APP_URL, PROGRAMS, intelligenceById, type Skill } from '../content/intelligences';
import { useStore } from '../data/store';
import { byType, joinAttempts, typeTrend } from '../logic/diagnostics';
import { currentLevel, rowOf } from '../logic/mastery';
import { tokenize } from '../logic/rhythm';
import type { SessionConfig } from '../logic/session';
import { ALL_TYPES, type Level, type Mode, type TestType } from '../logic/types';
import { intelVars } from './Intelligences';
import '../components/intel/intel.css';
import './home.css';

export default function IntelligencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const intel = intelligenceById(id ?? '');
  const program = intel ? PROGRAMS[intel.id] : undefined;
  const { attempts, questions, sessions, mastery } = useStore((s) => s);
  const rows = useMemo(() => joinAttempts(attempts, questions, sessions), [attempts, questions, sessions]);
  const signature = useMemo(() => (intel ? tokenize(intel.description.replace(/ — /g, '. ')) : []), [intel]);

  if (!intel)
    return (
      <main className="page">
        <Empty title="האינטליגנציה לא נמצאה" action={{ to: '/intelligences', label: 'לכל האינטליגנציות' }} />
      </main>
    );

  const color = `hsl(${intel.hue})`;
  const levels = Object.fromEntries(ALL_TYPES.map((t) => [t, currentLevel(mastery, t)])) as Record<TestType, Level>;
  const go = (mode: Mode, types: TestType[]) => navigate('/run', { state: { mode, types, levels } satisfies SessionConfig });
  const drills = program?.skills.filter((s) => s.drill).map((s) => s.drill!) ?? [];

  const SkillCard = ({ skill }: { skill: Skill }) => {
    const t = skill.drill;
    const s = t ? byType(rows.filter((r) => r.mode !== 'explain'), t) : null;
    const cur = t ? currentLevel(mastery, t) : null;
    const trend = t ? typeTrend(rows, t) : [];
    return (
      <article className="skill">
        <div className="skill-head">
          <h3>{skill.name}</h3>
          <span className="tag">{t ? 'תרגיל עם מפתח' : 'כלי פתוח'}</span>
        </div>
        <p className="small">{skill.what}</p>
        {t && cur && (
          <div className="skill-level">
            <span className="lvl-num">{cur}</span>
            <div className="lvl-bars" aria-label={`רמה ${cur} מתוך 3`}>
              {([1, 2, 3] as Level[]).map((l) => (
                <span key={l} className={rowOf(mastery, t, l).status} />
              ))}
            </div>
            <span className="small num">{s && s.n ? pct(s.accuracy) : 'עוד לא תורגל'}</span>
            {trend.length > 1 && <span className="xs muted">{trend.length} סשנים</span>}
          </div>
        )}
        <details>
          <summary>איך לגשת</summary>
          <ul>
            {skill.strategies.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
        <div className="row" style={{ marginTop: 'auto' }}>
          {t ? (
            <>
              <button className="btn primary" onClick={() => go('practice', [t])}>
                תרגול
              </button>
              <button className="btn" onClick={() => go('explain', [t])}>
                הסבר
              </button>
              <button className="btn ghost" onClick={() => go('exam', [t])}>
                מבחן
              </button>
            </>
          ) : (
            <a className="btn primary" href={`#tool-${skill.tool}`}>
              פתיחת הכלי
            </a>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="page" style={intelVars(intel)}>
      <nav className="small">
        <Link to="/intelligences">אינטליגנציות</Link> <span className="muted">/ {intel.name}</span>
      </nav>

      <section className="intel-hero">
        <div className="stack">
          <span className="intel-num">{intel.number}</span>
          <h1>{intel.name}</h1>
          <span className="eyebrow">
            {intel.domain} · {intel.keyword}
          </span>
          <p className="lead">{intel.description}</p>
        </div>
        <figure className="intel-sign" aria-label="הקצב של התיאור עצמו">
          <Skyline sents={signature} color={color} />
          <figcaption className="xs muted">חתימה: קו הרקיע של התיאור עצמו, משפט אחר משפט. כך נראה קצב כשמסתכלים עליו.</figcaption>
        </figure>
      </section>

      {!program ? (
        <Empty title="מערך התרגול של האינטליגנציה הזו בבנייה" action={{ to: '/intelligences/linguistic', label: 'למערך הפעיל: לשונית-מילולית' }}>
          המערכים נבנים לפי הסדר. כל מערך מפרק את האינטליגנציה למיומנויות, עם תרגילים וכלים.
        </Empty>
      ) : (
        <>
          <section className="stack" aria-labelledby="map-t">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div className="page-head">
                <h2 id="map-t">מפת המיומנויות</h2>
                <p className="small muted" style={{ maxWidth: '62ch' }}>
                  {program.premise}
                </p>
              </div>
              <div className="row">
                <button className="btn primary lg" onClick={() => go('practice', drills)}>
                  סבב משולב
                </button>
                <button className="btn lg" onClick={() => go('simulation', drills)}>
                  מבחן משולב
                </button>
              </div>
            </div>
            <div className="skills">
              {program.skills.map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
            </div>
          </section>

          {program.skills
            .filter((s) => s.tool)
            .map((s) => {
              const tool = TOOLS[s.tool!];
              return (
                <section key={s.tool} className="card tool-card" id={`tool-${s.tool}`} style={{ scrollMarginTop: 80 }}>
                  <span className="eyebrow">כלי · {s.name}</span>
                  <h2>{tool.title}</h2>
                  <p className="small muted">{tool.blurb}</p>
                  {tool.render({ color, seed: intel.description })}
                </section>
              );
            })}
        </>
      )}

      <p className="small muted">
        מקור התיאור:{' '}
        <a href={INTELLIGENCES_APP_URL} target="_blank" rel="noreferrer">
          אפליקציית האינטליגנציות
        </a>
        .
      </p>
    </main>
  );
}
