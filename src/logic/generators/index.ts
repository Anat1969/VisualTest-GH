import { hashString, makeRng } from '../rng';
import type { DynamicSpec, Item, Level, Option, Variant, VisualSpec } from '../types';
import { cubeNet, paperFolding } from './folding';
import { matrices2D } from './matrices';
import { hiddenFigure, perceptualSpeed } from './perception';
import { plans } from './plans';
import { sections } from './sections';
import { mechanics, physics, statics } from './technical';
import { analogy, oddWord, sequence } from './verbal';
import { rotation2D, rotation3D } from './rotation';

/** What a generator returns before shuffling and identification. Options[0] is correct. */
export interface Draft {
  dim: Item['dim'];
  prompt: string;
  stimulus: VisualSpec;
  dynamic?: DynamicSpec;
  options: Option[];
  explanation: string;
}

export function generateItem(variant: Variant, level: Level, seed: number): Item {
  const rng = makeRng(seed);
  const { type, dim, motion } = variant;
  const draft = build(type, dim, motion, level, rng);
  const options = rng.shuffle(draft.options);
  return {
    id: `${type}-${dim}-${motion}-L${level}-${hashString(JSON.stringify(draft.options[0].visual) + JSON.stringify(draft.stimulus))}`,
    type,
    level,
    dim,
    motion,
    seed,
    prompt: draft.prompt,
    stimulus: draft.stimulus,
    dynamic: draft.dynamic,
    options,
    correctIndex: options.findIndex((o) => o.correct),
    explanation: draft.explanation,
  };
}

function build(type: Variant['type'], dim: Variant['dim'], motion: Variant['motion'], level: Level, rng: ReturnType<typeof makeRng>): Draft {
  switch (type) {
    case 'rotation':
      return dim === '2D' ? rotation2D(rng, level, motion) : rotation3D(rng, level, motion);
    case 'folding':
      return dim === '2D' ? paperFolding(rng, level, motion) : cubeNet(rng, level, motion);
    case 'matrices':
      return matrices2D(rng, level);
    case 'sections':
      return sections(rng, level, motion);
    case 'plans':
      return plans(rng, level, motion);
    case 'hidden':
      return hiddenFigure(rng, level);
    case 'speed':
      return perceptualSpeed(rng, level, motion);
    case 'mechanics':
      return mechanics(rng, level, motion);
    case 'statics':
      return statics(rng, level);
    case 'physics':
      return physics(rng, level, motion);
    case 'analogy':
      return analogy(rng, level);
    case 'oddword':
      return oddWord(rng, level);
    case 'sequence':
      return sequence(rng, level);
  }
}
