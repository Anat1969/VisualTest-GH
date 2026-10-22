import { add, dot, mulV, scale } from '../../logic/geometry';
import type { Cubes3DSpec, M3, V3 } from '../../logic/types';
import { CAM_SHAPES, depth, lightness, project, pts, shade } from './projection';

const DIRS: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function faceAxes(d: V3): [V3, V3] {
  if (d[0]) return [[0, 1, 0], [0, 0, 1]];
  if (d[1]) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

/** Shepard–Metzler figure, painter's order (far cubes first), hidden inner faces skipped. */
export function Cubes3D({ spec, rot, label }: { spec: Cubes3DSpec; rot?: M3; label?: string }) {
  const R = rot ?? spec.rot;
  const cam = CAM_SHAPES;
  const set = new Set(spec.cubes.map((c) => c.map((v) => Math.round(v * 2)).join(',')));
  const has = (p: V3) => set.has(p.map((v) => Math.round(v * 2)).join(','));
  const radius = Math.max(...spec.cubes.map((c) => Math.hypot(c[0], c[1], c[2]))) + 0.9;

  const cubes = spec.cubes
    .map((c) => ({ c, w: mulV(R, c) }))
    .sort((a, b) => depth(cam, a.w) - depth(cam, b.w));

  const polys: { key: string; points: string; fill: string }[] = [];
  for (const { c } of cubes) {
    for (const d of DIRS) {
      if (has(add(c, d))) continue;
      const n = mulV(R, d);
      if (dot(n, cam.c) <= 1e-6) continue;
      const [e1, e2] = faceAxes(d);
      const center = add(c, scale(d, 0.5));
      const corners = [
        add(add(center, scale(e1, -0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, -0.5)),
        add(add(center, scale(e1, 0.5)), scale(e2, 0.5)),
        add(add(center, scale(e1, -0.5)), scale(e2, 0.5)),
      ].map((p) => project(cam, mulV(R, p)));
      polys.push({ key: `${c.join(',')}|${d.join(',')}`, points: pts(corners), fill: shade('#9DB0C4', lightness(n)) });
    }
  }
  const r = Math.max(2.6, radius) + (spec.front ? 0.6 : 0);
  // fixed "front" arrow on the ground, in world space, so it stays put while the building turns
  const zFloor = Math.min(...spec.cubes.map((c) => c[2])) - 0.5;
  const a1 = project(cam, [0, -radius - 0.4, zFloor]);
  const a2 = project(cam, [0, -radius + 0.5, zFloor]);
  const ang = Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);
  const head = [a2, [a2[0] - 0.32 * Math.cos(ang - 0.45), a2[1] - 0.32 * Math.sin(ang - 0.45)], [a2[0] - 0.32 * Math.cos(ang + 0.45), a2[1] - 0.32 * Math.sin(ang + 0.45)]] as [number, number][];
  return (
    <svg viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} role="img" aria-label={label ?? 'צורה תלת-ממדית מקוביות'} className="stim-svg">
      {spec.front && (
        <g>
          <line x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} stroke="var(--bad)" strokeWidth={0.07} />
          <polygon points={pts(head)} fill="var(--bad)" />
          <text x={a1[0]} y={a1[1] + 0.35} fontSize={0.36} fontWeight={700} textAnchor="middle" fill="var(--bad)">
            חזית
          </text>
        </g>
      )}
      {polys.map((p) => (
        <polygon key={p.key} points={p.points} fill={p.fill} stroke="var(--ink)" strokeWidth={0.045} strokeLinejoin="round" />
      ))}
    </svg>
  );
}
