import type { VerbalSpec } from '../../logic/types';
import './verbal.css';

/** Typographic stimuli for the linguistic drills. Words are set like specimens, not like UI text. */
export function Verbal({ spec }: { spec: VerbalSpec }) {
  switch (spec.mode) {
    case 'pair':
      return (
        <div className="vb-pair" role="img" aria-label={`${spec.words[0]} ו${spec.words[1]}`}>
          <span className="vb-word">{spec.words[0]}</span>
          <span className="vb-link" aria-hidden>
            <span className="vb-link-line" />
            <span className="vb-link-q">היחס</span>
            <span className="vb-link-line" />
          </span>
          <span className="vb-word">{spec.words[1]}</span>
        </div>
      );
    case 'pairOption':
      return (
        <span className="vb-opt-pair">
          <span>{spec.words[0]}</span>
          <span className="vb-rule" aria-hidden />
          <span>{spec.words[1]}</span>
        </span>
      );
    case 'word':
      return <span className="vb-opt-word">{spec.words[0]}</span>;
    case 'order':
      // first sentence on the right: the reading direction of the page
      return (
        <span className="vb-order" aria-label={`סדר: ${spec.words.join(', ')}`}>
          {spec.words.map((w, i) => (
            <span key={i} className="vb-chip">
              {w}
            </span>
          ))}
        </span>
      );
    case 'series':
      // numbers read left to right, like on a test sheet
      return (
        <div className="vb-series" dir="ltr" role="img" aria-label={`סדרה: ${spec.words.join(', ')}, ומה הבא`}>
          {spec.words.map((w, i) => (
            <span key={i} className="vb-num-box">
              {w}
            </span>
          ))}
          <span className="vb-num-box q">?</span>
        </div>
      );
    case 'quote':
      return (
        <blockquote className="vb-quote">
          <span className="vb-quote-mark" aria-hidden>
            ”
          </span>
          {spec.words[0]}
        </blockquote>
      );
    case 'gap':
      // a scale read from weak (right) to strong (left), with one slot missing
      return (
        <div className="vb-gap" role="img" aria-label={`סולם: ${spec.words.join(', ')}`}>
          <span className="vb-gap-end xs muted">חלש</span>
          {spec.words.map((w, i) => (
            <span key={i} className={`vb-num-box ${w === '?' ? 'q' : ''}`}>
              {w}
            </span>
          ))}
          <span className="vb-gap-end xs muted">חזק</span>
        </div>
      );
    case 'code':
      return (
        <pre className="vb-code" dir="ltr">
          {spec.words.map((line, i) => (
            <span key={i} className="vb-code-line">
              <span className="vb-code-n" aria-hidden>
                {i + 1}
              </span>
              {line}
            </span>
          ))}
        </pre>
      );
    case 'table': {
      const [head, ...rows] = spec.words.map((r) => r.split('|'));
      return (
        <div className="vb-table-wrap">
          <table className="vb-table">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={/^\d+$/.test(c) ? 'num' : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'note':
      return <p className="vb-note">{spec.words[0]}</p>;
    case 'sentences':
      return (
        <ol className="vb-sentences">
          {spec.words.map((line, i) => (
            <li key={i}>
              <span className="vb-num">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      );
  }
}
