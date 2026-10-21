import type { Poly2DSpec } from '../../logic/types';

/** Polyomino drawn around its own centre, rotated clockwise by `angle`. */
export function Poly2D({ spec, label }: { spec: Poly2DSpec; label?: string }) {
  const xs = spec.cells.map((c) => c[0]);
  const ys = spec.cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
  return (
    <svg viewBox="-3.4 -3.4 6.8 6.8" role="img" aria-label={label ?? 'צורה דו-ממדית'} className="stim-svg">
      <g transform={`rotate(${spec.angle}) scale(${spec.mirror ? -1 : 1} 1) translate(${-cx} ${-cy})`}>
        {spec.cells.map(([x, y]) => (
          <rect
            key={`${x},${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="var(--stim)"
            stroke="var(--ink)"
            strokeWidth={0.06}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}
