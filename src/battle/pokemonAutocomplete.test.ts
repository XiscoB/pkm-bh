import { describe, expect, it } from "vitest";
import {
  getAutocompleteDataset,
  getPokemonAutocompleteSuggestions,
} from "./pokemonAutocomplete";

describe("getAutocompleteDataset", () => {
  it("keeps base species and common forms while excluding special variants", () => {
    const dataset = getAutocompleteDataset([
      "pikachu",
      "pikachu-rock-star",
      "rattata-alola",
      "charizard-mega-x",
      "landorus-therian",
      "eevee-gmax",
    ]);

    expect(dataset).toEqual(["pikachu", "landorus-therian", "rattata-alola"]);
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

  it("returns empty suggestions for empty query", () => {
    expect(getPokemonAutocompleteSuggestions("", ["pikachu"])).toEqual([]);
  });
});
