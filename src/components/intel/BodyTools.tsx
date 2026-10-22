import { useEffect, useMemo, useRef, useState } from 'react';
import { clickAt, now } from '../../logic/synth';
import { mean, useLocal } from './local';

/* ================= timing: tap with a metronome ================= */

/** A metronome plays; tap on the beat. Each tap is placed on a line: early, on time, late. */
export function TimingLab({ color }: { color: string }) {
  const [bpm, setBpm] = useState(90);
  const [running, setRunning] = useState(false);
  const [errs, setErrs] = useState<number[]>([]);
  const [best, setBest] = useLocal<number | null>('merhav:timing-best', null);
  const t0 = useRef(0);
  const period = 60 / bpm;

  useEffect(() => {
    if (!running) return;
    let beat = 0;
    t0.current = now() + 0.3;
    let timer = 0;
    const loop = () => {
      while (t0.current + beat * period < now() + 0.1) {
        clickAt(t0.current + beat * period, beat % 4 === 0);
        beat++;
      }
      timer = window.setTimeout(loop, 25);
    };
    loop();
    return () => clearTimeout(timer);
  }, [running, period]);

  const tap = () => {
    if (!running) return;
    const t = now() - t0.current;
    const nearest = Math.round(t / period);
    if (nearest < 1) return;
    setErrs((e) => [...e, (t - nearest * period) * 1000].slice(-24));
  };
  const absMean = errs.length ? mean(errs.map(Math.abs)) : null;
  const bias = errs.length ? mean(errs) : null;
  useEffect(() => {
    if (!running && absMean !== null && errs.length >= 12 && (best === null || absMean < best)) setBest(Math.round(absMean));
  }, [running, absMean, errs.length, best, setBest]);

  const W = 120;
  return (
    <div className="lab">
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            if (!running) setErrs([]);
            setRunning(!running);
          }}
        >
          {running ? 'עצירה' : 'התחלה'}
        </button>
        <label className="small row" style={{ gap: 'var(--s2)' }}>
          קצב <input type="range" min={60} max={140} value={bpm} disabled={running} onChange={(e) => setBpm(+e.target.value)} aria-label="פעמות לדקה" />
          <span className="num">{bpm}</span>
        </label>
      </div>
      <button className="tap-pad" onPointerDown={tap} disabled={!running} aria-label="הקשה על הפעמה">
        {running ? 'הקישי על כל פעמה' : 'התחילי, ואז הקישי'}
      </button>
      <svg className="timing-line" viewBox={`${-W} -14 ${W * 2} 30`} aria-label="פיזור ההקשות סביב הפעמה" style={{ direction: 'ltr' }}>
        <line x1={-W} y1="0" x2={W} y2="0" stroke="var(--line-strong)" />
        <line x1="0" y1="-10" x2="0" y2="10" stroke="var(--ink)" strokeWidth="1.5" />
        <text x={-W + 4} y="13" fontSize="7" fill="var(--ink-3)">
          מוקדם
        </text>
        <text x={W - 4} y="13" fontSize="7" fill="var(--ink-3)" textAnchor="end">
          מאוחר
        </text>
        {errs.map((e, i) => (
          <circle key={i} cx={Math.max(-W + 3, Math.min(W - 3, e))} cy={-4 + (i % 3) * 4} r="2.6" fill={color} opacity={0.35 + (0.65 * (i + 1)) / errs.length} />
        ))}
      </svg>
      <dl className="stat-row">
        <div>
          <dt>סטייה ממוצעת</dt>
          <dd className="num">{absMean !== null ? `${Math.round(absMean)} ms` : '–'}</dd>
        </div>
        <div>
          <dt>נטייה</dt>
          <dd>{bias === null ? '–' : Math.abs(bias) < 10 ? 'מאוזנת' : bias < 0 ? `מקדימה (${Math.round(-bias)} ms)` : `מאחרת (${Math.round(bias)} ms)`}</dd>
        </div>
        <div>
          <dt>השיא שלך</dt>
          <dd className="num">{best !== null ? `${best} ms` : '–'}</dd>
        </div>
      </dl>
      <p className="xs muted">רוב האנשים מקדימים מעט את הפעמה. שיא נרשם אחרי 12 הקשות ועצירה. כדאי לנסות גם בעיניים עצומות.</p>
    </div>
  );
}

