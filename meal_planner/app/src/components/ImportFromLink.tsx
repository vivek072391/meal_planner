import { useState } from 'react';
import type { Recipe } from '../types';
import { importFromUrl, parseFromText, isInstagramUrl } from '../engine/recipeImporter';

interface Props {
  onImport: (recipe: Partial<Recipe>) => void;
  onClose: () => void;
}

type Mode = 'url' | 'paste';

export default function ImportFromLink({ onImport, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isInsta = isInstagramUrl(url);

  async function handleFetchUrl() {
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const recipe = await importFromUrl(url.trim());
      onImport(recipe);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handlePasteImport() {
    if (!pasteText.trim()) return;
    setError('');
    try {
      const recipe = parseFromText(pasteText.trim());
      onImport(recipe);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import from Link or Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border overflow-hidden mb-5 text-sm">
          <button
            onClick={() => { setMode('url'); setError(''); }}
            className={`flex-1 py-2 font-medium transition-colors ${
              mode === 'url' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔗 Recipe URL
          </button>
          <button
            onClick={() => { setMode('paste'); setError(''); }}
            className={`flex-1 py-2 font-medium transition-colors ${
              mode === 'paste' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 Paste Text / Instagram
          </button>
        </div>

        {mode === 'url' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Paste a link to any recipe page (AllRecipes, Food Network, NYT Cooking, food blogs, etc.)
              and we'll extract the recipe automatically.
            </p>

            {isInsta && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                <strong>Instagram detected.</strong> Instagram requires a login to view posts, so
                automatic import won't work. Switch to{' '}
                <button
                  onClick={() => setMode('paste')}
                  className="underline font-medium"
                >
                  Paste Text
                </button>{' '}
                and copy-paste the recipe from the caption instead.
              </div>
            )}

            <input
              type="url"
              className="border rounded w-full px-3 py-2 text-sm mb-3"
              placeholder="https://www.allrecipes.com/recipe/..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !isInsta && handleFetchUrl()}
            />

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-3">
                {error}
                {error.includes('No recipe data') && (
                  <p className="mt-1 text-red-500">
                    Try the{' '}
                    <button onClick={() => setMode('paste')} className="underline">
                      Paste Text
                    </button>{' '}
                    option instead.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
                Cancel
              </button>
              <button
                onClick={handleFetchUrl}
                disabled={loading || !url.trim() || isInsta}
                className="px-4 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {loading ? 'Fetching...' : 'Import Recipe'}
              </button>
            </div>
          </div>
        )}

        {mode === 'paste' && (
          <div>
            <p className="text-sm text-gray-500 mb-1">
              Paste the recipe text below — from an Instagram caption, a copied web page, or anywhere else.
            </p>
            <p className="text-xs text-gray-400 mb-3">
              <strong>Instagram tip:</strong> Open the post → tap "···" → Copy → paste here.
              For best results, include an "Ingredients:" and "Instructions:" section header.
            </p>

            <textarea
              className="border rounded w-full px-3 py-2 text-sm font-mono mb-3"
              rows={12}
              placeholder={`Lemon Garlic Pasta\n\nIngredients:\n2 cups pasta\n3 cloves garlic\n2 tbsp olive oil\n1 lemon\n\nInstructions:\n1. Cook pasta per package\n2. Sauté garlic in oil\n3. Toss with pasta and lemon juice`}
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setError(''); }}
            />

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-3">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
                Cancel
              </button>
              <button
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
              >
                Parse Recipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
