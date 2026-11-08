import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../logic/types';
import { ERROR_HINT, ERROR_LABEL } from '../../logic/types';
import { NetFlat } from '../stimulus/Net';
import { Visual } from '../stimulus/Visual';
import { DynamicStage } from './DynamicStage';
import { solverFor } from './solvers';
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
  /** extra options the learner tested after a wrong answer (lift-off items only) */
  const [tries, setTries] = useState<number[]>([]);
  const answered = answer !== null;

  useEffect(() => {
    setReady(!item.dynamic);
    setReplay(0);
    setTries([]);
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
  // with feedback on, a wrong answer (or a timeout) is never revealed: the learner tries again until finding it.
  // Only the first answer is scored; later tries are for learning.
  const retrying = answered && showFeedback;
  const tested = retrying ? [...(answer! >= 0 ? [answer!] : []), ...tries] : [];
  const current = tested[tested.length - 1] as number | undefined;
  const solved = retrying && current !== undefined && item.options[current].correct;
  const reveal = solved;
  const Solver = solverFor(item);
  const solving = retrying && current !== undefined && Solver !== null;
  const testing = current !== undefined ? item.options[current] : null;
  const stageRef = useRef<HTMLDivElement>(null);
  // each test plays in the stage: bring it into view (on a phone the answer would otherwise scroll it away)
  useEffect(() => {
    if (!solving) return;
    const id = requestAnimationFrame(() => stageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    return () => cancelAnimationFrame(id);
  }, [solving, current]);
  const wide = item.stimulus.kind === 'paperSteps' && !item.dynamic;

  return (
    <article className={`item ${wide ? 'item--stack' : ''}`}>
      <p className="item-prompt">{item.prompt}</p>

      <div ref={stageRef} className={`board item-stage ${wide ? 'wide' : ''}`}>
        {item.dynamic?.kind === 'netFold' && !solving && (
          <figure className="stage-ref">
            <NetFlat spec={item.dynamic.net} />
            <figcaption>הפריסה</figcaption>
          </figure>
        )}
        {solving ? (
          Solver && <Solver key={current} item={item} target={current!} />
        ) : item.dynamic ? (
          <DynamicStage
            spec={item.dynamic}
            reveal={reveal}
            replayToken={replay}
            onPaused={() => setReady(true)}
          />
        ) : (
          <Visual spec={item.stimulus} label="פריט המקור" />
        )}
        {item.dynamic && !solving && (
          <div className="stage-status" aria-live="polite">
            {!ready ? 'צפי בתנועה' : reveal ? 'התנועה הושלמה' : 'נקודת השאלה'}
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

      <div className={`options ${item.dynamic && !ready ? 'waiting' : ''}`} role="group" aria-label="אפשרויות תשובה" aria-hidden={item.dynamic && !ready ? true : undefined}>
        {item.options.map((o, i) => {
          const triedWrong = retrying && tested.includes(i) && !o.correct;
          const state = !retrying ? '' : triedWrong ? 'is-wrong' : solved ? (o.correct ? 'is-correct' : 'is-dim') : '';
          const canTry = retrying && !solved && !tested.includes(i);
          return (
            <button
              key={i}
              className={`option ${state} ${answer === i ? 'is-chosen' : ''}`}
              disabled={canTry ? false : answered || !ready}
              onClick={() => (canTry ? setTries((t) => [...t, i]) : onAnswer(i))}
              aria-label={`אפשרות ${OPTION_LABELS[i]}`}
            >
              <span className="option-label">{OPTION_LABELS[i]}</span>
              <span className="option-visual">
                <Visual spec={o.visual} label={`אפשרות ${OPTION_LABELS[i]}`} />
              </span>
              {reveal && (o.correct || i === answer) && (
                <span className={`tag ${o.correct ? 'ok' : 'bad'}`}>{o.correct ? 'התשובה הנכונה' : 'הבחירה שלך'}</span>
              )}
            </button>
          );
        })}
      </div>

      {retrying && !solved && (
        <section className="feedback bad" aria-live="polite">
          <h3>{testing ? `${OPTION_LABELS[current!]} לא מתאימה. נסי אפשרות אחרת` : 'הזמן נגמר. בחרי תשובה כדי ללמוד'}</h3>
          {testing && (
            <p>
              <span className="tag bad">{ERROR_LABEL[testing.errorType!]}</span> {testing.why}
            </p>
          )}
          {testing && <p className="small muted">{ERROR_HINT[testing.errorType!]}</p>}
          <p className="small muted">בציון נרשמת טעות. הניסיונות הבאים לא משנים אותה.</p>
        </section>
      )}

      {reveal && (
        <section className={`feedback ${isRight ? 'ok' : 'bad'}`} aria-live="polite">
          <h3>
            {isRight ? 'נכון' : `נמצא בניסיון ה-${tested.length}: ${OPTION_LABELS[current!]}. בציון נרשמה טעות`}
          </h3>
          <p>{correct.why}</p>
          <p className="muted">{item.explanation}</p>
          
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
