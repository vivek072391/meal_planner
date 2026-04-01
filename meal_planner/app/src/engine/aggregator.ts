import type { MealPlan, Recipe, PantryItem, ShoppingList, ShoppingListItem } from '../types';
import { generateId } from '../utils';

// ── Synonym / alias map ────────────────────────────────────────────────────
const ALIASES: Record<string, string> = {
  'all-purpose flour': 'flour',
  'all purpose flour': 'flour',
  'plain flour': 'flour',
  'kosher salt': 'salt',
  'sea salt': 'salt',
  'table salt': 'salt',
  'coarse salt': 'salt',
  'black pepper': 'pepper',
  'ground black pepper': 'pepper',
  'freshly ground pepper': 'pepper',
  'freshly ground black pepper': 'pepper',
  'extra virgin olive oil': 'olive oil',
  'extra-virgin olive oil': 'olive oil',
  'unsalted butter': 'butter',
  'salted butter': 'butter',
  'heavy whipping cream': 'heavy cream',
  'double cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  'garlic clove': 'garlic',
  'garlic cloves': 'garlic',
  'scallion': 'green onion',
  'scallions': 'green onion',
  'spring onion': 'green onion',
  'spring onions': 'green onion',
  'chicken stock': 'chicken broth',
  'vegetable stock': 'vegetable broth',
  'beef stock': 'beef broth',
};

// ── Descriptor / preparation words to strip ───────────────────────────────
const STRIP_WORDS = new Set([
  'minced', 'chopped', 'diced', 'sliced', 'shredded', 'grated', 'crushed',
  'peeled', 'seeded', 'deseeded', 'trimmed', 'halved', 'quartered', 'cubed',
  'julienned', 'toasted', 'roasted',
  'finely', 'roughly', 'thinly', 'coarsely',
  'fresh', 'frozen', 'dried', 'canned', 'raw', 'cooked', 'thawed', 'packed',
  'large', 'medium', 'small', 'whole', 'big',
  'boneless', 'skinless',
  'organic', 'extra', 'virgin',
]);

function depluralize(word: string): string {
  if (word.length < 4) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes')) return word.slice(0, -1);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

function canonicalize(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  s = s.replace(/\s*\([^)]*\)/g, '').trim();   // remove complete "(softened)" etc.
  s = s.replace(/\s*\([^)]*$/, '').trim();     // remove unclosed "( …" with no closing paren
  s = s.replace(/,.*$/, '').trim();             // remove ", minced" etc.
  if (ALIASES[s]) return ALIASES[s];
  const words = s.split(' ');
  const core = words.filter((w) => !STRIP_WORDS.has(w));
  const kept = core.length > 0 ? core : words;
  if (kept.length > 0) kept[kept.length - 1] = depluralize(kept[kept.length - 1]);
  s = kept.join(' ');
  if (ALIASES[s]) return ALIASES[s];
  return s;
}

// ── Unit conversion ────────────────────────────────────────────────────────
// All volumes → millilitres; all weights → grams.
// Unrecognised units stay as-is (keyed by their lowercase form).

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 5, teaspoon: 5, teaspoons: 5,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  cup: 240, cups: 240,
  'fl oz': 30, 'fluid oz': 30, 'fluid ounce': 30, 'fluid ounces': 30,
  ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1,
  l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
};

const WEIGHT_TO_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, pound: 453.6, pounds: 453.6, lbs: 453.6,
};

type BaseUnit = 'ml' | 'g' | string;

function toBase(qty: number, unit: string | undefined): { baseQty: number; baseUnit: BaseUnit } {
  const u = (unit ?? '').trim().toLowerCase();
  if (u in VOLUME_TO_ML) return { baseQty: qty * VOLUME_TO_ML[u], baseUnit: 'ml' };
  if (u in WEIGHT_TO_G)  return { baseQty: qty * WEIGHT_TO_G[u],  baseUnit: 'g'  };
  return { baseQty: qty, baseUnit: u || 'unit' };
}

