// Runs on each shop's pages. If Fashionistas queued a listing for this shop,
// waits for the sell form, fills it, and shows a small panel with what was
// filled, what still needs you, and copy buttons for every value.
// It never presses Post / List / Publish.
(() => {
  if (!globalThis.FashFill) return;
  const TOP = window === window.top;
  const host = location.hostname.replace(/^www\./, "");

  chrome.runtime.sendMessage({ type: "job", host }, (res) => {
    if (chrome.runtime.lastError) { console.warn("[crosslister]", chrome.runtime.lastError.message); return; }
    const job = res && res.job;
    if (!job) return;
    if (TOP) start(job); else frameOnly(job);
  });

  // eBay puts its description editor in an iframe: fill only that there.
  function frameOnly(job) {
    const tryIt = () => {
      if (document.body && document.body.isContentEditable && job.fields.description) {
        FashFill.setValue(document.body, job.fields.description);
        return true;
      }
      return false;
    };
    if (!tryIt()) setTimeout(tryIt, 2500);
  }

  function start(job) {
    const panel = makePanel(job);
    let tries = 0;
    const attempt = () => {
      tries++;
      const found = FashFill.findFields();
      // Wait until the form has at least a title or price field (SPAs render late).
      if (!(found.title || found.price) && tries < 30) return setTimeout(attempt, 700);
      const report = FashFill.fillAll(job.fields, job.photos);
      panel.show(report);
    };
    attempt();
  }

  function makePanel(job) {
    const hostEl = document.createElement("div");
    hostEl.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
    const root = hostEl.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        .p{width:300px;max-height:70vh;overflow:auto;font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#12121a;background:#fff;border:1px solid #e7e1d8;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.22);padding:14px}
        h3{margin:0 0 4px;font-size:14px} .mut{color:#74747e;font-size:12px;margin:0 0 10px}
        .row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid #f1ece4}
        .ok{color:#0f8a4b;font-weight:700} .no{color:#c2410c;font-weight:700}
        button{font:600 12px system-ui,sans-serif;border:1px solid #e7e1d8;background:#f7f3ee;border-radius:9px;padding:5px 9px;cursor:pointer}
        button.main{background:#ff4e3a;color:#fff;border-color:#ff4e3a}
        .bar{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
      </style>
      <div class="p" role="dialog" aria-label="Fashionistas Crosslister">
        <h3>Fashionistas filled this in</h3>
        <p class="mut" id="sub">Looking for the listing form…</p>
        <div id="rows"></div>
        <div class="bar">
          <button class="main" id="again" title="Fill the form again, for example after the page changed.">Fill again</button>
          <button id="done" title="Forget this listing for this shop and close the panel.">I've posted it</button>
          <button id="hide" title="Hide this panel. The listing stays queued.">Hide</button>
        </div>
        <p class="mut" style="margin:10px 0 0">Check everything, pick category and condition, then press this shop's own Post button. We never post for you.</p>
      </div>`;
    document.documentElement.appendChild(hostEl);
    const $ = (id) => root.getElementById(id);
    const labels = { title: "Title", description: "Description", price: "Price", brand: "Brand", size: "Size", color: "Colour" };

    function show(report) {
      const n = report.filled.length;
      $("sub").textContent = n
        ? `Filled ${n} field${n === 1 ? "" : "s"}${report.photos ? ` and ${report.photos} photo${report.photos === 1 ? "" : "s"}` : ""}.`
        : "Couldn't find this shop's form fields. Use the copy buttons below.";
      $("rows").innerHTML = "";
      for (const f of Object.keys(labels)) {
        const v = job.fields[f];
        if (!v) continue;
        const ok = report.filled.includes(f);
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span><b>${labels[f]}</b> <span class="${ok ? "ok" : "no"}">${ok ? "filled" : "paste it"}</span></span>`;
        const b = document.createElement("button");
        b.textContent = "Copy";
        b.title = `Copy the ${labels[f].toLowerCase()} to paste it yourself.`;
        b.onclick = () => navigator.clipboard.writeText(String(v)).then(() => { b.textContent = "Copied"; }, (e) => { console.warn("[crosslister] copy", e); b.textContent = "Copy failed"; });
        row.appendChild(b);
        $("rows").appendChild(row);
      }
      if (job.photos && job.photos.length && !report.photos) {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span><b>Photos</b> <span class="no">add them yourself</span></span>`;
        $("rows").appendChild(row);
      }
    }
    $("again").onclick = () => show(FashFill.fillAll(job.fields, job.photos));
    $("done").onclick = () => chrome.runtime.sendMessage({ type: "done", host }, () => hostEl.remove());
    $("hide").onclick = () => hostEl.remove();
    return { show };
  }
})();
