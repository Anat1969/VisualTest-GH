import { dot2, reflect2 } from '../../logic/geometry';
import { SQUARE, foldSteps } from '../../logic/paper';
import type { P2, PaperFold, PaperHolesSpec, PaperStepsSpec } from '../../logic/types';
import { pts } from './projection';

const S = 100;
const sc = (p: P2): [number, number] => [p[0] * S, p[1] * S];
const VB = '-14 -14 128 128';

function FoldLine({ fold, region }: { fold: PaperFold; region: P2[] }) {
  // line segment clipped to the region's extent along the fold direction
  const t: P2 = [-fold.n[1], fold.n[0]];
  const proj = region.map((p) => dot2(t, p));
  const a = Math.min(...proj);
  const b = Math.max(...proj);
  const base: P2 = [fold.n[0] * fold.c, fold.n[1] * fold.c];
  const p1 = sc([base[0] + t[0] * a, base[1] + t[1] * a]);
  const p2 = sc([base[0] + t[0] * b, base[1] + t[1] * b]);
  return <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="var(--bad)" strokeWidth={1.6} strokeDasharray="5 4" />;
}

function FoldArrow({ flap, fold }: { flap: P2[]; fold: PaperFold }) {
  const c: P2 = [flap.reduce((s, p) => s + p[0], 0) / flap.length, flap.reduce((s, p) => s + p[1], 0) / flap.length];
  const to = reflect2(c, fold.n, fold.c);
  const [x1, y1] = sc(c);
  const [x2, y2] = sc([c[0] + (to[0] - c[0]) * 0.82, c[1] + (to[1] - c[1]) * 0.82]);
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.25;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const h = 6;
  const head = [
    [x2, y2],
    [x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45)],
    [x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45)],
  ] as [number, number][];
  return (
    <g stroke="var(--ink)" strokeWidth={1.4} fill="none">
      <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} />
      <polygon points={pts(head)} fill="var(--ink)" />
    </g>
  );
}

const Ghost = () => (
  <polygon points={pts(SQUARE.map(sc))} fill="none" stroke="var(--line-strong)" strokeWidth={0.8} strokeDasharray="2 3" />
);

export function PaperSteps({ spec }: { spec: PaperStepsSpec }) {
  const steps = foldSteps(spec.folds);
  const final = steps[steps.length - 1].kept;
  return (
    <div className="paper-steps" role="img" aria-label="שלבי הקיפול והניקוב">
      {steps.map((s, i) => (
        <figure key={i} className="paper-step">
          <svg viewBox={VB} className="stim-svg">
            <Ghost />
            <polygon points={pts(s.kept.map(sc))} fill="#FBF9F4" stroke="var(--ink)" strokeWidth={1.2} />
            <polygon points={pts(s.flap.map(sc))} fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth={1.2} />
            <FoldLine fold={s.fold} region={s.before} />
            <FoldArrow flap={s.flap} fold={s.fold} />
          </svg>
          <figcaption>קיפול {i + 1}</figcaption>
        </figure>
      ))}
      <figure className="paper-step">
        <svg viewBox={VB} className="stim-svg">
          <Ghost />
          <polygon points={pts(final.map(sc))} fill="var(--surface-sunk)" stroke="var(--ink)" strokeWidth={1.2} />
          {spec.punches.map((p, i) => {
            const [x, y] = sc(p);
            return <circle key={i} cx={x} cy={y} r={4.2} fill="var(--ink)" />;
          })}
        </svg>
        <figcaption>ניקוב</figcaption>
      </figure>
    </div>
  );
}

export function PaperHoles({ spec, label }: { spec: PaperHolesSpec; label?: string }) {
  return (
    <svg viewBox={VB} role="img" aria-label={label ?? `דף פתוח עם ${spec.holes.length} חורים`} className="stim-svg">
      <polygon points={pts(SQUARE.map(sc))} fill="#FBF9F4" stroke="var(--ink)" strokeWidth={1.2} />
      {[0.25, 0.5, 0.75].map((v) => (
        <g key={v} stroke="var(--line)" strokeWidth={0.6}>
          <line x1={v * S} y1={0} x2={v * S} y2={S} />
          <line x1={0} y1={v * S} x2={S} y2={v * S} />
        </g>
      ))}
      {spec.holes.map((p, i) => {
        const [x, y] = sc(p);
        return <circle key={i} cx={x} cy={y} r={4.2} fill="var(--ink)" />;
      })}
    </svg>
  );
}

/** One frame of the folding animation: folds 0..k-1 done, fold k at fraction t (0..1). */
export function PaperFrame({ spec, k, t, punched }: { spec: PaperStepsSpec; k: number; t: number; punched: boolean }) {
  const steps = foldSteps(spec.folds);
  const s = steps[Math.min(k, steps.length - 1)];
  const done = k >= steps.length;
  const region = done ? s.kept : s.before;
  const flap = done
    ? []
    : s.flap.map((p) => {
        const d = dot2(s.fold.n, p) - s.fold.c;
        const m = d * (1 - Math.cos(Math.PI * t));
        return [p[0] - m * s.fold.n[0], p[1] - m * s.fold.n[1]] as P2;
      });
  return (
    <svg viewBox={VB} className="stim-svg" role="img" aria-label="הנפשת קיפול">
      <Ghost />
      <polygon points={pts((done ? region : s.kept).map(sc))} fill="#FBF9F4" stroke="var(--ink)" strokeWidth={1.2} />
      {!done && (
        <polygon
          points={pts(flap.map(sc))}
          fill={t > 0.5 ? 'var(--accent-soft)' : '#FBF9F4'}
          stroke="var(--ink)"
          strokeWidth={1.2}
          opacity={0.95}
        />
      )}
      {!done && <FoldLine fold={s.fold} region={s.before} />}
      {punched &&
        spec.punches.map((p, i) => {
          const [x, y] = sc(p);
          return <circle key={i} cx={x} cy={y} r={4.2} fill="var(--ink)" />;
        })}
    </svg>
  );
}
