import type { Recipe, RecipeIngredient } from '../types';
import { generateId } from '../utils';

// Sites known to block automated access (Cloudflare or similar bot protection)
const BLOCKED_SITES = [
  'allrecipes.com',
  'simplyrecipes.com',
  'seriouseats.com',
  'foodnetwork.com',
  'cooking.nytimes.com',
  'nytimes.com/recipes',
  'epicurious.com',
  'tasty.co',
];

/** Detect if a URL is an Instagram post/reel */
export function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|tv)\//i.test(url);
}

/** Detect if a URL is from a site known to block automated access */
export function isBlockedSite(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const match = BLOCKED_SITES.find((s) => hostname.includes(s));
    return match ?? null;
  } catch {
    return null;
  }
}

/** Fetch HTML via a CORS proxy, trying multiple proxies with fallback */
async function fetchViaProxy(url: string): Promise<string> {
  const encoded = encodeURIComponent(url);

  // Primary: codetabs — returns raw HTML, fast and reliable
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 500) return text;
    }
  } catch { /* fall through */ }

  // Fallback: allorigins — wraps response in JSON
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encoded}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = await res.json();
      const text: string = data.contents ?? '';
      if (text.length > 500) return text;
    }
  } catch { /* fall through */ }

  throw new Error('Could not reach the page via any proxy. Check your connection and try again.');
}

/**
 * Fetch a recipe URL and attempt to extract schema.org/Recipe JSON-LD.
 * Returns a partial Recipe on success, throws on failure.
 */
export async function importFromUrl(url: string): Promise<Partial<Recipe>> {
  let html: string;
  try {
    html = await fetchViaProxy(url);
  } catch (e) {
    throw new Error((e as Error).message);
  }

  if (!html || html.length < 500) {
    throw new Error('The page returned no content. Try the Paste Text option instead.');
  }

  // Detect Cloudflare blocking challenge pages.
  // Note: 'challenge-platform' appears in Cloudflare's analytics script on ALL CF sites,
  // so we only flag pages that show the actual blocking UI (short page + challenge text).
  const looksLikeChallengePage = html.length < 15000 && (
    html.includes('Just a moment') ||
    html.includes('Enable JavaScript and cookies to continue') ||
    html.includes('cf-browser-verification')
  );
  if (looksLikeChallengePage) {
    const err = new Error('CLOUDFLARE_BLOCKED');
    (err as Error & { isCloudflareBlocked: boolean }).isCloudflareBlocked = true;
    throw err;
  }

  return parseRecipeFromHtml(html, url);
}

export function isCloudflareBlockedError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e as Error & { isCloudflareBlocked?: boolean }).isCloudflareBlocked === true
  );
}

/** Parse schema.org Recipe JSON-LD from an HTML page */
function parseRecipeFromHtml(html: string, sourceUrl: string): Partial<Recipe> {
  // Extract all JSON-LD blocks
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const candidates: unknown[] = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Handle @graph arrays (common on recipe sites)
      if (data['@graph']) {
        candidates.push(...data['@graph']);
      } else {
        candidates.push(data);
      }
    } catch {
      // ignore malformed JSON blocks
    }
  }

  // Find a Recipe object
  const recipeData = candidates.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      ((item as Record<string, unknown>)['@type'] === 'Recipe' ||
        (Array.isArray((item as Record<string, unknown>)['@type']) &&
          ((item as Record<string, unknown>)['@type'] as string[]).includes('Recipe')))
  ) as Record<string, unknown> | undefined;

  if (!recipeData) {
    throw new Error(
      'NO_RECIPE_SCHEMA'
    );
  }

  return mapSchemaToRecipe(recipeData, sourceUrl);
}

/** Map schema.org Recipe fields to our Recipe type */
function mapSchemaToRecipe(data: Record<string, unknown>, sourceUrl: string): Partial<Recipe> {
  const title = (data['name'] as string) ?? 'Untitled Recipe';

  // Ingredients: array of strings like "2 cups flour"
  const rawIngredients = (data['recipeIngredient'] as string[]) ?? [];
  const ingredients: RecipeIngredient[] = rawIngredients.map(parseIngredientString);

  // Instructions: can be array of strings, array of HowToStep objects, or a single string
  const rawInstructions = data['recipeInstructions'];
  const steps = parseInstructions(rawInstructions);

  // Times: ISO 8601 duration like "PT30M" or "PT1H20M"
  const prepTimeMins = parseDuration((data['prepTime'] as string) ?? '');
  const cookTimeMins = parseDuration((data['cookTime'] as string) ?? '');

  // Servings
  const yieldRaw = data['recipeYield'];
  const servings = parseServings(yieldRaw);

  return {
    id: generateId(),
    title,
    ingredients,
    steps,
    prepTimeMins: prepTimeMins || 10,
    cookTimeMins: cookTimeMins || 20,
    tags: [],
    servings,
    bulkCookable: false,
    weekdayFriendly: (prepTimeMins + cookTimeMins) <= 30,
    source: sourceUrl,
    rating: 3,
  };
}

