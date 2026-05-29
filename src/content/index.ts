/**
 * Content script entry. Mounts a Shadow-DOM-isolated Preact app and routes
 * messages from the background (OPEN_PICKER / SAVE_SELECTION).
 */
import { render, h } from 'preact';
import tokensCss from '@shared/tokens.css?inline';
import overlayCss from './overlay.css?inline';
import { ContentApp, openPicker, openSave, insertPromptById, floatingEnabled, floatingTarget } from './ui';
import { onMessage } from '@shared/messaging';
import { applyTheme } from '@shared/theme';
import { getSettings, subscribe } from '@shared/store';
import { startFocusTracking, isEditable } from './insertion';

// Track the page's last-focused editable from the start so the popup can
// insert into it even after the popup steals focus. Cheap, runs on every page.
startFocusTracking();

const HOST_ID = 'snapprompt-root';

function mount(): ShadowRoot {
  let host = document.getElementById(HOST_ID);
  if (host) return (host as HTMLElement).shadowRoot!;

  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = tokensCss + '\n' + overlayCss;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  // theme: set data-theme on the HOST element so `:host([data-theme="dark"])`
  // in tokens.css resolves and its custom properties inherit into the shadow tree.
  getSettings().then((s) => applyTheme(s.theme, host as HTMLElement));

  render(h(ContentApp, null), mountPoint);
  return shadow;
}

// mount lazily on first trigger to avoid touching every page eagerly
let mounted = false;
function ensureMounted() {
  if (!mounted) { mount(); mounted = true; }
}

/* ---------- Floating button (Phase 2) ---------- */
let floatEl: HTMLElement | null = null;

function positionFloat() {
  if (!floatEl || !document.contains(floatEl)) {
    floatEl = null;
    floatingTarget.value = null;
    return;
  }
  const r = floatEl.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) { floatingTarget.value = null; return; }
  // top-right corner, just inside the field
  floatingTarget.value = { x: Math.max(8, r.right - 32), y: Math.max(8, r.top + 4) };
}

getSettings().then((s) => (floatingEnabled.value = s.floatingButton));
subscribe(() => getSettings().then((s) => {
  floatingEnabled.value = s.floatingButton;
  if (!s.floatingButton) { floatEl = null; floatingTarget.value = null; }
}));

document.addEventListener('focusin', () => {
  if (!floatingEnabled.value) return;
  const el = document.activeElement as HTMLElement | null;
  if (!el || el.id === HOST_ID) return;
  if (isEditable(el)) { ensureMounted(); floatEl = el; positionFloat(); }
}, true);

document.addEventListener('focusout', () => {
  setTimeout(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !isEditable(el)) { floatEl = null; floatingTarget.value = null; }
  }, 150);
}, true);

window.addEventListener('scroll', () => { if (floatEl) positionFloat(); }, true);
window.addEventListener('resize', () => { if (floatEl) positionFloat(); });

onMessage((msg) => {
  switch (msg.type) {
    case 'OPEN_PICKER':
      ensureMounted();
      openPicker();
      return { ok: true };
    case 'SAVE_SELECTION':
      ensureMounted();
      openSave(msg.text, msg.sourceUrl);
      return { ok: true };
    case 'INSERT_PROMPT':
      ensureMounted();
      void insertPromptById(msg.promptId);
      return { ok: true };
    case 'CAPTURE_AND_SAVE': {
      ensureMounted();
      const sel = window.getSelection()?.toString().trim() ?? '';
      openSave(sel, location.href);
      return { ok: true };
    }
    case 'PING':
      return { ok: true, data: 'pong' };
    default:
      return undefined;
  }
});
