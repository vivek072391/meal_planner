import type { MealPlan, Recipe, PantryItem, ShoppingList, ShoppingListItem } from '../types';
import { generateId } from '../utils';

// ── Synonym / alias map ────────────────────────────────────────────────────
// Applied before AND after descriptor stripping (handles both raw and
// stripped forms). Keys must be pre-lowercased.
const ALIASES: Record<string, string> = {
  // Flour
  'all-purpose flour': 'flour',
  'all purpose flour': 'flour',
  'plain flour': 'flour',
  // Salt
  'kosher salt': 'salt',
  'sea salt': 'salt',
  'table salt': 'salt',
  'coarse salt': 'salt',
  // Pepper
  'black pepper': 'pepper',
  'ground black pepper': 'pepper',
  'freshly ground pepper': 'pepper',
  'freshly ground black pepper': 'pepper',
  'white pepper': 'white pepper',
  // Olive oil
  'extra virgin olive oil': 'olive oil',
  'extra-virgin olive oil': 'olive oil',
  // Butter
  'unsalted butter': 'butter',
  'salted butter': 'butter',
  // Cream
  'heavy whipping cream': 'heavy cream',
  'double cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  // Garlic
  'garlic clove': 'garlic',
  'garlic cloves': 'garlic',
  // Green onion family
  'scallion': 'green onion',
  'scallions': 'green onion',
  'spring onion': 'green onion',
  'spring onions': 'green onions',
  // Broth / stock
  'chicken stock': 'chicken broth',
  'vegetable stock': 'vegetable broth',
  'beef stock': 'beef broth',
};

// ── Descriptor / preparation words to strip ───────────────────────────────
// These words modify how an ingredient is prepared but don't change identity.
const STRIP_WORDS = new Set([
  // Preparation methods
  'minced', 'chopped', 'diced', 'sliced', 'shredded', 'grated', 'crushed',
  'peeled', 'seeded', 'deseeded', 'trimmed', 'halved', 'quartered', 'cubed',
  'julienned', 'toasted', 'roasted', 'caramelized',
  'finely', 'roughly', 'thinly', 'coarsely',
  // State
  'fresh', 'frozen', 'dried', 'canned', 'raw', 'cooked', 'thawed', 'packed',
  // Size
  'large', 'medium', 'small', 'whole', 'big',
  // Meat modifiers
  'boneless', 'skinless',
  // Quality
  'organic', 'extra', 'virgin',
]);

// ── Plural normalization ───────────────────────────────────────────────────
function depluralize(word: string): string {
  if (word.length < 4) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'; // berries → berry
  if (word.endsWith('oes')) return word.slice(0, -1);        // tomatoes → tomato
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    return word.slice(0, -1); // cloves→clove, onions→onion, eggs→egg
  }
  return word;
}

// ── Main canonicalize function ─────────────────────────────────────────────
function canonicalize(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ');

  // Remove parenthetical notes:  "butter (softened)" → "butter"
  s = s.replace(/\s*\([^)]*\)/g, '').trim();

  // Remove text after comma:  "garlic, minced" → "garlic"
  s = s.replace(/,.*$/, '').trim();

  // Alias check on the cleaned-but-not-yet-stripped form
  if (ALIASES[s]) return ALIASES[s];

  // Strip preparation/descriptor words
  const words = s.split(' ');
  const core = words.filter((w) => !STRIP_WORDS.has(w));
  const kept = core.length > 0 ? core : words; // never strip everything

  // Depluralize only the last word (preserves "green onions" → "green onion")
  if (kept.length > 0) {
    kept[kept.length - 1] = depluralize(kept[kept.length - 1]);
  }

  s = kept.join(' ');

  // Alias check again on the normalized form (catches "garlic clove" → "garlic")
  if (ALIASES[s]) return ALIASES[s];

  return s;
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

// ── Main export ────────────────────────────────────────────────────────────
/**
 * Aggregates ingredients across the week's meal plan,
 * subtracts pantry quantities, and returns a consolidated shopping list.
 *
 * Ingredients are grouped by (canonical name + unit). Same-name ingredients
 * with different units (e.g. "garlic: 3 cloves" vs "garlic: 1 tsp") remain
 * as separate rows rather than incorrectly summing across incompatible units.
 */
export function generateShoppingList(
  plan: MealPlan,
  recipes: Recipe[],
  pantryItems: PantryItem[]
): ShoppingList {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  // Pantry is keyed by canonical name only (unit handled at lookup time)
  const pantryMap = new Map(pantryItems.map((p) => [canonicalize(p.name), p]));

  // Key: "canonicalName||unit"  →  aggregated quantities
  const aggregated = new Map<
    string,
    { name: string; quantity: number; unit: string; sources: string[] }
  >();

  for (const slot of plan.daySlots) {
    if (!slot.recipeId) continue;
    const recipe = recipeMap.get(slot.recipeId);
    if (!recipe) continue;

    const scale = slot.servings / recipe.servings;

    for (const ing of recipe.ingredients) {
      const canonName = canonicalize(ing.name);
      const unit = normalizeUnit(ing.unit);
      const key = `${canonName}||${unit}`;

      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += ing.quantity * scale;
        if (!existing.sources.includes(recipe.title)) {
          existing.sources.push(recipe.title);
        }
      } else {
        aggregated.set(key, {
          name: canonName,
          quantity: ing.quantity * scale,
          unit: ing.unit.trim(), // preserve original casing for display
          sources: [recipe.title],
        });
      }
    }
  }

  // Build shopping list items, subtract pantry
  const items: ShoppingListItem[] = [];
  for (const agg of aggregated.values()) {
    const pantry = pantryMap.get(agg.name);
    const pantryQty =
      pantry && normalizeUnit(pantry.unit) === normalizeUnit(agg.unit)
        ? pantry.quantity
        : 0;
    const adjusted = Math.max(0, agg.quantity - pantryQty);

    items.push({
      name: agg.name,
      totalQuantity: roundQty(agg.quantity),
      unit: agg.unit,
      sourceRecipes: agg.sources,
      pantryAdjustedQuantity: roundQty(adjusted),
      inPantry: adjusted <= 0,
    });
  }

  // Sort: items to buy first, then alphabetically
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

function roundQty(q: number): number {
  return Math.round(q * 100) / 100;
}
