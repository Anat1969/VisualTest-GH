// Convex solids, plane sections and shape signatures (for "which shape is the cross-section").
import { CAM_SHAPES, depth, lightness, project, shade } from './camera';
import { add, cross, dot, norm, scale, sub } from './geometry';
import type { P2, Prim, V3 } from './types';

export type SolidName = 'cube' | 'box' | 'triPrism' | 'pyramid' | 'cylinder' | 'cone';

export interface Solid {
  name: SolidName;
  verts: V3[];
  faces: number[][];
  curved: boolean;
}

export const SOLID_LABEL: Record<SolidName, string> = {
  cube: 'קובייה',
  box: 'תיבה',
  triPrism: 'מנסרה משולשת',
  pyramid: 'פירמידה',
  cylinder: 'גליל',
  cone: 'חרוט',
};

const RING = 36;

export function makeSolid(name: SolidName): Solid {
  const boxOf = (a: number, b: number, c: number): Solid => ({
    name,
    curved: false,
    verts: [
      [-a, -b, -c], [a, -b, -c], [a, b, -c], [-a, b, -c],
      [-a, -b, c], [a, -b, c], [a, b, c], [-a, b, c],
    ],
    faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
  });
  switch (name) {
    case 'cube':
      return boxOf(1, 1, 1);
    case 'box':
      return boxOf(1.45, 0.85, 0.7);
    case 'triPrism': {
      const tri: [number, number][] = [[-1, -0.8], [1, -0.8], [0, 0.95]];
      const verts: V3[] = [...tri.map(([y, z]) => [-1.3, y, z] as V3), ...tri.map(([y, z]) => [1.3, y, z] as V3)];
      return { name, curved: false, verts, faces: [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]] };
    }
    case 'pyramid':
      return {
        name,
        curved: false,
        verts: [[-1, -1, -0.9], [1, -1, -0.9], [1, 1, -0.9], [-1, 1, -0.9], [0, 0, 1.1]],
        faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
      };
    case 'cylinder': {
      const ring = (z: number) => Array.from({ length: RING }, (_, i) => [Math.cos((2 * Math.PI * i) / RING), Math.sin((2 * Math.PI * i) / RING), z] as V3);
      const verts = [...ring(-1.1), ...ring(1.1)];
      const faces = [
        Array.from({ length: RING }, (_, i) => i),
        Array.from({ length: RING }, (_, i) => RING + i),
        ...Array.from({ length: RING }, (_, i) => [i, (i + 1) % RING, RING + ((i + 1) % RING), RING + i]),
      ];
      return { name, curved: true, verts, faces };
    }
    case 'cone': {
      const base = Array.from({ length: RING }, (_, i) => [1.1 * Math.cos((2 * Math.PI * i) / RING), 1.1 * Math.sin((2 * Math.PI * i) / RING), -0.9] as V3);
      const verts: V3[] = [...base, [0, 0, 1.25]];
      const faces = [Array.from({ length: RING }, (_, i) => i), ...Array.from({ length: RING }, (_, i) => [i, (i + 1) % RING, RING])];
      return { name, curved: true, verts, faces };
    }
  }
}

const centroid3 = (pts: V3[]) => scale(pts.reduce((a, b) => add(a, b), [0, 0, 0]), 1 / pts.length);

function outwardNormal(s: Solid, face: number[]): V3 {
  const [a, b, c] = face.map((i) => s.verts[i]);
  let n = norm(cross(sub(b, a), sub(c, a)));
  const fc = centroid3(face.map((i) => s.verts[i]));
  if (dot(n, sub(fc, centroid3(s.verts))) < 0) n = scale(n, -1);
  return n;
}

export interface Plane {
  n: V3; // unit
  d: number; // n·p = d
}

/** In-plane basis (u, v). */
export function planeBasis(n: V3): [V3, V3] {
  const ref: V3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(ref, n));
  return [u, cross(n, u)];
}

function hull(points: P2[]): P2[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 1e-9) lower.pop();
    lower.push(q);
  }
  const upper: P2[] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 1e-9) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function edgesOf(s: Solid): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const f of s.faces)
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push([a, b]);
      }
    }
  return out;
}

