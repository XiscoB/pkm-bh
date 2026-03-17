import { describe, expect, it } from "vitest";
import { getStatProfileSummary, type BaseStats } from "./statProfile";

function buildStats(overrides: Partial<BaseStats>): BaseStats {
  return {
    hp: 80,
    attack: 80,
    defense: 80,
    specialAttack: 80,
    specialDefense: 80,
    speed: 80,
    ...overrides,
  };
}

describe("getStatProfileSummary", () => {
  it("labels fast special attackers", () => {
    expect(
      getStatProfileSummary(buildStats({ speed: 120, specialAttack: 130 })),
    ).toBe("High Speed, special attacker.");
  });

  it("labels defensive distributions", () => {
    expect(
      getStatProfileSummary(
        buildStats({ hp: 110, defense: 130, specialDefense: 120, speed: 60 }),
      ),
    ).toBe("Defensive / tanky profile.");
  });

  it("labels offense-leaning distributions", () => {
    expect(
      getStatProfileSummary(
        buildStats({ attack: 115, specialAttack: 110, speed: 105, hp: 70 }),
      ),
    ).toBe("Balanced offensive Pokemon.");
  });
});
