// Offscreen document: copies text to the clipboard on request from the
// background service worker. Uses the textarea + execCommand('copy') method,
// which works in an offscreen document without focus or a user gesture.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'SP_COPY') return;
  const ta = document.getElementById('t');
  ta.value = msg.text || '';
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  sendResponse({ ok });
  return true;
});
