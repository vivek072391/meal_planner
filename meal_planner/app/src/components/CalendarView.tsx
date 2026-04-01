import { useState } from 'react';
import type { MealPlan, Recipe, UserProfile } from '../types';
import { formatDate } from '../utils';

interface Props {
  allPlans: Map<string, MealPlan>;
  recipes: Recipe[];
  profile: UserProfile;
  onGenerate: (weekStart: string) => void;
  onOverride: (weekStart: string, date: string, recipeId: string | null) => void;
  onMarkCooked: (date: string) => void;
  cookedDates: Set<string>;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS_SUN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_LABELS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCalendarWeeks(year: number, month: number, weekStart: 0 | 1): string[][] {
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay();
  const offset = weekStart === 0 ? dayOfWeek : (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  const cursor = new Date(year, month, 1 - offset);
  const lastOfMonth = new Date(year, month + 1, 0);
  const weeks: string[][] = [];
  while (cursor <= lastOfMonth) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isoDate(new Date(cursor)));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

interface DayDetail {
  date: string;
  weekStart: string;
}

export default function CalendarView({
  allPlans,
  recipes,
  profile,
  onGenerate,
  onOverride,
  onMarkCooked,
  cookedDates,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [overrideRecipeId, setOverrideRecipeId] = useState<string>('');

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const todayStr = isoDate(today);
  const dayLabels = profile.weekStart === 0 ? DAY_LABELS_SUN : DAY_LABELS_MON;
  const weeks = getCalendarWeeks(viewYear, viewMonth, profile.weekStart);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function openDetail(date: string, weekStart: string) {
    const plan = allPlans.get(weekStart);
    const slot = plan?.daySlots.find((s) => s.date === date);
    setOverrideRecipeId(slot?.recipeId ?? '');
    setDetail({ date, weekStart });
  }

  function closeDetail() { setDetail(null); }

  function handleOverrideSave() {
    if (!detail) return;
    onOverride(detail.weekStart, detail.date, overrideRecipeId || null);
    closeDetail();
  }

  const detailPlan = detail ? allPlans.get(detail.weekStart) : null;
  const detailSlot = detailPlan?.daySlots.find((s) => s.date === detail?.date);
  const detailRecipe = detailSlot?.recipeId ? recipeMap.get(detailSlot.recipeId) : null;
  const isDetailCooked = detail ? cookedDates.has(detail.date) : false;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded border hover:bg-gray-50 text-gray-600 font-medium"
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded border hover:bg-gray-50 text-gray-600 font-medium"
          >
            ›
          </button>
          <h2 className="text-lg font-semibold text-gray-800 ml-1">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
        </div>
        <button
          onClick={goToday}
          className="text-sm border px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600"
        >
          Today
        </button>
      </div>

      {recipes.length === 0 && (
        <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          Add some recipes first, then click "+ Plan" on any week to generate a meal plan.
        </p>
      )}

      {/* Calendar grid */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Day header row */}
        <div className="grid grid-cols-[44px_repeat(7,1fr)] bg-gray-50 border-b">
          <div className="p-2" />
          {dayLabels.map((label) => (
            <div
              key={label}
              className="py-2 text-xs font-semibold text-gray-500 text-center uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week) => {
          const weekStart = week[0];
          const plan = allPlans.get(weekStart);
          const hasPlanForWeek = !!plan;

          return (
            <div key={weekStart} className="grid grid-cols-[44px_repeat(7,1fr)] border-b last:border-b-0">
              {/* Generate button column */}
              <div className="flex items-center justify-center border-r bg-gray-50 p-1">
                <button
                  onClick={() => onGenerate(weekStart)}
                  disabled={recipes.length === 0}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    hasPlanForWeek
                      ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title={hasPlanForWeek ? 'Re-generate this week' : 'Generate meal plan for this week'}
                >
                  {hasPlanForWeek ? '↺' : '+'}
                </button>
              </div>

              {/* Day cells */}
              {week.map((date) => {
                const inMonth = new Date(date + 'T12:00:00').getMonth() === viewMonth;
                const isToday = date === todayStr;
                const slot = plan?.daySlots.find((s) => s.date === date);
                const recipe = slot?.recipeId ? recipeMap.get(slot.recipeId) : null;
                const isCooked = cookedDates.has(date);
                const dayOfWeek = new Date(date + 'T12:00:00').getDay();
                const isBulkDay = profile.bulkDays.includes(dayOfWeek);
                const dayNum = new Date(date + 'T12:00:00').getDate();
                const clickable = hasPlanForWeek && inMonth;

                return (
                  <div
                    key={date}
                    onClick={() => clickable && openDetail(date, weekStart)}
                    className={[
                      'border-r last:border-r-0 min-h-[70px] p-1.5 transition-colors',
                      !inMonth ? 'bg-gray-50' : '',
                      isToday && inMonth ? 'bg-blue-50' : '',
                      isBulkDay && inMonth && !isToday ? 'bg-sky-50/60' : '',
                      isCooked && inMonth ? 'bg-green-50' : '',
                      clickable ? 'cursor-pointer hover:bg-gray-100' : '',
                    ].join(' ')}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={[
                          'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                          isToday && inMonth
                            ? 'bg-blue-600 text-white'
                            : inMonth
                            ? 'text-gray-700'
                            : 'text-gray-300',
                        ].join(' ')}
                      >
                        {dayNum}
                      </span>
                      {isCooked && inMonth && (
                        <span className="text-green-500 text-xs">✓</span>
                      )}
                    </div>

                    {/* Recipe name */}
                    {recipe && inMonth && (
                      <p
                        className={`text-xs leading-tight font-medium truncate ${
                          isCooked ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                        title={recipe.title}
                      >
                        {recipe.title}
                      </p>
                    )}
                    {!recipe && slot !== undefined && inMonth && (
                      <p className="text-xs text-gray-300 italic">No meal</p>
                    )}
                    {recipe && inMonth && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {recipe.prepTimeMins + recipe.cookTimeMins}m
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-100 border border-sky-200 inline-block" /> Bulk cook day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Cooked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs">+</span>
          Generate week
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-xs">↺</span>
          Re-generate week
        </span>
      </div>

      {/* Day detail modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">{formatDate(detail.date)}</h3>
                {detailRecipe && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {detailRecipe.prepTimeMins + detailRecipe.cookTimeMins} min total
                    {detailSlot?.manualOverride && ' · Pinned'}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {detailRecipe ? (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">{detailRecipe.title}</p>
                {detailRecipe.source && (() => {
                  try {
                    return (
                      <a
                        href={detailRecipe.source}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-0.5 block"
                      >
                        🔗 {new URL(detailRecipe.source).hostname}
                      </a>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">No meal planned for this day.</p>
            )}

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Change meal
              </label>
              <select
                value={overrideRecipeId}
                onChange={(e) => setOverrideRecipeId(e.target.value)}
                className="border rounded-lg w-full text-sm px-2 py-2 bg-white"
              >
                <option value="">— No dinner planned —</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleOverrideSave}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
              {!isDetailCooked && detailRecipe && (
                <button
                  onClick={() => {
                    onMarkCooked(detail.date);
                    closeDetail();
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Mark Cooked ✓
                </button>
              )}
              {isDetailCooked && (
                <div className="flex-1 text-center py-2 text-green-600 text-sm font-medium">
                  Cooked ✓
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
