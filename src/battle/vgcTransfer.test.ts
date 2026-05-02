import { describe, expect, it } from "vitest";
import { exportEnemiesJson, importEnemiesJson } from "./vgcTransfer";
import type { EnemyEntry } from "./vgcTypes";

function makeEnemy(
  name: string,
  types: string[],
  moveTypeInput: string,
  onField: boolean,
): EnemyEntry {
  return {
    id: "e1",
    name,
    types: types as EnemyEntry["types"],
    moveTypeInput,
    fetchedCoverageTypes: [],
    spriteUrl: null,
    baseStats: null,
    onField,
  };
}

describe("exportEnemiesJson", () => {
  it("exports enemies with all fields", () => {
    const enemies = [
      makeEnemy("charizard", ["fire", "flying"], "dragon", true),
      makeEnemy("blastoise", ["water"], "ice", false),
    ];
    expect(exportEnemiesJson(enemies)).toBe(
      '{"enemies":[{"name":"charizard","types":["fire","flying"],"moveTypeInput":"dragon","onField":true},{"name":"blastoise","types":["water"],"moveTypeInput":"ice","onField":false}]}',
    );
  });

  it("exports empty array when no enemies", () => {
    expect(exportEnemiesJson([])).toBe('{"enemies":[]}');
  });
});

describe("importEnemiesJson", () => {
  it("imports valid enemy payload", () => {
    const result = importEnemiesJson(
      '{"enemies":[{"name":"charizard","types":["fire","flying"],"moveTypeInput":"dragon","onField":true}]}',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "charizard",
      types: ["fire", "flying"],
      moveTypeInput: "dragon",
      onField: true,
    });
  });

  it("ignores invalid type values", () => {
    const result = importEnemiesJson(
      '{"enemies":[{"name":"x","types":["fire","notatype","water"],"moveTypeInput":"","onField":false}]}',
    );
    expect(result[0].types).toEqual(["fire", "water"]);
  });

  it("defaults missing fields", () => {
    const result = importEnemiesJson('{"enemies":[{}]}');
    expect(result[0]).toEqual({
      name: "",
      types: [],
      moveTypeInput: "",
      onField: false,
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => importEnemiesJson("not-json")).toThrow("Invalid JSON format.");
  });

  it("throws when enemies array is missing", () => {
    expect(() => importEnemiesJson('{"value":[]}')).toThrow(
      "Invalid enemy payload.",
    );
  });
});
