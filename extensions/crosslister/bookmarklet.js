// "Fashionistas Fill" bookmark — the no-install version of the Crosslister.
// Built into a javascript: link by build-bookmarklet.mjs together with fill.js.
// The listing arrives through the clipboard (Fashionistas → "Copy for Fashionistas
// Fill"), so it needs no network access and works under the shops' strict
// connect-src policies. It never presses Post.
(() => {
  const F = globalThis.FashFill;
  const HOSTS = { "depop.com": "depop", "ebay.com": "ebay", "poshmark.com": "poshmark", "mercari.com": "mercari", "vinted.com": "vinted", "grailed.com": "grailed" };
  const host = location.hostname.replace(/^www\./, "");
  const shop = Object.keys(HOSTS).find((h) => host === h || host.endsWith("." + h));
  const shopId = shop ? HOSTS[shop] : null;

  document.getElementById("fash-fill-host")?.remove();
  const hostEl = document.createElement("div");
  hostEl.id = "fash-fill-host";
  hostEl.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const root = hostEl.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    .p{width:300px;max-height:75vh;overflow:auto;font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#12121a;background:#fff;border:1px solid #e7e1d8;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.22);padding:14px}
    h3{margin:0 0 4px;font-size:14px}.mut{color:#74747e;font-size:12px;margin:0 0 10px}
    textarea{width:100%;box-sizing:border-box;height:64px;border:1.5px dashed #ff4e3a;border-radius:10px;padding:8px;font:12px system-ui}
    .row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid #f1ece4}
    .ok{color:#0f8a4b;font-weight:700}.no{color:#c2410c;font-weight:700}
    button{font:600 12px system-ui,sans-serif;border:1px solid #e7e1d8;background:#f7f3ee;border-radius:9px;padding:5px 9px;cursor:pointer}
  </style><div class="p" role="dialog" aria-label="Fashionistas Fill">
    <h3>Fashionistas Fill</h3><p class="mut" id="sub">Reading your listing…</p>
    <textarea id="paste" placeholder="Click here and paste (Ctrl+V or ⌘V)" hidden></textarea>
    <div id="rows"></div>
    <p class="mut" style="margin:10px 0 0">Check everything, then press this shop's own Post button. We never post for you.
    <button id="x" title="Close this panel.">Close</button></p></div>`;
  document.documentElement.appendChild(hostEl);
  const $ = (id) => root.getElementById(id);
  $("x").onclick = () => hostEl.remove();

  const labels = { title: "Title", description: "Description", price: "Price", brand: "Brand", size: "Size", color: "Colour" };

  function fillFrames(desc) {
    // eBay-style editors live in same-origin iframes.
    for (const f of document.querySelectorAll("iframe")) {
      try {
        const b = f.contentDocument && f.contentDocument.body;
        if (b && b.isContentEditable && desc) { F.setValue(b, desc); return true; }
      } catch (e) { /* cross-origin frame: skip */ }
    }
    return false;
  }

  function run(payload) {
    const fields = (payload.shops && (payload.shops[shopId] || payload.shops[Object.keys(payload.shops)[0]])) || payload.fields || {};
    const report = F.fillAll(fields, payload.photos || []);
    if (!report.filled.includes("description") && fillFrames(fields.description)) {
      report.filled.push("description");
      report.missing = report.missing.filter((m) => m !== "description");
    }
    const n = report.filled.length;
    $("paste").hidden = true;
    $("sub").textContent = n
      ? `Filled ${n} field${n === 1 ? "" : "s"}${report.photos ? ` and ${report.photos} photo${report.photos === 1 ? "" : "s"}` : ""}.`
      : "Couldn't find this shop's form here. Open Sell on this shop, then click the bookmark again — or use the copy buttons.";
    $("rows").innerHTML = "";
    for (const f of Object.keys(labels)) {
      const v = fields[f];
      if (!v) continue;
      const row = document.createElement("div");
      row.className = "row";
      const ok = report.filled.includes(f);
      row.innerHTML = `<span><b>${labels[f]}</b> <span class="${ok ? "ok" : "no"}">${ok ? "filled" : "paste it"}</span></span>`;
      const b = document.createElement("button");
      b.textContent = "Copy";
      b.onclick = () => navigator.clipboard.writeText(String(v)).then(() => { b.textContent = "Copied"; }, () => { b.textContent = "Copy failed"; });
      row.appendChild(b);
      $("rows").appendChild(row);
    }
    if ((payload.photos || []).length && !report.photos) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span><b>Photos</b> <span class="no">add them yourself</span></span>`;
      $("rows").appendChild(row);
    }
  }

  function parse(text) {
    try {
      const d = JSON.parse(String(text || "").trim());
      return d && d.fashionistas === 1 ? d : null;
    } catch { return null; }
  }

  function askPaste(why) {
    $("sub").textContent = why;
    const ta = $("paste");
    ta.hidden = false;
    ta.focus();
    ta.onpaste = (e) => {
      const d = parse(e.clipboardData && e.clipboardData.getData("text"));
      e.preventDefault();
      if (d) run(d);
      else $("sub").textContent = "That isn't a Fashionistas listing. In Fashionistas press “Copy for Fashionistas Fill” first.";
    };
  }

  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then((t) => {
      const d = parse(t);
      if (d) run(d);
      else askPaste("Nothing from Fashionistas on your clipboard. Press “Copy for Fashionistas Fill” there, then paste here:");
    }, () => askPaste("Paste your listing here:"));
  } else askPaste("Paste your listing here:");
})();
