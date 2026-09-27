const NAMES = { depop: "Depop", ebay: "eBay", poshmark: "Poshmark", mercari: "Mercari", vinted: "Vinted", grailed: "Grailed" };
function render() {
  chrome.runtime.sendMessage({ type: "list" }, (res) => {
    const box = document.getElementById("jobs");
    const jobs = (res && res.jobs) || [];
    box.textContent = "";
    if (!jobs.length) { box.innerHTML = "<p>Nothing waiting to be filled.</p>"; return; }
    for (const j of jobs) {
      const d = document.createElement("div");
      d.className = "job";
      const b = document.createElement("b"); b.textContent = NAMES[j.shop] || j.shop;
      const s = document.createElement("span"); s.textContent = j.fields.title || "Untitled";
      d.append(b, s); box.appendChild(d);
    }
  });
}
document.getElementById("clear").onclick = () => chrome.runtime.sendMessage({ type: "clear" }, render);
render();
