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
