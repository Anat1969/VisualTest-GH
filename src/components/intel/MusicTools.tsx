import { useEffect, useRef, useState } from 'react';
import { click, now, tone } from '../../logic/synth';
import { mean, sd, useLocal } from './local';

/* ================= step sequencer ================= */

const ROWS = [
  { name: 'צליל גבוה', midi: 79 },
  { name: 'צליל אמצעי', midi: 72 },
  { name: 'צליל נמוך', midi: 64 },
  { name: 'בס', midi: 48 },
];
const STEPS = 16;
const EMPTY = ROWS.map(() => Array(STEPS).fill(false) as boolean[]);
const DEMO = ROWS.map((_, r) => Array.from({ length: STEPS }, (_, i) => (r === 3 ? i % 4 === 0 : r === 2 ? i % 8 === 4 : r === 0 ? i % 2 === 1 && i % 6 === 1 : i === 10)));

/** A 4×16 grid: build a pattern, hear it loop, and see the beat as a shape. */
export function Sequencer({ color }: { color: string }) {
  const [grid, setGrid] = useLocal<boolean[][]>('merhav:seq', DEMO);
  const [bpm, setBpm] = useLocal('merhav:seq-bpm', 96);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(-1);
  const state = useRef({ grid, bpm });
  state.current = { grid, bpm };

  useEffect(() => {
    if (!playing) return setPos(-1);
    let step = 0;
    let next = now() + 0.05;
    let raf = 0;
    const ahead = () => {
      const dur = 60 / state.current.bpm / 4; // sixteenth notes
      while (next < now() + 0.12) {
        const s = step % STEPS;
        state.current.grid.forEach((row, r) => row[s] && tone(ROWS[r].midi, next, r === 3 ? dur * 1.8 : dur * 1.2, r === 3 ? 0.3 : 0.18));
        const at = next;
        window.setTimeout(() => setPos(s), Math.max(0, (at - now()) * 1000));
        next += dur;
        step++;
      }
      raf = window.setTimeout(ahead, 25);
    };
    ahead();
    return () => clearTimeout(raf);
  }, [playing]);

  const toggle = (r: number, i: number) => setGrid(grid.map((row, rr) => (rr === r ? row.map((v, ii) => (ii === i ? !v : v)) : row)));
  const density = grid.flat().filter(Boolean).length;

  return (
    <div className="lab">
      <div className="seq" role="grid" aria-label="רשת הצעדים" dir="ltr">
        {grid.map((row, r) => (
          <div key={r} className="seq-row" role="row">
            <span className="seq-name" dir="rtl">
              {ROWS[r].name}
            </span>
            {row.map((on, i) => (
              <button
                key={i}
                role="gridcell"
                className={`seq-cell ${on ? 'on' : ''} ${pos === i ? 'now' : ''} ${i % 4 === 0 ? 'beat' : ''}`}
                style={on ? { background: color, borderColor: color } : undefined}
                aria-pressed={on}
                aria-label={`${ROWS[r].name}, צעד ${i + 1}`}
                onClick={() => toggle(r, i)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => setPlaying(!playing)}>
          {playing ? 'עצירה' : 'ניגון בלולאה'}
        </button>
        <label className="small row" style={{ gap: 'var(--s2)' }}>
          קצב <input type="range" min={60} max={160} value={bpm} onChange={(e) => setBpm(+e.target.value)} aria-label="פעמות לדקה" />{' '}
          <span className="num">{bpm}</span>
        </label>
        <button className="btn ghost" onClick={() => setGrid(EMPTY)}>
          ניקוי
        </button>
        <button className="btn ghost" onClick={() => setGrid(DEMO)}>
          דוגמה
        </button>
      </div>
      <p className="xs muted">
        <span className="num">{density}</span> צלילים ב-<span className="num">16</span> צעדים. נסי: אותו דפוס, ותזיזי צליל אחד בצעד אחד. שימי לב כמה השינוי מורגש.
      </p>
    </div>
  );
}

/* ================= tempo tapper ================= */

/** Tap a steady beat; see your tempo and how even your taps are. */
export function Tapper({ color }: { color: string }) {
  const [taps, setTaps] = useState<number[]>([]);
  const [best, setBest] = useLocal<number | null>('merhav:tap-best', null);
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const ms = intervals.map((x) => x * 1000);
  const bpm = intervals.length ? 60 / mean(intervals) : 0;
  const spread = ms.length > 2 ? (sd(ms) / mean(ms)) * 100 : null;

  const tap = () => {
    click();
    const t = performance.now() / 1000;
    setTaps((cur) => (cur.length && t - cur[cur.length - 1] > 2.5 ? [t] : [...cur, t].slice(-17)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).dataset.tap) {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (spread !== null && ms.length >= 8 && (best === null || spread < best)) setBest(+spread.toFixed(1));
  }, [spread, ms.length, best, setBest]);

  const maxMs = Math.max(400, ...ms);
  return (
    <div className="lab">
      <button className="tap-pad" data-tap="1" onPointerDown={tap} aria-label="הקשה">
        הקישי כאן בקצב קבוע
      </button>
      <div className="tap-bars" aria-hidden>
        {ms.map((v, i) => (
          <span key={i} style={{ height: `${(v / maxMs) * 100}%`, background: color }} />
        ))}
      </div>
      <dl className="stat-row">
        <div>
          <dt>קצב</dt>
          <dd className="num">{bpm ? Math.round(bpm) : '–'}</dd>
        </div>
        <div>
          <dt>סטייה בין הקשות</dt>
          <dd className="num">{spread !== null ? `${spread.toFixed(1)}%` : '–'}</dd>
        </div>
        <div>
          <dt>השיא שלך</dt>
          <dd className="num">{best !== null ? `${best}%` : '–'}</dd>
        </div>
      </dl>
      <p className="xs muted">עמודות שוות בגובהן הן קצב יציב. מתחת ל-3% זו יציבות טובה מאוד. הפסקה של יותר משתי שניות מתחילה מדידה חדשה. השיא נמדד מ-8 מרווחים ומעלה.</p>
    </div>
  );
}
