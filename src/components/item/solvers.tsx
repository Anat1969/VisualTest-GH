import type { ComponentType } from 'react';
import type { Item } from '../../logic/types';
import { Continue2DSolve, Continue3DSolve, canContinue2D, canContinue3D } from './ContinueSolve';
import { HiddenSolve, canSolveHidden } from './HiddenSolve';
import { NetSolve, canSolveNet } from './NetSolve';
import { PaperSolve, canSolvePaper } from './PaperSolve';
import { PlanSolve, canSolvePlan } from './PlanSolve';
import { Poly2DSolve, canSolve2D } from './Poly2DSolve';
import { RotationSolve, canSolve3D } from './RotationSolve';
import { SectionSolve, canSolveSection } from './SectionSolve';
import { SpeedSolve, canSolveSpeed } from './SpeedSolve';
import type { SolveProps } from './solveKit';

/**
 * Every test type with a "lifts off the page" solution. A new one is registered here:
 * a `can` test on the item, and a component that plays the chosen option inside the item's own stage.
 */
const SOLVERS: { can: (item: Item) => boolean; C: ComponentType<SolveProps> }[] = [
  { can: canSolve3D, C: RotationSolve },
  { can: canSolve2D, C: Poly2DSolve },
  { can: canContinue2D, C: Continue2DSolve },
  { can: canContinue3D, C: Continue3DSolve },
  { can: canSolveNet, C: NetSolve },
  { can: canSolvePaper, C: PaperSolve },
  { can: canSolvePlan, C: PlanSolve },
  { can: canSolveSection, C: SectionSolve },
  { can: canSolveHidden, C: HiddenSolve },
  { can: canSolveSpeed, C: SpeedSolve },
];

export const solverFor = (item: Item): ComponentType<SolveProps> | null => SOLVERS.find((s) => s.can(item))?.C ?? null;
