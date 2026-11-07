// Animated solution for cube-net items: which cube orientation shows the chosen option, and does it match.
// Pure math, no React.
import { CUBE_ROTATIONS, mulV } from './geometry';
import { cubeFrames, oppositeOf, orientIndex, viewFor } from './cubeNet';
import type { CubeViewSpec, FaceLook, M3, NetSpec, V3 } from './types';

export type Slot = 'top' | 'front' | 'right';
export const SLOTS: Slot[] = ['top', 'front', 'right'];

const same = (a: V3, b: V3) => a.every((v, i) => Math.round(v) === Math.round(b[i]));
const sameLook = (a: FaceLook, b: FaceLook) => a.color === b.color && a.mark === b.mark && a.letter === b.letter;

export interface CubeFit {
  rot: M3;
  /** per visible slot: does the folded cube show what the option shows there */
  ok: Record<Slot, boolean>;
  same: boolean;
}

/** The cube rotation that shows the option best, and which of its three faces match. */
export function fitCubeView(net: NetSpec, view: CubeViewSpec, oriented: boolean): CubeFit {
  const frames = cubeFrames(net.cells, net.root);
  let best: CubeFit | null = null;
  let bestN = -1;
  for (const rot of CUBE_ROTATIONS) {
    const v = viewFor(frames, rot);
    const ok = Object.fromEntries(
      SLOTS.map((s) => {
        const want = view[s];
        const has = net.faces[v[s].id];
        const looks = sameLook(has, want.face);
        const turned = !oriented || orientIndex(s, v[s].up) === orientIndex(s, want.up);
        return [s, looks && turned];
      }),
    ) as Record<Slot, boolean>;
    const n = SLOTS.filter((s) => ok[s]).length;
    if (n > bestN) {
      bestN = n;
      best = { rot, ok, same: n === 3 };
    }
  }
  return best!;
}

export interface OppositeFit {
  rot: M3;
  /** the chosen face is the one opposite the marked face */
  same: boolean;
}

/** Marked face toward the viewer (front); an adjacent chosen face on top, an opposite one hidden at the back. */
export function fitOpposite(net: NetSpec, marked: number, chosen: number): OppositeFit {
  const frames = cubeFrames(net.cells, net.root);
  const opposite = oppositeOf(frames, marked) === chosen;
  const rot =
    CUBE_ROTATIONS.find(
      (r) => same(mulV(r, frames[marked].normal), [0, -1, 0]) && (opposite || same(mulV(r, frames[chosen].normal), [0, 0, 1])),
    ) ?? CUBE_ROTATIONS[0];
  return { rot, same: opposite };
}
