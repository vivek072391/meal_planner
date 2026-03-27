import { useEffect, useState, useCallback } from 'react';
import { db, ensureDefaultProfile } from './db';
import type { Recipe, PantryItem, MealPlan, ShoppingList, UserProfile } from './types';
import { generateMealPlan } from './engine/planner';
import { generateShoppingList } from './engine/aggregator';
import RecipeManager from './components/RecipeManager';
import PantryManager from './components/PantryManager';
import WeeklyPlanner from './components/WeeklyPlanner';
import ShoppingListView from './components/ShoppingListView';
import ProfileSettings from './components/ProfileSettings';

type Tab = 'planner' | 'recipes' | 'pantry' | 'shopping' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'planner', label: 'Planner', icon: '📅' },
  { id: 'recipes', label: 'Recipes', icon: '📖' },
  { id: 'pantry', label: 'Pantry', icon: '🥫' },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('planner');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [cookedDates, setCookedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load everything from IndexedDB on startup
  useEffect(() => {
    async function load() {
      const [p, r, pantry, plans, lists] = await Promise.all([
        ensureDefaultProfile(),
        db.recipes.toArray(),
        db.pantryItems.toArray(),
        db.mealPlans.orderBy('weekStartDate').reverse().limit(1).toArray(),
        db.shoppingLists.orderBy('weekStartDate').reverse().limit(1).toArray(),
      ]);
      setProfile(p);
      setRecipes(r);
      setPantryItems(pantry);
      if (plans.length > 0) setCurrentPlan(plans[0]);
      if (lists.length > 0) setShoppingList(lists[0]);
      setLoading(false);
    }
    load();
  }, []);

  // --- Recipe operations ---
  const handleAddRecipe = useCallback(async (recipe: Recipe) => {
    await db.recipes.put(recipe);
    setRecipes((prev) => [...prev, recipe]);
  }, []);

  const handleUpdateRecipe = useCallback(async (recipe: Recipe) => {
    await db.recipes.put(recipe);
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)));
  }, []);

  const handleDeleteRecipe = useCallback(async (id: string) => {
    await db.recipes.delete(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleImportRecipes = useCallback(async (imported: Recipe[]) => {
    await db.recipes.bulkPut(imported);
    setRecipes((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newOnes = imported.filter((r) => !existingIds.has(r.id));
      const updated = prev.map((r) => imported.find((i) => i.id === r.id) ?? r);
      return [...updated, ...newOnes];
    });
  }, []);

  // --- Pantry operations ---
  const handleAddPantry = useCallback(async (item: PantryItem) => {
    await db.pantryItems.put(item);
    setPantryItems((prev) => [...prev, item]);
  }, []);

  const handleUpdatePantry = useCallback(async (item: PantryItem) => {
    await db.pantryItems.put(item);
    setPantryItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
  }, []);

  const handleDeletePantry = useCallback(async (id: string) => {
    await db.pantryItems.delete(id);
    setPantryItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- Planner operations ---
  const handleGenerate = useCallback(async (weekStart: string) => {
    if (!profile) return;
    const plan = generateMealPlan({
      profile,
      recipes,
      pantryItems,
      weekStartDate: weekStart,
      existingPlan: currentPlan?.weekStartDate === weekStart ? currentPlan : undefined,
    });
    await db.mealPlans.put(plan);
    setCurrentPlan(plan);

    // Auto-generate shopping list
    const list = generateShoppingList(plan, recipes, pantryItems);
    await db.shoppingLists.put(list);
    setShoppingList(list);
  }, [profile, recipes, pantryItems, currentPlan]);

  const handleOverride = useCallback(async (date: string, recipeId: string | null) => {
    if (!currentPlan) return;
    const updated: MealPlan = {
      ...currentPlan,
      daySlots: currentPlan.daySlots.map((s) =>
        s.date === date ? { ...s, recipeId, manualOverride: true } : s
      ),
    };
    await db.mealPlans.put(updated);
    setCurrentPlan(updated);
    const list = generateShoppingList(updated, recipes, pantryItems);
    await db.shoppingLists.put(list);
    setShoppingList(list);
  }, [currentPlan, recipes, pantryItems]);

  const handleMarkCooked = useCallback((date: string) => {
    setCookedDates((prev) => {
      const next = new Set(prev);
      next.add(date);
      return next;
    });
  }, []);

  const handleRefreshShoppingList = useCallback(async () => {
    if (!currentPlan) return;
    const list = generateShoppingList(currentPlan, recipes, pantryItems);
    await db.shoppingLists.put(list);
    setShoppingList(list);
  }, [currentPlan, recipes, pantryItems]);

  const handleSaveProfile = useCallback(async (p: UserProfile) => {
    await db.profiles.put(p);
    setProfile(p);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🍽️</span>
          <h1 className="text-lg font-semibold text-gray-800">
            {profile?.name ?? 'Meal Planner'}
          </h1>
          <span className="text-xs text-gray-400 hidden sm:block">Family Dinner Planner</span>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-white border-b sticky top-[57px] z-10">
        <div className="max-w-5xl mx-auto px-2 flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-green-600 text-green-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {tab === 'planner' && profile && (
          <WeeklyPlanner
            plan={currentPlan}
            recipes={recipes}
            profile={profile}
            onGenerate={handleGenerate}
            onOverride={handleOverride}
            onMarkCooked={handleMarkCooked}
            cookedDates={cookedDates}
          />
        )}

        {tab === 'recipes' && (
          <RecipeManager
            recipes={recipes}
            onAdd={handleAddRecipe}
            onUpdate={handleUpdateRecipe}
            onDelete={handleDeleteRecipe}
            onImportJSON={handleImportRecipes}
          />
        )}

        {tab === 'pantry' && (
          <PantryManager
            items={pantryItems}
            onAdd={handleAddPantry}
            onUpdate={handleUpdatePantry}
            onDelete={handleDeletePantry}
          />
        )}

        {tab === 'shopping' && (
          <ShoppingListView
            shoppingList={shoppingList}
            onGenerate={handleRefreshShoppingList}
            hasPlan={currentPlan !== null}
          />
        )}

        {tab === 'settings' && profile && (
          <ProfileSettings profile={profile} onSave={handleSaveProfile} />
        )}
      </main>
    </div>
  );
}
