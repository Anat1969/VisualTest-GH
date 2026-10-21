import { Link } from 'react-router-dom';
import { LIBRARY, RULES_TEXT, SOURCE_NOTE } from '../content/library';

export default function Library() {
  return (
    <main className="page">
      <header className="page-head">
        <span className="eyebrow">ספרייה</span>
        <h1>סוגי המבחן</h1>
        <p className="lead">מה כל סוג בודק, איך הוא נראה, ואיך לגשת אליו. הסבר קצר לפני תרגול חוסך טעויות כלל.</p>
      </header>

      {LIBRARY.map((e) => (
        <section key={e.type} className="card" aria-labelledby={`lib-${e.type}`}>
          <h2 id={`lib-${e.type}`}>{e.title}</h2>
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
