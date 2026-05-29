import { render } from 'preact';
import '@shared/tokens.css';
import './popup.css';
import { App } from './App';
import { getSettings } from '@shared/store';
import { applyTheme, watchSystemTheme } from '@shared/theme';

getSettings().then((s) => {
  applyTheme(s.theme);
  watchSystemTheme(s.theme);
});

// Window-mode detection: ?mode=window (detached window) | ?mode=panel (side panel)
const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'window' || mode === 'panel') {
  document.documentElement.classList.add(`mode-${mode}`);
}

render(<App />, document.getElementById('app')!);
