// Orthographic camera + consistent light for all 3D stimuli.
import { cross, dot, norm } from './geometry';
import type { V3 } from './types';

export interface Camera {
  c: V3; // toward viewer
  R: V3; // screen right
  U: V3; // screen up
}

export function camera(dir: V3): Camera {
  const c = norm(dir);
  const R = norm(cross([0, 0, 1], c));
  const U = cross(c, R);
  return { c, R, U };
}

export const CAM_SHAPES = camera([1, -1.35, 0.95]);
export const CAM_CUBE = camera([1, -1, 0.9]);
export const CAM_FOLD = camera([0.55, -1.25, 1.45]);

/** Light from top-right-front: same direction as the CSS shadows. */
const LIGHT = norm([0.45, -0.35, 1]);

export const project = (cam: Camera, p: V3): [number, number] => [dot(p, cam.R), -dot(p, cam.U)];
export const depth = (cam: Camera, p: V3) => dot(p, cam.c);
export const lightness = (n: V3) => 0.56 + 0.46 * Math.max(0, dot(norm(n), LIGHT));

export function shade(hex: string, f: number): string {
  const v = parseInt(hex.slice(1), 16);
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => Math.max(0, Math.min(255, Math.round(x * f))));
  return `rgb(${ch.join(',')})`;
}

export const pts = (list: [number, number][]) => list.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
