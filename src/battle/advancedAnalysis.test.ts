import { describe, expect, it } from "vitest";
import {
  calculateDangerScore,
  evaluateTeamPokemonAdvanced,
  getCoverageEffectivenessBreakdown,
  getBestSwitchRecommendation,
  parseOptionalMoveTypesInput,
  resolveEnemyAttackTypes,
} from "./advancedAnalysis";

describe("parseOptionalMoveTypesInput", () => {
  it("parses valid move types and ignores invalid values", () => {
    expect(
      parseOptionalMoveTypesInput(" Ice, ground, status, ground "),
    ).toEqual(["ice", "ground"]);
  });
});

describe("calculateDangerScore", () => {
  it("reduces danger score when optional move typing improves offense", () => {
    const withoutOptionalMoves = calculateDangerScore(
      ["water"],
      ["water"],
      ["electric"],
    );

    const withOptionalMoves = calculateDangerScore(
      ["water"],
      ["water"],
      ["electric"],
      ["ground"],
    );

    expect(withOptionalMoves).toBeLessThan(withoutOptionalMoves);
  });
});

describe("evaluateTeamPokemonAdvanced", () => {
  it("includes base labels and danger score", () => {
    expect(
      evaluateTeamPokemonAdvanced(
        "gyarados",
        ["water", "flying"],
        ["fire"],
        ["electric"],
        ["ground"],
      ),
    ).toEqual({
      pokemon: "gyarados",
      strength: "Strong",
      safety: "Risk",
      dangerScore: 8,
      strengthSource: "stab",
      effectiveAttackType: "water",
    });
  });

  it("marks Strong via move coverage when STAB is not effective", () => {
    expect(
      evaluateTeamPokemonAdvanced(
        "blastoise",
        ["water"],
        ["grass"],
        ["fire"],
        ["ice"],
      ),
    ).toMatchObject({
      strength: "Strong",
      strengthSource: "move",
      effectiveAttackType: "ice",
    });
  });

  it("uses move coverage when it is stronger than STAB", () => {
    expect(
      evaluateTeamPokemonAdvanced(
        "gyarados",
        ["water"],
        ["fire", "flying"],
        ["electric"],
        ["rock"],
      ),
    ).toMatchObject({
      strength: "Strong",
      strengthSource: "move",
      effectiveAttackType: "rock",
    });
  });

  it("prefers STAB when STAB and move coverage have equal effectiveness", () => {
    expect(
      evaluateTeamPokemonAdvanced(
        "gyarados",
        ["water"],
        ["fire"],
        ["electric"],
        ["ground"],
      ),
    ).toMatchObject({
      strength: "Strong",
      strengthSource: "stab",
      effectiveAttackType: "water",
    });
  });

  it("marks Weak when no effective coverage and defensively disadvantaged", () => {
    expect(
      evaluateTeamPokemonAdvanced("flareon", ["fire"], ["water"], ["ground"]),
    ).toMatchObject({
      strength: "Weak",
      strengthSource: null,
      effectiveAttackType: null,
    });
  });

  it("marks Neutral when no effective coverage and not defensively disadvantaged", () => {
    expect(
      evaluateTeamPokemonAdvanced("eevee", ["normal"], ["rock"], ["ghost"]),
    ).toMatchObject({
      strength: "Neutral",
      strengthSource: null,
      effectiveAttackType: null,
    });
  });
});

describe("getBestSwitchRecommendation", () => {
  it("returns the lowest danger option", () => {
    const recommendation = getBestSwitchRecommendation([
      {
        pokemon: "charizard",
        strength: "Strong",
        safety: "Risk",
        dangerScore: 9,
        strengthSource: "stab",
        effectiveAttackType: "fire",
      },
      {
        pokemon: "blastoise",
        strength: "Neutral",
        safety: "Safe",
        dangerScore: 2,
        strengthSource: null,
        effectiveAttackType: null,
      },
    ]);

    expect(recommendation?.pokemon).toBe("blastoise");
  });
});

describe("resolveEnemyAttackTypes", () => {
  it("uses known enemy moves plus STAB when known move types are provided", () => {
    expect(
      resolveEnemyAttackTypes(
        ["fire", "flying"],
        ["electric", "rock"],
        ["electric"],
      ),
    ).toEqual({
      mode: "known",
      attackTypes: ["fire", "flying", "electric"],
    });
  });

  it("uses assumed coverage types when known move types are not provided", () => {
    expect(
      resolveEnemyAttackTypes(["fire", "flying"], ["electric", "rock"]),
    ).toEqual({
      mode: "assumed",
      attackTypes: ["electric", "rock"],
    });
  });
});

describe("getCoverageEffectivenessBreakdown", () => {
  it("classifies available types into strong, neutral, resisted, and immune", () => {
    expect(
      getCoverageEffectivenessBreakdown(
        ["electric", "flying"],
        ["normal", "fire"],
        ["ghost", "water"],
      ),
    ).toEqual({
      strong: [{ type: "electric", source: "stab", multiplier: 2 }],
      neutral: [{ type: "flying", source: "stab", multiplier: 1 }],
      resisted: [{ type: "fire", source: "move", multiplier: 0.5 }],
      immune: [{ type: "normal", source: "move", multiplier: 0 }],
    });
  });

  it("marks duplicate type from STAB + moveTypes as STAB and keeps immune entries", () => {
    expect(
      getCoverageEffectivenessBreakdown(
        ["normal"],
        ["normal", "dark"],
        ["ghost"],
      ),
    ).toEqual({
      strong: [{ type: "dark", source: "move", multiplier: 2 }],
      neutral: [],
      resisted: [],
      immune: [{ type: "normal", source: "stab", multiplier: 0 }],
    });
  });
});
