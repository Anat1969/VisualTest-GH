// Dedicated practice for fusions, keyed by fusion key ('a+b', alphabetical), like PROGRAMS is keyed by intelligence id.
// Empty until the fusion drills are built (stages C onward). A fusion page always works without an entry:
// it falls back to a mixed round of both intelligences' keyed drills and the card's daily challenge.
import type { Skill } from './intelligences';

export interface FusionProgram {
  premise: string;
  skills: Skill[];
}

export const FUSION_PROGRAMS: Record<string, FusionProgram> = {};
