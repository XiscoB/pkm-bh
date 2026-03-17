# 🧭 Pokemon Battle Helper — Roadmap

## 🎯 Purpose

This roadmap defines the exact scope, stages, and constraints of the project.
It is the single source of truth for:

- What to build
- In what order
- What is explicitly out of scope

This document is also used to derive AGENTS.md so that agents:

- Do NOT extend scope
- Do NOT add features outside current tier
- Only execute clearly defined tasks

---

# 🧱 Core Principles

- ⚡ Instant response (no delays mid-battle)
- 📱 Mobile-first UI
- 🧠 Decision-focused (not data-heavy)
- 🌐 Static deployment (GitHub Pages)
- 💾 Local-first (no backend)
- 🚫 No over-engineering

---

# ⚙️ Tech Stack

## Frontend

- React
- Vite
- TypeScript

## Data

- PokeAPI (https://pokeapi.co)

## Storage

- localStorage → team + settings
- IndexedDB → cached Pokémon + types

## Optional (later)

- Service Worker (offline support)

---

# 📦 Architecture

UI (React)
↓
Battle Engine (pure TypeScript)
↓
Data Layer

- API fetch
- IndexedDB cache

Rules:

- Battle logic MUST be pure functions
- UI MUST NOT contain business logic

---

# 🗺️ Roadmap Tiers

---

## 🟢 Tier 0 — Setup

### Goal

Project bootstrapped and runnable

### Tasks

- Setup Vite + React + TypeScript
- Create base layout
- Add inputs:
  - Enemy Pokémon name
  - Team input (comma-separated)

### Output

- Inputs render correctly
- Values displayed on screen

### Constraints

- No API calls
- No styling effort

---

## 🟢 Tier 1 — Core Engine (MVP)

### Goal

Display enemy weaknesses

### Tasks

- Fetch Pokémon data from API
- Extract types
- Implement type effectiveness engine

### Output

- Enemy types
- Weakness list

### Constraints

- No caching
- No team logic

---

## 🟡 Tier 2 — Cache Layer

### Goal

Eliminate repeated API calls

### Tasks

- Implement IndexedDB storage
- Cache Pokémon data
- Cache type data
- Cache-first fetch strategy

### Output

- Instant load after first fetch

### Constraints

- No UI changes

---

## 🟡 Tier 3 — Coverage System

### Goal

Show enemy possible attack types

### Tasks

- Extract moves from API
- Map moves → types
- Deduplicate types

### Output

- Coverage types list

### Constraints

- Do NOT list individual moves

---

## 🟠 Tier 4 — Team Evaluation (CORE)

### Goal

Recommend best Pokémon from team

### Tasks

- Parse user team
- Fetch each Pokémon
- Compare:
  - vs enemy weaknesses
  - vs enemy coverage

### Output

- Per Pokémon:
  - Strong / Neutral / Weak
  - Safe / Risk

### Constraints

- No advanced battle logic
- No stats or abilities

---

## 🟠 Tier 5 — UI Polish

### Goal

Fast, readable battle UI

### Tasks

- Add color coding
- Improve layout
- Ensure no scrolling required

### Output

- One-screen decision UI

### Constraints

- No design system
- No animations

---

## 🔵 Tier 6 — Team Persistence

### Goal

Persist and reuse teams

### Tasks

- Save team in localStorage
- Build simple team editor

### Output

- Team persists across sessions

---

## 🔵 Tier 7 — Import / Export

### Goal

Share and restore teams

### Tasks

- Export JSON
- Import JSON
- Clipboard support

### Format

{
"team": ["gyarados", "pikachu", "blastoise"]
}

---

## 🟣 Tier 8 — Advanced Features

### Goal

Improve decision accuracy

### Tasks

- Optional move-type input for user Pokémon
- Danger score calculation
- Best switch recommendation
- Smarter coverage filtering

### Constraints

- Still no full damage calculator

---

## 🟣 Tier 9 — UX Enhancements (Battle Efficiency)

### Goal

Improve usability and speed during battle without increasing complexity or visual noise.

---

### Tasks

- Implement autocomplete for Pokémon name input:
  - Suggest Pokémon names while typing
  - Allow keyboard navigation (arrow keys + enter)
  - Must be fast and non-blocking

- Improve primary action visibility:
  - Make "Analyze" button larger and visually prominent

- Improve layout hierarchy:
  - Move Import / Export section to bottom of the page

- Improve team usability:
  - Add collapsible "My Team" section
  - Allow toggle open/close
  - Default to collapsed after initial setup

- Fix team export/import:
  - Include moveTypes in exported JSON
  - Ensure import restores full team state (name + moveTypes)

---

### Output

- Faster Pokémon selection via autocomplete
- Clear primary action (Analyze)
- Cleaner layout with better focus on battle information
- Fully consistent import/export behavior

---

### Constraints

- Do NOT introduce heavy UI libraries
- Do NOT add visual clutter
- Do NOT degrade performance
- Do NOT fetch on every keystroke for autocomplete
- Autocomplete MUST use a local or cached list of Pokémon names
- Keep UI minimal and battle-focused
- Autocomplete MUST be instant (<50ms perceived response)
- Prefer preloaded or cached dataset over runtime API queries

---

### Notes

- Autocomplete should prioritize responsiveness over completeness
- Small Pokémon sprites may be added ONLY if they do not affect clarity or performance (optional)

## 🟣 Tier 10 — Interaction & Clarity Improvements

### Goal

Improve clarity, usability, and interaction flow during battle without adding complexity or visual noise.

---

### Tasks

- Extend autocomplete to "My Team" inputs:
  - Provide the same autocomplete behavior as Enemy Pokémon input
  - Share the same data source and filtering rules
  - Allow keyboard navigation and selection
  - Maintain performance (must remain instant)
  - Autocomplete implementation MUST be shared (single reusable component or logic)

- Improve team section labeling:
  - When collapsed, display: "Show My Team"
  - When expanded, display: "Hide My Team"

- Improve autocomplete filtering (shared across Enemy and Team inputs):
  - Exclude alternate or non-standard Pokémon forms (e.g., special event forms, Pokémon GO variants, cosmetic variants)
  - Prioritize base species and common competitive forms only
  - Ensure results remain simple and relevant for beginners
  - Autocomplete implementation MUST be shared (single reusable component or logic)

- Improve interaction flow:
  - When selecting a Pokémon from autocomplete:
    - Automatically trigger analysis IF the user's team is not empty

- Add evaluation legend:
  - Display a small legend explaining:
    - Strong / Neutral / Weak
    - Safe / Risk
    - Danger score (numeric value)
  - Keep it compact and readable
  - Position near "Team Evaluation" section

- Add enemy sprite:
  - Display a small Pokémon sprite in the Enemy Snapshot
  - Use official sprite from API if available
  - Keep size small and non-intrusive

---

### Output

- Clearer team toggle behavior
- Cleaner and more relevant autocomplete results
- Faster interaction (less manual actions)
- Better understanding of evaluation results
- Slightly improved visual recognition with sprite

---

### Constraints

- Do NOT introduce heavy UI libraries
- Do NOT add visual clutter
- Do NOT degrade performance
- Autocomplete filtering MUST be done locally or via cached data
- Do NOT rely on additional API calls for filtering
- Sprite must be lightweight and not affect layout or performance

---

### Notes

- Filtering logic should favor simplicity over completeness
- Legend should remain minimal and not distract from core battle information

## 🟣 Tier 11 — UI Polish & Logic Validation

### Goal

Refine visual clarity, improve interaction feedback, and ensure correctness of battle evaluation logic before introducing new features.

---

### Tasks

- Improve layout alignment:
  - Center main section titles:
    - "Pokemon Battle Helper"
    - "Enemy Snapshot"
    - "Team Evaluation"

- Improve team toggle UX:
  - Add icon indicator for collapse/expand (e.g., arrow up/down)
  - Keep "Show My Team" / "Hide My Team" text
  - Ensure clear visual affordance

- Improve interaction feedback:
  - Make evaluation labels clickable:
    - Strong / Neutral / Weak
    - Safe / Risk
  - On click, display brief explanation (inline or small expandable area)
  - Avoid hover-only interactions (must work on mobile)

- Improve visual recognition:
  - Add small Pokémon sprites in Team Evaluation list
  - Keep them compact and aligned with text
  - Do NOT significantly increase row height

- Validate and fix evaluation logic:
  - Ensure offensive matchup is correctly calculated:
    - Example: Bulbasaur vs Charizard should NOT be Neutral
  - Review type effectiveness calculations for:
    - Dual-type interactions
    - Multipliers (2x, 4x, etc.)
  - Ensure consistency between:
    - Weaknesses
    - Team evaluation
    - "Strong" classification

---

### Output

- Cleaner and more balanced layout
- Improved usability through clear interactions
- Better visual scanning with sprites
- Correct and reliable battle evaluations

---

### Constraints

- Do NOT introduce heavy UI libraries
- Do NOT increase visual clutter
- Do NOT degrade performance
- Sprites must remain lightweight and non-intrusive
- Interaction explanations must be minimal and fast to access
- Logic fixes must NOT introduce new features or complexity

---

### Notes

- Prioritize correctness over visual improvements
- This tier acts as stabilization before introducing new battle features (e.g., TM/learnable moves in future tiers)

## 🟣 Tier 12 — Move Coverage Integration

### Goal

Enhance team evaluation by incorporating user-defined move types (TM coverage), allowing more accurate offensive analysis without increasing complexity.

---

### Tasks

- Extend team data model:
  - Each Pokémon may include optional moveTypes
  - Example:
    {
    "name": "pikachu",
    "moveTypes": ["electric", "grass"]
    }

- Improve team input UX:
  - Add autocomplete for moveTypes in "My Team"
  - Reuse same autocomplete system
  - Restrict to valid Pokémon types only

- Integrate moveTypes into evaluation:

  For each Pokémon:
  - Combine:
    - Pokémon STAB types
    - User-defined moveTypes
  - Use this combined set as offensive coverage

- Update "Strong / Neutral / Weak" logic:
  - A Pokémon is "Strong" if ANY of its types (STAB or moveTypes) is super effective against the enemy
  - A Pokémon is "Weak" if:
    - It has no effective coverage AND is defensively disadvantaged
  - Otherwise → "Neutral"

- Enhance explanation system:
  - When showing "Strong":
    - Specify source:
      - STAB (e.g., "Water is super effective")
      - Move coverage (e.g., "Grass coverage is super effective")
  - Keep explanations minimal (1 line)

- Maintain compatibility:
  - If no moveTypes are provided → fallback to current behavior (STAB only)

- Visually distinguish move-based strengths:
  - Example:
    - "Strong (via move)"
    - or subtle indicator/icon

---

### Output

- More accurate team evaluation based on real coverage
- Clear distinction between:
  - Natural strengths (STAB)
  - Added strengths (moveTypes)

---

### Constraints

- Do NOT fetch full move lists from API
- Do NOT simulate learnsets or TM availability
- Do NOT introduce damage calculations
- Do NOT increase UI complexity significantly
- MoveTypes must be treated only as type hints

---

### Notes

- This tier enhances decision accuracy without changing core UX
- Keep evaluation fast and deterministic
- This is NOT a competitive battle simulator

## 🟣 Tier 13 — Final UX Polish & Usability

### Goal

Finalize the user experience by improving clarity, consistency, and usability without introducing new core features.

This tier focuses on:

- Explanation clarity
- Terminology consistency
- Interaction polish
- Real-world usability improvements

---

### Tasks

#### 1. TM Indicator Enhancement

- Standardize TM usage across the app:
  - Replace "via move" with "(TM)"
  - Example:
    - "Strong (TM)"
    - "Electric coverage (TM)"

- Add interactive TM explanation:
  - "(TM)" must be clickable/tappable
  - On click, show a small inline explanation:

    "TM: Coverage added via moves, not STAB"

- Interaction behavior:
  - Click → show explanation
  - Click again → hide explanation
  - Only one TM explanation visible at a time

---

#### 2. Enemy Move Input (NEW)

- Extend Enemy Snapshot to support optional moveTypes input
  - Same format as "My Team"
  - Reuse autocomplete system
  - Restrict to valid Pokémon types

- Example:
  {
  "enemy": {
  "name": "charizard",
  "moveTypes": ["electric"]
  }
  }

---

#### 3. Enemy Coverage Mode Switching (CRITICAL)

- If enemy moveTypes are provided:
  - Use ONLY provided moveTypes + STAB for enemy evaluation
  - Do NOT assume additional coverage
  - Do NOT display "(TM)" for enemy threats

- If enemy moveTypes are NOT provided:
  - Use current assumed coverage system
  - Display "(TM)" where applicable

  #### 3.1 Enemy Mode Indicator (NEW)

- Display a subtle indicator when enemy moveTypes are provided:

  Example:
  - "Using known enemy moves"

- This indicator should:
  - Appear within or near the Enemy Snapshot section
  - Be visually subtle (small text, low emphasis)
  - Not distract from core battle information

- Behavior:
  - If enemy moveTypes are present:
    - Show the indicator
    - System operates in "known moves" mode

  - If enemy moveTypes are NOT present:
    - Do NOT show the indicator
    - System operates in "assumed coverage" mode

- Purpose:
  - Clearly communicate whether:
    - Enemy threats are based on assumptions (TM)
    - OR based on user-provided moves

- Constraints:
  - Do NOT add icons, badges, or heavy styling
  - Do NOT increase layout complexity
  - Keep it as a simple, readable text hint

---

#### 4. Danger Explanation Refinement

- Ensure Danger explanation always includes:
  - Qualitative level (Low / Medium / High)
  - Summary of overall risk
  - One or two concrete causes

- Ensure consistency with score:
  - 0–5 → Low
  - 6–8 → Medium
  - 9+ → High

- Ensure explanation reflects mode:

  When using assumed coverage:
  - "Electric coverage (TM) can pressure Water"

  When using user-defined enemy moves:
  - "Electric coverage threatens Water"

---

#### 5. STAB vs TM Consistency

- Ensure consistent terminology across UI:
  - STAB → no label
  - Move-based → "(TM)" only when assumed

- Ensure explanations match selected source:
  - STAB → "Water is super effective vs Fire/Flying"
  - TM → "Ice coverage (TM) is super effective vs Dragon/Flying"

---

#### 6. Explanation Consistency Across Labels

- Ensure all clickable labels behave consistently:
  - Strong / Neutral / Weak
  - Safe / Risk
  - Danger

- Each explanation must:
  - Be 1–2 lines max
  - Use consistent tone and structure
  - Reflect actual logic (no contradictions)

---

#### 7. Interaction Polish

- Ensure active label state is visually clear:
  - Highlight selected label
  - Only one active per row

- Ensure explanation visibility is consistent:
  - Appears below the row
  - Does not shift layout excessively

---

#### 8. Best Switch Emphasis

- Improve visibility of "Best switch":
  - Add subtle visual emphasis:
    - Border highlight OR
    - Background tint OR
    - Icon (e.g., ⭐)

- Keep it minimal and non-intrusive

---

#### 9. Team Evaluation Readability

- Ensure rows are easy to scan:
  - Consistent spacing
  - Clear alignment of:
    - Sprite
    - Name
    - Labels

- Ensure no visual clutter is introduced

---

#### 10. Final Validation (CRITICAL)

Perform manual validation with scenarios:

- With enemy moveTypes provided
- Without enemy moveTypes

Test cases:

- STAB-only Pokémon
- Pokémon with moveTypes
- Enemy with known moves
- Enemy without known moves

Ensure:

- Correct label (Strong / Neutral / Weak)
- Correct explanation
- Correct source (STAB vs TM)
- Correct Danger explanation
- Correct mode switching behavior

---

### Output

- Fully consistent and understandable UI
- Clear distinction between:
  - STAB
  - TM (assumed coverage)
  - Known enemy moves
- Trustworthy explanations aligned with logic
- Smooth and intuitive interaction behavior

---

### Constraints

- Do NOT introduce complex move systems
- Do NOT fetch full move lists from API
- Do NOT simulate real learnsets
- Keep everything optional and user-driven
- Keep UI minimal and fast

---

### Notes

- This tier finalizes the product for real usage
- Focus on trust, clarity, and consistency
- Avoid overengineering or feature creep

# ⭐ Additional Feature

## Recent Enemies

### Goal

Quick reuse during battles

### Tasks

- Store last 5 searched Pokémon
- Display as quick buttons

---

# 🚫 Out of Scope (ALL TIERS)

Agents MUST NOT implement:

- Abilities
- Stats (IV/EV)
- Damage calculator
- Full move lists
- Competitive mechanics
- Backend services
- Authentication
- External APIs beyond PokeAPI

---

# 🧠 Agent Rules (for AGENTS.md generation)

Agents MUST:

- Only work within the current tier
- Only execute listed tasks
- Not anticipate future tiers
- Not refactor unrelated code
- Keep implementations minimal

Agents MUST NOT:

- Add features not defined in current tier
- Improve UX beyond requirements
- Introduce new dependencies without need

---

# 📍 Progress Tracking

Current Tier: [SET_THIS]

When working:

- Replace [SET_THIS] with active tier
- Only execute tasks from that tier

---

# ✅ Definition of Done (per tier)

A tier is complete when:

- All tasks are implemented
- Output matches specification
- Constraints are respected
- Required tests are implemented (for business logic tiers)
- No extra features are added

---

# 🚀 Notes

- Keep everything minimal
- Prefer clarity over completeness
- Build only what is needed for battle decisions

---

End of roadmap
