// Tiny Web Audio synth: soft mallet tones on a step grid.
import type { AudioSpec } from './types';

let ctx: AudioContext | null = null;
let active: OscillatorNode[] = [];

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function tone(midi: number, at: number, dur: number, gain = 0.22) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq(midi);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  osc.connect(g).connect(a.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
  active.push(osc);
  osc.onended = () => (active = active.filter((o) => o !== osc));
}

export function playNotes(spec: AudioSpec) {
  const a = audio();
  if (!a) return;
  const step = 60 / spec.bpm / 2;
  const total = spec.steps * step;
  const t0 = a.currentTime + 0.08;
  for (let r = 0; r < spec.repeat; r++)
    for (const n of spec.notes) tone(n.midi, t0 + r * (total + step * 2) + n.step * step, Math.max(0.12, (n.len ?? 1) * step * 0.95));
}

export function click(accent = false) {
  const a = audio();
  if (!a) return;
  tone(accent ? 84 : 76, a.currentTime + 0.01, 0.06, 0.18);
}

/** A click scheduled on the audio clock, for steady metronomes. */
export function clickAt(at: number, accent = false) {
  tone(accent ? 84 : 76, at, 0.06, 0.18);
}

export function stopAll() {
  active.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  active = [];
}

export const now = () => audio()?.currentTime ?? performance.now() / 1000;
