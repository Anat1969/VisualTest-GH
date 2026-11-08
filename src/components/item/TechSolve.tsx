import { useMemo } from 'react';
import { fitBeam, fitPath, fitTrain, fitWater, hintOf, type PathIssue } from '../../logic/solveTech';
import type { Item, P2, SceneSpec } from '../../logic/types';
import { Scene } from '../stimulus/Scene';
import { OPTION_LABELS, SOLVE, SolveChrome, T_HOLD, ease, phase, useSolveClock, type SolveProps } from './solveKit';

/*
 * Technical understanding: the learner's choice is played through, and the stage shows where it breaks.
 * Gears: the chosen motion of the last wheel travels back along the train to the first wheel, against the given arrow.
 * Beam: the chosen load is hung and the beam tilts by the net moment.
 * Paths: the body runs along the chosen path; every stretch is checked against the force acting on it.
 * Water: the glass tilts, the chosen water settles in it, and is checked against the level and the volume.
 */

const pts = (list: P2[]) => list.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 0.02 ? String(Math.round(x)) : x.toFixed(2).replace(/0$/, ''));

export const canSolveTrain = (item: Item) => item.type === 'mechanics' && !!hintOf(item, 'train');
export const canSolveBeam = (item: Item) => item.type === 'statics' && !!hintOf(item, 'beam');
export const canSolvePath = (item: Item) => item.type === 'physics' && !!hintOf(item, 'path');
export const canSolveWater = (item: Item) => item.type === 'physics' && !!hintOf(item, 'water');

/* ---------------- gears ---------------- */

const LINK_RULE: Record<string, string> = { mesh: 'שיניים: הופכות כיוון', belt: 'רצועה: שומרת כיוון', cross: 'רצועה מוצלבת: הופכת', shaft: 'ציר משותף: אותה תנועה' };
const T_START = 500, T_LINK = 1000, T_COMPARE = 900, T_BACK_G = 600;
const OMEGA = 70; // degrees per second at speed 1

function turnArrow(c: P2, r: number, dir: number, color: string, width: number) {
  const R = r + 7;
  const list: P2[] = Array.from({ length: 12 }, (_, i) => {
    const a = (-150 + i * 9) * (Math.PI / 180);
    return [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)] as P2;
  });
  const line = dir > 0 ? list : list.slice().reverse();
  const a = line[line.length - 2], b = line[line.length - 1];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const h = width * 4;
  const head: P2[] = [b, [b[0] - h * Math.cos(ang - 0.45), b[1] - h * Math.sin(ang - 0.45)], [b[0] - h * Math.cos(ang + 0.45), b[1] - h * Math.sin(ang + 0.45)]];
  return (
    <g>
      <polyline points={pts(line)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={pts(head)} fill={color} />
    </g>
  );
}

