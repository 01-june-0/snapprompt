/**
 * Fuzzy search & sorting over prompts (Fuse.js).
 */
import Fuse, { type IFuseOptions, type FuseResultMatch } from 'fuse.js';
import type { Prompt, SortMode } from './types';

const FUSE_OPTIONS: IFuseOptions<Prompt> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.4,
  ignoreLocation: true,
  keys: [
    { name: 'title', weight: 2 },
    { name: 'tags', weight: 1.5 },
    { name: 'body', weight: 1 },
  ],
};

export interface SearchResult {
  prompt: Prompt;
  /** Matched index ranges per key, for highlighting */
  matches?: readonly FuseResultMatch[];
}

export function search(prompts: Prompt[], query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return prompts.map((prompt) => ({ prompt }));
  const fuse = new Fuse(prompts, FUSE_OPTIONS);
  return fuse.search(q).map((r) => ({ prompt: r.item, matches: r.matches }));
}

/** Recency + frequency weighting used for default ordering in the picker. */
export function rankForPicker(prompts: Prompt[]): Prompt[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const score = (p: Prompt) => {
    const recency = p.lastUsedAt
      ? Math.max(0, 30 - (now - p.lastUsedAt) / DAY)
      : 0;
    const frequency = Math.min(20, p.useCount);
    const fav = p.favorite ? 10 : 0;
    return recency + frequency + fav;
  };
  return [...prompts].sort((a, b) => score(b) - score(a));
}

export function sortPrompts(prompts: Prompt[], mode: SortMode): Prompt[] {
  const arr = [...prompts];
  switch (mode) {
    case 'recent-used':
      return arr.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
    case 'recent-saved':
      return arr.sort((a, b) => b.updatedAt - a.updatedAt);
    case 'most-used':
      return arr.sort((a, b) => b.useCount - a.useCount);
    case 'name':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr;
  }
}
