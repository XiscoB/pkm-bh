export type BaseStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

function averageDefense(stats: BaseStats): number {
  return (stats.hp + stats.defense + stats.specialDefense) / 3;
}

function averageOffense(stats: BaseStats): number {
  return (stats.attack + stats.specialAttack + stats.speed) / 3;
}

export function getStatProfileSummary(stats: BaseStats): string {
  const defensiveAverage = averageDefense(stats);
  const offensiveAverage = averageOffense(stats);

  if (stats.speed >= 110 && stats.specialAttack >= 100) {
    return "High Speed, special attacker.";
  }

  if (defensiveAverage >= offensiveAverage + 8) {
    return "Defensive / tanky profile.";
  }

  if (offensiveAverage >= defensiveAverage + 8) {
    return "Balanced offensive Pokemon.";
  }

  return "Balanced stat profile.";
}
