import { useEffect, useMemo, useState } from "react";
import {
  getAttackMultiplierAgainstTypes,
  getImmunities,
  getWeaknesses,
  TYPE_NAMES,
  type PokemonType,
} from "./battle/typeEffectiveness";
import { getStatProfileSummary } from "./battle/statProfile";
import {
  type TeamMatchupSafety,
  type TeamMatchupStrength,
} from "./battle/teamEvaluation";
import { exportTeamJson, importTeamJson } from "./battle/teamTransfer";
import {
  evaluateTeamPokemonAdvanced,
  getBestSwitchRecommendation,
  parseOptionalMoveTypesInput,
  resolveEnemyAttackTypes,
  type AdvancedTeamEvaluation,
  type EnemyCoverageMode,
} from "./battle/advancedAnalysis";
import {
  getAutocompleteDataset,
  getPokemonAutocompleteSuggestions,
} from "./battle/pokemonAutocomplete";
import {
  fetchPokemonBaseStats,
  fetchPokemonCoverageTypes,
  fetchPokemonNameIndex,
  fetchPokemonSpriteUrl,
  type PokemonBaseStats,
  fetchPokemonTypes,
} from "./data/pokeapi";

const TEAM_STORAGE_KEY = "pkm-bh-team";

type SavedTeamState = {
  teamSlots: string[];
  teamMoveTypeInputs: string[];
};

function normalizeSavedTeam(rawTeam: unknown): string[] {
  if (!Array.isArray(rawTeam)) {
    return [""];
  }

  const team = rawTeam
    .map((value) => (typeof value === "string" ? value : ""))
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0);

  if (team.length === 0) {
    return [""];
  }

  return team;
}

function loadSavedTeamState(): SavedTeamState {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);

    if (!raw) {
      return { teamSlots: [""], teamMoveTypeInputs: [""] };
    }

    const parsed = JSON.parse(raw);
    const defaultState = { teamSlots: [""], teamMoveTypeInputs: [""] };

    // Backward compatibility with older array-only storage.
    if (Array.isArray(parsed)) {
      const teamSlots = normalizeSavedTeam(parsed);
      return {
        teamSlots,
        teamMoveTypeInputs: Array(teamSlots.length).fill(""),
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return defaultState;
    }

    const parsedRecord = parsed as {
      team?: unknown;
      moveTypeInputs?: unknown;
    };
    const teamSlots = normalizeSavedTeam(parsedRecord.team);
    const rawMoveTypeInputs = Array.isArray(parsedRecord.moveTypeInputs)
      ? parsedRecord.moveTypeInputs
      : [];
    const teamMoveTypeInputs = teamSlots.map((_, index) => {
      const value = rawMoveTypeInputs[index];
      return typeof value === "string" ? value : "";
    });

    return { teamSlots, teamMoveTypeInputs };
  } catch {
    return { teamSlots: [""], teamMoveTypeInputs: [""] };
  }
}

function formatPokemonName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function strengthClassName(strength: TeamMatchupStrength): string {
  if (strength === "Strong") {
    return "status status-strong";
  }

  if (strength === "Weak") {
    return "status status-weak";
  }

  return "status status-neutral";
}

function safetyClassName(safety: TeamMatchupSafety): string {
  if (safety === "Safe") {
    return "status status-safe";
  }

  return "status status-risk";
}

function weaknessClassName(multiplier: number): string {
  if (multiplier >= 4) {
    return "chip chip-danger";
  }

  if (multiplier > 1) {
    return "chip chip-warn";
  }

  return "chip";
}

function formatTypeList(types: PokemonType[]): string {
  return types.map((type) => formatPokemonName(type)).join("/");
}

function getLastCommaSeparatedToken(value: string): string {
  const parts = value.split(",");
  return (parts[parts.length - 1] ?? "").trim().toLowerCase();
}

function applyCommaSeparatedSuggestion(
  currentValue: string,
  suggestion: string,
): string {
  const committedParts = currentValue
    .split(",")
    .slice(0, -1)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);

  return [...committedParts, suggestion].join(", ");
}

function normalizePokemonNameInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_full, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

function getStrongAgainstTypes(attackTypes: PokemonType[]): PokemonType[] {
  if (attackTypes.length === 0) {
    return [];
  }

  return TYPE_NAMES.filter((defendingType) => {
    return attackTypes.some(
      (attackType) =>
        getAttackMultiplierAgainstTypes(attackType, [defendingType]) > 1,
    );
  });
}

