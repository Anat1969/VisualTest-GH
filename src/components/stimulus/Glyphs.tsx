import { useId } from 'react';
import type { GlyphSpec, Glyph, MatrixSpec } from '../../logic/types';

const CELL = 110;
const SIZE = 22; // glyph size inside a cell

/** Draws the glyph centred at (cx, cy). `hatch` is the id of the pattern used for hatched fill. */
function drawGlyph(g: Glyph, cx: number, cy: number, hatch: string) {
  const offsets = g.count === 1 ? [0] : g.count === 2 ? [-16, 16] : [-30, 0, 30];
  const fill = g.fill === 'solid' ? 'var(--ink)' : g.fill === 'hatched' ? `url(#${hatch})` : 'none';
  return offsets.map((dx, i) => {
    const x = cx + dx;
    const y = cy;
    const common = { fill, stroke: 'var(--ink)', strokeWidth: 2.2, strokeLinejoin: 'round' as const };
    const h = SIZE / 2;
    switch (g.shape) {
      case 'circle':
        return <circle key={i} {...common} cx={x} cy={y} r={h} />;
      case 'square':
        return <rect key={i} {...common} x={x - h} y={y - h} width={SIZE} height={SIZE} />;
      case 'triangle':
        return <polygon key={i} {...common} points={`${x},${y - h} ${x + h},${y + h} ${x - h},${y + h}`} />;
      case 'diamond':
        return <polygon key={i} {...common} points={`${x},${y - h - 2} ${x + h},${y} ${x},${y + h + 2} ${x - h},${y}`} />;
    }
  });
}

function HatchPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="2" />
    </pattern>
  );
}

/** A single glyph, e.g. one of the answer options. */
export function GlyphView({ spec, label }: { spec: GlyphSpec; label?: string }) {
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox={`0 0 ${CELL} ${CELL}`} role="img" aria-label={label ?? 'צורה'} className="stim-svg">
      <defs>
        <HatchPattern id={id} />
      </defs>
      {drawGlyph(spec.glyph, CELL / 2, CELL / 2, id)}
    </svg>
  );
}

/** A 3×3 matrix. The `null` cell is drawn as a question mark. */
export function Matrix({ spec, label }: { spec: MatrixSpec; label?: string }) {
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const side = CELL * 3;
  return (
    <svg viewBox={`0 0 ${side} ${side}`} role="img" aria-label={label ?? 'מטריצה שלוש על שלוש'} className="stim-svg">
      <defs>
        <HatchPattern id={id} />
      </defs>
      {spec.cells.map((g, i) => {
        const x = (i % 3) * CELL;
        const y = Math.floor(i / 3) * CELL;
        return (
          <g key={i}>
            <rect x={x + 3} y={y + 3} width={CELL - 6} height={CELL - 6} rx={6} fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={1.5} />
            {g ? (
              drawGlyph(g, x + CELL / 2, y + CELL / 2, id)
            ) : (
              <text x={x + CELL / 2} y={y + CELL / 2 + 16} textAnchor="middle" fontSize={44} fill="var(--ink-3)" fontFamily="var(--font-display)">
                ?
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
