# Tech Design — Meal Planner

## Overview
This document describes the technical design for the Meal Planner app (dinner-focused) based on the project's requirements. The system generates weekly dinner plans for a family of three (2 adults, 1 toddler), enforces dietary constraints, optimizes for bulk/weeknight recipes, and produces consolidated grocery lists with pantry integration.

## Goals
- Produce repeatable, testable meal plans and shopping lists.
- Keep the system modular: separate UI, planner engine, storage, and integration layers.
- Make the planner performant and deterministic for a good UX on consumer devices.

## High-level Architecture
- Client: Web (React) or mobile-friendly PWA. Responsible for UI, recipe entry, pantry management, marking cooked meals, and offline access.
- Backend: Lightweight REST API (optional for cloud sync). Provides recipe storage, meal plan generation endpoint, and user profile persistence. Planner engine can run client-side (for privacy/offline) or server-side (for heavy optimization / cloud sync).
- Data Store: Local storage (IndexedDB) for client-only mode; optional cloud DB (Postgres or Firestore) for sync.
- Sync Layer: Optional sync service with conflict resolution (last-write-wins for non-critical fields; explicit merge for recipes and pantry quantities).
- Integrations: Calendar export (ICS), CSV export, optional calendar API (OAuth-limited), push notifications (optional).

## Component Breakdown
- UI Layer
  - Profile & Settings screens
  - Recipe manager (import, manual entry, edit)
  - Pantry manager (items, quantities)
  - Weekly planner view (calendar/grid)
  - Meal detail (instructions, cook/reheat guidance)
  - Grocery checklist (printable / CSV / mobile checklist)

- Planner Engine
  - Input: recipes, user profile, pantry inventory, week configuration, user overrides
  - Output: ordered 7-day dinner plan, consolidated shopping list
  - Responsibilities: enforce constraints, optimize for reuse & time, scale servings, respect manual overrides

- Persistence
  - Entities persisted: UserProfile, Recipes, PantryItems, MealPlans, ShoppingLists, Ratings/History
  - Local: IndexedDB for PWA; Cloud: authenticated per-user DB

## Data Model (core entities)
- UserProfile
  - id, name, members: [{name, age, type(adult/toddler), dietaryRestrictions[], allergies[], servingMultiplier}], preferences (weekStart, weekdayMaxCookMins, bulkDays[])

- Recipe
  - id, title, ingredients: [{name, quantity, unit, optional}], steps[], prepTimeMins, cookTimeMins, tags[], servings, bulkCookable(bool), perishabilityScore, nutritionSummary(optional), source

- Ingredient (normalized)
  - id, name, unitType (weight/volume/count), canonicalUnits[]

- PantryItem
  - id, ingredientId, quantity, unit, location, lastUpdated

- MealPlan
  - id, weekStartDate, daySlots: [{date, recipeId, servings, manualOverride(bool)}], generatedAt, metadata

- ShoppingList
  - id, weekStartDate, items: [{ingredientId, name, totalQuantity, unit, sourceRecipes[], pantryAdjustedQuantity}], exportedAt

- History / Ratings
  - recipeId, userId, date, rating, notes

## APIs (if backend present)
- Auth (optional): `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`
- Profiles: `GET/PUT /profiles/{id}`
- Recipes: `GET /recipes`, `POST /recipes`, `PUT /recipes/{id}`, `DELETE /recipes/{id}`
- Pantry: `GET /pantry`, `POST /pantry`, `PUT /pantry/{id}`
- Planner: `POST /planner/generate` — body: {profileId, weekStart, pantrySnapshot, overrides[], constraints} -> returns MealPlan + ShoppingList
- Exports: `GET /planner/{planId}/shoppinglist.csv`, `GET /planner/{planId}/plan.ics`

API considerations
- Planner endpoint should accept a `dryRun` flag and `preserveOverrides` flag. Responses include trace metadata (why a recipe was chosen / which constraint blocked alternate choices) to help UI explain decisions.