function getStrengthExplanation(
  evaluation: AdvancedTeamEvaluation,
  teamTypes: PokemonType[],
  enemyTypes: PokemonType[],
): string {
  const teamTypeLabel = formatTypeList(teamTypes);
  const enemyTypeLabel = formatTypeList(enemyTypes);

  if (evaluation.strength === "Strong") {
    if (evaluation.effectiveAttackType) {
      if (evaluation.strengthSource === "move") {
        return `${formatPokemonName(evaluation.effectiveAttackType)} coverage (TM) is super effective vs ${enemyTypeLabel}.`;
      }

      return `${formatPokemonName(evaluation.effectiveAttackType)} is super effective vs ${enemyTypeLabel}.`;
    }

    return `Strong: ${teamTypeLabel} has an advantage into ${enemyTypeLabel}.`;
  }

  if (evaluation.strength === "Weak") {
    return `Weak: ${teamTypeLabel} is resisted or pressured by ${enemyTypeLabel}.`;
  }

  return `Neutral: no clear type edge for ${teamTypeLabel} into ${enemyTypeLabel}.`;
}

function formatThreatTypeLabel(
  attackType: PokemonType,
  enemyTypes: PokemonType[],
  coverageMode: EnemyCoverageMode,
): string {
  const typeLabel = formatPokemonName(attackType);

  if (coverageMode === "assumed" && !enemyTypes.includes(attackType)) {
    return `${typeLabel} coverage (TM)`;
  }

  return `${typeLabel} coverage`;
}

function getDangerLevel(score: number): "Low" | "Medium" | "High" {
  if (score <= 5) {
    return "Low";
  }

  if (score <= 8) {
    return "Medium";
  }

  return "High";
}

function getSafetyExplanation(
  safety: TeamMatchupSafety,
  teamTypes: PokemonType[],
  coverageTypes: PokemonType[],
  enemyTypes: PokemonType[],
  coverageMode: EnemyCoverageMode,
): string {
  const teamTypeLabel = formatTypeList(teamTypes);

  if (safety === "Safe") {
    return `Safe: enemy coverage has no clear edge into ${teamTypeLabel}.`;
  }

  const threateningType = coverageTypes.find(
    (coverageType) =>
      getAttackMultiplierAgainstTypes(coverageType, teamTypes) > 1,
  );

  return threateningType
    ? `Risk: ${formatThreatTypeLabel(threateningType, enemyTypes, coverageMode)} threatens ${teamTypeLabel}.`
    : `Risk: enemy coverage is effective against ${teamTypeLabel}.`;
}

function getDangerExplanation(
  dangerScore: number,
  teamTypes: PokemonType[],
  coverageTypes: PokemonType[],
  enemyTypes: PokemonType[],
  coverageMode: EnemyCoverageMode,
): string {
  const teamTypeLabel = formatTypeList(teamTypes);
  const dangerLevel = getDangerLevel(dangerScore);
  const threateningCoverage = coverageTypes
    .map((coverageType) => {
      const multiplier = getAttackMultiplierAgainstTypes(
        coverageType,
        teamTypes,
      );
      return {
        type: coverageType,
        multiplier,
      };
    })
    .filter((entry) => entry.multiplier > 1)
    .sort((left, right) => {
      if (right.multiplier !== left.multiplier) {
        return right.multiplier - left.multiplier;
      }

      return left.type.localeCompare(right.type);
    });
  const highlightedThreats = threateningCoverage.slice(0, 2);
  const highlightedThreatLabel = highlightedThreats
    .map((entry) => formatThreatTypeLabel(entry.type, enemyTypes, coverageMode))
    .join(" and ");

  if (dangerLevel === "Low") {
    if (highlightedThreats.length === 0) {
      return "Low danger: low overall risk with limited coverage pressure.";
    }

    return `Low danger: low overall risk, but ${highlightedThreatLabel} can pressure ${teamTypeLabel}.`;
  }

  if (dangerLevel === "Medium") {
    if (highlightedThreats.length >= 2) {
      return `Medium danger: moderate overall risk from multiple threats. ${highlightedThreatLabel} can pressure ${teamTypeLabel}.`;
    }

    if (highlightedThreats.length === 1) {
      return `Medium danger: moderate overall risk from targeted pressure. ${highlightedThreatLabel} can pressure ${teamTypeLabel}.`;
    }

    return "Medium danger: moderate overall risk from offense and defense pressure.";
  }

  if (highlightedThreats.length > 0) {
    return `High danger: high overall risk with direct defensive pressure. ${highlightedThreatLabel} is especially threatening.`;
  }

  return "High danger: high overall risk from severe matchup pressure.";
}

