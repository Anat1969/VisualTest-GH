import { useEffect, useState } from 'react';
import type { Item } from '../../logic/types';
import { ERROR_HINT, ERROR_LABEL } from '../../logic/types';
import { NetFlat } from '../stimulus/Net';
import { Visual } from '../stimulus/Visual';
import { DynamicStage } from './DynamicStage';
import './item.css';

export const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];

export interface ItemViewProps {
  item: Item;
  /** null while answering; the chosen index (or -1 for timeout) once answered */
  answer: number | null;
  showFeedback: boolean;
  explainMode: boolean;
  allowReplay: boolean;
  onAnswer: (index: number) => void;
}

export function ItemView({ item, answer, showFeedback, explainMode, allowReplay, onAnswer }: ItemViewProps) {
  const [ready, setReady] = useState(!item.dynamic);
  const [replay, setReplay] = useState(0);
  const answered = answer !== null;

  useEffect(() => {
    setReady(!item.dynamic);
    setReplay(0);
  }, [item]);

  useEffect(() => {
    if (answered || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= item.options.length) onAnswer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, ready, item, onAnswer]);

  const chosen = answer !== null && answer >= 0 ? item.options[answer] : null;
  const correct = item.options[item.correctIndex];
  const isRight = chosen?.correct ?? false;
  const wide = item.stimulus.kind === 'paperSteps' && !item.dynamic;

  return (
    <article className="item">
      <p className="item-prompt">{item.prompt}</p>

      <div className={`board item-stage ${wide ? 'wide' : ''}`}>
        {item.dynamic?.kind === 'netFold' && (
          <figure className="stage-ref">
            <NetFlat spec={item.dynamic.net} />
            <figcaption>הפריסה</figcaption>
          </figure>
        )}
        {item.dynamic ? (
          <DynamicStage
            spec={item.dynamic}
            reveal={answered && showFeedback}
            replayToken={replay}
            onPaused={() => setReady(true)}
          />
        ) : (
          <Visual spec={item.stimulus} label="פריט המקור" />
        )}
        {item.dynamic && (
          <div className="stage-status" aria-live="polite">
            {!ready ? 'צפי בתנועה' : answered && showFeedback ? 'התנועה הושלמה' : 'נקודת השאלה'}
          </div>
        )}
      </div>

      {item.dynamic && allowReplay && ready && !answered && (
        <div className="row">
          <button
            className="btn ghost"
            onClick={() => {
              setReady(false);
              setReplay((r) => r + 1);
            }}
          >
            הצגה חוזרת של התנועה
          </button>
        </div>
      )}

      <div className="options" role="group" aria-label="אפשרויות תשובה">
        {item.options.map((o, i) => {
          const state = !answered || !showFeedback ? '' : o.correct ? 'is-correct' : i === answer ? 'is-wrong' : 'is-dim';
          return (
            <button
              key={i}
              className={`option ${state} ${answer === i ? 'is-chosen' : ''}`}
              disabled={answered || !ready}
              onClick={() => onAnswer(i)}
              aria-label={`אפשרות ${OPTION_LABELS[i]}`}
            >
              <span className="option-label">{OPTION_LABELS[i]}</span>
              <span className="option-visual">
                <Visual spec={o.visual} label={`אפשרות ${OPTION_LABELS[i]}`} />
              </span>
              {answered && showFeedback && (o.correct || i === answer) && (
                <span className={`tag ${o.correct ? 'ok' : 'bad'}`}>{o.correct ? 'התשובה הנכונה' : 'הבחירה שלך'}</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && showFeedback && (
        <section className={`feedback ${isRight ? 'ok' : 'bad'}`} aria-live="polite">
          <h3>{answer === -1 ? 'הזמן נגמר' : isRight ? 'נכון' : `לא נכון. התשובה: ${OPTION_LABELS[item.correctIndex]}`}</h3>
          {chosen && !isRight && (
            <p>
              <span className="tag bad">{ERROR_LABEL[chosen.errorType!]}</span> {chosen.why}
            </p>
          )}
          <p>{correct.why}</p>
          <p className="muted">{item.explanation}</p>
          {chosen && !isRight && <p className="small muted">{ERROR_HINT[chosen.errorType!]}</p>}
          {explainMode && (
            <details open>
              <summary>ניתוח כל האפשרויות</summary>
              <ul className="why-list">
                {item.options.map((o, i) => (
                  <li key={i}>
                    <strong>{OPTION_LABELS[i]}.</strong> {o.correct ? 'נכונה. ' : `${ERROR_LABEL[o.errorType!]}: `}
                    {o.why}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </article>
  );
}
