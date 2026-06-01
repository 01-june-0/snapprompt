/**
 * SnapPrompt background service worker (MV3).
 * - context menu for saving selection
 * - keyboard command routing (open-picker, save-selection)
 * - message hub
 * - install → onboarding, schema init
 * - periodic backup alarm (Phase 2 hook) + snapshots
 */
import { ensureSchema, takeSnapshot, recordUsage, getSettings, getPrompts } from '@shared/store';
import { onMessage } from '@shared/messaging';
import { setLocale, t } from '@shared/i18n';
import { search, rankForPicker } from '@shared/search';
import { substitute, extractVariables } from '@shared/variables';
import { maybeAutoBackup, runBackupDownload } from './autobackup';
import type { Message } from '@shared/types';

const CTX_SAVE = 'snapprompt-save-selection';
const CTX_OPEN = 'snapprompt-open-picker';

/** (Re)build the context menus, localized to the current language setting. */
async function buildMenus() {
  const settings = await getSettings();
  setLocale(settings.language);
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: CTX_SAVE, title: t('ctx.save'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: CTX_OPEN, title: t('ctx.open'), contexts: ['page', 'editable'] });
}

/* ---------- lifecycle ---------- */

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureSchema();
  await buildMenus();

  if (details.reason === 'install') {
    // open onboarding (options page) on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html#onboarding') });
  }
});

// Rebuild menus on SW startup (locale may have changed) so titles stay localized.
chrome.runtime.onStartup.addListener(() => { void buildMenus(); });

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

/* ---------- omnibox: "sp <query>" → search & copy ---------- */

chrome.omnibox.onInputStarted.addListener(async () => {
  const s = await getSettings();
  setLocale(s.language);
  chrome.omnibox.setDefaultSuggestion({ description: t('omni.default') });
});

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const prompts = await getPrompts();
  const matched = text.trim()
    ? search(prompts, text).map((r) => r.prompt)
    : rankForPicker(prompts);
  suggest(
    matched.slice(0, 6).map((p) => {
      const preview = p.body.replace(/\s+/g, ' ').trim().slice(0, 60);
      return { content: p.id, description: `<match>${escapeXml(p.title)}</match> <dim>${escapeXml(preview)}</dim>` };
    }),
  );
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  setBadge('…', '#7C3AED'); // immediate feedback that the handler ran
  try {
    const prompts = await getPrompts();
    const prompt = prompts.find((p) => p.id === text) ?? search(prompts, text).map((r) => r.prompt)[0];
    if (!prompt) { setBadge('?', '#F59E0B'); clearBadgeLater(); return; }
    const resolved = substitute(prompt.body, {}, extractVariables(prompt.body));
    const ok = await copyToClipboard(resolved);
    await recordUsage(prompt.id);
    setBadge(ok ? '✓' : '✗', ok ? '#10B981' : '#EF4444');
  } catch (e) {
    console.warn('[SnapPrompt] omnibox error:', e);
    setBadge('✗', '#EF4444');
  }
  clearBadgeLater();
});

function setBadge(text: string, color: string) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}
function clearBadgeLater(ms = 1800) {
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), ms);
}

/**
 * Copy text to the clipboard from the service worker via an offscreen document.
 * Works regardless of the active tab (new tab, edge://, etc.).
 */
let offscreenCreating: Promise<void> | null = null;
async function ensureOffscreen(): Promise<void> {
  try {
    // hasDocument may be missing on some builds — guard it.
    if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) return;
  } catch { /* fall through to create */ }
  if (offscreenCreating) { await offscreenCreating; return; }
  offscreenCreating = chrome.offscreen
    .createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD' as chrome.offscreen.Reason],
      justification: 'Copy the selected prompt to the clipboard from the address bar (omnibox).',
    })
    .then(() => {})
    .catch((e) => { if (!String(e).includes('single offscreen')) throw e; }); // already exists → fine
  try { await offscreenCreating; } finally { offscreenCreating = null; }
}
async function trySendCopy(text: string): Promise<boolean> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'SP_COPY', text })) as { ok?: boolean } | undefined;
    return !!res?.ok;
  } catch {
    return false;
  }
}
async function copyToClipboard(textToCopy: string): Promise<boolean> {
  // 1) offscreen document — works regardless of the active tab (new tab, edge://…)
  try {
    await ensureOffscreen();
    // the offscreen listener may not be ready on first use — retry a few times
    for (let i = 0; i < 6; i++) {
      if (await trySendCopy(textToCopy)) return true;
      await new Promise((r) => setTimeout(r, 120));
    }
  } catch (e) {
    console.warn('[SnapPrompt] offscreen copy failed:', e);
  }
  // 2) fallback: inject into the active tab (normal pages only)
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (txt: string) => {
          try {
            const ta = document.createElement('textarea');
            ta.value = txt;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
          } catch { return false; }
        },
        args: [textToCopy],
      });
      if (res?.result) return true;
    }
  } catch (e) {
    console.warn('[SnapPrompt] active-tab copy failed:', e);
  }
  return false;
}

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
