import type { FaceLook } from '../../logic/types';

const LIGHT_FACES = new Set(['#D9A441', '#B9B2A3']);

/** Face content in local coords: x ∈ [-0.5, 0.5] right, y ∈ [-0.5, 0.5] down. */
export function FacePattern({ face, fill }: { face: FaceLook; fill?: string }) {
  const ink = LIGHT_FACES.has(face.color) ? '#1F2A37' : '#FBF9F4';
  return (
    <g>
      <rect x={-0.5} y={-0.5} width={1} height={1} fill={fill ?? face.color} stroke="#1F2A37" strokeWidth={0.04} />
      {face.mark === 'dot' && <circle r={0.12} fill={ink} />}
      {face.mark === 'ring' && <circle r={0.2} fill="none" stroke={ink} strokeWidth={0.07} />}
      {face.mark === 'four' &&
        [-0.18, 0.18].flatMap((x) => [-0.18, 0.18].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.075} fill={ink} />))}
      {face.mark === 'diamond' && <polygon points="0,-0.24 0.24,0 0,0.24 -0.24,0" fill={ink} />}
      {face.mark === 'cross' && (
        <g fill={ink}>
          <rect x={-0.24} y={-0.05} width={0.48} height={0.1} />
          <rect x={-0.05} y={-0.24} width={0.1} height={0.48} />
        </g>
      )}
      {face.letter && (
        <text
          x={0}
          y={0.02}
          fontSize={0.62}
          fontFamily="'Frank Ruhl Libre', serif"
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
          fill={ink}
        >
          {face.letter}
        </text>
      )}
    </g>
  );
}

export function Swatch({ face, label }: { face: FaceLook; label?: string }) {
  return (
    <svg viewBox="-0.9 -0.9 1.8 1.8" role="img" aria-label={label ?? 'פאה'} className="stim-svg">
      <FacePattern face={face} />
    </svg>
  );
}
