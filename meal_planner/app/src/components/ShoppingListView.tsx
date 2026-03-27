import { useState } from 'react';
import type { ShoppingList } from '../types';
import { shoppingListToCSV } from '../utils';

interface Props {
  shoppingList: ShoppingList | null;
  onGenerate: () => void;
  hasPlan: boolean;
}

export default function ShoppingListView({ shoppingList, onGenerate, hasPlan }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggleChecked(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function handleExportCSV() {
    if (!shoppingList) return;
    const csv = shoppingListToCSV(shoppingList.items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${shoppingList.weekStartDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    if (!shoppingList) return;
    const text = shoppingList.items
      .filter((i) => !i.inPantry)
      .map((i) => `${i.name}: ${i.pantryAdjustedQuantity} ${i.unit}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  }

  function handlePrint() {
    window.print();
  }

  const toBuy = shoppingList?.items.filter((i) => !i.inPantry) ?? [];
  const inPantry = shoppingList?.items.filter((i) => i.inPantry) ?? [];

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <h2 className="text-xl font-semibold flex-1">Shopping List</h2>
        {hasPlan && (
          <button
            onClick={onGenerate}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Refresh from Plan
          </button>
        )}
        {shoppingList && (
          <>
            <button onClick={handleExportCSV} className="border px-3 py-1.5 rounded text-sm">
              CSV
            </button>
            <button onClick={handleCopy} className="border px-3 py-1.5 rounded text-sm">
              Copy
            </button>
            <button onClick={handlePrint} className="border px-3 py-1.5 rounded text-sm">
              Print
            </button>
          </>
        )}
      </div>

      {!shoppingList && (
        <p className="text-gray-400 text-sm text-center mt-8">
          {hasPlan
            ? 'Click "Refresh from Plan" to generate your shopping list.'
            : 'Generate a meal plan first to create a shopping list.'}
        </p>
      )}

      {shoppingList && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Week of {shoppingList.weekStartDate} · {toBuy.length} items to buy
          </p>

          {/* Items to buy */}
          {toBuy.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">To Buy</h3>
              <div className="divide-y rounded-lg border overflow-hidden">
                {toBuy.map((item) => {
                  const isChecked = checked.has(item.name);
                  return (
                    <div
                      key={item.name}
                      onClick={() => toggleChecked(item.name)}
                      className={`flex items-center gap-3 px-3 py-2.5 bg-white cursor-pointer hover:bg-gray-50 ${
                        isChecked ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="accent-green-600"
                      />
                      <span className="flex-1 capitalize text-sm">{item.name}</span>
                      <span className="text-sm font-medium">
                        {item.pantryAdjustedQuantity}
                      </span>
                      <span className="text-xs text-gray-400 w-12">{item.unit}</span>
                      <span className="text-xs text-gray-300 hidden sm:block">
                        {item.sourceRecipes.slice(0, 2).join(', ')}
                        {item.sourceRecipes.length > 2 && ` +${item.sourceRecipes.length - 2}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* In pantry */}
          {inPantry.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Already in Pantry ({inPantry.length})
              </h3>
              <div className="divide-y rounded-lg border overflow-hidden opacity-60">
                {inPantry.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-2 bg-green-50 text-sm"
                  >
                    <span className="text-green-500">✓</span>
                    <span className="flex-1 capitalize">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
