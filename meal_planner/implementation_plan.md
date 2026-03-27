# Implementation Plan — Meal Planner

This phased plan maps the tech design into incremental implementation phases, each with clear scope, milestones, acceptance criteria, and estimated effort. Prioritize Phase 1 for an MVP that runs client-side (PWA) with local storage.

---

## Phase 1 — MVP: Core Planner & Grocery Lists (2–4 weeks)

Goal: Deliver a working client-side planner that imports recipes, generates a 7-day dinner plan, and produces a consolidated shopping list with pantry subtraction.

Milestones
- Minimal UI: recipe list, recipe detail, pantry manager, weekly planner grid, shopping list view.
- Recipe import: manual entry + JSON/CSV import of family recipes.
- Planner engine: constraint-aware greedy heuristic (dietary/allergen filtering, weekday time limits, bulk-day handling).
- Shopping list aggregation: canonicalization of ingredient names, unit conversion (basic), pantry subtraction.
- Local persistence: IndexedDB, export/import JSON backup.

Acceptance Criteria
- Generate a 7-day plan from imported recipes that respects dietary/allergy filters and weekday cook-time limits.
- Shopping list aggregates quantities and subtracts pantry items.
- UI permits marking pantry items and marking meals as cooked.

Deliverables
- `implementation_plan.md` (this file)
- `tech_design.md` (existing)
- Minimal React (or PWA) app scaffold with planner endpoint implemented client-side.

Risk & Mitigation
- Ingredient canonicalization complexity — start with manual merge UI and a small mapping table.

Estimated Effort: 2–4 weeks (1 dev)

---

## Phase 2 — UX, Offline & Pantry Sync (2–3 weeks)

Goal: Improve UX, add offline resilience, and robust pantry flows.

Milestones
- Mobile-first responsive styling and accessibility improvements.
- Offline-first behavior: app fully usable offline, sync queue when online.
- Pantry UX: quick-add staples, recurring items, low-stock alerts.
- Manual override flows: lock days, re-run planner preserving overrides.

Acceptance Criteria
- App can create and view plans while offline; syncing does not corrupt local plans.
- Pantry adjustments reflect immediately in shopping lists.

Estimated Effort: 2–3 weeks

---

## Phase 3 — Optimization, Ratings & Analytics (2–4 weeks)

Goal: Improve planner quality via ratings, repetition heuristics, and more advanced optimization (optional server-side ILP later).

Milestones
- Recipe ratings UI & history tracking influence planner scoring.
- Variety & repeat thresholds enforced by planner.
- Introduce a server-side optional planner endpoint with batch optimization (ILP/CP-SAT) for power users.
- Planner explainability: decision traces returned to UI.

Acceptance Criteria
- Rated recipes are preferred when other score components tie-break.
- Server-side optimized runs return improved reuse scores for large catalogs.

Estimated Effort: 2–4 weeks

---

## Phase 4 — Integrations & Extensibility (1–3 weeks)

Goal: Add exports, calendar sync, and optional cloud persistence.

Milestones
- Export formats: CSV shopping lists, printable views, ICS calendar export.
- Optional cloud sync with user opt-in (Postgres or Firestore backend).
- OAuth calendar integration (read/write limited events) and notifications.

Acceptance Criteria
- Users can export shopping lists as CSV and add meal events to a calendar via ICS or direct sync.
- Cloud sync restores data on a second device without data loss (basic conflict handling).

Estimated Effort: 1–3 weeks

---

## Phase 5 — Testing, Docs & Deployment (1–2 weeks)

Goal: Hardening, tests, documentation, and public deployment.

Milestones
- Unit tests for planner heuristics and aggregator, integration tests for end-to-end planning flow.
- README, basic user docs, and developer setup guide.
- CI pipeline for builds, tests, and deploy to static host (if PWA) or container registry (if backend).

Acceptance Criteria
- CI runs tests; builds produce deployable artifacts; documented run instructions exist.

Estimated Effort: 1–2 weeks

---

## Dependencies & Sequencing
- Phase 1 must complete before Phase 2. Phase 3 (server-side optimization) can be started in parallel with Phase 2 if backend resources are available.
- Calendar integration and cloud sync depend on user auth infrastructure.

## Backlog / Next Steps
- Break Phase 1 milestones into issues/user stories (import, planner core, UI scaffolding, persistence, aggregation). Would you like me to generate a backlog of user stories and tasks (GitHub issues format)?

---

Generated from `tech_design.md` and `requirements.md`.
