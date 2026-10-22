import { useEffect, useRef, useState } from 'react';
import type { AudioSpec } from '../../logic/types';
import { playNotes, stopAll } from '../../logic/synth';

/** A play button and a neutral pulse. The pulse marks timing only, never pitch or position. */
export function AudioPlayer({ spec }: { spec: AudioSpec }) {
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [plays, setPlays] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      stopAll();
    },
    [],
  );

  const play = () => {
    if (playing) return;
    setPlaying(true);
    setPlays((n) => n + 1);
    const stepMs = 60000 / spec.bpm / 2;
    const total = spec.steps * stepMs;
    playNotes(spec);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (let r = 0; r < spec.repeat; r++)
      for (const n of spec.notes) timers.current.push(window.setTimeout(() => setPulse((p) => p + 1), r * (total + stepMs * 2) + n.step * stepMs));
    timers.current.push(window.setTimeout(() => setPlaying(false), spec.repeat * (total + stepMs * 2)));
  };

  return (
    <div className="audio-stim">
      <span key={pulse} className={`pulse ${playing ? 'on' : ''}`} aria-hidden />
      <button className="btn primary lg" onClick={play} disabled={playing}>
        {playing ? 'מושמע' : plays ? 'השמעה חוזרת' : `השמעת ה${spec.label}`}
      </button>
      <span className="xs muted">{plays ? `הושמע ${plays} ${plays === 1 ? 'פעם' : 'פעמים'}` : 'דורש שמע. כדאי אוזניות.'}</span>
    </div>
  );
}
