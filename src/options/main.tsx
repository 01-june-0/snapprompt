import { render } from 'preact';
import '@shared/tokens.css';
import './options.css';
import '@/components/prompt-options.css';
import { Options } from './Options';
import { Onboarding } from './Onboarding';
import { getSettings, subscribe } from '@shared/store';
import { applyTheme, watchSystemTheme } from '@shared/theme';
import { setLocale } from '@shared/i18n';

function applyPrefs(s: { theme: 'system' | 'light' | 'dark'; language: 'system' | 'ko' | 'en' | 'ja' | 'zh' }) {
  applyTheme(s.theme);
  setLocale(s.language);
}
getSettings().then((s) => {
  applyPrefs(s);
  watchSystemTheme(s.theme);
});
subscribe(() => getSettings().then(applyPrefs));

const isOnboarding = location.hash.replace('#', '') === 'onboarding';
render(isOnboarding ? <Onboarding /> : <Options />, document.getElementById('app')!);
