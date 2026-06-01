// Offscreen document: copies text to the clipboard on request from the
// background service worker. Tries the async Clipboard API first, then falls
// back to textarea + execCommand('copy') (works without focus in offscreen).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'SP_COPY') return;
  (async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(msg.text || '');
      ok = true;
    } catch (_e) {
      try {
        const ta = document.getElementById('t');
        ta.value = msg.text || '';
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
      } catch (_e2) {
        ok = false;
      }
    }
    sendResponse({ ok });
  })();
  return true; // keep the channel open for the async response
});
