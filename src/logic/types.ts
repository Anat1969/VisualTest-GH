// Domain model shared by generators, sessions and storage.

export type TestType = 'rotation' | 'folding';
export type Dim = '2D' | '3D';
export type Motion = 'static' | 'dynamic';
export type Level = 1 | 2 | 3;
export type Mode = 'explain' | 'practice' | 'exam' | 'simulation';
export type ErrorType = 'encoding' | 'transformation' | 'wrong_rule' | 'timeout';

export type V3 = [number, number, number];
export type M3 = number[]; // 3x3, row-major
export type P2 = [number, number];

/* ---------- Visual specs: pure data, rendered by components/stimulus ---------- */

export interface Poly2DSpec {
  kind: 'poly2d';
  cells: P2[];
  angle: number; // degrees, clockwise on screen
  mirror: boolean;
}

export interface Cubes3DSpec {
  kind: 'cubes3d';
  cubes: V3[];
  rot: M3;
}

export interface PaperFold {
  n: P2; // unit normal of fold line
  c: number; // line: n·p = c
  keep: 1 | -1; // side that stays in place
}

export interface PaperStepsSpec {
  kind: 'paperSteps';
  folds: PaperFold[];
  punches: P2[];
}

export interface PaperHolesSpec {
  kind: 'paperHoles';
  holes: P2[];
}

export type FaceMark = 'none' | 'dot' | 'ring' | 'four' | 'diamond' | 'cross';

export interface FaceLook {
  id: number; // 0..5
  color: string;
  mark: FaceMark;
  letter?: string; // oriented glyph (level 3)
}

export interface NetSpec {
  kind: 'net';
  cells: P2[]; // [col, row] per face id
  root: number;
  faces: FaceLook[];
  highlight?: number;
}

export interface CubeSlot {
  face: FaceLook;
  up: V3; // world up-vector of the face pattern
}

export interface CubeViewSpec {
  kind: 'cubeView';
  top: CubeSlot;
  front: CubeSlot;
  right: CubeSlot;
}

export interface SwatchSpec {
  kind: 'swatch';
  face: FaceLook;
}

export type VisualSpec =
  | Poly2DSpec
  | Cubes3DSpec
  | PaperStepsSpec
  | PaperHolesSpec
  | NetSpec
  | CubeViewSpec
  | SwatchSpec;

/* ---------- Dynamic animation: plays to a question point, then continues after answer ---------- */

export type DynamicSpec =
  | { kind: 'rotate2d'; base: Poly2DSpec; from: number; to: number; reveal: number; durationMs: number }
  | { kind: 'rotate3d'; base: Cubes3DSpec; axis: V3; from: number; to: number; reveal: number; durationMs: number }
  | { kind: 'paperFold'; steps: PaperStepsSpec; durationMs: number }
  | { kind: 'netFold'; net: NetSpec; pauseAt: number; durationMs: number };

export interface Option {
  visual: VisualSpec;
  correct: boolean;
  errorType?: Exclude<ErrorType, 'timeout'>;
  why: string; // shown after answering
}

export interface Item {
  id: string;
  type: TestType;
  level: Level;
  dim: Dim;
  motion: Motion;
  seed: number;
  prompt: string;
  stimulus: VisualSpec;
  dynamic?: DynamicSpec;
  options: Option[];
  correctIndex: number;
  explanation: string;
}

export interface Variant {
  type: TestType;
  dim: Dim;
  motion: Motion;
}

export const TEST_TYPES: TestType[] = ['rotation', 'folding'];
export const LEVELS: Level[] = [1, 2, 3];

export const TYPE_LABEL: Record<TestType, string> = {
  rotation: 'רוטציה מנטלית',
  folding: 'קיפול ופריסה',
};

export const MODE_LABEL: Record<Mode, string> = {
  explain: 'הסבר',
  practice: 'תרגול',
  exam: 'מבחן',
  simulation: 'סימולציה מעורבת',
};

export const ERROR_LABEL: Record<ErrorType, string> = {
  encoding: 'קידוד',
  transformation: 'טרנספורמציה',
  wrong_rule: 'כלל שגוי',
  timeout: 'חריגת זמן',
};

export const ERROR_HINT: Record<ErrorType, string> = {
  encoding: 'הצורה נקלטה לא מדויק. לפני הפעולה המנטלית, סמני לעצמך שני מאפיינים ייחודיים ובדקי אותם בכל אפשרות.',
  transformation: 'הפעולה המנטלית בוצעה חלקית או בכיוון שגוי. בצעי אותה בצעדים קטנים ועקבי אחרי נקודת עוגן אחת.',
  wrong_rule: 'הופעל כלל שאינו חל: למשל שיקוף במקום סיבוב, או פאות נגדיות שנראות צמודות. זכרי את הכלל לפני הבחירה.',
  timeout: 'הזמן נגמר. אם פריט נתקע, עדיף לבחור ולהמשיך.',
};

export const variantKey = (v: Variant) => `${v.type}:${v.dim}:${v.motion}`;
