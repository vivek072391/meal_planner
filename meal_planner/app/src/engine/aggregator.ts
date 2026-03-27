import type { MealPlan, Recipe, PantryItem, ShoppingList, ShoppingListItem } from '../types';
import { generateId } from '../utils';

/**
 * Aggregates ingredients across the week's meal plan,
 * subtracts pantry quantities, and returns a consolidated shopping list.
 */
export function generateShoppingList(
  plan: MealPlan,
  recipes: Recipe[],
  pantryItems: PantryItem[]
): ShoppingList {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const pantryMap = new Map(pantryItems.map((p) => [canonicalize(p.name), p]));

  // Aggregate ingredients
  const aggregated = new Map<
    string,
    { quantity: number; unit: string; sources: string[] }
  >();

  for (const slot of plan.daySlots) {
    if (!slot.recipeId) continue;
    const recipe = recipeMap.get(slot.recipeId);
    if (!recipe) continue;

    // Scale by servings ratio
    const scale = slot.servings / recipe.servings;

    for (const ing of recipe.ingredients) {
      const key = canonicalize(ing.name);
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += ing.quantity * scale;
        if (!existing.sources.includes(recipe.title)) {
          existing.sources.push(recipe.title);
        }
      } else {
        aggregated.set(key, {
          quantity: ing.quantity * scale,
          unit: ing.unit,
          sources: [recipe.title],
        });
      }
    }
  }

  // Build shopping list items, subtract pantry
  const items: ShoppingListItem[] = [];
  for (const [key, agg] of aggregated.entries()) {
    const pantry = pantryMap.get(key);
    const pantryQty = pantry && pantry.unit === agg.unit ? pantry.quantity : 0;
    const adjusted = Math.max(0, agg.quantity - pantryQty);

    items.push({
      name: key,
      totalQuantity: roundQty(agg.quantity),
      unit: agg.unit,
      sourceRecipes: agg.sources,
      pantryAdjustedQuantity: roundQty(adjusted),
      inPantry: adjusted <= 0,
    });
  }

  // Sort: items to buy first, then by name
  items.sort((a, b) => {
    if (a.inPantry !== b.inPantry) return a.inPantry ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return {
    id: generateId(),
    weekStartDate: plan.weekStartDate,
    items,
    generatedAt: new Date(),
  };
}

function canonicalize(name: string): string {
  return name.trim().toLowerCase();
}

function roundQty(q: number): number {
  return Math.round(q * 100) / 100;
}
