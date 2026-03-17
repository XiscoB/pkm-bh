import {
  getAttackMultiplierAgainstTypes,
  isPokemonType,
  type PokemonType,
} from "./typeEffectiveness";
import {
  getTeamPokemonSafety,
  type TeamMatchupSafety,
  type TeamMatchupStrength,
} from "./teamEvaluation";

export type StrengthSource = "stab" | "move" | null;

export type AdvancedTeamEvaluation = {
  pokemon: string;
  strength: TeamMatchupStrength;
  safety: TeamMatchupSafety;
  dangerScore: number;
  strengthSource: StrengthSource;
  effectiveAttackType: PokemonType | null;
};

export type EnemyCoverageMode = "assumed" | "known";

export function resolveEnemyAttackTypes(
  enemyTypes: PokemonType[],
  assumedCoverageTypes: PokemonType[],
  knownMoveTypes: PokemonType[] = [],
): {
  mode: EnemyCoverageMode;
  attackTypes: PokemonType[];
} {
  if (knownMoveTypes.length > 0) {
    return {
      mode: "known",
      attackTypes: [...new Set([...enemyTypes, ...knownMoveTypes])],
    };
  }

  return {
    mode: "assumed",
    attackTypes: [...new Set(assumedCoverageTypes)],
  };
}

function strengthRank(strength: TeamMatchupStrength): number {
  if (strength === "Strong") {
    return 0;
  }

  if (strength === "Neutral") {
    return 1;
  }

  return 2;
}

function safetyRank(safety: TeamMatchupSafety): number {
  if (safety === "Safe") {
    return 0;
  }

  return 1;
}

function getBestOffensiveMultiplier(
  attackTypes: PokemonType[],
  enemyTypes: PokemonType[],
): number {
  if (attackTypes.length === 0) {
    return 1;
  }

  return attackTypes.reduce((bestMultiplier, attackType) => {
    const multiplier = getAttackMultiplierAgainstTypes(attackType, enemyTypes);
    return Math.max(bestMultiplier, multiplier);
  }, 0);
}

function getBestEffectiveAttack(
  teamPokemonTypes: PokemonType[],
  optionalMoveTypes: PokemonType[],
  enemyTypes: PokemonType[],
): { type: PokemonType; source: Exclude<StrengthSource, null> } | null {
  let bestType: PokemonType | null = null;
  let bestSource: Exclude<StrengthSource, null> | null = null;
  let bestMultiplier = 1;

  const considerAttackType = (
    attackType: PokemonType,
    source: Exclude<StrengthSource, null>,
  ) => {
    const multiplier = getAttackMultiplierAgainstTypes(attackType, enemyTypes);

    if (multiplier <= 1) {
      return;
    }

    if (
      multiplier > bestMultiplier ||
      (multiplier === bestMultiplier &&
        source === "stab" &&
        bestSource === "move")
    ) {
      bestType = attackType;
      bestSource = source;
      bestMultiplier = multiplier;
    }
  };

  for (const stabType of teamPokemonTypes) {
    considerAttackType(stabType, "stab");
  }

  for (const moveType of optionalMoveTypes) {
    considerAttackType(moveType, "move");
  }

  if (!bestType || !bestSource) {
    return null;
  }

  return {
    type: bestType,
    source: bestSource,
  };
}

function getWorstDefensiveMultiplier(
  teamPokemonTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
): number {
  if (enemyCoverageTypes.length === 0) {
    return 1;
  }

  return enemyCoverageTypes.reduce((worstMultiplier, enemyAttackType) => {
    const multiplier = getAttackMultiplierAgainstTypes(
      enemyAttackType,
      teamPokemonTypes,
    );

    return Math.max(worstMultiplier, multiplier);
  }, 0);
}

export function parseOptionalMoveTypesInput(input: string): PokemonType[] {
  const optionalMoveTypes = input
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(isPokemonType);

  return [...new Set(optionalMoveTypes)];
}

export function getPokemonAttackTypes(
  teamPokemonTypes: PokemonType[],
  optionalMoveTypes: PokemonType[],
): PokemonType[] {
  return [...new Set([...teamPokemonTypes, ...optionalMoveTypes])];
}

export function calculateDangerScore(
  teamPokemonTypes: PokemonType[],
  enemyTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
  optionalMoveTypes: PokemonType[] = [],
): number {
  const attackTypes = getPokemonAttackTypes(
    teamPokemonTypes,
    optionalMoveTypes,
  );
  const bestOffensiveMultiplier = getBestOffensiveMultiplier(
    attackTypes,
    enemyTypes,
  );
  const worstDefensiveMultiplier = getWorstDefensiveMultiplier(
    teamPokemonTypes,
    enemyCoverageTypes,
  );

  const offensivePenalty =
    bestOffensiveMultiplier >= 2
      ? 0
      : bestOffensiveMultiplier > 1
        ? 1
        : bestOffensiveMultiplier === 1
          ? 3
          : 5;

  const defensivePenalty =
    worstDefensiveMultiplier >= 4
      ? 8
      : worstDefensiveMultiplier > 1
        ? 5
        : worstDefensiveMultiplier === 1
          ? 2
          : 0;

  return offensivePenalty + defensivePenalty;
}

export function evaluateTeamPokemonAdvanced(
  pokemon: string,
  teamPokemonTypes: PokemonType[],
  enemyTypes: PokemonType[],
  enemyCoverageTypes: PokemonType[],
  optionalMoveTypes: PokemonType[] = [],
): AdvancedTeamEvaluation {
  const bestEffectiveAttack = getBestEffectiveAttack(
    teamPokemonTypes,
    optionalMoveTypes,
    enemyTypes,
  );
  const worstDefensiveMultiplier = getWorstDefensiveMultiplier(
    teamPokemonTypes,
    enemyCoverageTypes,
  );
  const safety = getTeamPokemonSafety(teamPokemonTypes, enemyCoverageTypes);

  let strength: TeamMatchupStrength = "Neutral";
  let strengthSource: StrengthSource = null;
  let effectiveAttackType: PokemonType | null = null;

  if (bestEffectiveAttack) {
    strength = "Strong";
    strengthSource = bestEffectiveAttack.source;
    effectiveAttackType = bestEffectiveAttack.type;
  } else if (worstDefensiveMultiplier > 1) {
    strength = "Weak";
  }

  return {
    pokemon,
    strength,
    safety,
    dangerScore: calculateDangerScore(
      teamPokemonTypes,
      enemyTypes,
      enemyCoverageTypes,
      optionalMoveTypes,
    ),
    strengthSource,
    effectiveAttackType,
  };
}

export function getBestSwitchRecommendation(
  evaluations: AdvancedTeamEvaluation[],
): AdvancedTeamEvaluation | null {
  if (evaluations.length === 0) {
    return null;
  }

  return evaluations.reduce((best, current) => {
    if (current.dangerScore < best.dangerScore) {
      return current;
    }

    if (current.dangerScore > best.dangerScore) {
      return best;
    }

    const strengthComparison =
      strengthRank(current.strength) - strengthRank(best.strength);

    if (strengthComparison < 0) {
      return current;
    }

    if (strengthComparison > 0) {
      return best;
    }

    const safetyComparison =
      safetyRank(current.safety) - safetyRank(best.safety);

    if (safetyComparison < 0) {
      return current;
    }

    if (safetyComparison > 0) {
      return best;
    }

    return current.pokemon.localeCompare(best.pokemon) < 0 ? current : best;
  }, evaluations[0]);
}
