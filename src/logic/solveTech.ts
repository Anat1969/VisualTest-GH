// Animated solutions for the technical types: play the learner's choice through and show where it breaks.
// Gears: the chosen motion of the last wheel is passed back along the train to the first wheel.
// Beam: the chosen load is hung and the beam tilts by the net moment.
// Paths: the body runs along the chosen path, and every bend is checked against the force acting on it.
// Water: the chosen surface is checked against the level and the volume. Pure math, no React.
import type { Item, P2, SceneSpec, SolveHint, TextSpec } from './types';

type Hint<K extends SolveHint['kind']> = Extract<SolveHint, { kind: K }>;
export const hintOf = <K extends SolveHint['kind']>(item: Item, kind: K): Hint<K> | null =>
  item.solve?.kind === kind ? (item.solve as Hint<K>) : null;

/* ---------------- gears ---------------- */

export interface TrainFit {
  /** per wheel, as implied by the chosen motion of the last wheel: direction (+1 clockwise) and speed */
  dir: number[];
  speed: number[];
  /** what the chosen option says about the last wheel */
  claimDir: number;
  claimFaster: boolean | null;
  claimTurns: number | null;
  /** real ratio: turns of the last wheel per turn of the first */
  ratio: number;
  dirOk: boolean;
  speedOk: boolean;
  same: boolean;
}

/** One step back along a link: the motion of wheel i from the motion of wheel i + 1. */
export function stepBack(link: string, teethA: number, teethB: number, dirB: number, speedB: number): { dir: number; speed: number } {
  if (link === 'shaft') return { dir: dirB, speed: speedB };
  const speed = (speedB * teethB) / teethA;
  return { dir: link === 'belt' ? dirB : -dirB, speed };
}

export function fitTrain(item: Item, target: number): TrainFit {
  const h = hintOf(item, 'train')!;
  const t = item.options[target].visual as TextSpec;
  const words = `${t.text} ${t.sub ?? ''}`;
  const claimDir = words.includes('נגד') ? -1 : 1;
  const claimTurns = h.turns ? parseFloat(t.text) : null;
  const claimFaster = h.turns ? null : words.includes('מהר');
  // the real ratio, walking forward
  let ratio = 1;
  h.links.forEach((l, i) => {
    if (l !== 'shaft') ratio *= h.wheels[i].teeth / h.wheels[i + 1].teeth;
  });
  // the claimed motion of the last wheel, at the speed the claim implies
  const n = h.wheels.length;
  const lastSpeed = claimTurns ?? (claimFaster === ratio > 1 ? ratio : 1 / ratio);
  const dir = Array.from({ length: n }, () => 0);
  const speed = Array.from({ length: n }, () => 0);
  dir[n - 1] = claimDir;
  speed[n - 1] = lastSpeed;
  for (let i = n - 2; i >= 0; i--) {
    const s = stepBack(h.links[i], h.wheels[i].teeth, h.wheels[i + 1].teeth, dir[i + 1], speed[i + 1]);
    dir[i] = s.dir;
    speed[i] = s.speed;
  }
  const dirOk = dir[0] === 1;
  const speedOk = Math.abs(speed[0] - 1) < 0.02;
  return { dir, speed, claimDir, claimFaster, claimTurns, ratio, dirOk, speedOk, same: dirOk && speedOk };
}

/* ---------------- balance beam ---------------- */

export interface BeamFit {
  loads: { pos: number; w: number; added: boolean }[];
  left: number;
  right: number;
  same: boolean;
}

export function fitBeam(item: Item, target: number): BeamFit {
  const h = hintOf(item, 'beam')!;
  const v = parseFloat((item.options[target].visual as TextSpec).text.replace(/[^\d.]/g, ''));
  const added = h.mode === 'weight' ? { pos: h.pos!, w: v, added: true } : { pos: v, w: h.w!, added: true };
  const loads = [...h.loads.map((l) => ({ ...l, added: false })), added];
  const left = loads.filter((l) => l.pos < 0).reduce((s, l) => s - l.pos * l.w, 0);
  const right = loads.filter((l) => l.pos > 0).reduce((s, l) => s + l.pos * l.w, 0);
  return { loads, left, right, same: Math.abs(left - right) < 1e-6 };
}

/* ---------------- paths after release ---------------- */

export type PathIssue = 'start' | 'kink' | 'bendsWithoutForce' | 'ignoresGravity' | 'bendsAgainstForce';

export interface PathFit {
  pts: P2[];
  /** per segment: fine, or what is wrong where it ends */
  pieces: { a: P2; b: P2; issue: PathIssue | null }[];
  issues: PathIssue[];
  same: boolean;
}

/** The dashed path of a path option. */
export const pathOf = (scene: SceneSpec): P2[] => {
  const p = scene.prims.find((q) => q.p === 'line' && q.dash && q.tone === 'accent');
  return p && p.p === 'line' ? p.pts : [];
};

const unit = (v: P2): P2 => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
const angleBetween = (a: P2, b: P2) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
const DEG = Math.PI / 180;

