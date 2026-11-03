import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../logic/types';
import { ERROR_HINT, ERROR_LABEL } from '../../logic/types';
import { NetFlat } from '../stimulus/Net';
import { Visual } from '../stimulus/Visual';
import { DynamicStage } from './DynamicStage';
import { RotationSolve, canSolve3D } from './RotationSolve';
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
  // lift-off items: a wrong answer is not revealed. The stage shows why it fails, and the learner tries again.
  const solving = answered && showFeedback && answer! >= 0 && canSolve3D(item);
  const tested = solving ? [answer!, ...tries] : [];
  const current = tested[tested.length - 1];
  const solved = !solving || item.options[current].correct;
  const reveal = answered && showFeedback && solved;
  const testing = item.options[current];
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
        ) : solving ? (
          <RotationSolve key={current} item={item} target={current} />
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

      <div className={`options ${item.dynamic && !ready ? 'waiting' : ''}`} role="group" aria-label="אפשרויות תשובה" aria-hidden={item.dynamic && !ready ? true : undefined}>
        {item.options.map((o, i) => {
          const triedWrong = solving && tested.includes(i) && !o.correct;
          const state = solving
            ? triedWrong ? 'is-wrong' : solved ? (o.correct ? 'is-correct' : 'is-dim') : ''
            : !answered || !showFeedback ? '' : o.correct ? 'is-correct' : i === answer ? 'is-wrong' : 'is-dim';
          const canTry = solving && !solved && !tested.includes(i);
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

      {solving && !solved && (
        <section className="feedback bad" aria-live="polite">
          <h3>{OPTION_LABELS[current]} לא מתאימה. נסי אפשרות אחרת</h3>
          <p>
            <span className="tag bad">{ERROR_LABEL[testing.errorType!]}</span> {testing.why}
          </p>
          <p className="small muted">{ERROR_HINT[testing.errorType!]}</p>
        </section>
      )}

      {reveal && (
        <section className={`feedback ${isRight ? 'ok' : 'bad'}`} aria-live="polite">
          <h3>
            {answer === -1
              ? 'הזמן נגמר'
              : isRight
                ? 'נכון'
                : solving
                  ? `נמצא בניסיון ה-${tested.length}: ${OPTION_LABELS[current]}`
                  : `לא נכון. התשובה: ${OPTION_LABELS[item.correctIndex]}`}
          </h3>
          {chosen && !isRight && !solving && (
            <p>
              <span className="tag bad">{ERROR_LABEL[chosen.errorType!]}</span> {chosen.why}
            </p>
          )}
          <p>{correct.why}</p>
          <p className="muted">{item.explanation}</p>
          {chosen && !isRight && !solving && <p className="small muted">{ERROR_HINT[chosen.errorType!]}</p>}
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