/** Parse an ingredient string like "2 cups all-purpose flour" */
export function parseIngredientString(raw: string): RecipeIngredient {
  // Strip HTML tags if any
  const clean = raw.replace(/<[^>]+>/g, '').trim();

  // Common units to recognize
  const unitPattern =
    /^(\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?)\s*(cups?|tbsp?|tablespoons?|tsp?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|litres?|liters?|cloves?|cans?|stalks?|heads?|slices?|pieces?|pinch(?:es)?|handfuls?|count|whole|large|medium|small)\.?\s+(.*)/i;

  const m = clean.match(unitPattern);
  if (m) {
    return {
      name: m[3].trim(),
      quantity: parseFraction(m[1].trim()),
      unit: normalizeUnit(m[2].trim()),
    };
  }

  // Just a number followed by ingredient
  const numOnly = clean.match(/^(\d+(?:[./]\d+)?)\s+(.*)/);
  if (numOnly) {
    return {
      name: numOnly[2].trim(),
      quantity: parseFraction(numOnly[1]),
      unit: 'count',
    };
  }

  return { name: clean, quantity: 1, unit: 'unit' };
}

function parseFraction(s: string): number {
  // Handle "1 1/2" or "1/2" or "2"
  const parts = s.trim().split(/\s+/);
  if (parts.length === 2) {
    return parseFloat(parts[0]) + evalFraction(parts[1]);
  }
  return evalFraction(parts[0]);
}

function evalFraction(s: string): number {
  if (s.includes('/')) {
    const [n, d] = s.split('/').map(Number);
    return n / d;
  }
  return parseFloat(s) || 1;
}

function normalizeUnit(u: string): string {
  const map: Record<string, string> = {
    tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
    cup: 'cups', cups: 'cups',
    ounce: 'oz', ounces: 'oz',
    pound: 'lbs', pounds: 'lbs', lb: 'lbs',
    gram: 'g', grams: 'g',
    kilogram: 'kg', kilograms: 'kg',
    milliliter: 'ml', milliliters: 'ml',
    liter: 'l', liters: 'l', litre: 'l', litres: 'l',
    clove: 'cloves',
  };
  const lower = u.toLowerCase().replace(/\.$/, '');
  return map[lower] ?? lower;
}

function parseInstructions(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split(/\n+/).map((s) => stripHtml(s)).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    const steps: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        const s = stripHtml(item);
        if (s) steps.push(s);
        continue;
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        const type = obj['@type'];

        // HowToSection: has itemListElement array of HowToStep
        if (type === 'HowToSection' && Array.isArray(obj['itemListElement'])) {
          const sectionName = obj['name'] as string | undefined;
          if (sectionName) steps.push(`— ${sectionName} —`);
          for (const step of obj['itemListElement'] as unknown[]) {
            const s = extractStepText(step);
            if (s) steps.push(s);
          }
          continue;
        }

        // HowToStep or plain object with text/name
        const s = extractStepText(item);
        if (s) steps.push(s);
      }
    }
    return steps;
  }
  return [];
}

function extractStepText(item: unknown): string {
  if (typeof item === 'string') return stripHtml(item);
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    return stripHtml((obj['text'] ?? obj['name'] ?? '') as string);
  }
  return '';
}

/** Strip HTML tags and decode common entities */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse ISO 8601 duration string to minutes. e.g. "PT1H30M" -> 90 */
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function parseServings(raw: unknown): number {
  if (!raw) return 4;
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw);
  const n = parseInt(s);
  return isNaN(n) ? 4 : n;
}

/**
 * Parse a raw text paste (e.g. from an Instagram caption) into a partial Recipe.
 * Heuristic: first non-empty line = title, lines with measurements = ingredients,
 * numbered/lettered lines or lines starting with a verb = steps.
 */
export function parseFromText(text: string): Partial<Recipe> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) throw new Error('No text provided.');

  // Title: first line (or line before "Ingredients:")
  let title = lines[0];
  const ingredientsHeaderIdx = lines.findIndex((l) =>
    /^ingredients?:?$/i.test(l)
  );
  if (ingredientsHeaderIdx > 0) title = lines[0];

  // Find sections
  const instructionsHeaderIdx = lines.findIndex((l) =>
    /^(instructions?|directions?|method|steps?|how to make):?$/i.test(l)
  );

  let ingredientLines: string[] = [];
  let stepLines: string[] = [];

  if (ingredientsHeaderIdx !== -1 && instructionsHeaderIdx !== -1) {
    // Explicit sections
    ingredientLines = lines.slice(ingredientsHeaderIdx + 1, instructionsHeaderIdx);
    stepLines = lines.slice(instructionsHeaderIdx + 1);
  } else if (ingredientsHeaderIdx !== -1) {
    ingredientLines = lines.slice(ingredientsHeaderIdx + 1);
  } else {
    // Heuristic: lines with measurement-like patterns are ingredients
    const measurePattern = /\d+\s*(cups?|tbsp?|tsp?|oz|g|kg|ml|l|lbs?|cloves?|count|pinch)/i;
    ingredientLines = lines.slice(1).filter((l) => measurePattern.test(l));
    stepLines = lines.slice(1).filter((l) => !measurePattern.test(l) && l.length > 15);
  }

  // Strip leading numbers/bullets from step lines
  const steps = stepLines.map((l) => l.replace(/^[\d]+[.)]\s*/, '').trim()).filter(Boolean);
  const ingredients = ingredientLines.map(parseIngredientString);

  return {
    id: generateId(),
    title,
    ingredients,
    steps,
    prepTimeMins: 10,
    cookTimeMins: 20,
    tags: [],
    servings: 4,
    bulkCookable: false,
    weekdayFriendly: true,
    rating: 3,
  };
}
