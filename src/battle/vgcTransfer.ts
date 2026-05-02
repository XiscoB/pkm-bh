import { isPokemonType, type PokemonType } from "./typeEffectiveness";
import type { EnemyEntry } from "./vgcTypes";

export type ImportedEnemyData = {
  name: string;
  types: PokemonType[];
  moveTypeInput: string;
  onField: boolean;
};

export function exportEnemiesJson(enemies: EnemyEntry[]): string {
  const payload = {
    enemies: enemies.map((e) => ({
      name: e.name,
      types: e.types,
      moveTypeInput: e.moveTypeInput,
      onField: e.onField,
    })),
  };
  return JSON.stringify(payload);
}

export function importEnemiesJson(raw: string): ImportedEnemyData[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON format.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid enemy payload.");
  }

  const payload = parsed as { enemies?: unknown };

  if (!Array.isArray(payload.enemies)) {
    throw new Error("Invalid enemy payload.");
  }

  return payload.enemies.map((entry): ImportedEnemyData => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid enemy entry.");
    }

    const e = entry as Record<string, unknown>;
    const rawTypes = Array.isArray(e.types) ? e.types : [];
    const types = rawTypes.filter((t): t is PokemonType =>
      isPokemonType(String(t)),
    );

    return {
      name: typeof e.name === "string" ? e.name.trim() : "",
      types,
      moveTypeInput: typeof e.moveTypeInput === "string" ? e.moveTypeInput : "",
      onField: typeof e.onField === "boolean" ? e.onField : false,
    };
  });
}
