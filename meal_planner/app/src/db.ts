import Dexie, { type Table } from 'dexie';
import type { Recipe, PantryItem, MealPlan, ShoppingList, UserProfile } from './types';

class MealPlannerDB extends Dexie {
  recipes!: Table<Recipe>;
  pantryItems!: Table<PantryItem>;
  mealPlans!: Table<MealPlan>;
  shoppingLists!: Table<ShoppingList>;
  profiles!: Table<UserProfile>;

  constructor() {
    super('MealPlannerDB');
    this.version(1).stores({
      recipes: 'id, title, bulkCookable, weekdayFriendly',
      pantryItems: 'id, name',
      mealPlans: 'id, weekStartDate',
      shoppingLists: 'id, weekStartDate',
      profiles: 'id',
    });
  }
}

export const db = new MealPlannerDB();

// Seed a default profile if none exists
export async function ensureDefaultProfile(): Promise<UserProfile> {
  const existing = await db.profiles.toArray();
  if (existing.length > 0) return existing[0];

  const defaultProfile: UserProfile = {
    id: 'default',
    name: 'Our Family',
    members: [
      {
        id: 'm1',
        name: 'Adult 1',
        age: 35,
        type: 'adult',
        dietaryRestrictions: [],
        allergies: [],
        servingMultiplier: 1,
      },
      {
        id: 'm2',
        name: 'Adult 2',
        age: 33,
        type: 'adult',
        dietaryRestrictions: [],
        allergies: [],
        servingMultiplier: 1,
      },
      {
        id: 'm3',
        name: 'Little One',
        age: 3,
        type: 'toddler',
        dietaryRestrictions: [],
        allergies: [],
        servingMultiplier: 0.5,
      },
    ],
    weekStart: 0,
    weekdayMaxCookMins: 30,
    bulkDays: [0, 6], // Sunday and Saturday
  };

  await db.profiles.put(defaultProfile);
  return defaultProfile;
}
