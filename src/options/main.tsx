import { render } from 'preact';
import '@shared/tokens.css';
import './options.css';
import { Options } from './Options';
import { Onboarding } from './Onboarding';
import { getSettings } from '@shared/store';
import { applyTheme, watchSystemTheme } from '@shared/theme';

getSettings().then((s) => {
  applyTheme(s.theme);
  watchSystemTheme(s.theme);
});

const isOnboarding = location.hash.replace('#', '') === 'onboarding';
render(isOnboarding ? <Onboarding /> : <Options />, document.getElementById('app')!);
