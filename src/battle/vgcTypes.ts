import type { PokemonType } from "./typeEffectiveness";
import type { AdvancedTeamEvaluation } from "./advancedAnalysis";
import type { PokemonBaseStats } from "../data/pokeapi";

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
  baseStats: PokemonBaseStats | null;
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
