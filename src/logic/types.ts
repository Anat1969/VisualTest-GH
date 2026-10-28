// Domain model shared by generators, sessions and storage.

export type TestType =
  | 'rotation'
  | 'folding'
  | 'sections'
  | 'plans'
  | 'hidden'
  | 'speed'
  | 'matrices'
  | 'mechanics'
  | 'statics'
  | 'physics'
  // intelligences block · linguistic
  | 'analogy'
  | 'oddword'
  | 'sequence'
  // logical
  | 'series'
  | 'syllogism'
  | 'conditional'
  // musical
  | 'beat'
  | 'contour'
  | 'deviation'
  // kinesthetic
  | 'hands'
  | 'path'
  | 'balance'
  // interpersonal
  | 'perspective'
  | 'unsaid'
  | 'tone'
  // intrapersonal
  | 'distortion'
  | 'granularity'
  | 'need'
  // naturalist
  | 'taxon'
  | 'specimen'
  | 'ecology'
  // existential
  | 'values'
  | 'premise'
  | 'concept'
  // emotional
  | 'intensity'
  | 'regulation'
  | 'signal'
  // digital
  | 'trace'
  | 'query'
  | 'pipeline'
  // systems
  | 'loop'
  | 'stock'
  | 'effects'
  // fusion drills
  | 'fx_channel'
  | 'fx_defaults'
  | 'fx_baseline'
  | 'fx_conditions'
  | 'fx_motion'
  | 'fx_floors'
  | 'fx_broken'
  | 'fx_loop'
  | 'fx_feed'
  | 'fx_resolution';
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
  /** draws a fixed "front" arrow on the ground, for plan/elevation items */
  front?: boolean;
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

export type Shape = 'circle' | 'square' | 'triangle' | 'diamond';
export type Fill = 'empty' | 'hatched' | 'solid';
export type Count = 1 | 2 | 3;
export interface Glyph {
  shape: Shape;
  count: Count;
  fill: Fill;
}

export interface GlyphSpec {
  kind: 'glyph';
  glyph: Glyph;
}

/** 3×3 matrix; the cell with `null` is the one to complete. Row-major. */
export interface MatrixSpec {
  kind: 'matrix';
  cells: (Glyph | null)[];
}

export interface SwatchSpec {
  kind: 'swatch';
  face: FaceLook;
}

/* ---------- Scene: generic 2D drawing used by the technical and perception types ---------- */

/** Named tones map to design tokens; any other string is used as a CSS color. */
export type Tone = 'ink' | 'muted' | 'line' | 'accent' | 'accentSoft' | 'stim' | 'water' | 'paper' | 'sunk' | 'ok' | 'bad' | 'none' | (string & {});

/** When a primitive is visible during a dynamic item: play = before the question point, pause = at it, reveal = after answering. */
export type When = 'play' | 'pause' | 'reveal' | 'pre' | 'post';

export interface PrimAnim {
  spin?: number; // degrees per unit of time, around `c`
  c?: P2;
  path?: P2[]; // move a circle along this path during play
  revealPath?: P2[]; // and along this one during reveal
  from?: P2; // translate from this offset to zero during play
}

export type Prim = (
  | { p: 'line'; pts: P2[]; closed?: boolean; fill?: Tone; tone?: Tone; w?: number; dash?: boolean; opacity?: number }
  | { p: 'circle'; c: P2; r: number; fill?: Tone; tone?: Tone; w?: number; dash?: boolean }
  | { p: 'text'; at: P2; text: string; size?: number; tone?: Tone; weight?: number; anchor?: 'start' | 'middle' | 'end' }
  | { p: 'arrow'; pts: P2[]; tone?: Tone; w?: number; dash?: boolean }
  | { p: 'gear'; c: P2; r: number; teeth: number; fill?: Tone; angle?: number; label?: string }
  | { p: 'rect'; x: number; y: number; w: number; h: number; fill?: Tone; tone?: Tone; sw?: number; rx?: number }
) & { when?: When; anim?: PrimAnim };

export interface SceneSpec {
  kind: 'scene';
  box: [number, number, number, number]; // viewBox
  prims: Prim[];
  label?: string;
}

/** Verbal material: a word pair, a word, a note, or numbered sentences. */
export interface VerbalSpec {
  kind: 'verbal';
  mode: 'pair' | 'pairOption' | 'word' | 'note' | 'sentences' | 'order' | 'series' | 'quote' | 'gap' | 'code' | 'table';
  words: string[];
}

