// Core domain types for the Meal Planner app

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'egg-free'
  | 'fish-free';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  type: 'adult' | 'toddler';
  dietaryRestrictions: DietaryTag[];
  allergies: string[];
  servingMultiplier: number; // e.g. 0.5 for toddler
}

export interface UserProfile {
  id: string;
  name: string;
  members: FamilyMember[];
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  weekdayMaxCookMins: number; // default 30
  bulkDays: number[]; // day-of-week indices, e.g. [0, 6] for Sat/Sun
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  prepTimeMins: number;
  cookTimeMins: number;
  tags: DietaryTag[];
  servings: number; // base number of adult servings
  bulkCookable: boolean;
  weekdayFriendly: boolean; // cookTimeMins <= weekdayMaxCookMins
  source?: string;
  notes?: string;
  rating?: number; // 1-5
  perishabilityScore?: number; // 1-5, higher = more perishable
}

export interface PantryItem {
  id: string;
  name: string; // canonical ingredient name
  quantity: number;
  unit: string;
  lastUpdated: Date;
}

export interface DaySlot {
  date: string; // ISO date string YYYY-MM-DD
  recipeId: string | null;
  servings: number;
  manualOverride: boolean;
}

export interface MealPlan {
  id: string;
  weekStartDate: string; // ISO date string
  daySlots: DaySlot[];
  generatedAt: Date;
}

export interface ShoppingListItem {
  name: string; // canonical ingredient name
  totalQuantity: number;
  unit: string;
  sourceRecipes: string[]; // recipe titles
  pantryAdjustedQuantity: number; // after subtracting pantry
  inPantry: boolean;
}

export interface ShoppingList {
  id: string;
  weekStartDate: string;
  items: ShoppingListItem[];
  generatedAt: Date;
}
