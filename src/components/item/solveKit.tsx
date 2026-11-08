import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../logic/types';

/*
 * Shared timeline for the "lifts off the page" solutions.
 * Every solution: the figure lifts, moves onto the chosen option, lands (green fits, red does not),
 * and for a wrong option holds a second, then goes back to the original drawing to try again.
 */

export const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];
export const SOLVE = { stim: '#9DB0C4', anchor: '#3B86B0', ok: '#46A06A', bad: '#C9574B', ink: '#1F2A37' };
export const T_HOLD = 1000;

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp = (t: number) => Math.max(0, Math.min(1, t));
/** progress of a phase that starts at `from` and lasts `len` ms */
export const phase = (ms: number, from: number, len: number) => clamp((ms - from) / len);

export interface SolveProps {
  item: Item;
  target: number;
}

/**
 * Clock for one test. `total` = lift + move + land; `end` adds the hold and the way back for a wrong option.
 * With reduced motion: the result at once, then (wrong option) the original after the same pause.
 */
export function useSolveClock(total: number, end: number, target: number) {
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setMs(total);
      if (end === total) return;
      const id = window.setTimeout(() => setMs(end), T_HOLD);
      return () => window.clearTimeout(id);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      setMs(Math.min(t, end));
      if (t < end) raf.current = requestAnimationFrame(tick);
    };
    setMs(0);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, total, end]);
  return { ms, done: ms >= end, replay: () => setRun((r) => r + 1) };
}

/** Status line (green or red once the figure lands) and the replay button. */
export function SolveChrome({ caption, verdict, done, onReplay }: { caption: string; verdict: 'ok' | 'bad' | null; done: boolean; onReplay: () => void }) {
  return (
    <>
      <div className={`stage-status ${verdict ?? ''}`} aria-live="polite">
        {caption}
      </div>
      {done && (
        <button className="btn ghost sm stage-replay" onClick={onReplay}>
          שוב
        </button>
      )}
    </>
  );
}

/** "N cells do not find a place" in Hebrew, singular or plural. */
export const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);
