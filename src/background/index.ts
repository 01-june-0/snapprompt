/**
 * SnapPrompt background service worker (MV3).
 * - context menu for saving selection
 * - keyboard command routing (open-picker, save-selection)
 * - message hub
 * - install → onboarding, schema init
 * - periodic backup alarm (Phase 2 hook) + snapshots
 */
import { ensureSchema, recordUsage, addInsertion, getSettings, setSettings, getPrompts } from '@shared/store';
import { uuid } from '@shared/id';
import { onMessage } from '@shared/messaging';
import { setLocale, t } from '@shared/i18n';
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

// Loader path of the content script bundle — used for on-demand injection
// (right-click / shortcut) on sites outside the static content_scripts list.
const CS_FILE = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];

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
  await ensureContentScript(tab.id); // works on any site (activeTab grant from the click)
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

  await ensureContentScript(tab.id); // works on any site (activeTab grant from the command)
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
    case 'PROMPT_USED': {
      const { promptId, text, values, host } = msg;
      const work = recordUsage(promptId).then(async () => {
        if (text === undefined) return;
        const prompts = await getPrompts();
        const title = prompts.find((p) => p.id === promptId)?.title ?? '';
        await addInsertion({ id: uuid(), promptId, at: Date.now(), title, text, values: values ?? {}, host });
      });
      return work.then(() => ({ ok: true as const }));
    }
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
    case 'PING':
      return { ok: true as const, data: 'pong' };
    default:
      return { ok: false as const, error: 'unhandled message' };
  }
});

/* ---------- helpers ---------- */

async function sendToTab(tabId: number, msg: Message) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    return undefined;
  }
}

async function pingTab(tabId: number): Promise<boolean> {
  const pong = (await sendToTab(tabId, { type: 'PING' })) as { ok?: boolean } | undefined;
  return !!pong?.ok;
}

/**
 * Make sure the content script is running in `tabId`. On allowed (LLM) sites
 * it's already there statically. On any other site we inject it on demand —
 * allowed because the caller is a user gesture (context menu / command) that
 * grants activeTab. The crxjs content script is an ESM loader that imports its
 * real module asynchronously, so executeScript resolves BEFORE the message
 * listener is live; we poll PING until it actually answers before returning,
 * otherwise the caller's follow-up message races ahead and is dropped.
 */
async function ensureContentScript(tabId: number): Promise<boolean> {
  if (await pingTab(tabId)) return true;
  if (!(CS_FILE && chrome.scripting?.executeScript)) return false;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CS_FILE] });
  } catch {
    return false; // e.g. chrome:// page, web store — injection not allowed
  }
  for (let i = 0; i < 40; i++) {
    if (await pingTab(tabId)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

async function openSaveModal(tabId: number, text: string, sourceUrl: string) {
  await sendToTab(tabId, { type: 'SAVE_SELECTION', text, sourceUrl });
}
