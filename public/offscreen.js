// Offscreen document: copies text to the clipboard on request from the
// background service worker. Reports method/error back for diagnostics.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'SP_COPY') return;
  const text = msg.text || '';
  const out = { ok: false, method: '', err: '' };

  // 1) textarea + execCommand('copy') — the offscreen-appropriate method
  try {
    const ta = document.getElementById('t');
    ta.value = text;
    ta.select();
    ta.setSelectionRange(0, text.length);
    out.ok = document.execCommand('copy');
    out.method = 'execCommand';
  } catch (e) {
    out.err = 'exec:' + e;
  }
  if (out.ok) { sendResponse(out); return; }

  // 2) async Clipboard API fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => { out.ok = true; out.method = 'clipboard'; sendResponse(out); },
      (e) => { out.err += ' clip:' + e; sendResponse(out); },
    );
    return true; // async response
  }
  sendResponse(out);
});
