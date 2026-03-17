import { describe, expect, it } from "vitest";
import { getCoverageTypes, getFilteredCoverageTypes } from "./coverage";

describe("getCoverageTypes", () => {
  it("maps valid move types and deduplicates them", () => {
    const coverage = getCoverageTypes([
      "electric",
      "water",
      "electric",
      "ground",
    ]);

    expect(coverage).toEqual(["electric", "ground", "water"]);
  });

  it("ignores non-pokemon type values", () => {
    const coverage = getCoverageTypes(["fire", "status", "unknown"]);

    expect(coverage).toEqual(["fire"]);
  });
});

describe("getFilteredCoverageTypes", () => {
  it("keeps only physical and special move types", () => {
    const coverage = getFilteredCoverageTypes([
      { typeName: "fire", damageClassName: "special" },
      { typeName: "ground", damageClassName: "physical" },
      { typeName: "normal", damageClassName: "status" },
    ]);

    expect(coverage).toEqual(["fire", "ground"]);
  });
});
