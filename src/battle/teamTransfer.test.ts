import { describe, expect, it } from "vitest";
import { exportTeamJson, importTeamJson } from "./teamTransfer";

describe("exportTeamJson", () => {
  it("exports normalized team payload with move types", () => {
    expect(
      exportTeamJson(
        [" Pikachu ", "", "Charizard"],
        [" electric, status ", "", " fire, flying, fire "],
      ),
    ).toBe(
      '{"team":[{"name":"pikachu","moveTypes":["electric"]},{"name":"charizard","moveTypes":["fire","flying"]}]}',
    );
  });
});

describe("importTeamJson", () => {
  it("imports normalized team and moveType inputs from entry payload", () => {
    expect(
      importTeamJson(
        '{"team":[{"name":" Gyarados ","moveTypes":["water","flying"]},{"name":"Pikachu","moveTypes":["electric"]},{"name":"","moveTypes":[]}]}',
      ),
    ).toEqual({
      team: ["gyarados", "pikachu"],
      moveTypeInputs: ["water, flying", "electric"],
    });
  });

  it("supports legacy team string payloads", () => {
    expect(importTeamJson('{"team":[" Gyarados ","Pikachu",""]}')).toEqual({
      team: ["gyarados", "pikachu"],
      moveTypeInputs: ["", ""],
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => importTeamJson("not-json")).toThrow("Invalid JSON format.");
  });

  it("throws when payload does not match expected shape", () => {
    expect(() => importTeamJson('{"value":[]}')).toThrow(
      "Invalid import payload.",
    );
  });

  it("throws when team entries do not match supported shapes", () => {
    expect(() => importTeamJson('{"team":["pikachu",123]}')).toThrow(
      "Team entries must include name and moveTypes.",
    );
  });
});