export function TrainSolve({ item, target }: SolveProps) {
  const h = hintOf(item, 'train')!;
  const fit = useMemo(() => fitTrain(item, target), [item, target]);
  const n = h.wheels.length;
  const startAt = (i: number) => T_START + (n - 1 - i) * T_LINK; // the last wheel first, then back along the train
  const TOTAL = startAt(0) + T_COMPARE;
  const END = fit.same ? TOTAL + 1200 : TOTAL + T_HOLD + T_BACK_G;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);
  const scene = item.stimulus as SceneSpec;
  const unit = Math.max(scene.box[2], scene.box[3]) / 300;

  // freeze the wheels on the way back for a wrong choice
  const tt = fit.same ? ms : Math.min(ms, TOTAL + T_HOLD);
  const angle = (i: number) => (tt > startAt(i) ? fit.dir[i] * fit.speed[i] * OMEGA * ((tt - startAt(i)) / 1000) : 0);
  let g = 0;
  const prims = scene.prims
    .filter((p) => !(p.p === 'arrow' && p.tone === 'bad' && ms >= TOTAL))
    .map((p) => (p.p === 'gear' ? { ...p, angle: angle(g++) } : p));
  const active = (i: number) => ms > startAt(i);
  const compare = phase(ms, startAt(0), T_COMPARE);
  const back = END > TOTAL + 1200 ? phase(ms, TOTAL + T_HOLD, T_BACK_G) : 0;

  // the link being crossed right now
  const crossing = h.links.findIndex((_, i) => ms > startAt(i + 1) && ms <= startAt(i));
  const A = h.wheels[0], Z = h.wheels[n - 1];
  const L = OPTION_LABELS[target];
  const claim = fit.claimTurns !== null ? `${fmt(fit.claimTurns)} סיבובים ${fit.claimDir > 0 ? 'עם' : 'נגד'} כיוון השעון` : `${fit.claimDir > 0 ? 'עם' : 'נגד'} כיוון השעון, ${fit.claimFaster ? 'מהר' : 'לאט'} יותר`;
  const aWord = fit.dir[0] > 0 ? 'עם כיוון השעון' : 'נגד כיוון השעון';
  const verdict = fit.same
    ? `התנועה של ${L} מחזירה את ${A.label} בדיוק לתנועה הנתונה`
    : !fit.dirOk
      ? `אם ${Z.label} מסתובב כמו ב-${L}, ${A.label} היה מסתובב ${aWord}, הפוך מהחץ`
      : fit.claimTurns !== null
        ? `אם ${Z.label} עושה ${fmt(fit.claimTurns)} סיבובים, ${A.label} היה עושה ${fmt(fit.speed[0])}, לא סיבוב אחד`
        : `בקצב של ${L}, ${A.label} היה מסתובב ${fit.speed[0] > 1 ? 'מהר' : 'לאט'} יותר מהקצב הנתון`;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : ms >= TOTAL
      ? verdict
      : ms < startAt(n - 1) + 300
        ? `${Z.label} מסתובב כפי שבחרת: ${claim}`
        : crossing >= 0
          ? `התנועה עוברת אחורה אל ${h.wheels[crossing].label}. ${LINK_RULE[h.links[crossing]]}`
          : `משווים את ${A.label} לחץ הנתון`;

  return (
    <>
      <Scene spec={{ ...scene, prims }} label={caption}>
        {h.wheels.map((w, i) =>
          active(i) && (i !== 0 || compare < 0.5) ? <g key={i} opacity={i === n - 1 ? 1 : 0.85}>{turnArrow(w.c, w.r + 4, fit.dir[i], i === n - 1 ? SOLVE.anchor : SOLVE.ink, 1.6 * unit * 1.2)}</g> : null,
        )}
        {crossing >= 0 && (() => {
          const a = h.wheels[crossing].c, b = h.wheels[crossing + 1].c;
          return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={SOLVE.anchor} strokeWidth={3 * unit} strokeDasharray={`${6 * unit} ${4 * unit}`} opacity={0.7} />;
        })()}
        {compare > 0.5 && back < 1 && <g opacity={1 - back}>{turnArrow(A.c, A.r + 4, fit.dir[0], fit.same ? SOLVE.ok : SOLVE.bad, 2.6 * unit * 1.2)}</g>}
        {compare > 0.5 && back < 1 && fit.claimTurns !== null && (
          <text x={A.c[0]} y={A.c[1] + A.r + 16 * unit * 1.4} fontSize={13 * unit * 1.2} fontWeight={700} textAnchor="middle" fill={fit.speedOk ? SOLVE.ok : SOLVE.bad} opacity={1 - back}>
            {fmt(fit.speed[0])} סיבובים
          </text>
        )}
      </Scene>
      <SolveChrome caption={caption} verdict={ms >= TOTAL ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}

/* ---------------- balance beam ---------------- */

const U = 18;
const T_DROP = 700, T_TILT = 1600, T_READ = 700, T_BACK_B = 900;

export function BeamSolve({ item, target }: SolveProps) {
  const fit = useMemo(() => fitBeam(item, target), [item, target]);
  const TOTAL = T_DROP + T_TILT + T_READ;
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK_B;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);
  const drop = ease(phase(ms, 0, T_DROP));
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK_B)) : 0;
  const tilt = phase(ms, T_DROP, T_TILT);
  const read = phase(ms, T_DROP + T_TILT, T_READ);
  const net = fit.right - fit.left;
  const full = net === 0 ? 0 : Math.sign(net) * Math.max(3, Math.min(13, (Math.abs(net) / Math.max(fit.left, fit.right)) * 16));
  // settles with a small damped swing
  const deg = full * (1 - Math.exp(-5 * tilt) * Math.cos(9 * tilt)) * (tilt > 0 ? 1 : 0) * (1 - back);
  const a = (deg * Math.PI) / 180;
  // the beam turns about the pivot tip; loads hang straight down from where they sit on it
  const onBeam = (x: number): P2 => [x * Math.cos(a), x * Math.sin(a) + 6];

  const L = OPTION_LABELS[target];
  const added = fit.loads.find((l) => l.added)!;
  const landed = ms >= TOTAL;
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'המשקל יורד מהקורה'
      : landed || read > 0
        ? fit.same
          ? `מאוזנת: משמאל ${fit.left}, מימין ${fit.right}`
          : `הקורה נוטה ${net > 0 ? 'ימינה' : 'שמאלה'}: משמאל ${fit.left}, מימין ${fit.right} (משקל × מרחק)`
        : ms < T_DROP
          ? `תולים את ${L}: ${added.w} ק״ג במרחק ${added.pos}`
          : 'משחררים את הקורה';

  const hang = (pos: number, w: number, isNew: boolean, i: number) => {
    const [x, y] = onBeam(pos * U);
    const hh = 12 + w * 1.6;
    const lift = isNew ? (1 - drop) * 30 + back * 30 : 0;
    const op = isNew ? Math.min(drop, 1 - back) : 1;
    return (
      <g key={i} opacity={op} transform={`translate(0 ${-lift})`}>
        <line x1={x} y1={y} x2={x} y2={y + 20} stroke={SOLVE.ink} strokeWidth={1} />
        <rect x={x - 9} y={y + 20} width={18} height={hh} rx={2} fill={isNew ? '#CFE0EE' : '#9DB0C4'} stroke={SOLVE.ink} strokeWidth={1.2} />
        <text x={x} y={y + 20 + hh / 2} fontSize={10} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={SOLVE.ink}>
          {fmt(w)}
        </text>
      </g>
    );
  };
  const bar = (side: -1 | 1, value: number) => {
    const max = Math.max(fit.left, fit.right, 1);
    const w = (value / max) * 4 * U * read;
    const color = fit.same ? SOLVE.ok : value > (side < 0 ? fit.right : fit.left) ? SOLVE.bad : SOLVE.stim;
    return (
      <g opacity={read * (1 - back)}>
        <rect x={side < 0 ? -w - 4 : 4} y={84} width={w} height={7} fill={color} rx={1} />
        <text x={side * (4 * U + 14)} y={88} fontSize={9} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={SOLVE.ink}>
          {value}
        </text>
      </g>
    );
  };

  return (
    <>
      <svg viewBox={`${-5.7 * U} -18 ${11.4 * U} 116`} className="stim-svg" role="img" aria-label={caption}>
        <polygon points={pts([[0, 6], [-12, 30], [12, 30]])} fill="#9DB0C4" stroke={SOLVE.ink} strokeWidth={1.4} />
        <line x1={-40} y1={30} x2={40} y2={30} stroke="var(--ink-3)" strokeWidth={1.4} />
        <g transform={`rotate(${deg} 0 6)`}>
          <rect x={-5 * U} y={0} width={10 * U} height={6} rx={1} fill={fit.same && landed ? SOLVE.ok : SOLVE.ink} />
          {Array.from({ length: 11 }, (_, k) => k - 5).filter((k) => k).map((k) => (
            <text key={k} x={k * U} y={-7} fontSize={8} fontWeight={500} textAnchor="middle" fill="var(--ink-3)">
              {Math.abs(k)}
            </text>
          ))}
        </g>
        {fit.loads.map((l, i) => hang(l.pos, l.w, l.added, i))}
        {bar(-1, fit.left)}
        {bar(1, fit.right)}
      </svg>
      <SolveChrome caption={caption} verdict={landed ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}

/* ---------------- paths ---------------- */

const ISSUE: Record<PathIssue, string> = {
  start: 'ברגע השחרור המסלול פונה לכיוון אחר מהתנועה שהייתה לגוף',
  kink: 'כאן המסלול נשבר בבת אחת: שום כוח לא עושה את זה',
  bendsWithoutForce: 'כאן המסלול מתעקל, אבל אין כוח שמכופף אותו',
  ignoresGravity: 'כאן המסלול ישר, כאילו הכובד לא פועל',
  bendsAgainstForce: 'כאן המסלול מתעקל נגד כיוון הכובד',
};
const T_RUN = 2400, T_LAND_P = 700, T_BACK_P = 700;

export function PathSolve({ item, target }: SolveProps) {
  const h = hintOf(item, 'path')!;
  const fit = useMemo(() => fitPath(item, target), [item, target]);
  const TOTAL = 400 + T_RUN + T_LAND_P;
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK_P;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);
  const run = phase(ms, 400, T_RUN);
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK_P)) : 0;
  const land = phase(ms, 400 + T_RUN, T_LAND_P) * (1 - back);
  const scene = item.options[target].visual as SceneSpec;
  const unit = Math.max(scene.box[2], scene.box[3]) / 300;

  // run at an even pace along the path
  const k = Math.min(fit.pieces.length, Math.floor(run * fit.pieces.length));
  const at = k >= fit.pieces.length ? fit.pts[fit.pts.length - 1] : fit.pieces[k].a;
  const ball = back > 0 ? fit.pts[0] : at;
  const passed = fit.pieces.slice(0, k);
  const firstIssue = fit.pieces.find((p, i) => i < k && p.issue)?.issue ?? null;
  // the base drawing without the option's own ball and path
  const base: SceneSpec = { ...scene, prims: scene.prims.filter((p) => !(p.p === 'circle' && p.fill === 'ink') && !(p.p === 'line' && p.dash && p.tone === 'accent')) };
  const L = OPTION_LABELS[target];
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הגוף חוזר לנקודת השחרור'
      : ms >= 400 + T_RUN
        ? fit.same
          ? `${L}: המסלול מתעקל רק לכיוון הכוח, ובדיוק כמה שהוא מושך`
          : fit.issues[0] === 'start' && !h.v0
            ? 'ברגע החיתוך הגוף עומד, אבל המסלול מתחיל בתנועה הצידה'
            : ISSUE[fit.issues[0]]
        : firstIssue
          ? firstIssue === 'start' && !h.v0
            ? 'ברגע החיתוך הגוף עומד, אבל המסלול מתחיל בתנועה הצידה'
            : ISSUE[firstIssue]
          : h.force === 'none'
            ? `הגוף יוצא במסלול של ${L}. במישור אין עליו כוח`
            : `הגוף נע במסלול של ${L}. הכובד מושך למטה כל הזמן`;

  return (
    <>
      <Scene spec={base} label={caption}>
        <polyline points={pts(fit.pts)} fill="none" stroke={SOLVE.ink} strokeOpacity={0.3} strokeWidth={2 * unit * 1.4} strokeDasharray={`${4 * unit} ${3 * unit}`} />
        {(back > 0 ? [] : passed).map((p, i) => (
          <line key={i} x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} stroke={p.issue ? SOLVE.bad : SOLVE.ok} strokeWidth={(p.issue ? 4 : 3) * unit * 1.4} strokeLinecap="round" />
        ))}
        {land > 0 &&
          fit.pieces.filter((p) => p.issue).slice(0, 1).map((p, i) => (
            <circle key={i} cx={p.a[0]} cy={p.a[1]} r={7 * unit * 1.4} fill="none" stroke={SOLVE.bad} strokeWidth={2 * unit} opacity={land} />
          ))}
        {h.force === 'down' && run > 0 && back === 0 && (
          <g stroke={SOLVE.anchor} fill={SOLVE.anchor} opacity={0.8}>
            <line x1={ball[0]} y1={ball[1] + 5} x2={ball[0]} y2={ball[1] + 15} strokeWidth={1.4} />
            <polygon points={pts([[ball[0], ball[1] + 18], [ball[0] - 2.5, ball[1] + 13], [ball[0] + 2.5, ball[1] + 13]])} stroke="none" />
          </g>
        )}
        <circle cx={ball[0]} cy={ball[1]} r={3.6} fill={SOLVE.ink} />
      </Scene>
      <SolveChrome caption={caption} verdict={ms >= 400 + T_RUN ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}