function formatStrengthLabel(evaluation: AdvancedTeamEvaluation): string {
  return evaluation.strength;
}

type PokemonAutocompleteInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSuggestionSelect: (nextValue: string) => void;
  suggestionDataset: string[];
  onEnterPressed?: (value: string) => void;
  getSuggestionQuery?: (value: string) => string;
  applySuggestion?: (currentValue: string, suggestion: string) => string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
};

function PokemonAutocompleteInput({
  value,
  onValueChange,
  onSuggestionSelect,
  suggestionDataset,
  onEnterPressed,
  getSuggestionQuery,
  applySuggestion,
  id,
  placeholder,
  ariaLabel,
}: PokemonAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const queryValue = getSuggestionQuery ? getSuggestionQuery(value) : value;
    return getPokemonAutocompleteSuggestions(queryValue, suggestionDataset);
  }, [value, suggestionDataset, getSuggestionQuery]);

  return (
    <div className="autocomplete-wrap">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
          setActiveSuggestionIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && isOpen && suggestions.length > 0) {
            event.preventDefault();
            setActiveSuggestionIndex((current) =>
              current < suggestions.length - 1 ? current + 1 : 0,
            );
            return;
          }

          if (event.key === "ArrowUp" && isOpen && suggestions.length > 0) {
            event.preventDefault();
            setActiveSuggestionIndex((current) =>
              current > 0 ? current - 1 : suggestions.length - 1,
            );
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (
              isOpen &&
              suggestions.length > 0 &&
              activeSuggestionIndex >= 0
            ) {
              const selectedSuggestion = suggestions[activeSuggestionIndex];
              const nextValue = applySuggestion
                ? applySuggestion(value, selectedSuggestion)
                : selectedSuggestion;
              onSuggestionSelect(nextValue);
              onEnterPressed?.(nextValue);
            } else {
              onEnterPressed?.(value);
            }
            setIsOpen(false);
            setActiveSuggestionIndex(-1);
            return;
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setActiveSuggestionIndex(-1);
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            setActiveSuggestionIndex(-1);
          }, 100);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 ? (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                className={
                  index === activeSuggestionIndex
                    ? "autocomplete-option is-active"
                    : "autocomplete-option"
                }
                onMouseDown={() => {
                  const nextValue = applySuggestion
                    ? applySuggestion(value, suggestion)
                    : suggestion;
                  onSuggestionSelect(nextValue);
                  setIsOpen(false);
                  setActiveSuggestionIndex(-1);
                }}
              >
                {formatPokemonName(suggestion)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function hasNonEmptyTeam(team: string[]): boolean {
  return team.some((name) => name.trim().length > 0);
}

function App() {
  const initialSavedTeamState = useMemo(() => loadSavedTeamState(), []);
  const [enemyName, setEnemyName] = useState("");
  const [enemyMoveTypeInput, setEnemyMoveTypeInput] = useState("");
  const [pokemonNameIndex, setPokemonNameIndex] = useState<string[]>([]);
  const [isTeamEditorOpen, setIsTeamEditorOpen] = useState(false);
  const [teamSlots, setTeamSlots] = useState<string[]>(
    initialSavedTeamState.teamSlots,
  );
  const [teamMoveTypeInputs, setTeamMoveTypeInputs] = useState<string[]>(
    initialSavedTeamState.teamMoveTypeInputs,
  );
  const [enemyTypes, setEnemyTypes] = useState<PokemonType[]>([]);
  const [enemyCoverageMode, setEnemyCoverageMode] =
    useState<EnemyCoverageMode>("assumed");
  const [knownEnemyCoverageTypes, setKnownEnemyCoverageTypes] = useState<
    PokemonType[]
  >([]);
  const [coverageTypes, setCoverageTypes] = useState<PokemonType[]>([]);
  const [enemySpriteUrl, setEnemySpriteUrl] = useState<string | null>(null);
  const [enemyBaseStats, setEnemyBaseStats] = useState<PokemonBaseStats | null>(
    null,
  );
  const [isEnemyStatsOpen, setIsEnemyStatsOpen] = useState(false);
  const [teamEvaluations, setTeamEvaluations] = useState<
    AdvancedTeamEvaluation[]
  >([]);
  const [teamTypeMap, setTeamTypeMap] = useState<Record<string, PokemonType[]>>(
    {},
  );
  const [teamSpriteUrls, setTeamSpriteUrls] = useState<
    Record<string, string | null>
  >({});
  const [activeExplanationKey, setActiveExplanationKey] = useState<
    string | null
  >(null);
  const [activeTmExplanationPokemon, setActiveTmExplanationPokemon] = useState<
    string | null
  >(null);
  const [bestSwitch, setBestSwitch] = useState<AdvancedTeamEvaluation | null>(
    null,
  );
  const [transferText, setTransferText] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTeamLegendOpen, setIsTeamLegendOpen] = useState(false);

  const autocompleteDataset = useMemo(() => {
    return getAutocompleteDataset(pokemonNameIndex);
  }, [pokemonNameIndex]);

  const moveTypeDataset = useMemo(() => {
    return [...TYPE_NAMES];
  }, []);

  const weaknesses = getWeaknesses(enemyTypes);
  const immunities = getImmunities(enemyTypes);
  const enemyStrongAgainst = getStrongAgainstTypes(enemyTypes);
  const hasEnemySnapshotData =
    enemyTypes.length > 0 ||
    weaknesses.length > 0 ||
    enemyStrongAgainst.length > 0 ||
    coverageTypes.length > 0;
  const hasTeamEvaluationData = teamEvaluations.length > 0;
  const showBattleEmptyState = !hasEnemySnapshotData && !hasTeamEvaluationData;

  useEffect(() => {
    void fetchPokemonNameIndex()
      .then((names) => {
        setPokemonNameIndex(names);
      })
      .catch(() => {
        setPokemonNameIndex([]);
      });
  }, []);

  useEffect(() => {
    const teamToSave = teamSlots
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0);
    const moveTypeInputsToSave = teamToSave.map((_, index) => {
      return teamMoveTypeInputs[index] ?? "";
    });

    localStorage.setItem(
      TEAM_STORAGE_KEY,
      JSON.stringify({
        team: teamToSave,
        moveTypeInputs: moveTypeInputsToSave,
      }),
    );
  }, [teamSlots, teamMoveTypeInputs]);

  const updateTeamSlot = (index: number, value: string) => {
    setTeamSlots((current) =>
      current.map((entry, slotIndex) =>
        slotIndex === index ? normalizePokemonNameInput(value) : entry,
      ),
    );
  };

  const updateTeamMoveTypeInput = (index: number, value: string) => {
    setTeamMoveTypeInputs((current) =>
      current.map((entry, slotIndex) => (slotIndex === index ? value : entry)),
    );
  };

  const addTeamSlot = () => {
    setTeamSlots((current) => [...current, ""]);
    setTeamMoveTypeInputs((current) => [...current, ""]);
  };

  const removeTeamSlot = (index: number) => {
    setTeamSlots((current) => {
      const next = current.filter((_, slotIndex) => slotIndex !== index);
      return next.length > 0 ? next : [""];
    });

    setTeamMoveTypeInputs((current) => {
      const next = current.filter((_, slotIndex) => slotIndex !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const applyImportedTeam = (team: string[]) => {
    const nextTeam = team.length > 0 ? team : [""];
    setTeamSlots(nextTeam);
    setTeamMoveTypeInputs(Array(nextTeam.length).fill(""));
  };

  const applyImportedTeamState = (team: string[], moveTypeInputs: string[]) => {
    if (team.length === 0) {
      applyImportedTeam([]);
      return;
    }

    setTeamSlots(team);
    setTeamMoveTypeInputs(
      team.map((_, index) => {
        return moveTypeInputs[index] ?? "";
      }),
    );
  };

  const handleExportJson = () => {
    setTransferText(exportTeamJson(teamSlots, teamMoveTypeInputs));
    setTransferMessage("Team JSON ready.");
  };

  const handleCopyJson = async () => {
    const json = exportTeamJson(teamSlots, teamMoveTypeInputs);

    try {
      await navigator.clipboard.writeText(json);
      setTransferText(json);
      setTransferMessage("Team JSON copied to clipboard.");
    } catch {
      setTransferMessage("Clipboard copy failed.");
    }
  };

  const handleImportJson = (raw: string) => {
    try {
      const importedTeam = importTeamJson(raw);
      applyImportedTeamState(importedTeam.team, importedTeam.moveTypeInputs);
      setTransferMessage("Team imported.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setTransferMessage(message);
    }
  };

  const handlePasteAndImport = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setTransferText(clipboardText);
      handleImportJson(clipboardText);
    } catch {
      setTransferMessage("Clipboard paste failed.");
    }
  };

  const handleAnalyze = async (
    enemyNameOverride?: string,
    teamSlotsOverride?: string[],
  ) => {
    const currentEnemyName = (enemyNameOverride ?? enemyName)
      .trim()
      .toLowerCase();
    const currentTeamSlots = teamSlotsOverride ?? teamSlots;
    const enemyKnownMoveTypes = parseOptionalMoveTypesInput(enemyMoveTypeInput);

    setIsLoading(true);
    setErrorMessage("");
    setActiveExplanationKey(null);
    setActiveTmExplanationPokemon(null);

    try {
      const parsedTeam = currentTeamSlots
        .map((rawName, index) => {
          return {
            pokemonName: rawName.trim().toLowerCase(),
            optionalMoveTypes: parseOptionalMoveTypesInput(
              teamMoveTypeInputs[index] ?? "",
            ),
          };
        })
        .filter((entry) => entry.pokemonName.length > 0);

      const [types, coverage, teamData, spriteUrl, baseStats] =
        await Promise.all([
          fetchPokemonTypes(currentEnemyName),
          fetchPokemonCoverageTypes(currentEnemyName),
          Promise.all(
            parsedTeam.map(async (entry) => {
              const pokemonTypes = await fetchPokemonTypes(entry.pokemonName);

              return {
                pokemonName: entry.pokemonName,
                pokemonTypes,
                optionalMoveTypes: entry.optionalMoveTypes,
              };
            }),
          ),
          fetchPokemonSpriteUrl(currentEnemyName),
          fetchPokemonBaseStats(currentEnemyName),
        ]);

      const resolvedEnemyAttackTypes = resolveEnemyAttackTypes(
        types,
        coverage,
        enemyKnownMoveTypes,
      );

      const evaluations = teamData.map((entry) => {
        return evaluateTeamPokemonAdvanced(
          entry.pokemonName,
          entry.pokemonTypes,
          types,
          resolvedEnemyAttackTypes.attackTypes,
          entry.optionalMoveTypes,
        );
      });

      const spriteEntries = await Promise.all(
        teamData.map(async (entry) => {
          try {
            const spriteUrl = await fetchPokemonSpriteUrl(entry.pokemonName);
            return [entry.pokemonName, spriteUrl] as const;
          } catch {
            return [entry.pokemonName, null] as const;
          }
        }),
      );

      const nextTeamSpriteUrls = Object.fromEntries(spriteEntries);

      setEnemyTypes(types);
      setCoverageTypes(resolvedEnemyAttackTypes.attackTypes);
      setEnemyCoverageMode(resolvedEnemyAttackTypes.mode);
      setKnownEnemyCoverageTypes(
        resolvedEnemyAttackTypes.mode === "known" ? enemyKnownMoveTypes : [],
      );
      setEnemySpriteUrl(spriteUrl);
      setEnemyBaseStats(baseStats);
      setIsEnemyStatsOpen(false);
      setTeamEvaluations(evaluations);
      setTeamTypeMap(
        Object.fromEntries(
          teamData.map((entry) => [entry.pokemonName, entry.pokemonTypes]),
        ),
      );
      setTeamSpriteUrls(nextTeamSpriteUrls);
      setBestSwitch(getBestSwitchRecommendation(evaluations));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setEnemyTypes([]);
      setEnemyCoverageMode("assumed");
      setKnownEnemyCoverageTypes([]);
      setCoverageTypes([]);
      setEnemySpriteUrl(null);
      setEnemyBaseStats(null);
      setIsEnemyStatsOpen(false);
      setTeamEvaluations([]);
      setTeamTypeMap({});
      setTeamSpriteUrls({});
      setBestSwitch(null);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const maybeAutoAnalyze = (nextEnemyName: string, nextTeamSlots: string[]) => {
    if (!hasNonEmptyTeam(nextTeamSlots)) {
      return;
    }

    if (nextEnemyName.trim().length === 0) {
      return;
    }

    void handleAnalyze(nextEnemyName, nextTeamSlots);
  };

  const handleEnemySuggestionSelect = (suggestion: string) => {
    const normalizedSuggestion = normalizePokemonNameInput(suggestion);
    setEnemyName(normalizedSuggestion);
    maybeAutoAnalyze(normalizedSuggestion, teamSlots);
  };

  return (
    <main className="app-shell">
      <header className="panel control-panel">
        <h1>Pokemon Battle Helper</h1>

        <div className="form-row">
          <label htmlFor="enemy-name">Enemy Pokemon</label>
          <PokemonAutocompleteInput
            id="enemy-name"
            value={enemyName}
            suggestionDataset={autocompleteDataset}
            onValueChange={(value) =>
              setEnemyName(normalizePokemonNameInput(value))
            }
            onSuggestionSelect={handleEnemySuggestionSelect}
            onEnterPressed={(nextEnemyName) => {
              void handleAnalyze(nextEnemyName);
            }}
            placeholder="Charizard"
          />
        </div>

        <div className="form-row">
          <label htmlFor="enemy-move-types">Enemy move types (optional)</label>
          <PokemonAutocompleteInput
            id="enemy-move-types"
            value={enemyMoveTypeInput}
            suggestionDataset={moveTypeDataset}
            onValueChange={setEnemyMoveTypeInput}
            onSuggestionSelect={setEnemyMoveTypeInput}
            onEnterPressed={() => {
              void handleAnalyze();
            }}
            getSuggestionQuery={getLastCommaSeparatedToken}
            applySuggestion={applyCommaSeparatedSuggestion}
            placeholder="known coverage types (comma-separated): electric, ice"
          />
        </div>

        <div className="form-row">
          <button
            type="button"
            className={
              isTeamEditorOpen
                ? "team-collapse-toggle is-open"
                : "team-collapse-toggle is-closed"
            }
            onClick={() => setIsTeamEditorOpen((current) => !current)}
            aria-expanded={isTeamEditorOpen}
          >
            <span className="toggle-icon" aria-hidden="true">
              {isTeamEditorOpen ? "-" : "+"}
            </span>
            <span>{isTeamEditorOpen ? "Hide My Team" : "Show My Team"}</span>
          </button>

          {isTeamEditorOpen ? (
            <div className="team-editor">
              {teamSlots.map((name, index) => (
                <div key={index} className="team-editor-row">
                  <PokemonAutocompleteInput
                    value={name}
                    suggestionDataset={autocompleteDataset}
                    onValueChange={(value) => updateTeamSlot(index, value)}
                    onSuggestionSelect={(suggestion) => {
                      const nextTeamSlots = teamSlots.map((entry, slotIndex) =>
                        slotIndex === index ? suggestion : entry,
                      );

                      updateTeamSlot(index, suggestion);
                      maybeAutoAnalyze(enemyName, nextTeamSlots);
                    }}
                    placeholder="Pokemon name"
                    ariaLabel={`Team Pokemon ${index + 1}`}
                  />
                  <PokemonAutocompleteInput
                    value={teamMoveTypeInputs[index] ?? ""}
                    suggestionDataset={moveTypeDataset}
                    onValueChange={(nextValue) =>
                      updateTeamMoveTypeInput(index, nextValue)
                    }
                    onSuggestionSelect={(nextValue) =>
                      updateTeamMoveTypeInput(index, nextValue)
                    }
                    getSuggestionQuery={getLastCommaSeparatedToken}
                    applySuggestion={applyCommaSeparatedSuggestion}
                    placeholder="optional move types: ice, ground"
                    ariaLabel={`Team move types ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => removeTeamSlot(index)}
                    aria-label={`Remove team slot ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={addTeamSlot}
              >
                Add Pokemon
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="primary-analyze-button"
          onClick={() => {
            void handleAnalyze();
          }}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Analyze"}
        </button>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </header>

      {showBattleEmptyState ? (
        <section className="battle-empty-state">
          <img
            src={`${import.meta.env.BASE_URL}pkmbh.svg`}
            alt="Pokemon Battle Helper"
            className="battle-empty-state-image"
          />
        </section>
      ) : (
        <>
          <section className="panel insight-panel">
            <h2>Enemy Snapshot</h2>
            {enemyCoverageMode === "known" ? (
              <p className="mode-indicator">Using known enemy coverage</p>
            ) : null}

            {enemySpriteUrl ? (
              <div className="enemy-sprite-wrap">
                <button
                  type="button"
                  className="enemy-sprite-button"
                  onClick={() => setIsEnemyStatsOpen((current) => !current)}
                  aria-expanded={isEnemyStatsOpen}
                  aria-label="Toggle enemy base stats"
                >
                  <img
                    src={enemySpriteUrl}
                    alt={`${formatPokemonName(enemyName)} sprite`}
                    className="enemy-sprite"
                  />
                </button>
              </div>
            ) : null}

            {isEnemyStatsOpen && enemyBaseStats ? (
              <div className="enemy-stats-panel">
                <p className="enemy-stats-row">
                  HP: {enemyBaseStats.hp} Atk: {enemyBaseStats.attack} Def:{" "}
                  {enemyBaseStats.defense} SpA: {enemyBaseStats.specialAttack}{" "}
                  SpD: {enemyBaseStats.specialDefense} Spe:{" "}
                  {enemyBaseStats.speed}
                </p>
                <p className="enemy-stats-summary">
                  {getStatProfileSummary(enemyBaseStats)}
                </p>
              </div>
            ) : null}

            <div className="snapshot-grid">
              <article>
                <h3>Types</h3>
                {enemyTypes.length === 0 ? (
                  <p className="empty-text">None</p>
                ) : (
                  <ul className="chip-list">
                    {enemyTypes.map((type) => (
                      <li key={type} className="chip">
                        {type}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article>
                <h3>Weaknesses</h3>
                {weaknesses.length === 0 ? (
                  <p className="empty-text">None</p>
                ) : (
                  <ul className="chip-list">
                    {weaknesses.map((weakness) => (
                      <li
                        key={weakness.type}
                        className={weaknessClassName(weakness.multiplier)}
                      >
                        {weakness.type} x{weakness.multiplier}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article>
                <h3>Strong Against</h3>
                {enemyStrongAgainst.length === 0 ? (
                  <p className="empty-text">None</p>
                ) : (
                  <ul className="chip-list">
                    {enemyStrongAgainst.map((type) => (
                      <li key={type} className="chip">
                        {type}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article>
                <h3>Coverage</h3>
                {coverageTypes.length === 0 ? (
                  <p className="empty-text">None</p>
                ) : (
                  <ul className="chip-list">
                    {coverageTypes.map((type) => (
                      <li key={type} className="chip">
                        {type}
                        {enemyCoverageMode === "known" &&
                        knownEnemyCoverageTypes.includes(type)
                          ? " (known)"
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              {immunities.length > 0 ? (
                <article>
                  <h3>Immune</h3>
                  <ul className="chip-list">
                    {immunities.map((type) => (
                      <li key={type} className="chip">
                        {type}
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          </section>

          <section className="panel team-panel">
            <div className="team-panel-header">
              <h2>Team Evaluation</h2>
              <button
                type="button"
                className="help-button"
                onClick={() => setIsTeamLegendOpen((current) => !current)}
                aria-expanded={isTeamLegendOpen}
                aria-label="Toggle team evaluation legend"
              >
                ?
              </button>
            </div>
            {isTeamLegendOpen ? (
              <p className="legend-text">
                Strong / Neutral / Weak = offense matchup. Safe / Risk =
                defensive safety. Danger score = lower is safer.
              </p>
            ) : null}

            {teamEvaluations.length === 0 ? (
              <p className="empty-text">None</p>
            ) : (
              <>
                {bestSwitch ? (
                  <p className="recommendation-text">
                    Best switch: {formatPokemonName(bestSwitch.pokemon)} (danger{" "}
                    {bestSwitch.dangerScore})
                  </p>
                ) : null}
                <ul className="team-list">
                  {teamEvaluations.map((entry) => (
                    <li
                      key={entry.pokemon}
                      className={
                        bestSwitch?.pokemon === entry.pokemon
                          ? "team-row team-row-best"
                          : "team-row"
                      }
                    >
                      <div className="team-row-grid">
                        <span className="pokemon-identity">
                          {teamSpriteUrls[entry.pokemon] ? (
                            <img
                              src={teamSpriteUrls[entry.pokemon] ?? ""}
                              alt={`${formatPokemonName(entry.pokemon)} sprite`}
                              className="team-sprite"
                            />
                          ) : null}
                          <span className="pokemon-name">
                            {formatPokemonName(entry.pokemon)}
                          </span>
                        </span>
                        <button
                          type="button"
                          className={`${strengthClassName(entry.strength)} status-button ${
                            activeExplanationKey === `${entry.pokemon}:strength`
                              ? "status-button-active"
                              : ""
                          }`}
                          onClick={() => {
                            const key = `${entry.pokemon}:strength`;
                            setActiveExplanationKey((current) =>
                              current === key ? null : key,
                            );
                          }}
                          aria-expanded={
                            activeExplanationKey === `${entry.pokemon}:strength`
                          }
                        >
                          {formatStrengthLabel(entry)}
                        </button>
                        {entry.strength === "Strong" &&
                        entry.strengthSource === "move" ? (
                          <button
                            type="button"
                            className={`tm-indicator-button ${
                              activeTmExplanationPokemon === entry.pokemon
                                ? "tm-indicator-button-active"
                                : ""
                            }`}
                            onClick={() => {
                              setActiveTmExplanationPokemon((current) =>
                                current === entry.pokemon
                                  ? null
                                  : entry.pokemon,
                              );
                            }}
                            aria-expanded={
                              activeTmExplanationPokemon === entry.pokemon
                            }
                          >
                            (TM)
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`${safetyClassName(entry.safety)} status-button ${
                            activeExplanationKey === `${entry.pokemon}:safety`
                              ? "status-button-active"
                              : ""
                          }`}
                          onClick={() => {
                            const key = `${entry.pokemon}:safety`;
                            setActiveExplanationKey((current) =>
                              current === key ? null : key,
                            );
                          }}
                          aria-expanded={
                            activeExplanationKey === `${entry.pokemon}:safety`
                          }
                        >
                          {entry.safety}
                        </button>
                        <button
                          type="button"
                          className={`status status-danger status-button ${
                            activeExplanationKey === `${entry.pokemon}:danger`
                              ? "status-button-active"
                              : ""
                          }`}
                          onClick={() => {
                            const key = `${entry.pokemon}:danger`;
                            setActiveExplanationKey((current) =>
                              current === key ? null : key,
                            );
                          }}
                          aria-expanded={
                            activeExplanationKey === `${entry.pokemon}:danger`
                          }
                        >
                          Danger {entry.dangerScore}
                        </button>
                      </div>
                      {activeExplanationKey === `${entry.pokemon}:strength` ? (
                        <p className="status-explanation">
                          {getStrengthExplanation(
                            entry,
                            teamTypeMap[entry.pokemon] ?? [],
                            enemyTypes,
                          )}
                        </p>
                      ) : null}
                      {activeExplanationKey === `${entry.pokemon}:safety` ? (
                        <p className="status-explanation">
                          {getSafetyExplanation(
                            entry.safety,
                            teamTypeMap[entry.pokemon] ?? [],
                            coverageTypes,
                            enemyTypes,
                            enemyCoverageMode,
                          )}
                        </p>
                      ) : null}
                      {activeExplanationKey === `${entry.pokemon}:danger` ? (
                        <p className="status-explanation">
                          {getDangerExplanation(
                            entry.dangerScore,
                            teamTypeMap[entry.pokemon] ?? [],
                            coverageTypes,
                            enemyTypes,
                            enemyCoverageMode,
                          )}
                        </p>
                      ) : null}
                      {activeTmExplanationPokemon === entry.pokemon ? (
                        <p className="status-explanation">
                          TM: Coverage added via moves, not STAB.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <section className="panel transfer-panel">
        <div className="form-row">
          <label htmlFor="team-transfer">Import / Export</label>
          <textarea
            id="team-transfer"
            className="transfer-input"
            value={transferText}
            onChange={(event) => setTransferText(event.target.value)}
            placeholder='{"team":[{"name":"gyarados","moveTypes":["water"]}]}'
          />
          <div className="transfer-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleExportJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCopyJson}
            >
              Copy JSON
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleImportJson(transferText)}
            >
              Import JSON
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handlePasteAndImport}
            >
              Paste + Import
            </button>
          </div>
          {transferMessage ? (
            <p className="transfer-message">{transferMessage}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
