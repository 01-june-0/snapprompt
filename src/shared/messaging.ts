/**
 * Thin typed wrapper over chrome.runtime / tabs messaging.
 */
import type { Message, MessageResponse } from './types';

export async function sendToBackground(msg: Message): Promise<MessageResponse> {
  try {
    return (await chrome.runtime.sendMessage(msg)) as MessageResponse;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function sendToActiveTab(msg: Message): Promise<MessageResponse> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { ok: false, error: 'no active tab' };
    return (await chrome.tabs.sendMessage(tab.id, msg)) as MessageResponse;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function onMessage(
  handler: (
    msg: Message,
    sender: chrome.runtime.MessageSender,
  ) => void | Promise<MessageResponse> | MessageResponse,
): void {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const result = handler(msg as Message, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // keep channel open for async response
    }
    if (result !== undefined) sendResponse(result);
    return false;
  });
}
