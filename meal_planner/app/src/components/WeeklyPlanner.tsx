import { useState } from 'react';
import type { MealPlan, Recipe, UserProfile } from '../types';
import { formatDate, currentWeekStart, getWeekDates } from '../utils';

interface Props {
  plan: MealPlan | null;
  recipes: Recipe[];
  profile: UserProfile;
  onGenerate: (weekStart: string) => void;
  onOverride: (date: string, recipeId: string | null) => void;
  onMarkCooked: (date: string) => void;
  cookedDates: Set<string>;
}

export default function WeeklyPlanner({
  plan,
  recipes,
  profile,
  onGenerate,
  onOverride,
  onMarkCooked,
  cookedDates,
}: Props) {
  const [weekStart, setWeekStart] = useState(currentWeekStart(profile.weekStart));
  const [overrideDate, setOverrideDate] = useState<string | null>(null);

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const weekDates = plan ? getWeekDates(plan.weekStartDate) : getWeekDates(weekStart);

  function handleWeekChange(dir: -1 | 1) {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  return (
    <div className="p-4">
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => handleWeekChange(-1)} className="p-1 rounded border hover:bg-gray-50">
          ◀
        </button>
        <span className="text-sm font-medium flex-1 text-center">
          Week of {formatDate(weekStart)}
        </span>
        <button onClick={() => handleWeekChange(1)} className="p-1 rounded border hover:bg-gray-50">
          ▶
        </button>
        <button
          onClick={() => onGenerate(weekStart)}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
        >
          {plan?.weekStartDate === weekStart ? 'Re-generate' : 'Generate Plan'}
        </button>
      </div>

      {recipes.length === 0 && (
        <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          Add some recipes first, then generate your meal plan.
        </p>
      )}

      {/* Day grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {weekDates.map((date) => {
          const slot = plan?.daySlots.find((s) => s.date === date);
          const recipe = slot?.recipeId ? recipeMap.get(slot.recipeId) : null;
          const isCooked = cookedDates.has(date);
          const dayOfWeek = new Date(date + 'T12:00:00').getDay();
          const isBulkDay = profile.bulkDays.includes(dayOfWeek);
          const isOverriding = overrideDate === date;

          return (
            <div
              key={date}
              className={`rounded-lg border p-3 text-sm bg-white ${
                isCooked ? 'opacity-60 bg-green-50' : ''
              } ${isBulkDay ? 'border-blue-300' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-xs text-gray-600">{formatDate(date)}</span>
                {isBulkDay && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 rounded">Bulk</span>
                )}
              </div>

              {isOverriding ? (
                <div>
                  <select
                    className="border rounded w-full text-xs px-1 py-1 mb-1"
                    defaultValue={slot?.recipeId ?? ''}
                    onChange={(e) => {
                      onOverride(date, e.target.value || null);
                      setOverrideDate(null);
                    }}
                  >
                    <option value="">— No dinner planned —</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setOverrideDate(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : recipe ? (
                <div>
                  <p className="font-medium text-gray-800 leading-snug mb-1">{recipe.title}</p>
                  <p className="text-xs text-gray-400">
                    {recipe.prepTimeMins + recipe.cookTimeMins} min
                    {slot?.manualOverride && ' · Pinned'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {!isCooked && (
                      <button
                        onClick={() => onMarkCooked(date)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Mark cooked
                      </button>
                    )}
                    {isCooked && <span className="text-xs text-green-600">Cooked ✓</span>}
                    <button
                      onClick={() => setOverrideDate(date)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 text-xs mb-2">No meal planned</p>
                  <button
                    onClick={() => setOverrideDate(date)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    + Set meal
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {plan && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Generated {new Date(plan.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
