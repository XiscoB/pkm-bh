export const TYPE_NAMES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof TYPE_NAMES)[number];

type DefensiveRelations = {
  weakTo: PokemonType[];
  resists: PokemonType[];
  immuneTo: PokemonType[];
};

const DEFENSIVE_RELATIONS: Record<PokemonType, DefensiveRelations> = {
  normal: {
    weakTo: ["fighting"],
    resists: [],
    immuneTo: ["ghost"],
  },
  fire: {
    weakTo: ["water", "ground", "rock"],
    resists: ["fire", "grass", "ice", "bug", "steel", "fairy"],
    immuneTo: [],
  },
  water: {
    weakTo: ["electric", "grass"],
    resists: ["fire", "water", "ice", "steel"],
    immuneTo: [],
  },
  electric: {
    weakTo: ["ground"],
    resists: ["electric", "flying", "steel"],
    immuneTo: [],
  },
  grass: {
    weakTo: ["fire", "ice", "poison", "flying", "bug"],
    resists: ["water", "electric", "grass", "ground"],
    immuneTo: [],
  },
  ice: {
    weakTo: ["fire", "fighting", "rock", "steel"],
    resists: ["ice"],
    immuneTo: [],
  },
  fighting: {
    weakTo: ["flying", "psychic", "fairy"],
    resists: ["bug", "rock", "dark"],
    immuneTo: [],
  },
  poison: {
    weakTo: ["ground", "psychic"],
    resists: ["grass", "fighting", "poison", "bug", "fairy"],
    immuneTo: [],
  },
  ground: {
    weakTo: ["water", "grass", "ice"],
    resists: ["poison", "rock"],
    immuneTo: ["electric"],
  },
  flying: {
    weakTo: ["electric", "ice", "rock"],
    resists: ["grass", "fighting", "bug"],
    immuneTo: ["ground"],
  },
  psychic: {
    weakTo: ["bug", "ghost", "dark"],
    resists: ["fighting", "psychic"],
    immuneTo: [],
  },
  bug: {
    weakTo: ["fire", "flying", "rock"],
    resists: ["grass", "fighting", "ground"],
    immuneTo: [],
  },
  rock: {
    weakTo: ["water", "grass", "fighting", "ground", "steel"],
    resists: ["normal", "fire", "poison", "flying"],
    immuneTo: [],
  },
  ghost: {
    weakTo: ["ghost", "dark"],
    resists: ["poison", "bug"],
    immuneTo: ["normal", "fighting"],
  },
  dragon: {
    weakTo: ["ice", "dragon", "fairy"],
    resists: ["fire", "water", "electric", "grass"],
    immuneTo: [],
  },
  dark: {
    weakTo: ["fighting", "bug", "fairy"],
    resists: ["ghost", "dark"],
    immuneTo: ["psychic"],
  },
  steel: {
    weakTo: ["fire", "fighting", "ground"],
    resists: [
      "normal",
      "grass",
      "ice",
      "flying",
      "psychic",
      "bug",
      "rock",
      "dragon",
      "steel",
      "fairy",
    ],
    immuneTo: ["poison"],
  },
  fairy: {
    weakTo: ["poison", "steel"],
    resists: ["fighting", "bug", "dark"],
    immuneTo: ["dragon"],
  },
};

export type Weakness = {
  type: PokemonType;
  multiplier: number;
};

export function isPokemonType(value: string): value is PokemonType {
  return TYPE_NAMES.includes(value as PokemonType);
}

function getTypeMultiplier(
  attackType: PokemonType,
  defendType: PokemonType,
): number {
  const relations = DEFENSIVE_RELATIONS[defendType];

  if (relations.immuneTo.includes(attackType)) {
    return 0;
  }

  if (relations.weakTo.includes(attackType)) {
    return 2;
  }

  if (relations.resists.includes(attackType)) {
    return 0.5;
  }

  return 1;
}

export function getAttackMultiplierAgainstTypes(
  attackType: PokemonType,
  defendingTypes: PokemonType[],
): number {
  if (defendingTypes.length === 0) {
    return 1;
  }

  const uniqueDefendingTypes = [...new Set(defendingTypes)];

  return uniqueDefendingTypes.reduce((total, defendType) => {
    return total * getTypeMultiplier(attackType, defendType);
  }, 1);
}

export function getWeaknesses(defendingTypes: PokemonType[]): Weakness[] {
  if (defendingTypes.length === 0) {
    return [];
  }

  const weaknesses: Weakness[] = TYPE_NAMES.map((attackType) => {
    const multiplier = getAttackMultiplierAgainstTypes(
      attackType,
      defendingTypes,
    );

    return {
      type: attackType,
      multiplier,
    };
  })
    .filter((entry) => entry.multiplier > 1)
    .sort((a, b) => {
      if (b.multiplier !== a.multiplier) {
        return b.multiplier - a.multiplier;
      }

      return a.type.localeCompare(b.type);
    });

  return weaknesses;
}

export function getImmunities(defendingTypes: PokemonType[]): PokemonType[] {
  if (defendingTypes.length === 0) {
    return [];
  }

  return TYPE_NAMES.filter((attackType) => {
    return getAttackMultiplierAgainstTypes(attackType, defendingTypes) === 0;
  });
}
