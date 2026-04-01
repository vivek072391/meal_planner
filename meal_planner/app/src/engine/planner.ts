import type { Recipe, UserProfile, PantryItem, MealPlan, DaySlot } from '../types';
import { generateId, getWeekDates } from '../utils';

interface PlannerOptions {
  profile: UserProfile;
  recipes: Recipe[];
  pantryItems: PantryItem[];
  weekStartDate: string;
  plannedDays: number[]; // which days of week to fill (0=Sun … 6=Sat)
  existingPlan?: MealPlan; // for re-runs preserving overrides
}

/**
 * Constraint-aware greedy planner.
 *
 * Objectives (in order):
 * 1. Hard constraints: allergies + dietary restrictions
 * 2. Day-type fit: bulk recipes on bulk days, weekday-friendly on weekdays
 * 3. Maximize ingredient reuse (shared ingredients across the week)
 * 4. Prefer higher-rated recipes on tie-break
 * 5. Avoid repeats within the week
 */
export function generateMealPlan(options: PlannerOptions): MealPlan {
  const { profile, recipes, weekStartDate, plannedDays, existingPlan } = options;

  const dates = getWeekDates(weekStartDate);
  const totalServings = profile.members.reduce((s, m) => s + m.servingMultiplier, 0);
  const allAllergies = new Set(
    profile.members.flatMap((m) => m.allergies.map((a) => a.toLowerCase()))
  );
  const allRestrictions = new Set(
    profile.members.flatMap((m) => m.dietaryRestrictions)
  );

  // Pre-filter: remove recipes that violate hard constraints
  const eligible = recipes.filter((r) => {
    const hasAllergen = r.ingredients.some((ing) =>
      [...allAllergies].some((a) => ing.name.toLowerCase().includes(a))
    );
    if (hasAllergen) return false;

    if (allRestrictions.has('vegetarian') && !r.tags.includes('vegetarian') && !r.tags.includes('vegan'))
      return false;
    if (allRestrictions.has('vegan') && !r.tags.includes('vegan')) return false;
    if (allRestrictions.has('gluten-free') && !r.tags.includes('gluten-free')) return false;
    if (allRestrictions.has('dairy-free') && !r.tags.includes('dairy-free')) return false;
    if (allRestrictions.has('nut-free') && !r.tags.includes('nut-free')) return false;

    return true;
  });

  // Build initial slots — only planned days get a recipe; others stay null
  const daySlots: DaySlot[] = dates.map((date, i) => {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const isPlanned = plannedDays.includes(dayOfWeek);
    const isBulkDay = profile.bulkDays.includes(dayOfWeek);

    // Preserve manual overrides on re-run, but only if the day is still planned
    const existingSlot = existingPlan?.daySlots.find((s) => s.date === date);
    if (existingSlot?.manualOverride && isPlanned) return existingSlot;

    return {
      date,
      recipeId: null,
      servings: Math.ceil(totalServings),
      manualOverride: false,
      _isPlanned: isPlanned,
      _isBulkDay: isBulkDay,
      _dayIndex: i,
    } as DaySlot & { _isPlanned: boolean; _isBulkDay: boolean; _dayIndex: number };
  });

  const usedRecipeIds = new Set<string>();
  const selectedIngredients = new Map<string, number>();

  // Sort: bulk days first (to anchor shared ingredients), then remaining
  const sortedIndices = [...daySlots.keys()].sort((a, b) => {
    const aSlot = daySlots[a] as DaySlot & { _isBulkDay?: boolean };
    const bSlot = daySlots[b] as DaySlot & { _isBulkDay?: boolean };
    if (aSlot._isBulkDay && !bSlot._isBulkDay) return -1;
    if (!aSlot._isBulkDay && bSlot._isBulkDay) return 1;
    return 0;
  });

  for (const idx of sortedIndices) {
    const slot = daySlots[idx] as DaySlot & { _isPlanned?: boolean; _isBulkDay?: boolean };

    // Skip days not in the planned set, and days already set (manual overrides)
    if (!slot._isPlanned) continue;
    if (slot.manualOverride || slot.recipeId) continue;

    const dayOfWeek = new Date(slot.date + 'T12:00:00').getDay();
    const isBulkDay = profile.bulkDays.includes(dayOfWeek);

    const candidates = eligible.filter((r) => {
      if (usedRecipeIds.has(r.id)) return false;
      if (!isBulkDay && !r.weekdayFriendly) return false;
      return true;
    });

    if (candidates.length === 0) {
      const fallback = eligible.find((r) => !usedRecipeIds.has(r.id)) ?? eligible[0] ?? null;
      slot.recipeId = fallback?.id ?? null;
    } else {
      const scored = candidates.map((r) => {
        const reuseScore = r.ingredients.reduce((sum, ing) => {
          return sum + (selectedIngredients.get(ing.name.toLowerCase()) ?? 0);
        }, 0);
        const bulkBonus = isBulkDay && r.bulkCookable ? 2 : 0;
        const rating = r.rating ?? 3;
        return { recipe: r, score: reuseScore * 3 + bulkBonus + rating };
      });

      scored.sort((a, b) => b.score - a.score);
      const chosen = scored[0].recipe;
      slot.recipeId = chosen.id;
      usedRecipeIds.add(chosen.id);
      chosen.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase();
        selectedIngredients.set(key, (selectedIngredients.get(key) ?? 0) + 1);
      });
    }
  }

  const cleanSlots: DaySlot[] = daySlots.map(({ date, recipeId, servings, manualOverride }) => ({
    date, recipeId, servings, manualOverride,
  }));

  return {
    id: existingPlan?.id ?? generateId(),
    weekStartDate,
    daySlots: cleanSlots,
    generatedAt: new Date(),
  };
}