/** Sound to play: notes on a step grid. Rendered as a play button and a neutral pulse. */
export interface AudioSpec {
  kind: 'audio';
  bpm: number;
  steps: number; // grid length (sixteenth-like steps)
  notes: { step: number; midi: number; len?: number }[];
  repeat: number;
  label: string;
}

/** Answer given as words, e.g. a direction or a weight. */
export interface TextSpec {
  kind: 'text';
  text: string;
  sub?: string;
}

export type VisualSpec =
  | Poly2DSpec
  | Cubes3DSpec
  | PaperStepsSpec
  | PaperHolesSpec
  | NetSpec
  | CubeViewSpec
  | SwatchSpec
  | GlyphSpec
  | MatrixSpec
  | SceneSpec
  | TextSpec
  | VerbalSpec
  | AudioSpec;

/* ---------- Dynamic animation: plays to a question point, then continues after answer ---------- */

export type DynamicSpec =
  | { kind: 'rotate2d'; base: Poly2DSpec; from: number; to: number; reveal: number; durationMs: number }
  | { kind: 'rotate3d'; base: Cubes3DSpec; axis: V3; from: number; to: number; reveal: number; durationMs: number }
  | { kind: 'paperFold'; steps: PaperStepsSpec; durationMs: number }
  | { kind: 'netFold'; net: NetSpec; pauseAt: number; durationMs: number }
  | { kind: 'scene'; scene: SceneSpec; durationMs: number; revealMs: number };

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

export const TEST_TYPES: TestType[] = [
  'rotation',
  'folding',
  'sections',
  'plans',
  'hidden',
  'speed',
  'matrices',
  'mechanics',
  'statics',
  'physics',
];

/** Which 2D/3D × static/dynamic variants each type offers. */
export const TYPE_VARIANTS: Record<TestType, [Dim, Motion][]> = {
  rotation: [['2D', 'static'], ['2D', 'dynamic'], ['3D', 'static'], ['3D', 'dynamic']],
  folding: [['2D', 'static'], ['2D', 'dynamic'], ['3D', 'static'], ['3D', 'dynamic']],
  sections: [['3D', 'static'], ['3D', 'dynamic']],
  plans: [['3D', 'static'], ['3D', 'dynamic']],
  hidden: [['2D', 'static']],
  speed: [['2D', 'static'], ['2D', 'dynamic']],
  matrices: [['2D', 'static']],
  mechanics: [['2D', 'static'], ['2D', 'dynamic']],
  statics: [['2D', 'static']],
  physics: [['2D', 'static'], ['2D', 'dynamic']],
  analogy: [['2D', 'static']],
  oddword: [['2D', 'static']],
  sequence: [['2D', 'static']],
  series: [['2D', 'static']],
  syllogism: [['2D', 'static']],
  conditional: [['2D', 'static']],
  beat: [['2D', 'static']],
  contour: [['2D', 'static']],
  deviation: [['2D', 'static']],
  hands: [['2D', 'static']],
  path: [['2D', 'static']],
  balance: [['2D', 'static']],
  perspective: [['2D', 'static']],
  unsaid: [['2D', 'static']],
  tone: [['2D', 'static']],
  distortion: [['2D', 'static']],
  granularity: [['2D', 'static']],
  need: [['2D', 'static']],
  taxon: [['2D', 'static']],
  specimen: [['2D', 'static']],
  ecology: [['2D', 'static']],
  values: [['2D', 'static']],
  premise: [['2D', 'static']],
  concept: [['2D', 'static']],
  intensity: [['2D', 'static']],
  regulation: [['2D', 'static']],
  signal: [['2D', 'static']],
  trace: [['2D', 'static']],
  query: [['2D', 'static']],
  pipeline: [['2D', 'static']],
  loop: [['2D', 'static']],
  stock: [['2D', 'static']],
  effects: [['2D', 'static']],
  fx_channel: [['2D', 'static']],
  fx_defaults: [['2D', 'static']],
  fx_baseline: [['2D', 'static']],
  fx_conditions: [['2D', 'static']],
  fx_motion: [['2D', 'static']],
  fx_floors: [['2D', 'static']],
  fx_broken: [['2D', 'static']],
  fx_loop: [['2D', 'static']],
  fx_feed: [['2D', 'static']],
  fx_resolution: [['2D', 'static']],
};

