# 🤖 AGENTS.md — Pokemon Battle Helper

## 🎯 Purpose

This document defines how agents must behave when working on the project.
It is derived from roadmap.md and is strictly enforced.

Agents operate by:

- Reading the current tier
- Executing ONLY the tasks of that tier
- Respecting all constraints

---

# 📍 Source of Truth

- The roadmap is defined in `./roadmap.md` (root folder)
- roadmap.md is the ONLY source of scope
- If something is not in the current tier → DO NOT BUILD IT
- Agents MUST read `./roadmap.md` before executing any task

---

# 🧭 Current Tier

CURRENT_TIER = Tier 14

Agents MUST:

- Read CURRENT_TIER before doing anything
- Only execute tasks from that tier

---

# 🧱 General Rules

## ✅ Agents MUST

- Follow roadmap tiers strictly
- Implement minimal viable solutions
- Keep code simple and readable
- Use TypeScript
- Keep battle logic as pure functions
- Separate UI from logic
- Reuse existing code when possible
- Write tests for all business logic (Battle Engine)
- Follow TDD when possible:
  1. Write test
  2. Implement logic
  3. Make test pass

- Test only pure functions (no UI testing required)
- Keep tests minimal and focused

---

## 🚫 Agents MUST NOT

- Implement features from future tiers
- Add extra UX improvements not requested
- Introduce new dependencies without clear need
- Refactor unrelated parts of the codebase
- Add backend or server logic
- Add authentication
- Use APIs other than PokeAPI
- Skip tests for core logic
- Over-test UI components
- Add complex testing frameworks

---

# ⚙️ Tech Constraints

Agents MUST use:

- React
- Vite
- TypeScript
- localStorage (for team)
- IndexedDB (for caching)

Testing stack:

- Vitest
- No additional libraries unless required

Agents MUST NOT:

- Replace stack
- Introduce frameworks or libraries outside this list

---

# 🧠 Architecture Rules

Agents MUST respect:

UI (React)
↓
Battle Engine (pure TypeScript)
↓
Data Layer

Rules:

- No business logic inside components
- All calculations in pure functions
- Data fetching isolated

---

# 📦 Data Rules

- Use PokeAPI for Pokémon data
- Cache results in IndexedDB when applicable (Tier 2+)
- Do not fetch repeatedly if cached

---

# 🧪 Task Execution Protocol

When implementing:

1. Identify CURRENT_TIER
2. Extract tasks from roadmap
3. Implement ONLY those tasks
4. Validate output matches roadmap
5. Stop

Agents MUST NOT:

- Continue into next tier
- “Improve” beyond requirements

---

# 🧾 Output Rules

Agents should:

- Deliver working code
- Keep files minimal
- Avoid over-abstraction

Agents should NOT:

- Add comments explaining obvious code
- Add documentation unless requested

---

## 🧪 Testing Scope (STRICT)

Agents MUST:

- Test ONLY pure business logic functions (Battle Engine)
- Avoid any external dependencies in tests

Agents MUST NOT:

- Test API calls (PokeAPI interactions)
- Test React components or UI rendering
- Mock network requests unless absolutely required
- Introduce complex mocking setups

Rationale:
Tests must remain fast, deterministic, and focused only on core logic.

---

# 🚫 Global Out of Scope

Never implement:

- Abilities
- Stats (IV/EV)
- Damage calculators
- Full move listings UI
- Competitive mechanics
- Backend services

---

# ⭐ Special Features (Allowed only when tier reached)

- Team persistence (Tier 6)
- Import/Export (Tier 7)
- Advanced analysis (Tier 8)
- Recent enemies

---

# 🧩 Definition of Done

A task is complete when:

- It matches roadmap output
- It respects constraints
- It introduces no extra features

---

# 🧠 Behavior Summary

Agents are:

- Strict
- Minimal
- Deterministic

Agents are NOT:

- Creative beyond scope
- Product designers
- Optimizers beyond requirements

---

End of AGENTS.md
