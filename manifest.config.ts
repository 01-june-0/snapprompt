import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'SnapPrompt',
  version: pkg.version,
  description: pkg.description,
  default_locale: 'en',
  icons: {
    16: 'src/assets/icons/icon-16.png',
    32: 'src/assets/icons/icon-32.png',
    48: 'src/assets/icons/icon-48.png',
    128: 'src/assets/icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'SnapPrompt',
    default_icon: {
      16: 'src/assets/icons/icon-16.png',
      32: 'src/assets/icons/icon-32.png',
    },
  },
  options_page: 'src/options/index.html',
  side_panel: {
    default_path: 'src/popup/index.html?mode=panel',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  // Static content script ONLY on well-known LLM sites (narrow, purpose-tied
  // host access — no broad <all_urls> or optional broad host pattern). On any
  // other site, save/picker still work on demand via activeTab + scripting
  // (right-click / shortcut). Keep in sync with DEFAULT_ALLOWED_HOSTS in
  // src/shared/types.ts.
  content_scripts: [
    {
      matches: [
        'https://chatgpt.com/*',
        'https://chat.openai.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*',
        'https://aistudio.google.com/*',
        'https://perplexity.ai/*',
        'https://www.perplexity.ai/*',
        'https://copilot.microsoft.com/*',
        'https://chat.deepseek.com/*',
        'https://grok.com/*',
        'https://poe.com/*',
        'https://chat.mistral.ai/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: [
    'storage',
    'contextMenus',
    'activeTab',
    'scripting',
    'sidePanel',
  ],
  commands: {
    'open-picker': {
      description: 'Open prompt picker',
    },
    'save-selection': {
      description: 'Save selected text as a prompt',
    },
  },
  web_accessible_resources: [
    {
      resources: ['src/content/*'],
      matches: ['<all_urls>'],
    },
  ],
});