/** Drills of the intelligences block (kept out of the standard skill map). */
export const INTEL_TYPES: TestType[] = [
  'analogy', 'oddword', 'sequence',
  'series', 'syllogism', 'conditional',
  'beat', 'contour', 'deviation',
  'hands', 'path', 'balance',
  'perspective', 'unsaid', 'tone',
  'distortion', 'granularity', 'need',
  'taxon', 'specimen', 'ecology',
  'values', 'premise', 'concept',
  'intensity', 'regulation', 'signal',
  'trace', 'query', 'pipeline',
  'loop', 'stock', 'effects',
  // fusion drills
  'fx_channel', 'fx_defaults', 'fx_baseline', 'fx_conditions', 'fx_motion', 'fx_floors', 'fx_broken', 'fx_loop', 'fx_feed', 'fx_resolution',
];
export const ALL_TYPES: TestType[] = [...TEST_TYPES, ...INTEL_TYPES];
export const LEVELS: Level[] = [1, 2, 3];

export const TYPE_LABEL: Record<TestType, string> = {
  rotation: 'רוטציה מנטלית',
  folding: 'קיפול ופריסה',
  sections: 'חתכים',
  plans: 'תוכניות וחזיתות',
  hidden: 'צורה חבויה',
  speed: 'זריזות תפיסתית',
  matrices: 'מטריצות',
  mechanics: 'מכניקה',
  statics: 'סטטיקה',
  physics: 'פיזיקה אינטואיטיבית',
  analogy: 'יחסי משמעות',
  oddword: 'מיון ודיוק',
  sequence: 'רצף וטיעון',
  series: 'סדרות ודפוסים',
  syllogism: 'היסק מהנחות',
  conditional: 'אם, אז',
  beat: 'זיכרון קצב',
  contour: 'קו מנגינה',
  deviation: 'זיהוי סטייה',
  hands: 'יד ימין, יד שמאל',
  path: 'תכנון מסלול',
  balance: 'שיווי משקל',
  perspective: 'נקודת המבט של האחר',
  unsaid: 'מה שלא נאמר',
  tone: 'טון וכוונה',
  distortion: 'הטיות חשיבה',
  granularity: 'דיוק רגשי',
  need: 'רגש וצורך',
  taxon: 'גילוי כלל מיון',
  specimen: 'ההבדל הדק',
  ecology: 'קשרים במערכת',
  values: 'הערך שמאחורי ההחלטה',
  premise: 'הנחה סמויה',
  concept: 'הבחנה מושגית',
  intensity: 'סולם עוצמה',
  regulation: 'ויסות',
  signal: 'רגש כנתון',
  trace: 'מעקב אחרי קוד',
  query: 'סינון נתונים',
  pipeline: 'זרימת מידע',
  loop: 'לולאות משוב',
  stock: 'מלאי וזרימה',
  effects: 'שרשרת השפעות',
  fx_channel: 'רוחב פס רגשי',
  fx_defaults: 'ברירת המחדל המקודדת',
  fx_baseline: 'חריגה מהבסיס',
  fx_conditions: 'הצירוף המפעיל',
  fx_motion: 'השורה השגויה בתנועה',
  fx_floors: 'קומות ההפשטה',
  fx_broken: 'הקומה השבורה',
  fx_loop: 'החלק המשתנה בלופ',
  fx_feed: 'קריאת הדירוג',
  fx_resolution: 'איפה הפירוט משתלם',
};

export type Category = 'spatial' | 'perception' | 'reasoning' | 'technical';

export const CATEGORIES: { id: Category; label: string; blurb: string; types: TestType[] }[] = [
  {
    id: 'spatial',
    label: 'דמיון מרחבי',
    blurb: 'להחזיק גוף בראש ולפעול עליו: לסובב, לקפל, לחתוך, להטיל.',
    types: ['rotation', 'folding', 'sections', 'plans'],
  },
  {
    id: 'perception',
    label: 'תפיסה חזותית',
    blurb: 'לראות מהר ומדויק: לזהות פרט בתוך שלם, להבחין בהבדל קטן.',
    types: ['hidden', 'speed'],
  },
  { id: 'reasoning', label: 'הסקה מופשטת', blurb: 'לגלות כלל במבנה חזותי ולהחיל אותו.', types: ['matrices'] },
  {
    id: 'technical',
    label: 'הבנה טכנית',
    blurb: 'לחזות איך מערכת פיזית תתנהג: גלגלי שיניים, מנופים, תנועה ונוזלים.',
    types: ['mechanics', 'statics', 'physics'],
  },
];

export const categoryOf = (t: TestType) => CATEGORIES.find((c) => c.types.includes(t))!;

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
