import { Link } from 'react-router-dom';
import { LIBRARY, RULES_TEXT, SOURCE_NOTE } from '../content/library';
import { INTELLIGENCES, PROGRAMS } from '../content/intelligences';
import { CATEGORIES } from '../logic/types';
import { intelVars } from './Intelligences';
import '../components/intel/intel.css';

export default function Library() {
  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">ספרייה</span>
        <h1>סוגי המבחן</h1>
        <p className="lead">בלוק א: עשרה סוגי מבחן בארבעה תחומים. בלוק ב: מערכי התרגול של האינטליגנציות. מה כל תרגיל בודק ואיך לגשת אליו. הסבר קצר לפני תרגול חוסך טעויות כלל.</p>
        <nav className="row" aria-label="תוכן הספרייה">
          {LIBRARY.map((e) => (
            <a key={e.type} className="tag" href={`#lib-${e.type}`}>
              {e.title}
            </a>
          ))}
          <a className="tag accent" href="#block-b">
            בלוק ב: אינטליגנציות
          </a>
        </nav>
      </header>

      {CATEGORIES.map((c) => (
        <div key={c.id} className="stack">
          <div className="page-head">
            <span className="eyebrow">{c.label}</span>
            <p className="small muted">{c.blurb}</p>
          </div>
      {LIBRARY.filter((e) => c.types.includes(e.type)).map((e) => (
        <section key={e.type} className="card" aria-labelledby={`lib-${e.type}`} id={`lib-${e.type}`} style={{ scrollMarginTop: 80 }}>
          <h2>{e.title}</h2>
          <p className="lead">{e.measures}</p>
          <div className="grid-2">
            {e.formats.map((f) => (
              <div key={f.name} className="card flat">
                <span className="tag accent">{f.name}</span>
                <p className="small">{f.text}</p>
              </div>
            ))}
          </div>
          <h3>אסטרטגיות</h3>
          <ul className="stack small">
            {e.strategies.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3>טעויות נפוצות</h3>
          <ul className="stack small">
            {e.pitfalls.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3>רמות</h3>
          <ul className="stack small">
            {e.levels.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="row">
            <Link className="btn primary" to={`/practice?type=${e.type}&sub=explain`}>
              מצב הסבר: {e.title}
            </Link>
          </div>
        </section>
      ))}
        </div>
      ))}

      <div className="stack" id="block-b" style={{ scrollMarginTop: 80 }}>
        <div className="page-head">
          <span className="eyebrow">בלוק ב</span>
          <h2>מערכי התרגול של האינטליגנציות</h2>
          <p className="small muted">לכל אינטליגנציה תרגילים עם מפתח תשובות וכלים פתוחים. כאן מה כל מיומנות בודקת ואיך לגשת אליה.</p>
        </div>
        {INTELLIGENCES.filter((i) => PROGRAMS[i.id]).map((i) => {
          const p = PROGRAMS[i.id]!;
          return (
            <section key={i.id} className="card lib-intel" style={intelVars(i)} id={`lib-intel-${i.id}`}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2>
                  <span className="bb-num">{i.number}</span> {i.name}
                </h2>
                <Link className="btn" to={`/intelligences/${i.id}`}>
                  למערך
                </Link>
              </div>
              <p className="small muted">{p.premise}</p>
              <div className="grid-2">
                {p.skills.map((s) => (
                  <div key={s.id} className="card flat">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>{s.name}</strong>
                      <span className="tag">{s.drill ? 'תרגיל עם מפתח' : 'כלי פתוח'}</span>
                    </div>
                    <p className="small">{s.what}</p>
                    <ul className="stack xs">
                      {s.strategies.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card flat">
        <h2>כללי המסלול</h2>
        <ul className="stack small">
          {RULES_TEXT.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="xs muted">{SOURCE_NOTE}</p>
      </section>
    </main>
  );
}
