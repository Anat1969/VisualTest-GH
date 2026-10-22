import type { SentenceTok } from '../../logic/rhythm';

/** Sentence lengths as a skyline: one tower per sentence, height = words. */
export function Skyline({ sents, color, compact = false }: { sents: SentenceTok[]; color: string; compact?: boolean }) {
  if (!sents.length) return null;
  const max = Math.max(12, ...sents.map((s) => s.words.length));
  const w = 400;
  const h = compact ? 90 : 150;
  const gap = 6;
  const bw = Math.min(48, (w - gap * (sents.length + 1)) / sents.length);
  const total = sents.length * bw + (sents.length - 1) * gap;
  const x0 = (w - total) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="skyline" role="img" aria-label="אורך המשפטים כקו רקיע" style={{ direction: 'ltr' }}>
      <line x1="0" x2={w} y1={h} y2={h} stroke="var(--ink)" strokeWidth="1.2" />
      {sents.map((s, i) => {
        const bh = (s.words.length / max) * (h - 14);
        // reading order is right to left: sentence 1 stands on the right
        const x = x0 + (sents.length - 1 - i) * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} fill={color} opacity={0.18 + 0.6 * (s.words.length / max)} stroke="var(--ink)" strokeWidth="0.8" />
            {!compact && (
              <>
                <text x={x + bw / 2} y={h - bh - 4} fontSize="10" textAnchor="middle" fill="var(--ink-2)" fontWeight="700">
                  {s.words.length}
                </text>
                <text x={x + bw / 2} y={h + 15} fontSize="9" textAnchor="middle" fill="var(--ink-3)">
                  {i + 1}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Each sentence as a line of the score: word bars sized by letters, gaps for pauses. */
export function Score({ sents, color }: { sents: SentenceTok[]; color: string }) {
  return (
    <div className="score" role="img" aria-label="פרטיטורה של הטקסט: כל מילה כפס לפי אורכה, ורווחים במקום הפסקות">
      {sents.map((s, i) => (
        <div key={i} className="score-row">
          <span className="score-n">{i + 1}</span>
          <div className="score-bars">
            {s.words.map((w, j) => (
              <span key={j} className={`score-w ${w.pause === 1 ? 'p1' : ''}`} title={w.w} style={{ flexGrow: w.len, background: color }} />
            ))}
          </div>
          <span className="score-len">{s.words.length}</span>
        </div>
      ))}
    </div>
  );
}
