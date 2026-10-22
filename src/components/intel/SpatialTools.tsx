import { useEffect, useMemo, useRef, useState } from 'react';
import { I3, axisAngle, mulM } from '../../logic/geometry';
import { makeRng } from '../../logic/rng';
import { mirror3, randomPolycube } from '../../logic/shapes';
import type { M3 } from '../../logic/types';
import { Cubes3D } from '../stimulus/Cubes3D';

/* ================= turntable ================= */

/** Turn a shape by hand until it matches a target, then decide: same shape or mirror image. */
export function Turntable({ color }: { color: string }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const { shape, target, mirrored, start } = useMemo(() => {
    const rng = makeRng(seed);
    const shape = randomPolycube(rng, rng.int(6, 8));
    const mirrored = rng.chance(0.5);
    const pickRot = () => [...Array(rng.int(2, 4))].reduce<M3>((m) => mulM(axisAngle(rng.pick([[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const) as [number, number, number], 90), m), I3);
    return { shape, target: pickRot(), mirrored, start: pickRot() };
  }, [seed]);
  const [rot, setRot] = useState<M3>(start);
  const [answer, setAnswer] = useState<'same' | 'mirror' | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  useEffect(() => {
    setRot(start);
    setAnswer(null);
  }, [start]);

  const turn = (axis: [number, number, number], deg: number) => setRot((r) => mulM(axisAngle(axis, deg), r));
  const decide = (a: 'same' | 'mirror') => {
    if (answer) return;
    setAnswer(a);
    const ok = (a === 'mirror') === mirrored;
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
  };
  const mine = mirrored ? mirror3(shape) : shape;
  const ok = answer && (answer === 'mirror') === mirrored;

  return (
    <div className="lab">
      <div className="turn-grid">
        <figure className="turn-fig">
          <Cubes3D spec={{ kind: 'cubes3d', cubes: shape, rot: target }} label="המטרה" />
          <figcaption className="xs muted">המטרה</figcaption>
        </figure>
        <figure className="turn-fig mine" style={{ borderColor: color }}>
          <Cubes3D spec={{ kind: 'cubes3d', cubes: mine, rot }} label="הצורה שלך" />
          <figcaption className="xs muted">שלך: סובבי אותה</figcaption>
        </figure>
      </div>
      <div className="turn-pad" role="group" aria-label="סיבוב ברבעי סיבוב">
        <button className="btn" onClick={() => turn([0, 0, 1], 90)}>
          סביב הציר האנכי
        </button>
        <button className="btn" onClick={() => turn([1, 0, 0], 90)}>
          קדימה
        </button>
        <button className="btn" onClick={() => turn([0, 1, 0], 90)}>
          הצידה
        </button>
        <button className="btn ghost" onClick={() => setRot(start)}>
          איפוס
        </button>
      </div>
      <div className="row">
        <span className="small">אחרי שהצורות מיושרות: אותה צורה או תמונת מראה?</span>
        <button className="btn primary" disabled={!!answer} onClick={() => decide('same')}>
          אותה צורה
        </button>
        <button className="btn primary" disabled={!!answer} onClick={() => decide('mirror')}>
          תמונת מראה
        </button>
      </div>
      {answer && (
        <p className="small" aria-live="polite">
          <strong style={{ color: ok ? 'var(--ok)' : 'var(--bad)' }}>{ok ? 'נכון.' : 'לא נכון.'}</strong>{' '}
          {mirrored ? 'זו תמונת מראה: שום סיבוב לא יחפוף אותה למטרה.' : 'זו אותה צורה: יש סיבוב שמחפף אותן.'}{' '}
          <button className="btn ghost sm" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            צורה חדשה
          </button>
        </p>
      )}
      <p className="xs muted">
        בסבב הזה: <span className="num">{score.right}</span> מתוך <span className="num">{score.total}</span>. טיפ: יישרי קודם זרוע אחת ארוכה, ואז בדקי לאן פונה הזרוע הבאה.
      </p>
    </div>
  );
}

/* ================= framing ================= */

type Overlay = 'thirds' | 'golden' | 'diagonals' | 'center';
const OVERLAY_LABEL: Record<Overlay, string> = { thirds: 'שלישים', golden: 'חתך זהב', diagonals: 'אלכסונים', center: 'מרכז' };
const ASPECTS = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '4:5': 4 / 5 } as const;
const PHI = 0.382;

/** Load a photo, choose a crop and an overlay, and click to set what the frame centres on. */
export function FrameLab({ color }: { color: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [overlays, setOverlays] = useState<Overlay[]>(['thirds']);
  const [aspect, setAspect] = useState<keyof typeof ASPECTS>('3:2');
  const [focus, setFocus] = useState<[number, number]>([50, 50]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  const load = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('הקובץ אינו תמונה.');
    setError('');
    setSrc(URL.createObjectURL(f));
    setFocus([50, 50]);
  };
  const toggle = (o: Overlay) => setOverlays((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  const lines = (o: Overlay) => {
    const v = o === 'thirds' ? [1 / 3, 2 / 3] : o === 'golden' ? [PHI, 1 - PHI] : [];
    return v;
  };

  return (
    <div className="lab">
      <div className="row">
        <label className="btn primary">
          בחירת תמונה
          <input type="file" accept="image/*" hidden onChange={(e) => load(e.target.files?.[0])} />
        </label>
        {(Object.keys(ASPECTS) as (keyof typeof ASPECTS)[]).map((a) => (
          <button key={a} className={`btn ${aspect === a ? '' : 'ghost'}`} aria-pressed={aspect === a} onClick={() => setAspect(a)}>
            <span className="num">{a}</span>
          </button>
        ))}
      </div>
      <div className="row">
        {(Object.keys(OVERLAY_LABEL) as Overlay[]).map((o) => (
          <button key={o} className={`chip ${overlays.includes(o) ? 'on' : ''}`} aria-pressed={overlays.includes(o)} onClick={() => toggle(o)}>
            {OVERLAY_LABEL[o]}
          </button>
        ))}
      </div>
      {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      <div
        ref={box}
        className="frame-box"
        style={{ aspectRatio: String(ASPECTS[aspect]) }}
        onClick={(e) => {
          const r = box.current!.getBoundingClientRect();
          setFocus([((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]);
        }}
      >
        {src ? (
          <img src={src} alt="התמונה שנבחרה" style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
        ) : (
          <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-label="תמונת דוגמה">
            <rect width="300" height="200" fill="#dfe6ea" />
            <path d="M0 140 L70 95 L120 125 L190 70 L300 135 L300 200 L0 200Z" fill="#9db0c4" />
            <circle cx="228" cy="52" r="16" fill="#f2c46d" />
            <rect x="96" y="128" width="10" height="34" fill="#4c5b6a" />
          </svg>
        )}
        <svg className="frame-over" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {overlays.map((o) =>
            o === 'diagonals' ? (
              <g key={o} stroke={color} strokeWidth="0.4" vectorEffect="non-scaling-stroke">
                <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
                <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
              </g>
            ) : o === 'center' ? (
              <g key={o} stroke={color}>
                <line x1="48" y1="50" x2="52" y2="50" vectorEffect="non-scaling-stroke" />
                <line x1="50" y1="48" x2="50" y2="52" vectorEffect="non-scaling-stroke" />
              </g>
            ) : (
              <g key={o} stroke={o === 'golden' ? 'var(--accent)' : color} strokeDasharray={o === 'golden' ? '2 1.5' : undefined}>
                {lines(o).map((v) => (
                  <g key={v}>
                    <line x1={v * 100} y1="0" x2={v * 100} y2="100" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={v * 100} x2="100" y2={v * 100} vectorEffect="non-scaling-stroke" />
                  </g>
                ))}
              </g>
            ),
          )}
        </svg>
      </div>
      <p className="xs muted">
        {src ? 'לחיצה על התמונה מזיזה את החיתוך כך שהנקודה שבחרת תתקרב לקו. התמונה לא עולה לשום מקום, היא נשארת בדפדפן.' : 'בלי תמונה מוצגת דוגמה. בחרי צילום משלך כדי לתרגל.'} נקודות החיתוך של הקווים הן המקומות החזקים בפריים.
      </p>
    </div>
  );
}
