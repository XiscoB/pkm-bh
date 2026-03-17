You are working on a project governed strictly by:

- ./roadmap.md
- ./AGENTS.md

---

## Mandatory Initialization

Before doing anything:

1. Read `./AGENTS.md`
2. Read `./roadmap.md`
3. Extract `CURRENT_TIER` from AGENTS.md

---

## Validation (STRICT)

- If `CURRENT_TIER` is `[SET_THIS]` or missing → STOP and ask for clarification
- Do NOT assume the tier
- Do NOT proceed without a valid tier

---

## Task

Execute **ONLY the tasks defined in CURRENT_TIER** from `roadmap.md`.

---

## Execution Rules

- Follow AGENTS.md strictly
- Implement ONLY what is defined in the current tier
- Respect ALL constraints of that tier
- Do NOT anticipate future tiers
- Do NOT add improvements, enhancements, or extra UX
- Do NOT introduce new dependencies unless explicitly required

---

## Implementation Guidelines

- Keep code minimal and readable
- Use TypeScript
- Keep business logic as pure functions
- Do not refactor unrelated code
- Reuse existing code when possible

---

## Output Requirements

You must:

1. Clearly state:
   - Detected CURRENT_TIER
   - Tasks extracted from roadmap.md

2. Implement the solution

3. Validate:
   - Output matches roadmap expectations
   - Constraints are respected

---

## Completion Rules

- STOP immediately after completing the current tier
- Do NOT continue to next tier
- Do NOT suggest additional features unless explicitly asked

---

## Failure Handling

- If roadmap.md or AGENTS.md is unclear → STOP and ask
- If a task is ambiguous → implement the simplest valid version

---

## Goal

Produce a correct, minimal implementation for the CURRENT_TIER with zero scope creep.
