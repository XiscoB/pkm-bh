const EXCLUDED_FORM_TOKENS = new Set([
  "totem",
  "starter",
  "gmax",
  "cap",
  "cosplay",
  "belle",
  "pop",
  "rock",
  "libre",
  "phd",
  "partner",
  "world",
  "event",
  "go",
  "build",
]);

const COMMON_FORM_SUFFIXES = new Set([
  "alola",
  "galar",
  "hisui",
  "paldea",
  "therian",
  "incarnate",
  "wash",
  "heat",
  "frost",
  "fan",
  "mow",
  "attack",
  "defense",
  "speed",
  "origin",
  "altered",
]);

const PARADOX_PREFIXES = new Set([
  "great",
  "scream",
  "brute",
  "flutter",
  "slither",
  "sandy",
  "roaring",
  "walking",
  "gouging",
  "raging",
  "iron",
]);

function hasExcludedFormToken(tokens: string[]): boolean {
  return tokens.some((token) => EXCLUDED_FORM_TOKENS.has(token));
}

function isBaseOrCommonForm(name: string): boolean {
  const parts = name.split("-");

  if (parts.length === 1) {
    return true;
  }

  const suffixTokens = parts.slice(1);

  if (hasExcludedFormToken(suffixTokens)) {
    return false;
  }

  if (parts.length === 2 && PARADOX_PREFIXES.has(parts[0])) {
    return true;
  }

  if (suffixTokens[0] === "mega") {
    return (
      suffixTokens.length === 1 ||
      (suffixTokens.length === 2 &&
        (suffixTokens[1] === "x" || suffixTokens[1] === "y"))
    );
  }

  return suffixTokens.length === 1 && COMMON_FORM_SUFFIXES.has(suffixTokens[0]);
}

function getSuggestionBucket(name: string): number {
  return name.includes("-") ? 1 : 0;
}

export function getAutocompleteDataset(names: string[]): string[] {
  const filtered = names.filter((name) => isBaseOrCommonForm(name));

  return filtered.sort((left, right) => {
    const bucketDelta = getSuggestionBucket(left) - getSuggestionBucket(right);

    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    return left.localeCompare(right);
  });
}

export function getPokemonAutocompleteSuggestions(
  queryValue: string,
  dataset: string[],
  limit = 8,
): string[] {
  const query = queryValue.trim().toLowerCase().replace(/\s+/g, "-");

  if (query.length === 0) {
    return [];
  }

  const startsWithBase: string[] = [];
  const startsWithForms: string[] = [];
  const includesBase: string[] = [];
  const includesForms: string[] = [];

  for (const pokemonName of dataset) {
    if (pokemonName === query) {
      continue;
    }

    const isForm = pokemonName.includes("-");

    if (pokemonName.startsWith(query)) {
      if (isForm) {
        startsWithForms.push(pokemonName);
      } else {
        startsWithBase.push(pokemonName);
      }
    } else if (pokemonName.includes(query)) {
      if (isForm) {
        includesForms.push(pokemonName);
      } else {
        includesBase.push(pokemonName);
      }
    }

    if (
      startsWithBase.length +
        startsWithForms.length +
        includesBase.length +
        includesForms.length >=
      limit
    ) {
      break;
    }
  }

  return [
    ...startsWithBase,
    ...startsWithForms,
    ...includesBase,
    ...includesForms,
  ].slice(0, limit);
}
