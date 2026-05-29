/**
 * Theme application. Mirrors the CSS-variable token system used in /design.
 * Applies `data-theme="light|dark"` on the document root.
 */
import type { ThemePref } from './types';

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return pref;
}

export function applyTheme(pref: ThemePref, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = resolveTheme(pref);
}

/** Re-apply when the system theme changes (only matters for pref === 'system'). */
export function watchSystemTheme(
  pref: ThemePref,
  root: HTMLElement = document.documentElement,
): () => void {
  if (pref !== 'system' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => applyTheme('system', root);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
