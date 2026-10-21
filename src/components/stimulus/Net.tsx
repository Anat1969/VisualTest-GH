import { useMemo } from 'react';
import { foldNet } from '../../logic/cubeNet';
import { dot } from '../../logic/geometry';
import type { NetSpec } from '../../logic/types';
import { FacePattern } from './FacePattern';
import { CAM_FOLD, depth, lightness, project, pts, shade } from './projection';

/** Flat net, drawn top-down. */
export function NetFlat({ spec }: { spec: NetSpec }) {
  const xs = spec.cells.map((c) => c[0]);
  const ys = spec.cells.map((c) => c[1]);
  const w = Math.max(...xs) + 1;
  const h = Math.max(...ys) + 1;
  const pad = 0.35;
  return (
    <svg viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} role="img" aria-label="פריסת קובייה" className="stim-svg net">
      {spec.cells.map(([x, y], id) => (
        <g key={id} transform={`translate(${x + 0.5} ${y + 0.5})`}>
          <FacePattern face={spec.faces[id]} />
        </g>
      ))}
      {spec.highlight !== undefined && (
        <rect
          x={spec.cells[spec.highlight][0] + 0.04}
          y={spec.cells[spec.highlight][1] + 0.04}
          width={0.92}
          height={0.92}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={0.09}
          strokeDasharray="0.12 0.07"
        />
      )}
    </svg>
  );
}

/** Net folding in 3D at fraction t. Back sides render as plain paper. */
export function NetFolding({ spec, t }: { spec: NetSpec; t: number }) {
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const tt of [0, 0.25, 0.5, 0.75, 1])
      for (const f of foldNet(spec.cells, spec.root, tt))
        for (const c of f.corners) {
          const [x, y] = project(CAM_FOLD, c);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    const pad = 0.3;
    return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
  }, [spec]);

  const faces = foldNet(spec.cells, spec.root, t).sort((a, b) => depth(CAM_FOLD, a.center) - depth(CAM_FOLD, b.center));
  return (
    <svg viewBox={bounds} role="img" aria-label="פריסה מתקפלת לקובייה" className="stim-svg net">
      {faces.map((f) => {
        const front = dot(f.normal, CAM_FOLD.c) > 0;
        if (!front)
          return (
            <polygon
              key={f.id}
              points={pts(f.corners.map((c) => project(CAM_FOLD, c)))}
              fill={shade('#E9E3D6', lightness([-f.normal[0], -f.normal[1], -f.normal[2]]))}
              stroke="#1F2A37"
              strokeWidth={0.035}
            />
          );
        const [ex, ey] = project(CAM_FOLD, f.center);
        const [rx, ry] = project(CAM_FOLD, f.right);
        const [ux, uy] = project(CAM_FOLD, f.up);
        const look = spec.faces[f.id];
        return (
          <g key={f.id} transform={`matrix(${rx} ${ry} ${-ux} ${-uy} ${ex} ${ey})`}>
            <FacePattern face={look} fill={shade(look.color, lightness(f.normal))} />
            {spec.highlight === f.id && (
              <rect x={-0.46} y={-0.46} width={0.92} height={0.92} fill="none" stroke="#1F2A37" strokeWidth={0.09} strokeDasharray="0.12 0.07" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
