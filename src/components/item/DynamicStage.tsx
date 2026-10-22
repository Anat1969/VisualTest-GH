import { useEffect, useRef, useState } from 'react';
import { axisAngle, mulM } from '../../logic/geometry';
import type { DynamicSpec } from '../../logic/types';
import { Cubes3D } from '../stimulus/Cubes3D';
import { NetFolding } from '../stimulus/Net';
import { PaperFrame, PaperHoles } from '../stimulus/Paper';
import { Poly2D } from '../stimulus/Poly2D';
import { Scene } from '../stimulus/Scene';
import { unfold } from '../../logic/paper';

export type StagePhase = 'play' | 'paused' | 'reveal' | 'done';

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Timeline length (ms) for the part before the question point. */
function playLength(spec: DynamicSpec) {
  if (spec.kind === 'paperFold') return spec.durationMs * spec.steps.folds.length + 600;
  return spec.durationMs;
}

/**
 * Plays the animation up to the question point and stops there.
 * After an answer, `reveal` continues the motion to its real end state.
 */
export function DynamicStage({
  spec,
  reveal,
  replayToken,
  onPaused,
}: {
  spec: DynamicSpec;
  reveal: boolean;
  replayToken: number;
  onPaused: () => void;
}) {
  const [p, setP] = useState(0); // 0..1 play, 1..2 reveal
  const raf = useRef(0);
  const pausedSent = useRef(false);

  useEffect(() => {
    pausedSent.current = false;
    if (reducedMotion()) {
      setP(1);
      pausedSent.current = true;
      onPaused();
      return;
    }
    const len = playLength(spec);
    const start = performance.now();
    setP(0);
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / len);
      setP(x);
      if (x < 1) raf.current = requestAnimationFrame(tick);
      else if (!pausedSent.current) {
        pausedSent.current = true;
        onPaused();
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, replayToken]);

  useEffect(() => {
    if (!reveal) return;
    if (reducedMotion()) {
      setP(2);
      return;
    }
    const len = spec.kind === 'paperFold' ? 500 : spec.kind === 'scene' ? spec.revealMs : spec.durationMs;
    const start = performance.now();
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / len);
      setP(1 + x);
      if (x < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reveal, spec]);

  const playT = ease(Math.min(1, p));
  const revT = ease(Math.max(0, p - 1));

  switch (spec.kind) {
    case 'rotate2d': {
      const angle = p <= 1 ? spec.from + (spec.to - spec.from) * playT : spec.to + (spec.reveal - spec.to) * revT;
      return <Poly2D spec={{ ...spec.base, angle }} label="צורה בתנועת סיבוב" />;
    }
    case 'rotate3d': {
      const angle = p <= 1 ? spec.from + (spec.to - spec.from) * playT : spec.to + (spec.reveal - spec.to) * revT;
      return <Cubes3D spec={spec.base} rot={mulM(axisAngle(spec.axis, angle), spec.base.rot)} label="צורה תלת-ממדית בתנועת סיבוב" />;
    }
    case 'scene':
      // physical motion runs at constant speed, so no easing here
      return <Scene spec={spec.scene} t={p} revealing={p > 1 || reveal} />;
    case 'netFold': {
      const t = p <= 1 ? spec.pauseAt * playT : spec.pauseAt + (1 - spec.pauseAt) * revT;
      return <NetFolding spec={spec.net} t={t} />;
    }
    case 'paperFold': {
      if (p > 1) return <PaperHoles spec={{ kind: 'paperHoles', holes: unfold(spec.steps.folds, spec.steps.punches) }} label="הדף לאחר פתיחה" />;
      const n = spec.steps.folds.length;
      const total = playLength(spec);
      const ms = Math.min(1, p) * total;
      const k = Math.min(n, Math.floor(ms / spec.durationMs));
      const t = k >= n ? 1 : ease((ms - k * spec.durationMs) / spec.durationMs);
      return <PaperFrame spec={spec.steps} k={k} t={t} punched={k >= n} />;
    }
  }
}
