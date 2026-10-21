import { add, cross, scale } from '../../logic/geometry';
import { SLOT_NORMALS } from '../../logic/cubeNet';
import type { CubeSlot, CubeViewSpec, V3 } from '../../logic/types';
import { FacePattern } from './FacePattern';
import { CAM_CUBE, lightness, project, shade } from './projection';

/** A face drawn as an affine image of the unit square (exact under orthographic projection). */
export function AffineFace({ center, right, up, slot, normal }: { center: V3; right: V3; up: V3; slot: CubeSlot; normal: V3 }) {
  const [ex, ey] = project(CAM_CUBE, center);
  const [rx, ry] = project(CAM_CUBE, right);
  const [ux, uy] = project(CAM_CUBE, up);
  return (
    <g transform={`matrix(${rx} ${ry} ${-ux} ${-uy} ${ex} ${ey})`}>
      <FacePattern face={slot.face} fill={shade(slot.face.color, lightness(normal))} />
    </g>
  );
}

export function CubeView({ spec, label }: { spec: CubeViewSpec; label?: string }) {
  const slots = (['top', 'front', 'right'] as const).map((s) => {
    const n = SLOT_NORMALS[s];
    const slot = spec[s];
    const up = slot.up;
    const right = cross(up, n);
    return { s, n, slot, up, right, center: add([0, 0, 0], scale(n, 0.5)) };
  });
  return (
    <svg viewBox="-1.25 -1.25 2.5 2.5" role="img" aria-label={label ?? 'קובייה'} className="stim-svg">
      {slots.map((x) => (
        <AffineFace key={x.s} center={x.center} right={x.right} up={x.up} slot={x.slot} normal={x.n} />
      ))}
    </svg>
  );
}
