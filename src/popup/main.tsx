import { render } from 'preact';
import '@shared/tokens.css';
import './popup.css';
import '@/components/prompt-options.css';
import { App } from './App';
import { getSettings, subscribe, maybeSnapshot } from '@shared/store';
import { applyTheme, watchSystemTheme } from '@shared/theme';
import { setLocale } from '@shared/i18n';

void maybeSnapshot(); // rollback snapshot on open if stale (replaces daily alarm)

function applyPrefs(s: { theme: 'system' | 'light' | 'dark'; language: 'system' | 'ko' | 'en' | 'ja' | 'zh' }) {
  applyTheme(s.theme);
  setLocale(s.language);
}
getSettings().then((s) => {
  applyPrefs(s);
  watchSystemTheme(s.theme);
});
subscribe(() => getSettings().then(applyPrefs));

// Window-mode detection: ?mode=window (detached window) | ?mode=panel (side panel)
const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'window' || mode === 'panel') {
  document.documentElement.classList.add(`mode-${mode}`);
}

render(<App />, document.getElementById('app')!);
