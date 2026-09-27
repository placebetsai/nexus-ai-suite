// Runs on fashionistas.ai. Tells the page the extension is installed and
// passes "fill these shops" requests from the page to the background worker.
(() => {
  const mark = () => document.documentElement && (document.documentElement.dataset.fashCrosslister = chrome.runtime.getManifest().version);
  mark();
  document.addEventListener("DOMContentLoaded", mark);

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data;
    if (!d || d.source !== "fashionistas" || d.type !== "FASH_CROSSLIST") return;
    chrome.runtime.sendMessage({ type: "queue", job: d.job }, (res) => {
      const err = chrome.runtime.lastError;
      window.postMessage({ source: "fashionistas-crosslister", type: "FASH_CROSSLIST_ACK", ok: !err && !!(res && res.ok), error: err ? err.message : (res && res.error) || null, opened: res && res.opened }, location.origin);
    });
  });
})();
