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

type Stage =
  | 'idle'           // URL entered, nothing tried yet
  | 'fetching'       // auto-fetch in progress
  | 'needs-paste'    // blocked / no-schema — show paste area
  | 'paste-only';    // user jumped straight to paste (no URL)

function getPasteInstructions(url: string): { heading: string; steps: string[] } {
  if (isInstagramUrl(url)) {
    return {
      heading: 'Copy from Instagram',
      steps: [
        'Open the Instagram post in the app or browser',
        'Tap ··· → Copy (or long-press the caption and select all)',
        'Paste the caption text into the box below',
      ],
    };
  }
  if (url) {
    return {
      heading: 'Copy from the recipe page',
      steps: [
        `Open the link in your browser: ${new URL(url).hostname}`,
        'Press Cmd+A (Mac) or Ctrl+A (Windows) to select all',
        'Press Cmd+C / Ctrl+C to copy, then paste below',
      ],
    };
  }
  return {
    heading: 'Paste recipe text',
    steps: [
      'Open the recipe in your browser or app',
      'Select and copy the recipe text',
      'Paste it into the box below',
    ],
  };
}

export default function ImportFromLink({ onImport, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState('');

  const isInsta = isInstagramUrl(url);
  const blockedSite = isBlockedSite(url);
  const needsPaste = isInsta || !!blockedSite;
  const pasteInstructions = getPasteInstructions(url);

  // When URL changes, reset state
  function handleUrlChange(val: string) {
    setUrl(val);
    setError('');
    if (stage === 'fetching') return;
    setStage('idle');
  }

  async function handleAutoFetch() {
    setError('');
    setStage('fetching');
    try {
      const recipe = await importFromUrl(url.trim());
      // Ensure source URL is saved even on auto-fetch
      onImport({ ...recipe, source: url.trim() });
    } catch (e) {
      if (isCloudflareBlockedError(e) || (e as Error).message === 'NO_RECIPE_SCHEMA') {
        setStage('needs-paste');
      } else {
        setError((e as Error).message);
        setStage('idle');
      }
    }
  }

  function handlePasteImport() {
    if (!pasteText.trim()) return;
    setError('');
    try {
      const recipe = parseFromText(pasteText.trim());
      onImport({ ...recipe, source: url.trim() || undefined });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canAutoFetch = url.trim().startsWith('http') && !needsPaste;
  const showPasteArea = needsPaste || stage === 'needs-paste' || stage === 'paste-only';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Add Recipe from Link</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* ── Step 1: Source URL ── */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source URL <span className="text-gray-400 font-normal">(saved with the recipe for reference)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              className="border rounded flex-1 px-3 py-2 text-sm"
              placeholder="https://cafedelites.com/recipe/... or leave blank"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canAutoFetch && handleAutoFetch()}
            />
            {canAutoFetch && (
              <button
                onClick={handleAutoFetch}
                disabled={stage === 'fetching'}
                className="bg-green-600 text-white px-3 py-2 rounded text-sm whitespace-nowrap disabled:opacity-60 flex items-center gap-1.5"
              >
                {stage === 'fetching' ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Fetching…
                  </>
                ) : 'Auto-import'}
              </button>
            )}
          </div>

          {/* Inline status under URL field */}
          {needsPaste && url && (
            <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
              <span>⚠️</span>
              <span>
                {isInsta ? 'Instagram' : blockedSite} can't be auto-imported — paste the recipe text below.
                URL will still be saved with the recipe.
              </span>
            </p>
          )}
          {stage === 'needs-paste' && !needsPaste && (
            <p className="text-xs text-amber-700 mt-1.5">
              ⚠️ This site blocked the request or has no recipe data — paste the text below instead.
            </p>
          )}
        </div>

        {/* ── Divider with option to skip URL ── */}
        {stage !== 'needs-paste' && !needsPaste && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t" />
            <span className="text-xs text-gray-400">or paste directly</span>
            <div className="flex-1 border-t" />
          </div>
        )}

        {/* ── Step 2: Paste area (always shown when needed, optional otherwise) ── */}
        {(showPasteArea || stage === 'idle') && (
          <div>
            {/* Instructions when paste is required */}
            {showPasteArea && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-blue-800 mb-1.5">{pasteInstructions.heading}</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  {pasteInstructions.steps.map((s, i) => (
                    <li key={i} className="text-xs text-blue-700">{s}</li>
                  ))}
                </ol>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipe text
              {!showPasteArea && <span className="text-gray-400 font-normal"> (optional if using auto-import)</span>}
            </label>
            <textarea
              autoFocus={showPasteArea}
              className="border rounded w-full px-3 py-2 text-sm mb-1"
              rows={showPasteArea ? 10 : 6}
              placeholder={
                showPasteArea
                  ? 'Paste the full recipe text here — title, ingredients, and steps…'
                  : `Easy Tuna Patties\n\nIngredients:\n2 cans tuna\n1 egg\n\nInstructions:\n1. Mix ingredients\n2. Form patties\n3. Cook 3 min per side`
              }
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setError(''); }}
            />
            <p className="text-xs text-gray-400 mb-3">
              Tip: include "Ingredients:" and "Instructions:" headers for the best results.
            </p>
          </div>
        )}

        {/* Errors */}
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-3">
            {error}
          </p>
        )}

        {/* ── Footer actions ── */}
        <div className="flex gap-2 justify-between items-center">
          <button
            onClick={() => { setStage('paste-only'); setUrl(''); setError(''); }}
            className={`text-xs text-gray-400 hover:text-gray-600 underline ${stage === 'paste-only' ? 'hidden' : ''}`}
          >
            Skip URL, just paste
          </button>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
              Cancel
            </button>
            <button
              onClick={handlePasteImport}
              disabled={!pasteText.trim()}
              className="px-4 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
            >
              Import Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