/* ---------------- water ---------------- */

const T_TILT_W = 1300, T_POUR = 700, T_CHECK = 800, T_BACK_W = 900;

export function WaterSolve({ item, target }: SolveProps) {
  const h = hintOf(item, 'water')!;
  const fit = useMemo(() => fitWater(item, target), [item, target]);
  const TOTAL = T_TILT_W + T_POUR + T_CHECK;
  const END = fit.same ? TOTAL : TOTAL + T_HOLD + T_BACK_W;
  const { ms, done, replay } = useSolveClock(TOTAL, END, target);
  const back = END > TOTAL ? ease(phase(ms, TOTAL + T_HOLD, T_BACK_W)) : 0;
  const tilt = ease(phase(ms, 0, T_TILT_W)) * (1 - back);
  const pour = phase(ms, T_TILT_W, T_POUR) * (1 - back);
  const check = phase(ms, T_TILT_W + T_POUR, T_CHECK) * (1 - back);
  const deg = (h.tilt * 180) / Math.PI;
  const [s0, s1] = fit.surface;
  const mid: P2 = [(s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2];
  const L = OPTION_LABELS[target];
  const caption = done && back > 0
    ? `${L} לא מתאימה. נסי שוב`
    : back > 0
      ? 'הכוס חוזרת לעמוד'
      : ms >= T_TILT_W + T_POUR
        ? fit.same
          ? `${L}: פני המים במפלס, וכמות המים לא השתנתה`
          : [
              fit.levelOk ? '' : `פני המים נוטים ${Math.round(fit.tilt)}° מהמפלס`,
              fit.volumeOk ? '' : `המים תופסים ${Math.round(fit.fill * 100)}% מהכוס, ולפני ההטיה ${Math.round(h.fill * 100)}%`,
            ].filter(Boolean).join('. ')
        : ms < T_TILT_W
          ? `מטים את הכוס ב-${Math.round(Math.abs(deg))}°`
          : `המים של ${L} בכוס המוטה`;

  return (
    <>
      <svg viewBox="0 0 120 120" className="stim-svg" role="img" aria-label={caption}>
        <line x1={10} y1={112} x2={110} y2={112} stroke="var(--ink-3)" strokeWidth={1.2} />
        {pour > 0 && <polygon points={pts(fit.water)} fill="#8FB3CF" opacity={pour} />}
        <polygon points={pts(h.glass)} transform={`rotate(${deg * tilt} ${h.c[0]} ${h.c[1]})`} fill="none" stroke={SOLVE.ink} strokeWidth={2} />
        {check > 0 && (
          <g opacity={check}>
            <line x1={mid[0] - 34} y1={mid[1]} x2={mid[0] + 34} y2={mid[1]} stroke={fit.levelOk ? SOLVE.ok : SOLVE.ink} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={s0[0]} y1={s0[1]} x2={s1[0]} y2={s1[1]} stroke={fit.levelOk ? SOLVE.ok : SOLVE.bad} strokeWidth={2.4} strokeLinecap="round" />
            {!fit.levelOk && (
              <text x={mid[0] + 37} y={mid[1] - 6} fontSize={7} fontWeight={700} dominantBaseline="central" fill={SOLVE.bad}>
                {Math.round(fit.tilt)}°
              </text>
            )}
            <text x={10} y={10} fontSize={7} fontWeight={700} fill={fit.volumeOk ? SOLVE.ok : SOLVE.bad}>
              {Math.round(fit.fill * 100)}% מים
            </text>
          </g>
        )}
      </svg>
      <SolveChrome caption={caption} verdict={ms >= T_TILT_W + T_POUR ? (fit.same ? 'ok' : 'bad') : null} done={done} onReplay={replay} />
    </>
  );
}
