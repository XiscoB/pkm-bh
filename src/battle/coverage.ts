import { isPokemonType, type PokemonType } from "./typeEffectiveness";

export type CoverageMove = {
  typeName: string;
  damageClassName: string;
};

export function getCoverageTypes(moveTypeNames: string[]): PokemonType[] {
  const coverageTypes = moveTypeNames
    .map((typeName) => typeName.toLowerCase())
    .filter(isPokemonType);

  return [...new Set(coverageTypes)].sort((a, b) => a.localeCompare(b));
}

export function getFilteredCoverageTypes(moves: CoverageMove[]): PokemonType[] {
  const damagingMoveTypeNames = moves
    .filter((move) => {
      const damageClass = move.damageClassName.toLowerCase();
      return damageClass === "physical" || damageClass === "special";
    })
    .map((move) => move.typeName);

  return getCoverageTypes(damagingMoveTypeNames);
}
