import { isPokemonType } from "./typeEffectiveness";

export type TeamTransferEntry = {
  name: string;
  moveTypes: string[];
};

export type TeamTransferPayload = {
  team: TeamTransferEntry[];
};

export type ImportedTeamState = {
  team: string[];
  moveTypeInputs: string[];
};

function normalizePokemonName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeMoveTypes(moveTypes: string[]): string[] {
  return [
    ...new Set(
      moveTypes
        .map((value) => value.trim().toLowerCase())
        .filter(isPokemonType),
    ),
  ];
}

function normalizeTeamEntries(
  team: string[],
  moveTypeInputs: string[],
): TeamTransferEntry[] {
  return team
    .map((rawName, index) => {
      const name = normalizePokemonName(rawName);
      const parsedMoveTypes = normalizeMoveTypes(
        (moveTypeInputs[index] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      );

      return {
        name,
        moveTypes: parsedMoveTypes,
      };
    })
    .filter((entry) => entry.name.length > 0);
}

export function exportTeamJson(
  team: string[],
  moveTypeInputs: string[],
): string {
  const payload: TeamTransferPayload = {
    team: normalizeTeamEntries(team, moveTypeInputs),
  };

  return JSON.stringify(payload);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function formatMoveTypesInput(moveTypes: string[]): string {
  return moveTypes.join(", ");
}

export function importTeamJson(raw: string): ImportedTeamState {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON format.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid import payload.");
  }

  const maybePayload = parsed as { team?: unknown };

  if (!Array.isArray(maybePayload.team)) {
    throw new Error("Invalid import payload.");
  }

  if (isStringArray(maybePayload.team)) {
    const normalizedTeam = maybePayload.team
      .map((name) => normalizePokemonName(name))
      .filter((name) => name.length > 0);

    return {
      team: normalizedTeam,
      moveTypeInputs: Array(normalizedTeam.length).fill(""),
    };
  }

  const normalizedEntries = maybePayload.team.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Team entries must include name and moveTypes.");
    }

    const maybeEntry = entry as { name?: unknown; moveTypes?: unknown };

    if (typeof maybeEntry.name !== "string") {
      throw new Error("Team entries must include name and moveTypes.");
    }

    if (!isStringArray(maybeEntry.moveTypes)) {
      throw new Error("Team entries must include name and moveTypes.");
    }

    return {
      name: normalizePokemonName(maybeEntry.name),
      moveTypes: normalizeMoveTypes(maybeEntry.moveTypes),
    };
  });

  const filteredEntries = normalizedEntries.filter(
    (entry) => entry.name.length > 0,
  );

  return {
    team: filteredEntries.map((entry) => entry.name),
    moveTypeInputs: filteredEntries.map((entry) =>
      formatMoveTypesInput(entry.moveTypes),
    ),
  };
}
