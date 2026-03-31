import { useState } from 'react';
import type { Recipe } from '../types';
import {
  importFromUrl,
  parseFromText,
  isInstagramUrl,
  isBlockedSite,
  isCloudflareBlockedError,
} from '../engine/recipeImporter';

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
  const [error, setError] = useState<{ message: string; isBlocked?: boolean } | null>(null);

  const isInsta = isInstagramUrl(url);
  const blockedSite = isBlockedSite(url);
  const cantAutoFetch = isInsta || !!blockedSite;

  function switchToPaste() {
    setMode('paste');
    setError(null);
  }

  async function handleFetchUrl() {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const recipe = await importFromUrl(url.trim());
      onImport(recipe);
    } catch (e) {
      if (isCloudflareBlockedError(e)) {
        setError({ message: 'blocked', isBlocked: true });
      } else {
        setError({ message: (e as Error).message });
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePasteImport() {
    if (!pasteText.trim()) return;
    setError(null);
    try {
      const recipe = parseFromText(pasteText.trim());
      onImport(recipe);
    } catch (e) {
      setError({ message: (e as Error).message });
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
            onClick={() => { setMode('url'); setError(null); }}
            className={`flex-1 py-2 font-medium transition-colors ${
              mode === 'url' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔗 Recipe URL
          </button>
          <button
            onClick={() => { setMode('paste'); setError(null); }}
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
              Paste a recipe link and we'll extract it automatically. Works with most food blogs
              and recipe sites.
            </p>

            {/* Upfront warning for known blocked sites */}
            {blockedSite && !isInsta && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                <strong>⚠️ {blockedSite} blocks automated access.</strong> This site uses
                bot protection so automatic import won't work.{' '}
                <button onClick={switchToPaste} className="underline font-medium">
                  Use Paste Text instead
                </button>{' '}
                — copy the recipe from the page and paste it here.
              </div>
            )}

            {isInsta && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                <strong>Instagram detected.</strong> Instagram requires a login to view posts, so
                automatic import won't work.{' '}
                <button onClick={switchToPaste} className="underline font-medium">
                  Use Paste Text instead
                </button>{' '}
                — copy the caption from the post and paste it here.
              </div>
            )}

            <input
              type="url"
              className="border rounded w-full px-3 py-2 text-sm mb-3"
              placeholder="https://cafedelites.com/recipe/..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && !cantAutoFetch && handleFetchUrl()}
            />

            {/* Cloudflare blocked error */}
            {error?.isBlocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ This site blocked the import request.</p>
                <p className="mb-2">
                  Many large recipe sites (AllRecipes, Food Network, NYT Cooking) use bot
                  protection that prevents automated access.
                </p>
                <p>
                  <strong>Workaround:</strong> Open the recipe in your browser, select all the
                  text (Cmd+A), copy it, then{' '}
                  <button onClick={switchToPaste} className="underline font-medium">
                    switch to Paste Text
                  </button>{' '}
                  and paste it there.
                </p>
              </div>
            )}

            {/* No recipe schema error */}
            {error && !error.isBlocked && error.message === 'NO_RECIPE_SCHEMA' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ This site doesn't include structured recipe data.</p>
                <p className="mb-2">
                  Sites like Minimalist Baker, Half Baked Harvest, and The Kitchn don't embed
                  machine-readable recipe data, so automatic extraction isn't possible.
                </p>
                <p>
                  <strong>Workaround:</strong> Open the recipe, copy the text (Cmd+A → Cmd+C), then{' '}
                  <button onClick={switchToPaste} className="underline font-medium">
                    switch to Paste Text
                  </button>.
                </p>
              </div>
            )}

            {/* Generic error */}
            {error && !error.isBlocked && error.message !== 'NO_RECIPE_SCHEMA' && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-3">
                {error.message}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
                Cancel
              </button>
              <button
                onClick={handleFetchUrl}
                disabled={loading || !url.trim() || cantAutoFetch}
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
              Paste the recipe text — from an Instagram caption, a copied web page, or anywhere else.
            </p>
            <p className="text-xs text-gray-400 mb-1">
              <strong>From AllRecipes / any website:</strong> Open the page → Cmd+A to select all → Cmd+C to copy → paste below.
            </p>
            <p className="text-xs text-gray-400 mb-3">
              <strong>From Instagram:</strong> Open the post → tap "···" → Copy → paste below.
            </p>
            <p className="text-xs text-gray-300 mb-3">
              Tip: for best results, include "Ingredients:" and "Instructions:" as section headers.
            </p>

            <textarea
              className="border rounded w-full px-3 py-2 text-sm font-mono mb-3"
              rows={12}
              placeholder={`Easy Tuna Patties\n\nIngredients:\n2 cans tuna\n1 egg\n1/4 cup breadcrumbs\n1 tbsp mayo\n\nInstructions:\n1. Mix all ingredients\n2. Form into patties\n3. Cook 3 min per side`}
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setError(null); }}
            />

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-3">
                {error.message}
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
