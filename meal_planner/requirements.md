##Overview
You are an expert chef that plans meals for a family of 3 - 2 adults and 1 3 year old. You plan groceries, determine which meals to cook / eat each night for dinnner, and ensure the family eats healthy and uses ingredients in the most time effective way. You optimize for simple recipes that can either be cooked in bulk during the weekend or take 30min to cook during the week. You make sure the meals follow dietary restrictions of the family, and tell the family what to buy each week so you can cook for them. You pull from a list of recipes that the family provides you. 

## Detailed Requirements

Scope
- Source: Based on Overview in this file.
- Goal: Build a meal-planning assistant for a family of three (2 adults, 1 child age 3) that plans dinners, generates weekly grocery lists, enforces dietary restrictions, optimizes for simple/bulk recipes, and maximizes ingredient reuse and time efficiency.

Functional Requirements
- User Profiles: Support a family profile with members (name, age, servings multiplier, dietary restrictions, allergies). Default profile: 2 adults + 1 three-year-old.
- Recipe Repository: Allow importing and managing a family-provided recipe list (title, ingredients with quantities/unit, steps, cook time, tags: bulk/weekday/vegetarian/gluten-free/allergen flags, servings).
- Recipe Tagging & Metadata: Each recipe must include estimated prep/cook time, bulk-cookable flag, weekday-friendly flag (≤30 minutes), nutrition summary (optional), and perishability score for key ingredients.
- Meal Planning Engine:
	- Generate weekly dinner plans (configurable week range) that:
		- Satisfy family dietary restrictions and allergy exclusions.
		- Prefer recipes tagged bulk for weekend slots and recipes ≤30 minutes for weekday slots.
		- Maximize ingredient reuse to minimize grocery waste and shopping complexity.
		- Balance variety (avoid repeating the same main dish more than X times per N weeks — configurable).
		- Scale portions according to profile (including toddler portion rules).
	- Allow manual overrides per day and re-run optimization preserving user edits where possible.
- Grocery List Generation:
	- Produce a consolidated weekly shopping list aggregated by ingredient with quantities adjusted for planned servings and current pantry inventory.
	- Flag items to buy vs items likely available in pantry; allow marking pantry items and quantities.
	- Exportable formats: printable view, CSV, copy-to-clipboard, and mobile-friendly checklist.
- Pantry/Inventory Management: Track pantry items and quantities; decrement when meals are planned/marked cooked; enable quick addition of recurring staples.
- Scheduling & Calendar Integration: Display plan in a weekly calendar; allow syncing/export to common calendar formats (ICS) or link with device calendar (optional).
- Cooking Workflow: Show step-by-step recipe instructions and estimated total cook time. Indicate which recipes are bulk-cooked and include reheating/serving guidance for leftovers.
- Dietary Constraints & Safety: Enforce dietary restrictions at planning time (e.g., vegetarian, dairy-free) and handle toddler-specific constraints (texture/portion).
- User Actions & Feedback: Allow marking a meal as “cooked” or “skipped”, which updates pantry and future planning heuristics. Allow rating recipes to influence future selections.
- Import/Export & Sharing: Import recipes via structured formats (JSON/CSV) or manual entry; export meal plans and shopping lists.
- Notifications & Reminders: Optional reminders for shopping day, meal prep start, or when pantry items are low.
- Admin Settings: Configure week start day, maximum cook time for weekday recipes, which days are “bulk cook” opportunities, serving size rules, and repetition thresholds.

Non‑Functional Requirements
- Performance: Generate a 7-day plan and shopping list for up to 500 recipes in under 3 seconds on a typical modern laptop.
- Availability: App should work offline for viewing existing plans and pantry; sync when online.
- Data Storage & Privacy: Persist user data locally by default; provide optional cloud sync with user consent and encryption in transit and at rest.
- Security: Protect personal data; follow least-privilege for any integrations (calendar, cloud).
- Usability: Mobile-first responsive UI, simple flows for importing recipes and marking pantry items, accessible (WCAG AA).
- Maintainability: Modular architecture separating recipe storage, planning engine, and UI to allow updates to planning heuristics.
- Localization: Support units (metric/imperial) and language localization hooks.

Acceptance Criteria
- Dietary Compliance: Given a profile with a specified allergy, the generated 7-day dinner plan contains zero recipes with that allergen.
- Time Constraints: All weekday dinners have cook time ≤ configured weekday max (default 30 minutes).
- Bulk Placement: Weekend slots contain recipes marked bulk when available and flagged as preferred.
- Grocery Minimality: Generated shopping list aggregates ingredient quantities and reduces duplicates when multiple recipes use the same ingredient.
- Portion Scaling: Recipes scale correctly to the family profile (adult vs toddler portions) and ingredient totals match scaled serving counts.
- Pantry Integration: Marking pantry items reduces shopping list quantities accordingly.
- Manual Override Persistence: When a user edits a day’s meal and re-runs the planner, the planner respects the explicit override.
- Export/Import: Importing a provided recipe list results in those recipes being available for planning; shopping list exports are valid CSV and printable.

Assumptions & Constraints
- Input Quality: Recipes provided by the family include ingredient quantities and cook times (best-effort).
- Scope Limit: Initial scope focuses on dinners and weekly planning; breakfasts/lunches are out of scope for MVP.
- Nutrition: Detailed nutrition calculation is optional for MVP; basic tags suffice initially.

---
Updated: Added detailed functional, non-functional, and acceptance requirements.