/** Section polygon: in-plane 2D coords and the 3D points (for drawing on the solid). */
export function section(s: Solid, pl: Plane): { poly: P2[]; pts3: V3[] } {
  const [u, v] = planeBasis(pl.n);
  const pts: V3[] = [];
  for (const [a, b] of edgesOf(s)) {
    const A = s.verts[a];
    const B = s.verts[b];
    const fa = dot(pl.n, A) - pl.d;
    const fb = dot(pl.n, B) - pl.d;
    if (Math.abs(fa) < 1e-9) pts.push(A);
    if (fa * fb < 0) pts.push(add(A, scale(sub(B, A), fa / (fa - fb))));
  }
  const poly2 = hull(pts.map((p) => [dot(p, u), dot(p, v)] as P2));
  const pts3 = poly2.map(([x, y]) => add(add(scale(pl.n, pl.d), scale(u, x)), scale(v, y)));
  return { poly: poly2, pts3 };
}

export function polyArea(poly: P2[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

export function support(s: Solid, n: V3): [number, number] {
  const vals = s.verts.map((p) => dot(n, p));
  return [Math.min(...vals), Math.max(...vals)];
}

/* ---------- shape signature ---------- */

/** Remove near-duplicate and collinear vertices. */
function simplify(poly: P2[]): P2[] {
  let p = poly.filter((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-3;
  });
  let changed = true;
  while (changed && p.length > 3) {
    changed = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length];
      const b = p[i];
      const c = p[(i + 1) % p.length];
      const cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      if (cr < 1e-6) {
        p = p.filter((_, j) => j !== i);
        changed = true;
        break;
      }
    }
  }
  return p;
}

/** Centre, scale to unit radius and rotate the principal axis to horizontal. */
export function normalizeShape(poly: P2[]): P2[] {
  const p = simplify(poly);
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
  const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
  const c = p.map(([x, y]) => [x - cx, y - cy] as P2);
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of c) {
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const r = c.map(([x, y]) => [x * Math.cos(-ang) - y * Math.sin(-ang), x * Math.sin(-ang) + y * Math.cos(-ang)] as P2);
  const m = Math.max(...r.map(([x, y]) => Math.hypot(x, y)));
  return r.map(([x, y]) => [x / m, y / m] as P2);
}

export interface Signature {
  n: number; // vertex count, 99 = curved
  straight: number; // long straight edges (curved shapes)
  aspect: number;
  edges: number[];
}

export function signature(poly: P2[]): Signature {
  const p = normalizeShape(poly);
  const lens = p.map((a, i) => {
    const b = p[(i + 1) % p.length];
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  });
  const per = lens.reduce((a, b) => a + b, 0);
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const aspect = (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs));
  const curved = p.length > 8;
  return {
    n: curved ? 99 : p.length,
    straight: lens.filter((l) => l / per > 0.12).length,
    aspect,
    edges: curved ? [] : lens.map((l) => l / per).sort((a, b) => a - b),
  };
}

export function similar(a: Signature, b: Signature): boolean {
  if (a.n !== b.n) return false;
  if (Math.abs(a.aspect - b.aspect) > 0.09) return false;
  if (a.n === 99) return a.straight === b.straight;
  return a.edges.every((e, i) => Math.abs(e - b.edges[i]) < 0.03);
}

export function shapeName(poly: P2[]): string {
  const sig = signature(poly);
  const e = sig.edges;
  const eq = (x: number, y: number) => Math.abs(x - y) < 0.02;
  if (sig.n === 99) {
    if (sig.straight === 0) return Math.abs(sig.aspect - 1) < 0.06 ? 'עיגול' : 'אליפסה';
    return 'צורה עם קשת וצלע ישרה';
  }
  if (sig.n === 3) return eq(e[0], e[2]) ? 'משולש שווה צלעות' : eq(e[0], e[1]) || eq(e[1], e[2]) ? 'משולש שווה שוקיים' : 'משולש';
  if (sig.n === 4) {
    if (eq(e[0], e[3])) return Math.abs(sig.aspect - 1) < 0.06 ? 'ריבוע' : 'מעוין';
    if (eq(e[0], e[1]) && eq(e[2], e[3])) return 'מלבן';
    return 'טרפז';
  }
  if (sig.n === 5) return 'מחומש';
  if (sig.n === 6) return eq(e[0], e[5]) ? 'משושה משוכלל' : 'משושה';
  return `מצולע בן ${sig.n} צלעות`;
}

