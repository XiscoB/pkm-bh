import { describe, expect, it } from "vitest";
import {
  getAutocompleteDataset,
  getPokemonAutocompleteSuggestions,
} from "./pokemonAutocomplete";

describe("getAutocompleteDataset", () => {
  it("keeps base species and common forms while excluding cosmetic/event variants", () => {
    const dataset = getAutocompleteDataset([
      "pikachu",
      "pikachu-rock-star",
      "rattata-alola",
      "charizard-mega-x",
      "landorus-therian",
      "eevee-gmax",
    ]);

    expect(dataset).toEqual([
      "pikachu",
      "charizard-mega-x",
      "landorus-therian",
      "rattata-alola",
    ]);
  });

  it("keeps paradox species used in VGC", () => {
    const dataset = getAutocompleteDataset([
      "iron-valiant",
      "great-tusk",
      "flutter-mane",
      "pikachu-rock-star",
    ]);

    expect(dataset).toEqual(["flutter-mane", "great-tusk", "iron-valiant"]);
  });
});

describe("getPokemonAutocompleteSuggestions", () => {
  it("prioritizes starts-with and base species before forms", () => {
    const suggestions = getPokemonAutocompleteSuggestions(
      "char",
      ["charmeleon", "charizard-galar", "charizard", "raichu"],
      8,
    );

    expect(suggestions).toEqual(["charmeleon", "charizard", "charizard-galar"]);
  });

  it("matches hyphenated names when query uses spaces", () => {
    const suggestions = getPokemonAutocompleteSuggestions(
      "iron val",
      ["iron-hands", "iron-valiant", "flutter-mane"],
      8,
    );

    expect(suggestions).toEqual(["iron-valiant"]);
  });

  it("returns empty suggestions for empty query", () => {
    expect(getPokemonAutocompleteSuggestions("", ["pikachu"])).toEqual([]);
  });
});
