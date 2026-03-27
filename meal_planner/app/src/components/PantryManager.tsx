import { useState } from 'react';
import type { PantryItem } from '../types';
import { generateId } from '../utils';

interface Props {
  items: PantryItem[];
  onAdd: (item: PantryItem) => void;
  onUpdate: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

const QUICK_STAPLES = [
  { name: 'olive oil', unit: 'tbsp' },
  { name: 'salt', unit: 'tsp' },
  { name: 'pepper', unit: 'tsp' },
  { name: 'garlic', unit: 'cloves' },
  { name: 'onion', unit: 'count' },
  { name: 'butter', unit: 'tbsp' },
  { name: 'eggs', unit: 'count' },
  { name: 'pasta', unit: 'g' },
  { name: 'rice', unit: 'g' },
  { name: 'canned tomatoes', unit: 'g' },
];

export default function PantryManager({ items, onAdd, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('count');
  const [search, setSearch] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase().trim());
    if (existing) {
      onUpdate({ ...existing, quantity: existing.quantity + quantity, lastUpdated: new Date() });
    } else {
      onAdd({
        id: generateId(),
        name: name.trim().toLowerCase(),
        quantity,
        unit,
        lastUpdated: new Date(),
      });
    }
    setName('');
    setQuantity(1);
  }

  function addStaple(staple: { name: string; unit: string }) {
    const existing = items.find((i) => i.name === staple.name);
    if (existing) return; // already in pantry
    onAdd({
      id: generateId(),
      name: staple.name,
      quantity: 10,
      unit: staple.unit,
      lastUpdated: new Date(),
    });
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Pantry ({items.length} items)</h2>

      {/* Quick staples */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Quick add staples:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_STAPLES.map((s) => {
            const inPantry = items.some((i) => i.name === s.name);
            return (
              <button
                key={s.name}
                onClick={() => addStaple(s)}
                disabled={inPantry}
                className={`px-2 py-1 rounded-full text-xs border ${
                  inPantry
                    ? 'bg-green-50 border-green-300 text-green-600 cursor-default'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {inPantry ? '✓ ' : '+ '}{s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add item form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <input
          className="border rounded px-2 py-1 text-sm flex-1 min-w-32"
          placeholder="Ingredient name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          min={0}
          step={0.25}
          className="border rounded px-2 py-1 text-sm w-20"
          value={quantity}
          onChange={(e) => setQuantity(+e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-20"
          placeholder="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm">
          Add
        </button>
      </form>

      <input
        className="border rounded px-2 py-1 text-sm w-full mb-3"
        placeholder="Search pantry..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center mt-8">
          Pantry is empty. Add items or use quick staples above.
        </p>
      )}

      <div className="divide-y rounded-lg border overflow-hidden">
        {filtered.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white text-sm">
            <span className="flex-1 capitalize">{item.name}</span>
            <input
              type="number"
              min={0}
              step={0.25}
              className="border rounded px-1 py-0.5 w-16 text-sm text-right"
              value={item.quantity}
              onChange={(e) =>
                onUpdate({ ...item, quantity: +e.target.value, lastUpdated: new Date() })
              }
            />
            <span className="text-gray-500 w-12 text-xs">{item.unit}</span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-red-400 hover:text-red-600 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
