import { useEffect, useMemo, useState } from "react";
import {
  getAutocompleteDataset,
  getPokemonAutocompleteSuggestions,
} from "./battle/pokemonAutocomplete";
import {
  evaluateField2v2,
  evaluateRosterVsAllEnemies,
  type ActiveMyPokemon,
  type RosterEvalSummary,
} from "./battle/vgcAnalysis";
import type { EnemyEntry, FieldMatchupCell, FieldMatchupGrid, RosterPokemon } from "./battle/vgcTypes";
import { parseOptionalMoveTypesInput } from "./battle/advancedAnalysis";
import { getWeaknesses, isPokemonType, TYPE_NAMES, type PokemonType } from "./battle/typeEffectiveness";
import {
  fetchPokemonCoverageTypes,
  fetchPokemonNameIndex,
  fetchPokemonSpriteUrl,
  fetchPokemonTypes,
} from "./data/pokeapi";

const ROSTER_KEY = "pkm-bh-roster";
const VGC_BATTLE_KEY = "pkm-bh-vgc-battle";
const ROSTER_SIZE = 6;

// ── Persistence helpers ────────────────────────────────────────────────────────

type SavedBattleState = {
  selectedRosterIndices: number[];
  myOnFieldRosterIndices: number[];
  enemies: EnemyEntry[];
};

function loadRoster(): RosterPokemon[] {
  const empty: RosterPokemon[] = Array.from({ length: ROSTER_SIZE }, () => ({
    name: "",
    moveTypeInput: "",
  }));
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return empty;
    const roster = (parsed as { name?: unknown; moveTypeInput?: unknown }[])
      .slice(0, ROSTER_SIZE)
      .map((item) => ({
        name: typeof item?.name === "string" ? item.name : "",
        moveTypeInput: typeof item?.moveTypeInput === "string" ? item.moveTypeInput : "",
      }));
    while (roster.length < ROSTER_SIZE) roster.push({ name: "", moveTypeInput: "" });
    return roster;
  } catch {
    return empty;
  }
}

