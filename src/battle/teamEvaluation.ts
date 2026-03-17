import {
  getAttackMultiplierAgainstTypes,
  type PokemonType,
} from "./typeEffectiveness";

export type TeamMatchupStrength = "Strong" | "Neutral" | "Weak";
export type TeamMatchupSafety = "Safe" | "Risk";

export type TeamEvaluation = {
  pokemon: string;
  strength: TeamMatchupStrength;
  safety: TeamMatchupSafety;
};

export function parseTeamInput(teamInput: string): string[] {
  return teamInput
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0);
}

function getOffensiveMultipliers(
  attackerTypes: PokemonType[],
  defenderTypes: PokemonType[],
): number[] {
  if (attackerTypes.length === 0) {
    return [1];
  }

  return attackerTypes.map((attackerType) =>
    getAttackMultiplierAgainstTypes(attackerType, defenderTypes),
  );
}

function getWorstDefensiveMultiplier(
  defenderTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
): number {
  if (enemyCoverageTypes.length === 0) {
    return 1;
  }

  return enemyCoverageTypes.reduce((worstMultiplier, enemyAttackType) => {
    const multiplier = getAttackMultiplierAgainstTypes(
      enemyAttackType,
      defenderTypes,
    );
    return Math.max(worstMultiplier, multiplier);
  }, 0);
}

export function getTeamPokemonStrength(
  teamPokemonTypes: PokemonType[],
  enemyTypes: PokemonType[],
): TeamMatchupStrength {
  const offensiveMultipliers = getOffensiveMultipliers(
    teamPokemonTypes,
    enemyTypes,
  );
  const bestMultiplier = Math.max(...offensiveMultipliers);

  if (bestMultiplier > 1) {
    return "Strong";
  }

  if (bestMultiplier < 1) {
    return "Weak";
  }

  if (offensiveMultipliers.some((multiplier) => multiplier < 1)) {
    return "Weak";
  }

  return "Neutral";
}

export function getTeamPokemonSafety(
  teamPokemonTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
): TeamMatchupSafety {
  const worstMultiplier = getWorstDefensiveMultiplier(
    teamPokemonTypes,
    enemyCoverageTypes,
  );

  if (worstMultiplier > 1) {
    return "Risk";
  }

  return "Safe";
}

export function evaluateTeamPokemon(
  pokemon: string,
  teamPokemonTypes: PokemonType[],
  enemyTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
): TeamEvaluation {
  return {
    pokemon,
    strength: getTeamPokemonStrength(teamPokemonTypes, enemyTypes),
    safety: getTeamPokemonSafety(teamPokemonTypes, enemyCoverageTypes),
  };
}
