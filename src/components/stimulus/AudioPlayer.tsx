import { useEffect, useRef, useState } from 'react';
import type { AudioSpec } from '../../logic/types';
import { playNotes, stopAll } from '../../logic/synth';

const SILENT_KEY = 'merhav:silent-audio';

/**
 * A play button and a pulse. With sound, the pulse marks timing only.
 * In silent mode (no speakers, public transport) nothing plays: the pulse rises and falls with the pitch,
 * so the same item can be solved by eye.
 */
export function AudioPlayer({ spec }: { spec: AudioSpec }) {
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [height, setHeight] = useState(0.5);
  const [plays, setPlays] = useState(0);
  const [silent, setSilent] = useState(() => {
    try {
      return localStorage.getItem(SILENT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const timers = useRef<number[]>([]);
  const midis = spec.notes.map((n) => n.midi);
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      stopAll();
    },
    [],
  );

  const toggleSilent = () => {
    const next = !silent;
    setSilent(next);
    try {
      localStorage.setItem(SILENT_KEY, next ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };

  const play = () => {
    if (playing) return;
    setPlaying(true);
    setPlays((n) => n + 1);
    const stepMs = 60000 / spec.bpm / 2;
    const total = spec.steps * stepMs;
    if (!silent) playNotes(spec);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (let r = 0; r < spec.repeat; r++)
      for (const n of spec.notes)
        timers.current.push(
          window.setTimeout(() => {
            setPulse((p) => p + 1);
            setHeight(hi === lo ? 0.5 : (n.midi - lo) / (hi - lo));
          }, r * (total + stepMs * 2) + n.step * stepMs),
        );
    timers.current.push(window.setTimeout(() => setPlaying(false), spec.repeat * (total + stepMs * 2)));
  };

  return (
    <div className={`audio-stim ${silent ? 'silent' : ''}`}>
      {silent ? (
        <span className="pitch-rail" aria-hidden>
          <span key={pulse} className={`pulse ${playing ? 'on' : ''}`} style={{ bottom: `${height * 100}%` }} />
        </span>
      ) : (
        <span key={pulse} className={`pulse ${playing ? 'on' : ''}`} aria-hidden />
      )}
      <button className="btn primary lg" onClick={play} disabled={playing}>
        {playing ? (silent ? 'מוצג' : 'מושמע') : plays ? (silent ? 'הצגה חוזרת' : 'השמעה חוזרת') : silent ? `הצגת ה${spec.label}` : `השמעת ה${spec.label}`}
      </button>
      <span className="xs muted">
        {silent ? 'מצב שקט: הנקודה מהבהבת בכל צליל, וגובהה הוא גובה הצליל.' : plays ? `הושמע ${plays} ${plays === 1 ? 'פעם' : 'פעמים'}` : 'דורש שמע. כדאי אוזניות.'}
      </span>
      <button className="btn ghost sm" onClick={toggleSilent} aria-pressed={silent}>
        {silent ? 'חזרה לשמע' : 'בלי קול'}
      </button>
    </div>
  );
}
