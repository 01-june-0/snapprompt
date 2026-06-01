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
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: [
    'storage',
    'unlimitedStorage',
    'contextMenus',
    'downloads',
    'activeTab',
    'alarms',
    'sidePanel',
  ],
  host_permissions: ['<all_urls>'],
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
