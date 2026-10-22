import type { VisualSpec } from '../../logic/types';
import { CubeView } from './CubeView';
import { Cubes3D } from './Cubes3D';
import { GlyphView, Matrix } from './Glyphs';
import { Swatch } from './FacePattern';
import { NetFlat } from './Net';
import { PaperHoles, PaperSteps } from './Paper';
import { Poly2D } from './Poly2D';

export function Visual({ spec, label }: { spec: VisualSpec; label?: string }) {
  switch (spec.kind) {
    case 'poly2d':
      return <Poly2D spec={spec} label={label} />;
    case 'cubes3d':
      return <Cubes3D spec={spec} label={label} />;
    case 'paperSteps':
      return <PaperSteps spec={spec} />;
    case 'paperHoles':
      return <PaperHoles spec={spec} label={label} />;
    case 'net':
      return <NetFlat spec={spec} />;
    case 'cubeView':
      return <CubeView spec={spec} label={label} />;
    case 'swatch':
      return <Swatch face={spec.face} label={label} />;
    case 'glyph':
      return <GlyphView spec={spec} label={label} />;
    case 'matrix':
      return <Matrix spec={spec} label={label} />;
  }
}
