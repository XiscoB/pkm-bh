import {
  evaluateTeamPokemonAdvanced,
  parseOptionalMoveTypesInput,
  resolveEnemyAttackTypes,
  type AdvancedTeamEvaluation,
} from "./advancedAnalysis";
import type { PokemonType } from "./typeEffectiveness";
import type {
  EnemyEntry,
  FieldMatchupCell,
  FieldMatchupGrid,
} from "./vgcTypes";

export type ActiveMyPokemon = {
  name: string;
  types: PokemonType[];
  moveTypes: PokemonType[];
};

export function buildEnemyAttackTypes(entry: EnemyEntry): {
  attackTypes: PokemonType[];
  mode: "assumed" | "known";
} {
  const knownMoveTypes = parseOptionalMoveTypesInput(entry.moveTypeInput);
  const assumedCoverageTypes =
    entry.fetchedCoverageTypes.length > 0
      ? entry.fetchedCoverageTypes
      : entry.types;
  return resolveEnemyAttackTypes(
    entry.types,
    assumedCoverageTypes,
    knownMoveTypes,
  );
}

export function evaluateField2v2(
  myField: ActiveMyPokemon[],
  enemyField: EnemyEntry[],
): FieldMatchupGrid {
  return myField.map((myPokemon): FieldMatchupCell[] =>
    enemyField.map((enemy): FieldMatchupCell => {
      const { attackTypes, mode } = buildEnemyAttackTypes(enemy);
      const evaluation = evaluateTeamPokemonAdvanced(
        myPokemon.name,
        myPokemon.types,
        enemy.types,
        attackTypes,
        myPokemon.moveTypes,
      );
      return {
        myPokemonName: myPokemon.name,
        enemyId: enemy.id,
        evaluation,
        myTypes: myPokemon.types,
        enemyTypes: enemy.types,
        enemyCoverageTypes: attackTypes,
        coverageMode: mode,
      };
    }),
  );
}

export type RosterEvalSummary = {
  pokemonName: string;
  strongCount: number;
  neutralCount: number;
  weakCount: number;
  maxDangerScore: number;
};

export function evaluateRosterVsAllEnemies(
  roster: ActiveMyPokemon[],
  enemies: EnemyEntry[],
): RosterEvalSummary[] {
  if (enemies.length === 0) return [];

  return roster.map((myPokemon) => {
    const evaluations: AdvancedTeamEvaluation[] = enemies.map((enemy) => {
      const { attackTypes } = buildEnemyAttackTypes(enemy);
      return evaluateTeamPokemonAdvanced(
        myPokemon.name,
        myPokemon.types,
        enemy.types,
        attackTypes,
        myPokemon.moveTypes,
      );
    });

    return {
      pokemonName: myPokemon.name,
      strongCount: evaluations.filter((e) => e.strength === "Strong").length,
      neutralCount: evaluations.filter((e) => e.strength === "Neutral").length,
      weakCount: evaluations.filter((e) => e.strength === "Weak").length,
      maxDangerScore: Math.max(...evaluations.map((e) => e.dangerScore)),
    };
  });
}
