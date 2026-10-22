import { hashString, makeRng } from '../rng';
import type { DynamicSpec, Item, Level, Option, Variant, VisualSpec } from '../types';
import { cubeNet, paperFolding } from './folding';
import { matrices2D } from './matrices';
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
  const draft =
    type === 'rotation'
      ? dim === '2D'
        ? rotation2D(rng, level, motion)
        : rotation3D(rng, level, motion)
      : type === 'folding'
        ? dim === '2D'
          ? paperFolding(rng, level, motion)
          : cubeNet(rng, level, motion)
        : matrices2D(rng, level);
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
