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

render(<App />, document.getElementById('app')!);