/* ================= path tracing ================= */

type P = [number, number];

function curve(seed: number): P[] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const a = [r(), r(), r()].map((x) => 0.6 + x * 1.6);
  const ph = [r(), r(), r()].map((x) => x * 6.28);
  return Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    const x = 20 + t * 260;
    const y = 100 + 34 * Math.sin(a[0] * t * 6.28 + ph[0]) + 16 * Math.sin(a[1] * t * 12.5 + ph[1]) + 8 * Math.sin(a[2] * t * 19 + ph[2]);
    return [x, y];
  });
}

const distTo = (pts: P[], p: P) => Math.min(...pts.map(([x, y]) => Math.hypot(x - p[0], y - p[1])));

/** Follow a curve with finger or mouse in one stroke. Measured: average distance and how much of it you covered. */
export function TraceLab({ color }: { color: string }) {
  const [seed, setSeed] = useState(7);
  const target = useMemo(() => curve(seed), [seed]);
  const [stroke, setStroke] = useState<P[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [best, setBest] = useLocal<number | null>('merhav:trace-best', null);
  const svg = useRef<SVGSVGElement>(null);

  const at = (e: React.PointerEvent): P => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 200];
  };
  const result = useMemo(() => {
    if (stroke.length < 10 || drawing) return null;
    const err = mean(stroke.map((p) => distTo(target, p)));
    const covered = target.filter((t) => stroke.some((p) => Math.hypot(p[0] - t[0], p[1] - t[1]) < 8)).length / target.length;
    const score = Math.round(Math.max(0, 100 - err * 6) * covered);
    return { err, covered, score };
  }, [stroke, drawing, target]);
  useEffect(() => {
    if (result && (best === null || result.score > best)) setBest(result.score);
  }, [result, best, setBest]);

  const d = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <div className="lab">
      <svg
        ref={svg}
        className="trace-box"
        viewBox="0 0 300 200"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setStroke([at(e)]);
          setDrawing(true);
        }}
        onPointerMove={(e) => drawing && setStroke((s) => [...s, at(e)])}
        onPointerUp={() => setDrawing(false)}
        aria-label="משטח המעקב"
      >
        <path d={d(target)} fill="none" stroke="var(--line-strong)" strokeWidth="9" strokeLinecap="round" opacity="0.5" />
        <path d={d(target)} fill="none" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={target[0][0]} cy={target[0][1]} r="5" fill="var(--ok)" />
        {stroke.length > 1 && <path d={d(stroke)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <dl className="stat-row">
        <div>
          <dt>ציון</dt>
          <dd className="num">{result ? result.score : '–'}</dd>
        </div>
        <div>
          <dt>מרחק ממוצע</dt>
          <dd className="num">{result ? result.err.toFixed(1) : '–'}</dd>
        </div>
        <div>
          <dt>כיסוי</dt>
          <dd className="num">{result ? `${Math.round(result.covered * 100)}%` : '–'}</dd>
        </div>
        <div>
          <dt>השיא שלך</dt>
          <dd className="num">{best ?? '–'}</dd>
        </div>
      </dl>
      <div className="row">
        <button className="btn" onClick={() => setStroke([])}>
          ניסיון חוזר
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setSeed((s) => (s * 48271) % 2147483647);
            setStroke([]);
          }}
        >
          קו חדש
        </button>
      </div>
      <p className="xs muted">מתחילים בנקודה הירוקה ועוברים לאורך כל הקו בתנועה אחת. מהירות לא נמדדת: דיוק קודם, מהירות אחר כך.</p>
    </div>
  );
}
