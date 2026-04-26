import { describe, it, expect } from "vitest";
import {
  evaluateField2v2,
  evaluateRosterVsAllEnemies,
  buildEnemyAttackTypes,
  type ActiveMyPokemon,
} from "./vgcAnalysis";
import type { EnemyEntry } from "./vgcTypes";
import type { PokemonType } from "./typeEffectiveness";

function makeEnemy(
  id: string,
  types: PokemonType[],
  fetchedCoverage: PokemonType[] = [],
  onField = false,
): EnemyEntry {
  return {
    id,
    name: "",
    types,
    moveTypeInput: "",
    fetchedCoverageTypes: fetchedCoverage,
    spriteUrl: null,
    onField,
  };
}

function makeMyPokemon(
  name: string,
  types: PokemonType[],
  moveTypes: PokemonType[] = [],
): ActiveMyPokemon {
  return { name, types, moveTypes };
}

describe("evaluateField2v2", () => {
  it("returns NxM grid for N my pokemon vs M enemy pokemon", () => {
    const myField = [
      makeMyPokemon("gyarados", ["water", "flying"]),
      makeMyPokemon("pikachu", ["electric"]),
    ];
    const enemyField = [makeEnemy("e1", ["fire", "flying"]), makeEnemy("e2", ["water"])];
    const grid = evaluateField2v2(myField, enemyField);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(2);
    expect(grid[1]).toHaveLength(2);
    expect(grid[0][0].myPokemonName).toBe("gyarados");
    expect(grid[0][0].enemyId).toBe("e1");
    expect(grid[1][1].myPokemonName).toBe("pikachu");
    expect(grid[1][1].enemyId).toBe("e2");
  });

  it("pikachu (electric) is Strong vs water type enemy", () => {
    const myField = [makeMyPokemon("pikachu", ["electric"])];
    const enemyField = [makeEnemy("e1", ["water"])];
    const grid = evaluateField2v2(myField, enemyField);
    expect(grid[0][0].evaluation.strength).toBe("Strong");
  });

  it("water type is at risk vs grass enemy with grass coverage", () => {
    const myField = [makeMyPokemon("vaporeon", ["water"])];
    const enemyField = [makeEnemy("e1", ["grass"], ["grass"])];
    const grid = evaluateField2v2(myField, enemyField);
    expect(grid[0][0].evaluation.safety).toBe("Risk");
  });

  it("returns empty row for empty enemy field", () => {
    const myField = [makeMyPokemon("pikachu", ["electric"])];
    const grid = evaluateField2v2(myField, []);
    expect(grid).toHaveLength(1);
    expect(grid[0]).toHaveLength(0);
  });

  it("returns empty grid for empty my field", () => {
    const grid = evaluateField2v2([], [makeEnemy("e1", ["water"])]);
    expect(grid).toHaveLength(0);
  });

  it("populates myTypes and enemyTypes correctly in cell", () => {
    const myField = [makeMyPokemon("bulbasaur", ["grass", "poison"])];
    const enemyField = [makeEnemy("e1", ["fire", "flying"])];
    const grid = evaluateField2v2(myField, enemyField);
    expect(grid[0][0].myTypes).toEqual(["grass", "poison"]);
    expect(grid[0][0].enemyTypes).toEqual(["fire", "flying"]);
  });

  it("normal type vs ghost enemy results in immune coverage", () => {
    const myField = [makeMyPokemon("snorlax", ["normal"])];
    const enemyField = [makeEnemy("e1", ["ghost"])];
    const grid = evaluateField2v2(myField, enemyField);
    // Normal moves don't affect Ghost
    expect(grid[0][0].evaluation.strength).not.toBe("Strong");
  });
});

describe("buildEnemyAttackTypes", () => {
  it("uses fetched coverage when no known move types are provided", () => {
    const enemy = makeEnemy("e1", ["fire"], ["fire", "dragon", "flying"]);
    const { attackTypes, mode } = buildEnemyAttackTypes(enemy);
    expect(attackTypes).toContain("dragon");
    expect(mode).toBe("assumed");
  });

  it("falls back to enemy types when no fetched coverage and no known moves", () => {
    const enemy = makeEnemy("e1", ["electric"], []);
    const { attackTypes } = buildEnemyAttackTypes(enemy);
    expect(attackTypes).toContain("electric");
  });

  it("uses known move types when provided", () => {
    const enemy: EnemyEntry = {
      ...makeEnemy("e1", ["fire"], ["fire", "dragon"]),
      moveTypeInput: "ice, electric",
    };
    const { attackTypes, mode } = buildEnemyAttackTypes(enemy);
    expect(attackTypes).toContain("ice");
    expect(attackTypes).toContain("electric");
    expect(mode).toBe("known");
  });

  it("includes enemy types in known mode attack types", () => {
    const enemy: EnemyEntry = {
      ...makeEnemy("e1", ["water"]),
      moveTypeInput: "ice",
    };
    const { attackTypes } = buildEnemyAttackTypes(enemy);
    expect(attackTypes).toContain("water");
    expect(attackTypes).toContain("ice");
  });
});

describe("evaluateRosterVsAllEnemies", () => {
  it("returns empty when no enemies", () => {
    const roster = [makeMyPokemon("pikachu", ["electric"])];
    expect(evaluateRosterVsAllEnemies(roster, [])).toHaveLength(0);
  });

  it("returns one summary per roster pokemon", () => {
    const roster = [
      makeMyPokemon("pikachu", ["electric"]),
      makeMyPokemon("bulbasaur", ["grass", "poison"]),
    ];
    const enemies = [makeEnemy("e1", ["water"])];
    const summaries = evaluateRosterVsAllEnemies(roster, enemies);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].pokemonName).toBe("pikachu");
    expect(summaries[1].pokemonName).toBe("bulbasaur");
  });

  it("pikachu (electric) is strong vs water enemies", () => {
    const roster = [makeMyPokemon("pikachu", ["electric"])];
    const enemies = [makeEnemy("e1", ["water"]), makeEnemy("e2", ["water", "flying"])];
    const summaries = evaluateRosterVsAllEnemies(roster, enemies);
    expect(summaries[0].strongCount).toBe(2);
    expect(summaries[0].weakCount).toBe(0);
  });

  it("reports maxDangerScore correctly", () => {
    const roster = [makeMyPokemon("pikachu", ["electric"])];
    const enemies = [
      makeEnemy("e1", ["water"], ["water"]),
      makeEnemy("e2", ["ground"], ["ground"]),
    ];
    const summaries = evaluateRosterVsAllEnemies(roster, enemies);
    expect(summaries[0].maxDangerScore).toBeGreaterThan(0);
  });

  it("counts neutral matchups correctly", () => {
    const roster = [makeMyPokemon("clefairy", ["normal"])];
    const enemies = [makeEnemy("e1", ["water"]), makeEnemy("e2", ["fire"])];
    const summaries = evaluateRosterVsAllEnemies(roster, enemies);
    // Normal type has no super-effective coverage vs water or fire by default
    expect(summaries[0].neutralCount + summaries[0].weakCount).toBe(2);
  });
});