/** Convert a base quantity back to the most reader-friendly display unit. */
function fromBase(baseQty: number, baseUnit: BaseUnit): { qty: number; unit: string } {
  if (baseUnit === 'ml') {
    if (baseQty < 15)   return { qty: round2(baseQty / 5),   unit: 'tsp'  };
    if (baseQty < 60)   return { qty: round2(baseQty / 15),  unit: 'tbsp' };
    if (baseQty < 960)  return { qty: round2(baseQty / 240), unit: 'cup'  };
    return               { qty: round2(baseQty / 240), unit: 'cups' };
  }
  if (baseUnit === 'g') {
    if (baseQty < 28)   return { qty: round2(baseQty),         unit: 'g'  };
    if (baseQty < 454)  return { qty: round2(baseQty / 28.35), unit: 'oz' };
    return               { qty: round2(baseQty / 453.6),  unit: 'lb' };
  }
  return { qty: round2(baseQty), unit: baseUnit };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main export ────────────────────────────────────────────────────────────
export function generateShoppingList(
  plan: MealPlan,
  recipes: Recipe[],
  pantryItems: PantryItem[]
): ShoppingList {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const pantryMap = new Map(pantryItems.map((p) => [canonicalize(p.name), p]));

  // Accumulate: key = "canonicalName||baseUnit"
  const aggregated = new Map<
    string,
    { name: string; baseQuantity: number; baseUnit: BaseUnit; sources: string[] }
  >();

  for (const slot of plan.daySlots) {
    if (!slot.recipeId) continue;
    const recipe = recipeMap.get(slot.recipeId);
    if (!recipe) continue;
    const scale = recipe.servings > 0 ? slot.servings / recipe.servings : 1;

    for (const ing of recipe.ingredients) {
      if (!ing.name) continue; // skip any blank ingredient rows
      const canonName = canonicalize(ing.name);
      const qty = (ing.quantity ?? 0) * scale;
      const { baseQty, baseUnit } = toBase(qty, ing.unit);
      const key = `${canonName}||${baseUnit}`;

      const existing = aggregated.get(key);
      if (existing) {
        existing.baseQuantity += baseQty;
        if (!existing.sources.includes(recipe.title)) existing.sources.push(recipe.title);
      } else {
        aggregated.set(key, { name: canonName, baseQuantity: baseQty, baseUnit, sources: [recipe.title] });
      }
    }
  }

  // Second pass: collapse entries with the same canonical name into one row.
  // e.g. "olive oil||ml" + "olive oil||unit" → single "olive oil" entry
  // Priority: ml (volume) > g (weight) > everything else
  const unitPriority = (u: BaseUnit) => u === 'ml' ? 0 : u === 'g' ? 1 : 2;
  const merged = new Map<string, { name: string; baseQuantity: number; baseUnit: BaseUnit; sources: string[] }>();
  for (const agg of aggregated.values()) {
    const existing = merged.get(agg.name);
    if (!existing) {
      merged.set(agg.name, { ...agg, sources: [...agg.sources] });
    } else {
      // Merge sources
      for (const s of agg.sources) {
        if (!existing.sources.includes(s)) existing.sources.push(s);
      }
      if (existing.baseUnit === agg.baseUnit) {
        // Same base unit — just add
        existing.baseQuantity += agg.baseQuantity;
      } else if (unitPriority(agg.baseUnit) < unitPriority(existing.baseUnit)) {
        // Incoming entry has a better unit — promote it, discard the vague quantity
        existing.baseUnit = agg.baseUnit;
        existing.baseQuantity = agg.baseQuantity;
      }
      // else: existing has a better unit, keep it and ignore the vague quantity
    }
  }

  // Build items, subtract pantry, convert back to display units
  const items: ShoppingListItem[] = [];
  for (const agg of merged.values()) {
    const { qty: totalQty, unit: displayUnit } = fromBase(agg.baseQuantity, agg.baseUnit);

    // Pantry subtraction in the same base unit
    const pantry = pantryMap.get(agg.name);
    let pantryBase = 0;
    if (pantry) {
      const { baseQty: pBase, baseUnit: pUnit } = toBase(pantry.quantity, pantry.unit);
      if (pUnit === agg.baseUnit) pantryBase = pBase;
    }
    const adjustedBase = Math.max(0, agg.baseQuantity - pantryBase);
    const { qty: adjQty } = fromBase(adjustedBase, agg.baseUnit);

    items.push({
      name: agg.name,
      totalQuantity: totalQty,
      unit: displayUnit,
      sourceRecipes: agg.sources,
      pantryAdjustedQuantity: adjQty,
      inPantry: adjustedBase <= 0,
    });
  }

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