/* ---------- drawing ---------- */

/** Scene primitives for a solid and its cutting plane, in camera space (y down). */
export function drawSolidWithPlane(s: Solid, pl: Plane, slide: boolean): { prims: Prim[]; box: [number, number, number, number] } {
  const cam = CAM_SHAPES;
  const P = (p: V3) => project(cam, p);
  const faceN = s.faces.map((f) => outwardNormal(s, f));
  const front = faceN.map((n) => dot(n, cam.c) > 1e-6);
  const isSide = (fi: number) => s.curved && s.faces[fi].length <= 4;
  const adj = new Map<string, number[]>();
  s.faces.forEach((f, fi) =>
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      adj.set(k, [...(adj.get(k) ?? []), fi]);
    }),
  );

  const hidden: Prim[] = [];
  const visibleEdges: Prim[] = [];
  for (const [k, fs] of adj) {
    const [a, b] = k.split('-').map(Number);
    const [f1, f2] = fs;
    const bothSide = isSide(f1) && isSide(f2);
    const fr = fs.map((f) => front[f]);
    const line = [P(s.verts[a]), P(s.verts[b])];
    if (fr[0] && fr[1]) {
      if (!bothSide) visibleEdges.push({ p: 'line', pts: line, w: 1.6 });
    } else if (!fr[0] && !fr[1]) {
      if (!bothSide) hidden.push({ p: 'line', pts: line, w: 1, dash: true, tone: 'muted' });
    } else visibleEdges.push({ p: 'line', pts: line, w: 1.6 });
  }

  const faces: Prim[] = s.faces
    .map((f, fi) => ({ f, fi }))
    .filter(({ fi }) => front[fi])
    .sort((a, b) => depth(cam, centroid3(a.f.map((i) => s.verts[i]))) - depth(cam, centroid3(b.f.map((i) => s.verts[i]))))
    .map(({ f, fi }) => ({ p: 'line', closed: true, pts: f.map((i) => P(s.verts[i])), fill: shade('#9DB0C4', lightness(faceN[fi])), tone: 'none', w: 0, opacity: 0.55 }) as Prim);

  const [u, v] = planeBasis(pl.n);
  const c0 = scale(pl.n, pl.d);
  const S = 1.95;
  const quad = [
    add(add(c0, scale(u, -S)), scale(v, -S)),
    add(add(c0, scale(u, S)), scale(v, -S)),
    add(add(c0, scale(u, S)), scale(v, S)),
    add(add(c0, scale(u, -S)), scale(v, S)),
  ].map(P);
  const off = slide ? (() => {
    const [x, y] = P(scale(pl.n, 2.6));
    const [x0, y0] = P([0, 0, 0]);
    return [x - x0, y - y0] as P2;
  })() : undefined;
  const sec = section(s, pl).pts3.map(P);

  const prims: Prim[] = [
    ...hidden,
    ...faces,
    { p: 'line', closed: true, pts: quad, fill: 'accentSoft', tone: 'accent', w: 1.2, opacity: 0.72, anim: off ? { from: off } : undefined },
    { p: 'line', closed: true, pts: sec, fill: 'accent', tone: 'accent', w: 1.4, opacity: 0.85, when: 'reveal' },
    ...visibleEdges,
  ];
  const all = [...quad, ...s.verts.map(P)];
  const pad = 0.3;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const box: [number, number, number, number] = [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) - Math.min(...xs) + 2 * pad,
    Math.max(...ys) - Math.min(...ys) + 2 * pad,
  ];
  return { prims, box };
}

export function shapePrims(poly: P2[]): Prim[] {
  const p = normalizeShape(poly).map(([x, y]) => [x, -y] as P2);
  return [{ p: 'line', closed: true, pts: p, fill: 'stim', tone: 'ink', w: 1.6 }];
}

export const faceShapes = (s: Solid): P2[][] =>
  s.faces.map((f) => {
    const pts = f.map((i) => s.verts[i]);
    const n = outwardNormal(s, f);
    const [u, v] = planeBasis(n);
    return pts.map((p) => [dot(p, u), dot(p, v)] as P2);
  });
