import { describe, expect, it } from "vitest";
import {
  evaluateTeamPokemon,
  getTeamPokemonSafety,
  getTeamPokemonStrength,
  parseTeamInput,
} from "./teamEvaluation";

describe("parseTeamInput", () => {
  it("parses comma-separated names into normalized team entries", () => {
    expect(parseTeamInput(" Pikachu, Charizard , ,Blastoise")).toEqual([
      "pikachu",
      "charizard",
      "blastoise",
    ]);
  });
});

describe("getTeamPokemonStrength", () => {
  it("returns Strong when team pokemon can hit enemy super effectively", () => {
    expect(getTeamPokemonStrength(["water"], ["fire"])).toBe("Strong");
  });

  it("returns Weak when best available attack is resisted", () => {
    expect(getTeamPokemonStrength(["normal"], ["rock", "steel"])).toBe("Weak");
  });

  it("returns Neutral when best available attack is neutral", () => {
    expect(getTeamPokemonStrength(["normal"], ["fire"])).toBe("Neutral");
  });

  it("returns Weak when no attack is super effective and one type is resisted", () => {
    expect(
      getTeamPokemonStrength(["grass", "poison"], ["fire", "flying"]),
    ).toBe("Weak");
  });
});

describe("getTeamPokemonSafety", () => {
  it("returns Risk when enemy coverage includes super effective damage", () => {
    expect(getTeamPokemonSafety(["water"], ["electric", "ground"])).toBe(
      "Risk",
    );
  });

  it("returns Safe when enemy coverage is not super effective", () => {
    expect(getTeamPokemonSafety(["water"], ["fire"])).toBe("Safe");
  });
});

describe("evaluateTeamPokemon", () => {
  it("returns combined strength and safety labels", () => {
    expect(
      evaluateTeamPokemon(
        "gyarados",
        ["water", "flying"],
        ["fire"],
        ["electric"],
      ),
    ).toEqual({
      pokemon: "gyarados",
      strength: "Strong",
      safety: "Risk",
    });
  });
});
