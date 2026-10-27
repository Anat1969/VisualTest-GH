import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLocal, todayKey } from '../components/intel/local';
import { TOOLS } from '../components/intel/registry';
import { Empty } from '../components/ui/States';
import { FUSIONS, fusionFromSlug } from '../content/fusions';
import { FUSION_PROGRAMS } from '../content/fusionPrograms';
import { INTELLIGENCES_APP_URL, PROGRAMS, intelligenceById } from '../content/intelligences';
import { useStore } from '../data/store';
import { currentLevel } from '../logic/mastery';
import type { SessionConfig } from '../logic/session';
import { ALL_TYPES, TYPE_LABEL, type Level, type Mode, type TestType } from '../logic/types';
import '../components/intel/intel.css';

/** One fusion: its card, a round mixing both intelligences' keyed drills, and the card's daily challenge. */
export default function FusionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const key = fusionFromSlug(id ?? '');
  const card = FUSIONS[key];
  const [ida, idb] = key.split('+');
  const a = intelligenceById(ida);
  const b = intelligenceById(idb);
  const mastery = useStore((s) => s.mastery);
  const [done, setDone] = useLocal<string[]>(`merhav:fusion-challenge:${key}`, []);

  if (!card || !a || !b)
    return (
      <main className="page">
        <Empty title="המיזוג לא נמצא" action={{ to: '/intelligences', label: 'לחדר המיזוגים' }}>
          ייתכן שהקישור ישן. כל 66 המיזוגים נמצאים בחדר המיזוגים.
        </Empty>
      </main>
    );

  const own = FUSION_PROGRAMS[key];
  const drillsOf = (id: string) => PROGRAMS[id as keyof typeof PROGRAMS]?.skills.filter((s) => s.drill).map((s) => s.drill!) ?? [];
  const mixed = [...drillsOf(a.id), ...drillsOf(b.id)];
  const ownDrills = own?.skills.filter((s) => s.drill).map((s) => s.drill!) ?? [];
  const levels = Object.fromEntries(ALL_TYPES.map((t) => [t, currentLevel(mastery, t)])) as Record<TestType, Level>;
  const go = (mode: Mode, types: TestType[]) => navigate('/run', { state: { mode, types, levels } satisfies SessionConfig });
  const today = todayKey();
  const doneToday = done.includes(today);
  let streak = 0;
  for (const d = new Date(); done.includes(todayKey(d)); d.setDate(d.getDate() - 1)) streak++;

  return (
    <main className="page" style={{ ['--fa' as string]: `hsl(${a.hue})`, ['--fb' as string]: `hsl(${b.hue})` }}>
      <nav className="small">
        <Link to="/intelligences">אינטליגנציות</Link> <span className="muted">/ מיזוג / {card.name}</span>
      </nav>

      <section className="fusion-hero">
        <div className="stack">
          <span className="eyebrow">
            <Link to={`/intelligences/${a.id}`}>
              {a.number} {a.name}
            </Link>{' '}
            ×{' '}
            <Link to={`/intelligences/${b.id}`}>
              {b.number} {b.name}
            </Link>
          </span>
          <h1>{card.name}</h1>
          <p className="lead">{card.definition}</p>
          <p className="fusion-insight">{card.insight}</p>
        </div>
        <figure className="fusion-mark" aria-hidden>
          <span style={{ background: `hsl(${a.hue})` }} />
          <span style={{ background: `hsl(${b.hue})` }} />
        </figure>
      </section>

      <section className="card fusion-recognize">
        <span className="eyebrow">איך מזהים את זה</span>
        <p>{card.recognize}</p>
      </section>

      <section className="stack" aria-labelledby="fx-drills">
        <div className="page-head">
          <h2 id="fx-drills">תרגול</h2>
          <p className="small muted" style={{ maxWidth: '62ch' }}>
            {own
              ? own.premise
              : `עוד אין תרגילים ייעודיים למיזוג הזה. בינתיים: סבב שמערבב את תרגילי המפתח של שתי האינטליגנציות, כדי לעבור ביניהן באותו סשן.`}
          </p>
        </div>
        {own && ownDrills.length > 0 && (
          <div className="row">
            <button className="btn primary lg" onClick={() => go('practice', ownDrills)}>
              תרגילי המיזוג
            </button>
          </div>
        )}
        <div className="fusion-mix">
          <div className="fusion-mix-col" style={{ borderTopColor: `hsl(${a.hue})` }}>
            <strong>{a.name}</strong>
            <ul>
              {drillsOf(a.id).map((t) => (
                <li key={t}>{TYPE_LABEL[t]}</li>
              ))}
            </ul>
          </div>
          <div className="fusion-mix-col" style={{ borderTopColor: `hsl(${b.hue})` }}>
            <strong>{b.name}</strong>
            <ul>
              {drillsOf(b.id).map((t) => (
                <li key={t}>{TYPE_LABEL[t]}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="row">
          <button className={`btn ${own ? '' : 'primary'} lg`} onClick={() => go('practice', mixed)} disabled={!mixed.length}>
            סבב משולב
          </button>
          <button className="btn lg" onClick={() => go('simulation', mixed)} disabled={!mixed.length}>
            מבחן משולב
          </button>
        </div>
      </section>

      {own?.skills
        .filter((s) => s.tool)
        .map((s) => {
          const tool = TOOLS[s.tool!];
          return (
            <section key={s.id} className="card tool-card">
              <span className="eyebrow">כלי · {s.name}</span>
              <h2>{tool.title}</h2>
              <p className="small muted">{tool.blurb}</p>
              {tool.render({ color: `hsl(${a.hue})`, seed: card.definition })}
            </section>
          );
        })}

      <section className="card fusion-challenge" aria-labelledby="fx-ch">
        <span className="eyebrow">אתגר יומי</span>
        <h2 id="fx-ch">היום</h2>
        <p>{card.practice}</p>
        <div className="row">
          <button
            className={`btn ${doneToday ? '' : 'primary'}`}
            aria-pressed={doneToday}
            onClick={() => setDone(doneToday ? done.filter((d) => d !== today) : [...done, today].slice(-120))}
          >
            {doneToday ? 'בוצע היום' : 'סימון כבוצע היום'}
          </button>
          <span className="small muted">
            {streak ? (
              <>
                רצף של <span className="num">{streak}</span> {streak === 1 ? 'יום' : 'ימים'}
              </>
            ) : (
              'עוד לא סומן'
            )}{' '}
            · סך הכול <span className="num">{done.length}</span>
          </span>
        </div>
      </section>

      <p className="small muted">
        מקור הכרטיס:{' '}
        <a href={INTELLIGENCES_APP_URL} target="_blank" rel="noreferrer">
          אפליקציית האינטליגנציות
        </a>
        .
      </p>
    </main>
  );
}
