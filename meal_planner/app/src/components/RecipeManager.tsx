import { useState } from 'react';
import type { Recipe, RecipeIngredient, DietaryTag } from '../types';
import { generateId } from '../utils';
import ImportFromLink from './ImportFromLink';

interface Props {
  recipes: Recipe[];
  onAdd: (recipe: Recipe) => void;
  onUpdate: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onImportJSON: (recipes: Recipe[]) => void;
}

const EMPTY_RECIPE: Omit<Recipe, 'id'> = {
  title: '',
  ingredients: [],
  steps: [],
  prepTimeMins: 10,
  cookTimeMins: 20,
  tags: [],
  servings: 4,
  bulkCookable: false,
  weekdayFriendly: true,
  source: '',
  notes: '',
  rating: 3,
};

const ALL_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'fish-free'];

export default function RecipeManager({ recipes, onAdd, onUpdate, onDelete, onImportJSON }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<Omit<Recipe, 'id'>>(EMPTY_RECIPE);
  const [ingredientLine, setIngredientLine] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [search, setSearch] = useState('');
  const [importError, setImportError] = useState('');
  const [showLinkImport, setShowLinkImport] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_RECIPE);
    setIngredientLine('');
    setStepsText('');
    setShowForm(true);
  }

  function openEdit(r: Recipe) {
    setEditing(r);
    setForm({ ...r });
    setIngredientLine(r.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('\n'));
    setStepsText(r.steps.join('\n'));
    setShowForm(true);
  }

  function parseIngredients(text: string): RecipeIngredient[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/);
        const quantity = parseFloat(parts[0]) || 1;
        const unit = isNaN(parseFloat(parts[0])) ? 'unit' : (parts[1] || 'unit');
        const name = isNaN(parseFloat(parts[0]))
          ? parts.slice(0).join(' ')
          : parts.slice(2).join(' ') || parts[1];
        return { name: name || line, quantity, unit };
      });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ingredients = parseIngredients(ingredientLine);
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const totalCook = form.prepTimeMins + form.cookTimeMins;
    const recipe: Recipe = {
      ...form,
      id: editing?.id ?? generateId(),
      ingredients,
      steps,
      weekdayFriendly: totalCook <= 30,
    };
    if (editing) onUpdate(recipe);
    else onAdd(recipe);
    setShowForm(false);
  }

  function toggleTag(tag: DietaryTag) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function handleLinkImport(partial: Partial<Recipe>) {
    setShowLinkImport(false);
    setEditing(null);
    const merged = { ...EMPTY_RECIPE, ...partial };
    setForm(merged);
    setIngredientLine(
      (partial.ingredients ?? []).map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('\n')
    );
    setStepsText((partial.steps ?? []).join('\n'));
    setShowForm(true);
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const recipes: Recipe[] = arr.map((r: Partial<Recipe>) => ({
          id: r.id ?? generateId(),
          title: r.title ?? 'Untitled',
          ingredients: r.ingredients ?? [],
          steps: r.steps ?? [],
          prepTimeMins: r.prepTimeMins ?? 10,
          cookTimeMins: r.cookTimeMins ?? 20,
          tags: r.tags ?? [],
          servings: r.servings ?? 4,
          bulkCookable: r.bulkCookable ?? false,
          weekdayFriendly: r.weekdayFriendly ?? true,
          source: r.source,
          notes: r.notes,
          rating: r.rating ?? 3,
        }));
        onImportJSON(recipes);
        setImportError('');
      } catch {
        setImportError('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <h2 className="text-xl font-semibold flex-1">Recipes ({recipes.length})</h2>
        <input
          className="border rounded px-2 py-1 text-sm w-40"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={openNew} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
          + Add Recipe
        </button>
        <button
          onClick={() => setShowLinkImport(true)}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
        >
          🔗 Import from Link
        </button>
        <label className="bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer">
          Import JSON
          <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </label>
      </div>

      {importError && <p className="text-red-500 text-sm mb-2">{importError}</p>}

      {showLinkImport && (
        <ImportFromLink
          onImport={handleLinkImport}
          onClose={() => setShowLinkImport(false)}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Recipe' : 'New Recipe'}</h3>

            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              required
              className="border rounded w-full px-2 py-1 mb-3 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Prep (min)</label>
                <input
                  type="number" min={0}
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.prepTimeMins}
                  onChange={(e) => setForm((f) => ({ ...f, prepTimeMins: +e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cook (min)</label>
                <input
                  type="number" min={0}
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.cookTimeMins}
                  onChange={(e) => setForm((f) => ({ ...f, cookTimeMins: +e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Servings</label>
                <input
                  type="number" min={1}
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.servings}
                  onChange={(e) => setForm((f) => ({ ...f, servings: +e.target.value }))}
                />
              </div>
            </div>

            <label className="block text-sm font-medium mb-1">
              Ingredients <span className="text-gray-400 font-normal">(one per line: qty unit name)</span>
            </label>
            <textarea
              className="border rounded w-full px-2 py-1 mb-3 text-sm font-mono"
              rows={5}
              placeholder="2 cups flour&#10;1 tsp salt&#10;200 g chicken breast"
              value={ingredientLine}
              onChange={(e) => setIngredientLine(e.target.value)}
            />

            <label className="block text-sm font-medium mb-1">
              Steps <span className="text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              className="border rounded w-full px-2 py-1 mb-3 text-sm"
              rows={4}
              placeholder="Preheat oven to 350°F&#10;Mix ingredients&#10;Bake 20 min"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />

            <label className="block text-sm font-medium mb-1">Dietary Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    form.tags.includes(tag)
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.bulkCookable}
                  onChange={(e) => setForm((f) => ({ ...f, bulkCookable: e.target.checked }))}
                />
                Bulk cookable
              </label>
              <label className="flex items-center gap-1 text-sm">
                Rating:
                <select
                  className="border rounded px-1 text-sm ml-1"
                  value={form.rating ?? 3}
                  onChange={(e) => setForm((f) => ({ ...f, rating: +e.target.value }))}
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 rounded border text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded bg-green-600 text-white text-sm">
                {editing ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center mt-8">
          No recipes yet. Add one or import a JSON file.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.id} className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.prepTimeMins + r.cookTimeMins} min · {r.servings} servings
                  {r.bulkCookable && ' · Bulk'}
                  {r.weekdayFriendly && ' · Weekday'}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.tags.map((t) => (
                    <span key={t} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${r.title}"?`)) onDelete(r.id); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Del
                </button>
              </div>
            </div>
            {'⭐'.repeat(r.rating ?? 0)}
          </div>
        ))}
      </div>
    </div>
  );
}
