/**
 * Insert text into the page's currently-focused input.
 * Handles <textarea>/<input>, contenteditable (React/Vue-safe), and
 * falls back to clipboard. See docs/PRD.md §F4.
 */

export type InsertResult = 'inserted' | 'clipboard';

let lastActive: HTMLElement | null = null;

/** Remember the focused editable before our overlay steals focus. */
export function captureActiveElement(): void {
  const el = document.activeElement as HTMLElement | null;
  if (el && isEditable(el)) lastActive = el;
}

/**
 * Continuously remember the page's most recent editable element, so that when
 * the popup (which blurs the page) asks us to insert, we still know the target.
 * Safe to run on every page — it only attaches one passive capture listener.
 */
export function startFocusTracking(): void {
  document.addEventListener(
    'focusin',
    () => {
      const el = document.activeElement as HTMLElement | null;
      // Ignore focus moving into our own shadow host (retargeted to the host div).
      if (el && el.id === 'snapprompt-root') return;
      if (el && isEditable(el)) lastActive = el;
    },
    true,
  );
}

export function getTargetElement(): HTMLElement | null {
  const current = document.activeElement as HTMLElement | null;
  if (current && isEditable(current)) return current;
  if (lastActive && document.contains(lastActive)) return lastActive;
  return null;
}

export function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return ['text', 'search', 'url', 'email', 'tel', ''].includes(type);
  }
  return el.isContentEditable;
}

export async function insertText(text: string): Promise<InsertResult> {
  const target = getTargetElement();

  if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
    insertIntoField(target as HTMLInputElement | HTMLTextAreaElement, text);
    return 'inserted';
  }

  if (target && target.isContentEditable) {
    const ok = insertIntoContentEditable(target, text);
    if (ok) return 'inserted';
  }

  // fallback
  await copyToClipboard(text);
  return 'clipboard';
}

function insertIntoField(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  el.focus();
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  // Use the native setter so frameworks observing the value see the change.
  const proto =
    el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const next = before + text + after;
  if (setter) setter.call(el, next);
  else el.value = next;

  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
}

function insertIntoContentEditable(el: HTMLElement, text: string): boolean {
  el.focus();
  try {
    // execCommand keeps React/Vue/ProseMirror state in sync better than node ops.
    const ok = document.execCommand('insertText', false, text);
    if (ok) return true;
  } catch {
    /* fall through */
  }
  // Fallback: Range insertion + input event
  try {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      el.textContent = (el.textContent ?? '') + text;
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // legacy fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
