import { describe, expect, it } from "vitest";
import { getWeaknesses } from "./typeEffectiveness";

describe("getWeaknesses", () => {
  it("returns weaknesses for a single type", () => {
    const weaknesses = getWeaknesses(["fire"]);
    const weaknessTypes = weaknesses.map((entry) => entry.type);

    expect(weaknessTypes).toEqual(["ground", "rock", "water"]);
    expect(weaknesses.every((entry) => entry.multiplier === 2)).toBe(true);
  });

  it("calculates stacked weaknesses for dual types", () => {
    const weaknesses = getWeaknesses(["rock", "ground"]);
    const quadrupleWeakness = weaknesses.find(
      (entry) => entry.type === "water",
    );

    expect(quadrupleWeakness?.multiplier).toBe(4);
  });

  it("excludes neutral and resisted types", () => {
    const weaknesses = getWeaknesses(["water"]);
    const weaknessTypes = weaknesses.map((entry) => entry.type);

    expect(weaknessTypes).toEqual(["electric", "grass"]);
  });
});
