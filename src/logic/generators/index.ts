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
import { conditional, series, syllogism } from './logical';
import { beat, contour, deviation } from './musical';
import { balance, hands, path } from './kinesthetic';
import { distortion, granularity, need, perspective, tone, unsaid } from './social';
import { ecology, specimen, taxon } from './naturalist';
import { concept, intensity, premise, regulation, signal, values } from './inner';
import { pipeline, query, trace } from './digital';
import { effects, loop, stock } from './systems';
import { fxBaseline, fxBroken, fxChannel, fxConditions, fxDefaults, fxFeed, fxFloors, fxLoop, fxMotion, fxResolution } from './fusion';
import { fxArousal, fxBranch, fxCarrier, fxDose, fxForecast, fxModulation, fxProportion, fxRecovery, fxSeating, fxValue } from './fusion2';

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
    case 'series':
      return series(rng, level);
    case 'syllogism':
      return syllogism(rng, level);
    case 'conditional':
      return conditional(rng, level);
    case 'beat':
      return beat(rng, level);
    case 'contour':
      return contour(rng, level);
    case 'deviation':
      return deviation(rng, level);
    case 'hands':
      return hands(rng, level);
    case 'path':
      return path(rng, level);
    case 'balance':
      return balance(rng, level);
    case 'perspective':
      return perspective(rng, level);
    case 'unsaid':
      return unsaid(rng, level);
    case 'tone':
      return tone(rng, level);
    case 'distortion':
      return distortion(rng, level);
    case 'granularity':
      return granularity(rng, level);
    case 'need':
      return need(rng, level);
    case 'taxon':
      return taxon(rng, level);
    case 'specimen':
      return specimen(rng, level);
    case 'ecology':
      return ecology(rng, level);
    case 'values':
      return values(rng, level);
    case 'premise':
      return premise(rng, level);
    case 'concept':
      return concept(rng, level);
    case 'intensity':
      return intensity(rng, level);
    case 'regulation':
      return regulation(rng, level);
    case 'signal':
      return signal(rng, level);
    case 'trace':
      return trace(rng, level);
    case 'query':
      return query(rng, level);
    case 'pipeline':
      return pipeline(rng, level);
    case 'loop':
      return loop(rng, level);
    case 'stock':
      return stock(rng, level);
    case 'effects':
      return effects(rng, level);
    case 'fx_channel':
      return fxChannel(rng, level);
    case 'fx_defaults':
      return fxDefaults(rng, level);
    case 'fx_baseline':
      return fxBaseline(rng, level);
    case 'fx_conditions':
      return fxConditions(rng, level);
    case 'fx_motion':
      return fxMotion(rng, level);
    case 'fx_floors':
      return fxFloors(rng, level);
    case 'fx_broken':
      return fxBroken(rng, level);
    case 'fx_loop':
      return fxLoop(rng, level);
    case 'fx_feed':
      return fxFeed(rng, level);
    case 'fx_resolution':
      return fxResolution(rng, level);
    case 'fx_branch':
      return fxBranch(rng, level);
    case 'fx_value':
      return fxValue(rng, level);
    case 'fx_carrier':
      return fxCarrier(rng, level);
    case 'fx_forecast':
      return fxForecast(rng, level);
    case 'fx_arousal':
      return fxArousal(rng, level);
    case 'fx_dose':
      return fxDose(rng, level);
    case 'fx_proportion':
      return fxProportion(rng, level);
    case 'fx_modulation':
      return fxModulation(rng, level);
    case 'fx_recovery':
      return fxRecovery(rng, level);
    case 'fx_seating':
      return fxSeating(rng, level);
  }
}