function loadBattleState(): SavedBattleState {
  const empty: SavedBattleState = {
    selectedRosterIndices: [],
    myOnFieldRosterIndices: [],
    enemies: [],
  };
  try {
    const raw = localStorage.getItem(VGC_BATTLE_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty;
    const rec = parsed as Record<string, unknown>;

    const selectedRosterIndices = Array.isArray(rec.selectedRosterIndices)
      ? (rec.selectedRosterIndices as unknown[]).filter((n): n is number => typeof n === "number")
      : [];

    const myOnFieldRosterIndices = Array.isArray(rec.myOnFieldRosterIndices)
      ? (rec.myOnFieldRosterIndices as unknown[]).filter((n): n is number => typeof n === "number")
      : [];

    const enemies = Array.isArray(rec.enemies)
      ? (rec.enemies as unknown[])
          .map((e): EnemyEntry | null => {
            if (!e || typeof e !== "object") return null;
            const entry = e as Record<string, unknown>;
            return {
              id: typeof entry.id === "string" ? entry.id : `e${Math.random()}`,
              name: typeof entry.name === "string" ? entry.name : "",
              types: Array.isArray(entry.types)
                ? (entry.types as unknown[]).filter(isPokemonType)
                : [],
              moveTypeInput:
                typeof entry.moveTypeInput === "string" ? entry.moveTypeInput : "",
              fetchedCoverageTypes: Array.isArray(entry.fetchedCoverageTypes)
                ? (entry.fetchedCoverageTypes as unknown[]).filter(isPokemonType)
                : [],
              spriteUrl: typeof entry.spriteUrl === "string" ? entry.spriteUrl : null,
              onField: typeof entry.onField === "boolean" ? entry.onField : false,
            };
          })
          .filter((e): e is EnemyEntry => e !== null)
      : [];

    return { selectedRosterIndices, myOnFieldRosterIndices, enemies };
  } catch {
    return empty;
  }
}

// ── Display helpers ────────────────────────────────────────────────────────────

function formatPokemonName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePokemonNameInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_full, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

function getLastCommaSeparatedToken(value: string): string {
  const parts = value.split(",");
  return (parts[parts.length - 1] ?? "").trim().toLowerCase();
}

function applyCommaSeparatedSuggestion(current: string, suggestion: string): string {
  const parts = current
    .split(",")
    .slice(0, -1)
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  return [...parts, suggestion].join(", ");
}

function strengthClassName(strength: "Strong" | "Neutral" | "Weak"): string {
  if (strength === "Strong") return "status status-strong";
  if (strength === "Weak") return "status status-weak";
  return "status status-neutral";
}

function safetyClassName(safety: "Safe" | "Risk"): string {
  return safety === "Safe" ? "status status-safe" : "status status-risk";
}

function generateEnemyId(): string {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function getCellStrengthExplanation(cell: FieldMatchupCell): string {
  const myLabel = formatPokemonName(cell.myPokemonName);
  const enemyLabel = cell.enemyTypes.map((t) => formatPokemonName(t)).join("/");
  const ev = cell.evaluation;

  if (ev.strength === "Strong" && ev.effectiveAttackType) {
    const typeLabel = formatPokemonName(ev.effectiveAttackType);
    return ev.strengthSource === "move"
      ? `${typeLabel} coverage (TM) is super effective vs ${enemyLabel}.`
      : `${typeLabel} is super effective vs ${enemyLabel}.`;
  }
  if (ev.strength === "Strong") {
    return `${myLabel} has a type advantage into ${enemyLabel}.`;
  }
  if (ev.strength === "Weak") {
    return `${myLabel} has no effective coverage into ${enemyLabel}.`;
  }
  return `No clear type edge for ${myLabel} into ${enemyLabel}.`;
}

function getCellDangerExplanation(cell: FieldMatchupCell): string {
  const level =
    cell.evaluation.dangerScore <= 5
      ? "Low"
      : cell.evaluation.dangerScore <= 8
        ? "Medium"
        : "High";
  const myLabel = formatPokemonName(cell.myPokemonName);
  return `${level} danger (${cell.evaluation.dangerScore}) for ${myLabel} in this matchup.`;
}

// ── Autocomplete input (self-contained, mirrors the one in LegacyApp) ─────────

type AutocompleteInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSuggestionSelect: (value: string) => void;
  suggestionDataset: string[];
  onEnterPressed?: (value: string) => void;
  getSuggestionQuery?: (value: string) => string;
  applySuggestion?: (current: string, suggestion: string) => string;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
};

function AutocompleteInput({
  value,
  onValueChange,
  onSuggestionSelect,
  suggestionDataset,
  onEnterPressed,
  getSuggestionQuery,
  applySuggestion,
  placeholder,
  ariaLabel,
  id,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const query = getSuggestionQuery ? getSuggestionQuery(value) : value;
    return getPokemonAutocompleteSuggestions(query, suggestionDataset);
  }, [value, suggestionDataset, getSuggestionQuery]);

  return (
    <div className="autocomplete-wrap">
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          onValueChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(-1);
          }, 100);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && isOpen && suggestions.length > 0) {
            e.preventDefault();
            setActiveIndex((c) => (c < suggestions.length - 1 ? c + 1 : 0));
          } else if (e.key === "ArrowUp" && isOpen && suggestions.length > 0) {
            e.preventDefault();
            setActiveIndex((c) => (c > 0 ? c - 1 : suggestions.length - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && activeIndex >= 0 && suggestions.length > 0) {
              const s = suggestions[activeIndex];
              const next = applySuggestion ? applySuggestion(value, s) : s;
              onSuggestionSelect(next);
              onEnterPressed?.(next);
            } else {
              onEnterPressed?.(value);
            }
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (e.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {isOpen && suggestions.length > 0 ? (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                className={i === activeIndex ? "autocomplete-option is-active" : "autocomplete-option"}
                onMouseDown={() => {
                  const next = applySuggestion ? applySuggestion(value, s) : s;
                  onSuggestionSelect(next);
                  setIsOpen(false);
                  setActiveIndex(-1);
                }}
              >
                {formatPokemonName(s)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ── Type chip selector ─────────────────────────────────────────────────────────

function TypeChipSelector({
  selectedTypes,
  onToggle,
}: {
  selectedTypes: PokemonType[];
  onToggle: (type: PokemonType) => void;
}) {
  return (
    <div className="type-chip-selector">
      {TYPE_NAMES.map((type) => (
        <button
          key={type}
          type="button"
          className={selectedTypes.includes(type) ? "type-chip type-chip-selected" : "type-chip"}
          onClick={() => onToggle(type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

// ── Main VGC component ─────────────────────────────────────────────────────────

export default function VGCApp() {
  const initialBattle = useMemo(() => loadBattleState(), []);

  // Roster (6 slots, persisted)
  const [roster, setRoster] = useState<RosterPokemon[]>(loadRoster);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  // Battle state (persisted)
  const [selectedRosterIndices, setSelectedRosterIndices] = useState<number[]>(
    () => initialBattle.selectedRosterIndices.filter((i) => i >= 0 && i < ROSTER_SIZE),
  );
  const [myOnFieldRosterIndices, setMyOnFieldRosterIndices] = useState<number[]>(
    () =>
      initialBattle.myOnFieldRosterIndices.filter((i) =>
        initialBattle.selectedRosterIndices.includes(i),
      ),
  );
  const [enemies, setEnemies] = useState<EnemyEntry[]>(initialBattle.enemies);

  // Team picker
  const [isSelectingTeam, setIsSelectingTeam] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<number[]>([]);

  // Type / sprite maps for selected roster pokemon
  const [typeMap, setTypeMap] = useState<Record<string, PokemonType[]>>({});
  const [spriteMap, setSpriteMap] = useState<Record<string, string | null>>({});

  // Autocomplete datasets
  const [pokemonNameIndex, setPokemonNameIndex] = useState<string[]>([]);
  const autocompleteDataset = useMemo(
    () => getAutocompleteDataset(pokemonNameIndex),
    [pokemonNameIndex],
  );
  const moveTypeDataset = useMemo(() => [...TYPE_NAMES], []);

  // UI state
  const [activeExplanationKey, setActiveExplanationKey] = useState<string | null>(null);
  const [expandedEnemyIds, setExpandedEnemyIds] = useState<Set<string>>(new Set());
  const [loadingEnemyIds, setLoadingEnemyIds] = useState<Set<string>>(new Set());

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    void fetchPokemonNameIndex()
      .then((names) => setPokemonNameIndex(names))
      .catch(() => setPokemonNameIndex([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  }, [roster]);

  useEffect(() => {
    localStorage.setItem(
      VGC_BATTLE_KEY,
      JSON.stringify({ selectedRosterIndices, myOnFieldRosterIndices, enemies }),
    );
  }, [selectedRosterIndices, myOnFieldRosterIndices, enemies]);

  // Fetch types + sprites for selected roster pokemon
  useEffect(() => {
    const selectedPokemon = selectedRosterIndices
      .map((i) => roster[i])
      .filter((p): p is RosterPokemon => !!p && p.name.trim().length > 0);

    const toFetch = selectedPokemon.filter(
      (p) => !typeMap[p.name.trim().toLowerCase()],
    );
    if (toFetch.length === 0) return;

    void Promise.all(
      toFetch.map(async (p) => {
        const name = p.name.trim().toLowerCase();
        const [types, sprite] = await Promise.all([
          fetchPokemonTypes(name).catch((): PokemonType[] => []),
          fetchPokemonSpriteUrl(name).catch((): string | null => null),
        ]);
        return { name, types, sprite };
      }),
    ).then((results) => {
      setTypeMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.name] = r.types;
        });
        return next;
      });
      setSpriteMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.name] = r.sprite;
        });
        return next;
      });
    });
    // We intentionally only re-run when selectedRosterIndices changes, not typeMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRosterIndices, roster]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const fieldGrid = useMemo<FieldMatchupGrid | null>(() => {
    const myOnField: ActiveMyPokemon[] = myOnFieldRosterIndices
      .map((rIdx) => {
        const p = roster[rIdx];
        if (!p?.name.trim()) return null;
        const name = p.name.trim().toLowerCase();
        const types = typeMap[name];
        if (!types || types.length === 0) return null;
        return { name, types, moveTypes: parseOptionalMoveTypesInput(p.moveTypeInput) };
      })
      .filter((p): p is ActiveMyPokemon => p !== null);

    const enemyOnField = enemies.filter((e) => e.onField && e.types.length > 0);
    if (myOnField.length === 0 || enemyOnField.length === 0) return null;
    return evaluateField2v2(myOnField, enemyOnField);
  }, [myOnFieldRosterIndices, roster, typeMap, enemies]);

  const rosterSummaries = useMemo<RosterEvalSummary[]>(() => {
    if (enemies.length === 0) return [];
    const activePokemon: ActiveMyPokemon[] = selectedRosterIndices
      .map((rIdx) => {
        const p = roster[rIdx];
        if (!p?.name.trim()) return null;
        const name = p.name.trim().toLowerCase();
        const types = typeMap[name];
        if (!types || types.length === 0) return null;
        return { name, types, moveTypes: parseOptionalMoveTypesInput(p.moveTypeInput) };
      })
      .filter((p): p is ActiveMyPokemon => p !== null);
    if (activePokemon.length === 0) return [];
    return evaluateRosterVsAllEnemies(activePokemon, enemies);
  }, [selectedRosterIndices, roster, typeMap, enemies]);

  // ── Roster handlers ───────────────────────────────────────────────────────────

  const updateRosterSlot = (index: number, updates: Partial<RosterPokemon>) => {
    setRoster((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)));
  };

  // ── Team picker ───────────────────────────────────────────────────────────────

  const openTeamPicker = () => {
    setPickerSelection([...selectedRosterIndices]);
    setIsSelectingTeam(true);
  };

  const confirmTeamSelection = () => {
    setSelectedRosterIndices(pickerSelection);
    setMyOnFieldRosterIndices([]);
    setActiveExplanationKey(null);
    setIsSelectingTeam(false);
  };

  const togglePickerSelection = (index: number) => {
    setPickerSelection((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 4) return prev;
      return [...prev, index];
    });
  };

  // ── On-field toggles ──────────────────────────────────────────────────────────

  const toggleMyOnField = (rosterIndex: number) => {
    setMyOnFieldRosterIndices((prev) => {
      if (prev.includes(rosterIndex)) return prev.filter((i) => i !== rosterIndex);
      if (prev.length >= 2) return prev;
      return [...prev, rosterIndex];
    });
    setActiveExplanationKey(null);
  };

  const toggleEnemyOnField = (enemyId: string) => {
    setEnemies((prev) => {
      const onFieldCount = prev.filter((e) => e.onField).length;
      return prev.map((e) => {
        if (e.id !== enemyId) return e;
        if (e.onField) return { ...e, onField: false };
        if (onFieldCount >= 2) return e;
        return { ...e, onField: true };
      });
    });
    setActiveExplanationKey(null);
  };

  // ── Enemy handlers ────────────────────────────────────────────────────────────

  const addEnemy = () => {
    setEnemies((prev) => [
      ...prev,
      {
        id: generateEnemyId(),
        name: "",
        types: [],
        moveTypeInput: "",
        fetchedCoverageTypes: [],
        spriteUrl: null,
        onField: false,
      },
    ]);
  };

  const removeEnemy = (id: string) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEnemy = (id: string, updates: Partial<EnemyEntry>) => {
    setEnemies((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const fetchEnemyDataByName = async (id: string, name: string) => {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) return;
    setLoadingEnemyIds((prev) => new Set([...prev, id]));
    try {
      const [types, coverage, sprite] = await Promise.all([
        fetchPokemonTypes(normalizedName),
        fetchPokemonCoverageTypes(normalizedName).catch((): PokemonType[] => []),
        fetchPokemonSpriteUrl(normalizedName).catch((): string | null => null),
      ]);
      updateEnemy(id, { types, fetchedCoverageTypes: coverage, spriteUrl: sprite });
    } catch {
      // Keep existing types on error
    } finally {
      setLoadingEnemyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleEnemyType = (id: string, type: PokemonType) => {
    setEnemies((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          types: e.types.includes(type)
            ? e.types.filter((t) => t !== type)
            : [...e.types, type],
        };
      }),
    );
  };

  const toggleEnemyExpanded = (id: string) => {
    setExpandedEnemyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── New battle ────────────────────────────────────────────────────────────────

  const handleNewBattle = () => {
    setSelectedRosterIndices([]);
    setMyOnFieldRosterIndices([]);
    setEnemies([]);
    setActiveExplanationKey(null);
    setExpandedEnemyIds(new Set());
  };

  // ── Computed counts ───────────────────────────────────────────────────────────

  const hasActiveTeam = selectedRosterIndices.length === 4;
  const myOnFieldCount = myOnFieldRosterIndices.length;
  const enemyOnFieldCount = enemies.filter((e) => e.onField).length;
  const namedRosterCount = roster.filter((p) => p.name.trim().length > 0).length;

  const enemiesOnField = enemies.filter((e) => e.onField && e.types.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="app-shell">
      {/* ── Roster panel ── */}
      <header className="panel control-panel">
        <div className="vgc-header">
          <h1>VGC Battle Helper</h1>
          <button type="button" className="secondary-button vgc-new-battle-btn" onClick={handleNewBattle}>
            New Battle
          </button>
        </div>

        <button
          type="button"
          className={isRosterOpen ? "team-collapse-toggle is-open" : "team-collapse-toggle is-closed"}
          onClick={() => setIsRosterOpen((c) => !c)}
          aria-expanded={isRosterOpen}
        >
          <span className="toggle-icon" aria-hidden="true">
            {isRosterOpen ? "−" : "+"}
          </span>
          <span>{isRosterOpen ? "Hide My Roster" : "Show My Roster (6)"}</span>
        </button>

        {isRosterOpen ? (
          <div className="roster-editor">
            {roster.map((p, i) => (
              <div key={i} className="team-editor-row">
                <AutocompleteInput
                  value={p.name}
                  suggestionDataset={autocompleteDataset}
                  onValueChange={(v) => updateRosterSlot(i, { name: normalizePokemonNameInput(v) })}
                  onSuggestionSelect={(v) => updateRosterSlot(i, { name: v })}
                  placeholder={`Slot ${i + 1}`}
                  ariaLabel={`Roster slot ${i + 1}`}
                />
                <AutocompleteInput
                  value={p.moveTypeInput}
                  suggestionDataset={moveTypeDataset}
                  onValueChange={(v) => updateRosterSlot(i, { moveTypeInput: v })}
                  onSuggestionSelect={(v) => updateRosterSlot(i, { moveTypeInput: v })}
                  getSuggestionQuery={getLastCommaSeparatedToken}
                  applySuggestion={applyCommaSeparatedSuggestion}
                  placeholder="move types (optional)"
                  ariaLabel={`Roster move types ${i + 1}`}
                />
              </div>
            ))}
            <button
              type="button"
              className="primary-analyze-button"
              style={{ marginTop: "0.35rem" }}
              onClick={openTeamPicker}
              disabled={namedRosterCount < 4}
            >
              {hasActiveTeam ? "Change Battle Team (4)" : "Select 4 for This Battle"}
            </button>
          </div>
        ) : null}

        {/* ── Team picker ── */}
        {isSelectingTeam ? (
          <div className="team-picker">
            <p className="team-picker-title">
              Select 4 Pokémon ({pickerSelection.length}/4):
            </p>
            <div className="team-picker-grid">
              {roster.map((p, i) =>
                p.name.trim() ? (
                  <button
                    key={i}
                    type="button"
                    className={
                      pickerSelection.includes(i)
                        ? "picker-card picker-card-selected"
                        : "picker-card"
                    }
                    onClick={() => togglePickerSelection(i)}
                  >
                    {pickerSelection.includes(i) ? "✓ " : ""}
                    {formatPokemonName(p.name)}
                  </button>
                ) : null,
              )}
            </div>
            <div className="team-picker-actions">
              <button
                type="button"
                className="primary-analyze-button"
                onClick={confirmTeamSelection}
                disabled={pickerSelection.length !== 4}
              >
                Confirm
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsSelectingTeam(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Active team ── */}
      {hasActiveTeam ? (
        <section className="panel">
          <div className="vgc-section-header">
            <h2>My Team</h2>
            <span className="on-field-indicator">On Field: {myOnFieldCount}/2</span>
            <button type="button" className="secondary-button" onClick={openTeamPicker}>
              Change
            </button>
          </div>
          <p className="vgc-hint">Tap a Pokémon to mark it as on the field (max 2).</p>
          <div className="active-team-grid">
            {selectedRosterIndices.map((rIdx) => {
              const p = roster[rIdx];
              if (!p) return null;
              const name = p.name.trim().toLowerCase();
              const isOnField = myOnFieldRosterIndices.includes(rIdx);
              const canSelect = isOnField || myOnFieldCount < 2;
              const sprite = spriteMap[name];
              return (
                <button
                  key={rIdx}
                  type="button"
                  className={[
                    "pokemon-card",
                    isOnField ? "pokemon-card-on-field" : "",
                    !canSelect ? "pokemon-card-disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (canSelect) toggleMyOnField(rIdx);
                  }}
                  aria-pressed={isOnField}
                >
                  {sprite ? (
                    <img
                      src={sprite}
                      alt={`${formatPokemonName(p.name)} sprite`}
                      className="team-sprite"
                    />
                  ) : (
                    <div className="pokemon-card-placeholder" />
                  )}
                  <span className="pokemon-card-name">{formatPokemonName(p.name)}</span>
                  {isOnField ? <span className="on-field-badge">⚔</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="empty-text">
            Open "Show My Roster" above and select 4 Pokémon to start.
          </p>
        </section>
      )}

      {/* ── Known enemies ── */}
      <section className="panel">
        <div className="vgc-section-header">
          <h2>Known Enemies</h2>
          <span className="on-field-indicator">On Field: {enemyOnFieldCount}/2</span>
          {enemies.length < 6 ? (
            <button type="button" className="secondary-button" onClick={addEnemy}>
              + Add
            </button>
          ) : null}
        </div>

        {enemies.length === 0 ? (
          <p className="empty-text">
            Add enemies as you discover them. Name is optional — you can select types directly.
          </p>
        ) : (
          <div className="enemy-list">
            {enemies.map((enemy) => {
              const isOnField = enemy.onField;
              const canToggleOnField = isOnField || enemyOnFieldCount < 2;
              const isExpanded = expandedEnemyIds.has(enemy.id);
              const isLoading = loadingEnemyIds.has(enemy.id);
              const weaknesses = getWeaknesses(enemy.types).filter((w) => w.multiplier > 1);

              return (
                <div
                  key={enemy.id}
                  className={["enemy-card", isOnField ? "enemy-card-on-field" : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Header row */}
                  <div className="enemy-card-header">
                    <div className="enemy-card-name-row">
                      {enemy.spriteUrl ? (
                        <img src={enemy.spriteUrl} alt="enemy sprite" className="team-sprite" />
                      ) : null}
                      <AutocompleteInput
                        value={enemy.name}
                        suggestionDataset={autocompleteDataset}
                        onValueChange={(v) =>
                          updateEnemy(enemy.id, { name: normalizePokemonNameInput(v) })
                        }
                        onSuggestionSelect={(v) => {
                          updateEnemy(enemy.id, { name: v });
                          void fetchEnemyDataByName(enemy.id, v);
                        }}
                        onEnterPressed={(v) => {
                          if (v.trim()) void fetchEnemyDataByName(enemy.id, v);
                        }}
                        placeholder="Name (optional)"
                        ariaLabel="Enemy name"
                      />
                      {isLoading ? <span className="loading-text">…</span> : null}
                    </div>
                    <div className="enemy-card-actions">
                      <button
                        type="button"
                        className={[
                          "secondary-button",
                          isOnField ? "on-field-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          if (canToggleOnField) toggleEnemyOnField(enemy.id);
                        }}
                        disabled={!canToggleOnField && !isOnField}
                        aria-pressed={isOnField}
                      >
                        {isOnField ? "⚔ Field" : "Field"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleEnemyExpanded(enemy.id)}
                        aria-expanded={isExpanded}
                        aria-label="Toggle type editor"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => removeEnemy(enemy.id)}
                        aria-label="Remove enemy"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Types + weaknesses display */}
                  {enemy.types.length > 0 ? (
                    <ul className="chip-list" style={{ marginTop: "0.3rem" }}>
                      {enemy.types.map((t) => (
                        <li key={t} className="chip">
                          {t}
                        </li>
                      ))}
                      {weaknesses.map((w) => (
                        <li
                          key={`w-${w.type}`}
                          className={w.multiplier >= 4 ? "chip chip-danger" : "chip chip-warn"}
                        >
                          weak: {w.type} x{w.multiplier}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-text" style={{ fontSize: "0.78rem", margin: "0.3rem 0 0" }}>
                      No types set — tap ▼ to add types.
                    </p>
                  )}

                  {/* Expanded: type selector + move types */}
                  {isExpanded ? (
                    <div className="enemy-card-expanded">
                      <p className="enemy-card-label">Types:</p>
                      <TypeChipSelector
                        selectedTypes={enemy.types}
                        onToggle={(t) => toggleEnemyType(enemy.id, t)}
                      />
                      <p className="enemy-card-label">Known move types (optional):</p>
                      <AutocompleteInput
                        value={enemy.moveTypeInput}
                        suggestionDataset={moveTypeDataset}
                        onValueChange={(v) => updateEnemy(enemy.id, { moveTypeInput: v })}
                        onSuggestionSelect={(v) => updateEnemy(enemy.id, { moveTypeInput: v })}
                        getSuggestionQuery={getLastCommaSeparatedToken}
                        applySuggestion={applyCommaSeparatedSuggestion}
                        placeholder="e.g. ice, thunder"
                        ariaLabel="Enemy known move types"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Field Analysis 2v2 grid ── */}
      {fieldGrid !== null && fieldGrid.length > 0 ? (
        <section className="panel">
          <h2 className="vgc-section-title">Field Analysis</h2>
          <p className="vgc-hint">Tap a cell to see the matchup explanation.</p>
          <div
            className="matchup-grid"
            style={{
              gridTemplateColumns: `minmax(6rem,1fr) ${enemiesOnField.map(() => "minmax(0,1fr)").join(" ")}`,
            }}
          >
            {/* Header row */}
            <div className="matchup-header-cell" />
            {enemiesOnField.map((enemy) => (
              <div key={enemy.id} className="matchup-header-cell">
                {enemy.spriteUrl ? (
                  <img src={enemy.spriteUrl} alt="enemy" className="team-sprite" />
                ) : null}
                <span className="matchup-header-name">
                  {enemy.name
                    ? formatPokemonName(enemy.name)
                    : enemy.types.map((t) => formatPokemonName(t)).join("/")}
                </span>
              </div>
            ))}

            {/* Data rows */}
            {fieldGrid.map((row, ri) => {
              const rIdx = myOnFieldRosterIndices[ri];
              const myPokemon = rIdx !== undefined ? roster[rIdx] : undefined;
              const myName = myPokemon?.name.trim().toLowerCase() ?? "";
              const mySprite = spriteMap[myName];

              return (
                <>
                  <div key={`rh-${ri}`} className="matchup-row-header">
                    {mySprite ? (
                      <img src={mySprite} alt={myName} className="team-sprite" />
                    ) : null}
                    <span className="matchup-header-name">
                      {myPokemon ? formatPokemonName(myPokemon.name) : `Slot ${ri + 1}`}
                    </span>
                  </div>
                  {row.map((cell, ci) => {
                    const key = `cell-${ri}-${ci}`;
                    const isActive = activeExplanationKey === key;
                    return (
                      <div key={key} className="matchup-cell">
                        <button
                          type="button"
                          className={`${strengthClassName(cell.evaluation.strength)} status-button ${isActive ? "status-button-active" : ""}`}
                          onClick={() =>
                            setActiveExplanationKey((prev) => (prev === key ? null : key))
                          }
                        >
                          {cell.evaluation.strength}
                        </button>
                        <div className="matchup-cell-badges">
                          <span className={safetyClassName(cell.evaluation.safety)}>
                            {cell.evaluation.safety}
                          </span>
                          <span className="status status-danger">
                            {cell.evaluation.dangerScore}
                          </span>
                        </div>
                        {isActive ? (
                          <div className="status-explanation">
                            <p style={{ margin: "0 0 0.15rem" }}>
                              {getCellStrengthExplanation(cell)}
                            </p>
                            <p style={{ margin: 0 }}>{getCellDangerExplanation(cell)}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Roster vs all known enemies ── */}
      {rosterSummaries.length > 0 ? (
        <section className="panel">
          <h2 className="vgc-section-title">Roster vs Known Enemies</h2>
          <ul className="team-list">
            {rosterSummaries
              .slice()
              .sort((a, b) => {
                const scoreA = a.weakCount * 2 - a.strongCount;
                const scoreB = b.weakCount * 2 - b.strongCount;
                if (scoreA !== scoreB) return scoreA - scoreB;
                return a.maxDangerScore - b.maxDangerScore;
              })
              .map((summary) => {
                const rIdx = selectedRosterIndices.find(
                  (i) => roster[i]?.name.trim().toLowerCase() === summary.pokemonName,
                );
                const sprite =
                  rIdx !== undefined
                    ? spriteMap[roster[rIdx]?.name.trim().toLowerCase() ?? ""]
                    : null;
                return (
                  <li key={summary.pokemonName} className="team-row">
                    <div className="team-row-grid">
                      <span className="pokemon-identity">
                        {sprite ? (
                          <img
                            src={sprite}
                            alt={summary.pokemonName}
                            className="team-sprite"
                          />
                        ) : null}
                        <span className="pokemon-name">
                          {formatPokemonName(summary.pokemonName)}
                        </span>
                      </span>
                      <span className="status status-strong">{summary.strongCount}✓</span>
                      <span className="status status-neutral">{summary.neutralCount}~</span>
                      <span className="status status-weak">{summary.weakCount}✗</span>
                      <span className="status status-danger">D{summary.maxDangerScore}</span>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
