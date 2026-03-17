import { isPokemonType, type PokemonType } from "../battle/typeEffectiveness";
import { getFilteredCoverageTypes } from "../battle/coverage";

const CACHE_DB_NAME = "pkm-bh-cache";
const CACHE_DB_VERSION = 1;
const POKEMON_STORE = "pokemon";
const TYPE_STORE = "types";

type PokemonApiTypeEntry = {
  type: {
    name: string;
    url: string;
  };
};

type PokemonApiResponse = {
  types: PokemonApiTypeEntry[];
  moves: {
    move: {
      name: string;
      url: string;
    };
  }[];
  sprites?: {
    front_default: string | null;
    other?: {
      [key: string]: {
        front_default: string | null;
      } | null;
    };
  };
};

type TypeApiResponse = {
  name: string;
};

type MoveApiResponse = {
  type: {
    name: string;
  };
  damage_class: {
    name: string;
  };
};

type PokemonListApiResponse = {
  results: {
    name: string;
  }[];
};

type CachedRecord<T> = {
  key: string;
  value: T;
};

let dbPromise: Promise<IDBDatabase> | null = null;
const POKEMON_NAMES_CACHE_KEY = "pkm-bh-pokemon-names";

function openCacheDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(POKEMON_STORE)) {
        database.createObjectStore(POKEMON_STORE, { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains(TYPE_STORE)) {
        database.createObjectStore(TYPE_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB."));
    };
  });

  return dbPromise;
}

async function readCachedValue<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  try {
    const database = await openCacheDatabase();

    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as CachedRecord<T> | undefined;
        resolve(record?.value);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to read from IndexedDB."));
      };
    });
  } catch {
    return undefined;
  }
}

async function writeCachedValue<T>(
  storeName: string,
  key: string,
  value: T,
): Promise<void> {
  try {
    const database = await openCacheDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.put({ key, value } satisfies CachedRecord<T>);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Failed to write to IndexedDB."));
      };
    });
  } catch {
    return;
  }
}

async function fetchPokemonPayload(
  normalizedName: string,
): Promise<PokemonApiResponse> {
  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${normalizedName}`,
  );

  if (!response.ok) {
    throw new Error("Pokemon not found.");
  }

  return (await response.json()) as PokemonApiResponse;
}

async function fetchTypePayload(typeUrl: string): Promise<TypeApiResponse> {
  const response = await fetch(typeUrl);

  if (!response.ok) {
    throw new Error("Type data not found.");
  }

  return (await response.json()) as TypeApiResponse;
}

async function fetchMovePayload(moveUrl: string): Promise<MoveApiResponse> {
  const response = await fetch(moveUrl);

  if (!response.ok) {
    throw new Error("Move data not found.");
  }

  return (await response.json()) as MoveApiResponse;
}

function readCachedPokemonNameIndex(): string[] | null {
  try {
    const raw = localStorage.getItem(POKEMON_NAMES_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    if (!parsed.every((entry) => typeof entry === "string")) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedPokemonNameIndex(names: string[]): void {
  try {
    localStorage.setItem(POKEMON_NAMES_CACHE_KEY, JSON.stringify(names));
  } catch {
    return;
  }
}

export async function fetchPokemonNameIndex(): Promise<string[]> {
  const cachedNames = readCachedPokemonNameIndex();

  if (cachedNames && cachedNames.length > 0) {
    return cachedNames;
  }

  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1302");

  if (!response.ok) {
    throw new Error("Failed to load Pokemon index.");
  }

  const payload = (await response.json()) as PokemonListApiResponse;
  const names = payload.results
    .map((entry) => entry.name.trim().toLowerCase())
    .filter((name) => name.length > 0);

  writeCachedPokemonNameIndex(names);
  return names;
}

async function cachePokemonTypesData(
  payload: PokemonApiResponse,
): Promise<void> {
  await Promise.all(
    payload.types.map(async (entry) => {
      const typeName = entry.type.name.toLowerCase();
      const cachedType = await readCachedValue<TypeApiResponse>(
        TYPE_STORE,
        typeName,
      );

      if (cachedType) {
        return;
      }

      try {
        const typePayload = await fetchTypePayload(entry.type.url);
        await writeCachedValue(TYPE_STORE, typeName, typePayload);
      } catch {
        return;
      }
    }),
  );
}

export function extractPokemonTypes(
  payload: PokemonApiResponse,
): PokemonType[] {
  const types = payload.types
    .map((entry) => entry.type.name.toLowerCase())
    .filter(isPokemonType);

  return [...new Set(types)];
}

export async function fetchPokemonTypes(
  enemyName: string,
): Promise<PokemonType[]> {
  const normalizedName = enemyName.trim().toLowerCase();

  if (!normalizedName) {
    throw new Error("Enter an enemy Pokemon name.");
  }

  const cachedPokemon = await readCachedValue<PokemonApiResponse>(
    POKEMON_STORE,
    normalizedName,
  );

  if (cachedPokemon) {
    void cachePokemonTypesData(cachedPokemon);
    return extractPokemonTypes(cachedPokemon);
  }

  const payload = await fetchPokemonPayload(normalizedName);
  await writeCachedValue(POKEMON_STORE, normalizedName, payload);
  await cachePokemonTypesData(payload);
  return extractPokemonTypes(payload);
}

export async function fetchPokemonCoverageTypes(
  enemyName: string,
): Promise<PokemonType[]> {
  const normalizedName = enemyName.trim().toLowerCase();

  if (!normalizedName) {
    throw new Error("Enter an enemy Pokemon name.");
  }

  const cachedPokemon = await readCachedValue<PokemonApiResponse>(
    POKEMON_STORE,
    normalizedName,
  );

  const payload = cachedPokemon ?? (await fetchPokemonPayload(normalizedName));

  if (!cachedPokemon) {
    await writeCachedValue(POKEMON_STORE, normalizedName, payload);
  }

  const uniqueMoveUrls = [
    ...new Set(payload.moves.map((entry) => entry.move.url)),
  ];

  const moveTypeNames = await Promise.all(
    uniqueMoveUrls.map(async (moveUrl) => {
      const movePayload = await fetchMovePayload(moveUrl);

      return {
        typeName: movePayload.type.name,
        damageClassName: movePayload.damage_class.name,
      };
    }),
  );

  return getFilteredCoverageTypes(moveTypeNames);
}

function extractPokemonSpriteUrl(payload: PokemonApiResponse): string | null {
  const officialArtwork = payload.sprites?.other?.["official-artwork"];

  return (
    officialArtwork?.front_default ?? payload.sprites?.front_default ?? null
  );
}

export async function fetchPokemonSpriteUrl(
  enemyName: string,
): Promise<string | null> {
  const normalizedName = enemyName.trim().toLowerCase();

  if (!normalizedName) {
    throw new Error("Enter an enemy Pokemon name.");
  }

  const cachedPokemon = await readCachedValue<PokemonApiResponse>(
    POKEMON_STORE,
    normalizedName,
  );

  if (cachedPokemon) {
    return extractPokemonSpriteUrl(cachedPokemon);
  }

  const payload = await fetchPokemonPayload(normalizedName);
  await writeCachedValue(POKEMON_STORE, normalizedName, payload);
  return extractPokemonSpriteUrl(payload);
}