/** Resample to roughly even steps, so bends are measured the same way on every path. */
function resample(pts: P2[], step: number): P2[] {
  const out: P2[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

export function fitPath(item: Item, target: number): PathFit {
  const h = hintOf(item, 'path')!;
  const raw = pathOf(item.options[target].visual as SceneSpec);
  const pts = resample(raw, 4);
  const dirs = pts.slice(1).map((p, i) => unit([p[0] - pts[i][0], p[1] - pts[i][1]]));
  const issue: (PathIssue | null)[] = dirs.map(() => null);
  const down: P2 = [0, 1];

  // the first step: along the velocity at release, or straight down from rest
  const startDir = h.v0 ? unit(h.v0) : h.force === 'down' ? down : null;
  if (startDir && angleBetween(dirs[0], startDir) > 14 * DEG) issue[0] = 'start';

  // corners in the drawn path (before resampling) are sudden changes of direction: no force does that
  const corner = new Set<number>();
  for (let i = 1; i < raw.length - 1; i++) {
    const a = unit([raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]]);
    const b = unit([raw[i + 1][0] - raw[i][0], raw[i + 1][1] - raw[i][1]]);
    if (angleBetween(a, b) > 25 * DEG) corner.add(i);
  }
  let walked = 0;
  const cornerAt: number[] = [];
  for (let i = 1; i < raw.length; i++) {
    walked += Math.max(1, Math.round(Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]) / 4));
    if (corner.has(i)) cornerAt.push(walked);
  }
  for (const k of cornerAt) if (k - 1 < issue.length) issue[Math.max(0, k - 1)] ??= 'kink';

  // every bend must point toward the force; with no force, no bend; under gravity, a straight run must be vertical
  const W = 3; // compare directions a few steps apart, so the measure is not drowned by resampling
  for (let i = 0; i < dirs.length; i++) {
    if (issue[i]) continue;
    const a = dirs[Math.max(0, i - W)], b = dirs[Math.min(dirs.length - 1, i + W)];
    const turn = angleBetween(a, b);
    if (h.force === 'none') {
      if (turn > 3 * DEG) issue[i] = 'bendsWithoutForce';
      continue;
    }
    const d = dirs[i];
    // gravity's pull across the motion
    const along = down[0] * d[0] + down[1] * d[1];
    const gp: P2 = [down[0] - along * d[0], down[1] - along * d[1]];
    const gpl = Math.hypot(gp[0], gp[1]);
    if (turn < 1 * DEG) {
      if (gpl > 0.25) issue[i] = 'ignoresGravity';
      continue;
    }
    const acc: P2 = [b[0] - a[0], b[1] - a[1]];
    if (gpl > 0.05 && acc[0] * gp[0] + acc[1] * gp[1] < 0) issue[i] = 'bendsAgainstForce';
  }
  const pieces = dirs.map((_, i) => ({ a: pts[i], b: pts[i + 1], issue: issue[i] }));
  const issues = [...new Set(issue.filter((x): x is PathIssue => !!x))];
  return { pts, pieces, issues, same: issues.length === 0 };
}

/* ---------------- water in a tilted glass ---------------- */

export interface WaterFit {
  water: P2[];
  /** the free surface: the edge of the water that is not on the glass */
  surface: [P2, P2];
  /** its angle from the horizontal, degrees */
  tilt: number;
  /** share of the glass filled, against the share before tilting */
  fill: number;
  levelOk: boolean;
  volumeOk: boolean;
  same: boolean;
}

const area = (p: P2[]) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;

function onGlassEdge(glass: P2[], a: P2, b: P2) {
  return glass.some((g, i) => {
    const h = glass[(i + 1) % glass.length];
    const ex = h[0] - g[0], ey = h[1] - g[1];
    const l = Math.hypot(ex, ey);
    const off = (p: P2) => Math.abs((p[0] - g[0]) * ey - (p[1] - g[1]) * ex) / l;
    return off(a) < 0.05 && off(b) < 0.05;
  });
}

export function fitWater(item: Item, target: number): WaterFit {
  const h = hintOf(item, 'water')!;
  const rot = (p: P2): P2 => {
    const x = p[0] - h.c[0], y = p[1] - h.c[1];
    return [h.c[0] + x * Math.cos(h.tilt) - y * Math.sin(h.tilt), h.c[1] + x * Math.sin(h.tilt) + y * Math.cos(h.tilt)];
  };
  const glass = h.glass.map(rot);
  const scene = item.options[target].visual as SceneSpec;
  const w = scene.prims.find((p) => p.p === 'line' && p.fill === 'water');
  const water = w && w.p === 'line' ? w.pts : [];
  let surface: [P2, P2] = [water[0], water[1]];
  for (let i = 0; i < water.length; i++) {
    const a = water[i], b = water[(i + 1) % water.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1 && !onGlassEdge(glass, a, b)) surface = [a, b];
  }
  const ang = Math.atan2(surface[1][1] - surface[0][1], surface[1][0] - surface[0][0]) / DEG;
  const tilt = Math.min(Math.abs(ang) % 180, 180 - (Math.abs(ang) % 180));
  const fill = area(water) / area(glass);
  const levelOk = tilt < 1.5;
  const volumeOk = Math.abs(fill - h.fill) < 0.04;
  return { water, surface, tilt, fill, levelOk, volumeOk, same: levelOk && volumeOk };
}
