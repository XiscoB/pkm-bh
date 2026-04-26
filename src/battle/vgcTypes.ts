import type { PokemonType } from "./typeEffectiveness";
import type { AdvancedTeamEvaluation } from "./advancedAnalysis";

export type RosterPokemon = {
  name: string;
  moveTypeInput: string;
};

export type EnemyEntry = {
  id: string;
  name: string;
  types: PokemonType[];
  moveTypeInput: string;
  fetchedCoverageTypes: PokemonType[];
  spriteUrl: string | null;
  onField: boolean;
};

export type FieldMatchupCell = {
  myPokemonName: string;
  enemyId: string;
  evaluation: AdvancedTeamEvaluation;
  myTypes: PokemonType[];
  enemyTypes: PokemonType[];
  enemyCoverageTypes: PokemonType[];
  coverageMode: "assumed" | "known";
};

// grid[myIndex][enemyIndex]
export type FieldMatchupGrid = FieldMatchupCell[][];
