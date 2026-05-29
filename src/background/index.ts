/**
 * SnapPrompt background service worker (MV3).
 * - context menu for saving selection
 * - keyboard command routing (open-picker, save-selection)
 * - message hub
 * - install → onboarding, schema init
 * - periodic backup alarm (Phase 2 hook) + snapshots
 */
import { ensureSchema, takeSnapshot, recordUsage } from '@shared/store';
import { onMessage } from '@shared/messaging';
import { maybeAutoBackup } from './autobackup';
import type { Message } from '@shared/types';

const CTX_SAVE = 'snapprompt-save-selection';

/* ---------- lifecycle ---------- */

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureSchema();

  chrome.contextMenus.create({
    id: CTX_SAVE,
    title: 'SnapPrompt에 저장',
    contexts: ['selection'],
  });

  if (details.reason === 'install') {
    // open onboarding (options page) on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html#onboarding') });
  }
});

/* ---------- context menu ---------- */

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CTX_SAVE || !tab?.id) return;
  await openSaveModal(tab.id, info.selectionText ?? '', info.pageUrl ?? tab.url ?? '');
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
      return takeSnapshot().then(() => ({ ok: true as const }));
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