## Planner Engine Design
- Inputs:
  - Candidate recipe set (family-provided)
  - Profile constraints (dietary, allergies, toddler rules)
  - Day type constraints (weekday max cook time)
  - Pantry inventory
  - User overrides and repetition history

- Objectives (ordered):
  1. Satisfy hard constraints (allergies, incompatibilities).
  2. Fit weekday time limits and place bulk recipes on configured bulk days.
  3. Maximize ingredient reuse across the week (minimize distinct shopping items & waste).
  4. Maintain variety (avoid repeats beyond configured thresholds).
  5. Prefer higher-rated recipes when tie-breaking.

- Algorithmic approach
  - MVP: Constraint-aware greedy heuristic
    - Pre-filter recipes by dietary/allergen constraints.
    - Tag recipes by day-compatibility (weekday vs bulk/weekend).
    - For each day in preferred order (weekend first for bulk placement, then weekdays), select recipe maximizing a scoring function:
      score = w1*reuseScore + w2*(isPreferredDay) + w3*(rating) - w4*(repeatPenalty)
    - Recompute pantry-adjusted shopping list after selection.
  - Optional (v2): ILP/CP-SAT formulation (e.g., OR-Tools) to solve an optimization problem minimizing shopping footprint subject to constraints. Use server-side compute for ILP.

- Re-runs & overrides
  - Keep `manualOverride` flags. When re-running, lock overridden days and only re-optimize open slots. Provide UI to show alternative suggestions for locked slots.

- Scaling & Performance
  - For client-side: keep algorithms O(N * D) where N = #recipes, D = days (7). Use memoization for reuse scoring.
  - For server-side ILP: bound candidate set (e.g., top K per tag) to keep problem tractable.

## Shopping List Aggregation
- Normalize ingredient names using a simple canonicalization map (tokenization + lookup). Allow UI to merge duplicates.
- Convert units to canonical units for aggregation (e.g., grams/oz) based on ingredient unitType. Provide unit preferences (metric/imperial) in user profile.
- Subtract pantry quantities to create the final `toBuy` list. Flag low-stock alerts.

## Storage & Sync
- Local-first: Persist all core entities to IndexedDB; allow export/import of JSON for backups.
- Cloud sync (optional): Use per-user authenticated store with encrypted transport (HTTPS + OAuth). Conflict resolution: operations-based sync (preferred) or last-write-wins with user merge tools.

## Security & Privacy
- By default, keep data local to device. If cloud sync enabled, require explicit user opt-in.
- Minimize permissions for calendar/notifications; use OAuth scopes narrowly.
- Encrypt sensitive data at rest if stored in cloud.

## UI/UX Considerations
- Mobile-first; keep flows short for adding recipes and pantry items.
- Explainability: surface reasons for planner choices (e.g., "chosen to reuse chicken breast from Tue's meal").
- Easy manual override with ability to see re-run results that respect overrides.
- Simple import flow: CSV/JSON and quick parsing helpers.

## Testing Strategy
- Unit tests for planner heuristics and ingredient aggregation.
- Integration tests for planner -> shopping list generation with sample datasets.
- E2E tests to simulate common user flows: import recipes, create pantry, generate plan, export CSV.

## Observability & Monitoring (if server used)
- Basic application logs for planner runs (duration, candidate count, decision trace).
- Metrics: planner latency, sync failures, recipe import errors.

## Deployment & Ops
- Client-only (PWA): publish static site (Netlify/Vercel) or npm build.
- Server + cloud DB: containerized backend (Docker), deploy on managed service (Heroku/GCP Cloud Run). Use connection pooling and caching for planner endpoint.

## Future Enhancements
- ILP/CP-SAT optimization for improved optimality.
- Recipe nutrition calculation & optimization for balanced diet goals.
- Multi-meal planning (breakfast/lunch), shopping budget constraints, delivery integration.

## Open Questions
- Preferred default for client-side vs server-side planner? (privacy vs heavy optimization)
- Canonical ingredient database: use open dataset or custom mapping?

---
Generated from requirements in `requirements.md`.
