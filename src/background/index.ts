/**
 * SnapPrompt background service worker (MV3).
 * - context menu for saving selection
 * - keyboard command routing (open-picker, save-selection)
 * - message hub
 * - install → onboarding, schema init
 * - periodic backup alarm (Phase 2 hook) + snapshots
 */
import { ensureSchema, takeSnapshot, recordUsage, getSettings, setSettings } from '@shared/store';
import { onMessage } from '@shared/messaging';
import { setLocale, t } from '@shared/i18n';
import { maybeAutoBackup, runBackupDownload } from './autobackup';
import type { Message, PopupMode } from '@shared/types';

const CTX_SAVE = 'snapprompt-save-selection';
const CTX_OPEN = 'snapprompt-open-picker';
const POPUP_PATH = 'src/popup/index.html';

/** (Re)build the context menus, localized to the current language setting. */
async function buildMenus() {
  const settings = await getSettings();
  setLocale(settings.language);
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: CTX_SAVE, title: t('ctx.save'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: CTX_OPEN, title: t('ctx.open'), contexts: ['page', 'editable'] });
}

/* ---------- popup open mode (default popup / detached window / side panel) ---------- */

/** Open the prompt UI in a freely-movable detached window. */
async function openDetachedWindow() {
  await chrome.windows.create({
    url: chrome.runtime.getURL(`${POPUP_PATH}?mode=window`),
    type: 'popup',
    width: 480,
    height: 640,
  });
}

/**
 * Reconfigure the toolbar action so a single icon click reopens SnapPrompt in
 * the user's last-used mode:
 *  - default → show the toolbar popup
 *  - window  → no popup; onClicked fires and we open a detached window
 *  - panel   → no popup; the side panel opens directly on click
 * Action/side-panel state is browser-session scoped, so this is re-applied on
 * every service-worker start (module load + onInstalled).
 */
async function applyActionMode(mode: PopupMode) {
  try {
    await chrome.action.setPopup({ popup: mode === 'default' ? POPUP_PATH : '' });
  } catch { /* action may be unavailable briefly during startup */ }
  try {
    // @ts-ignore — setPanelBehavior is newer than some @types/chrome versions
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'panel' });
  } catch { /* sidePanel unsupported → window/default still work */ }
}

async function applyStoredActionMode() {
  try {
    await applyActionMode((await getSettings()).popupMode);
  } catch { /* settings not ready yet */ }
}

// Re-apply on every SW wake so the icon behavior survives browser restarts.
void applyStoredActionMode();

// Fires only in 'window' mode (popup empty + panel-on-click off).
chrome.action.onClicked.addListener(async () => {
  const { popupMode } = await getSettings();
  if (popupMode === 'window') await openDetachedWindow();
});

/* ---------- lifecycle ---------- */

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureSchema();
  await buildMenus();
  await applyStoredActionMode();

  if (details.reason === 'install') {
    // open onboarding (options page) on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html#onboarding') });
  }
});

// Rebuild menus on SW startup (locale may have changed) so titles stay localized.
chrome.runtime.onStartup.addListener(() => { void buildMenus(); void applyStoredActionMode(); });

/* ---------- context menu ---------- */

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === CTX_SAVE) {
    await openSaveModal(tab.id, info.selectionText ?? '', info.pageUrl ?? tab.url ?? '');
  } else if (info.menuItemId === CTX_OPEN) {
    await sendToTab(tab.id, { type: 'OPEN_PICKER' });
  }
});

/* ---------- keyboard commands ---------- */

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = active;
  }
  if (!tab?.id) return;

  if (command === 'open-picker') {
    await sendToTab(tab.id, { type: 'OPEN_PICKER' });
  } else if (command === 'save-selection') {
    // content script reads the current page selection and opens the save modal
    await sendToTab(tab.id, { type: 'CAPTURE_AND_SAVE' });
  }
});

/* ---------- message hub ---------- */

onMessage((msg: Message, sender) => {
  switch (msg.type) {
    case 'PROMPT_USED':
      return recordUsage(msg.promptId).then(() => ({ ok: true as const }));
    case 'SAVE_SELECTION': {
      const tabId = sender.tab?.id;
      if (tabId) void openSaveModal(tabId, msg.text, msg.sourceUrl);
      return { ok: true as const };
    }
    case 'OPEN_OPTIONS': {
      const url = chrome.runtime.getURL(
        'src/options/index.html' + (msg.section ? `#${msg.section}` : ''),
      );
      chrome.tabs.create({ url });
      return { ok: true as const };
    }
    case 'SET_POPUP_MODE':
      return setSettings({ popupMode: msg.mode })
        .then(() => applyActionMode(msg.mode))
        .then(() => ({ ok: true as const }));
    case 'BACKUP_NOW':
      // snapshot (internal) + download a JSON backup to the downloads folder
      return Promise.all([takeSnapshot(), runBackupDownload()]).then(
        ([, ok]) => (ok ? { ok: true as const } : { ok: false as const, error: '백업할 프롬프트가 없어요' }),
      );
    case 'PING':
      return { ok: true as const, data: 'pong' };
    default:
      return { ok: false as const, error: 'unhandled message' };
  }
});

/* ---------- backup: daily snapshot (always) + auto-download (if enabled) ---------- */

chrome.alarms.create('snapprompt-snapshot', { periodInMinutes: 60 * 24 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'snapprompt-snapshot') return;
  await takeSnapshot();
  await maybeAutoBackup();
});

// Catch up on a due backup when the browser/extension starts.
chrome.runtime.onStartup.addListener(() => {
  void maybeAutoBackup();
});

/* ---------- helpers ---------- */

async function sendToTab(tabId: number, msg: Message) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    return undefined;
  }
}

async function openSaveModal(tabId: number, text: string, sourceUrl: string) {
  await sendToTab(tabId, { type: 'SAVE_SELECTION', text, sourceUrl });
}
