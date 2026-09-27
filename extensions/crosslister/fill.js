// Field finder + filler, shared by every shop. It reads what a field is *called*
// (label, placeholder, aria-label, name, id, test id) instead of relying on a
// shop's CSS classes, so small redesigns on a shop don't break it.
// Exposed as globalThis.FashFill so filler.js and the tests can use it.
(() => {
  const RULES = {
    title: { want: /\btitle\b|what are you selling|what you('| a)re selling|tell us what|item name|listing name|name your (item|listing)|enter (brand|keywords)/i, avoid: /search|sub-?title|page title|seo/i, kinds: ["input", "textarea", "rich"] },
    description: { want: /descri|tell (buyers|us)|details about|about (this|the) item|item details/i, avoid: /search|short/i, kinds: ["textarea", "rich", "input"] },
    price: { want: /price|how much|amount|listing price|\$/i, avoid: /original|retail|ship|postage|compare|min(imum)?|floor|offer|discount|search|filter|budget|max/i, kinds: ["input"] },
    brand: { want: /\bbrand\b|designer|label\b|manufacturer/i, avoid: /search|filter/i, kinds: ["input"] },
    size: { want: /\bsize\b/i, avoid: /search|filter|shoe size chart/i, kinds: ["input"] },
    color: { want: /\bcolou?r\b/i, avoid: /search|filter/i, kinds: ["input"] },
  };

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  };

  function labelText(el) {
    const bits = [];
    const add = (s) => { if (s) bits.push(String(s)); };
    add(el.getAttribute("aria-label"));
    add(el.getAttribute("placeholder"));
    add(el.getAttribute("name"));
    add(el.id);
    add(el.getAttribute("data-testid"));
    add(el.getAttribute("data-test"));
    add(el.getAttribute("data-qa"));
    const lb = el.getAttribute("aria-labelledby");
    if (lb) lb.split(/\s+/).forEach((id) => add(document.getElementById(id)?.textContent));
    if (el.id) { try { add(document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent); } catch (e) { console.warn("[fill] label", e); } }
    add(el.closest("label")?.textContent);
    // Nearest heading-ish text above the field inside its small container.
    let box = el.parentElement;
    for (let i = 0; i < 3 && box; i++, box = box.parentElement) {
      const lab = box.querySelector("label, legend, h2, h3, h4, [class*=label i], [class*=Label]");
      if (lab && !lab.contains(el) && lab.textContent.length < 80) { add(lab.textContent); break; }
    }
    return bits.join(" | ").replace(/\s+/g, " ");
  }

  function kindOf(el) {
    if (el.tagName === "TEXTAREA") return "textarea";
    if (el.isContentEditable) return "rich";
    if (el.tagName === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      if (["text", "number", "tel", "search", ""].includes(t) || t === "text") return t === "search" ? "search" : "input";
    }
    return null;
  }

  function candidates(root = document) {
    return [...root.querySelectorAll("input, textarea, [contenteditable=''], [contenteditable='true']")]
      .filter((el) => kindOf(el) && kindOf(el) !== "search" && visible(el) && !el.disabled && !el.readOnly);
  }

  // Best element for each field; one element is never used for two fields.
  function findFields(root = document) {
    const els = candidates(root);
    const out = {};
    const used = new Set();
    for (const [field, rule] of Object.entries(RULES)) {
      let best = null, bestScore = 0;
      for (const el of els) {
        if (used.has(el)) continue;
        const k = kindOf(el);
        if (!rule.kinds.includes(k)) continue;
        const text = labelText(el);
        if (!rule.want.test(text) || rule.avoid.test(text)) continue;
        let score = 10 + (rule.kinds.length - rule.kinds.indexOf(k));
        if (field === "description" && k !== "input") score += 5;
        if (field === "price" && (el.inputMode === "decimal" || el.inputMode === "numeric" || el.type === "number")) score += 3;
        if (score > bestScore) { best = el; bestScore = score; }
      }
      if (best) { out[field] = best; used.add(best); }
    }
    // A shop with one big editor and no labelled description (eBay's frame).
    if (!out.description && root.body && root.body.isContentEditable) out.description = root.body;
    return out;
  }

  // React/Vue keep their own copy of an input's value; writing .value alone is
  // undone on the next render. Going through the prototype setter and firing
  // input/change is what their onChange handlers listen for.
  function setValue(el, value) {
    value = String(value ?? "");
    el.focus({ preventScroll: true });
    if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    } else {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return el.isContentEditable ? el.textContent === value : el.value === value;
  }

  function dataUrlToFile(p, i) {
    const [head, b64] = p.data.split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
    const ext = (p.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    return new File([bytes], `photo-${i + 1}.${ext}`, { type: p.type || head.slice(5, head.indexOf(";")) });
  }

  // Photo inputs are usually hidden behind a styled button, so visibility is not required.
  function attachPhotos(photos, root = document) {
    if (!photos || !photos.length) return 0;
    const inputs = [...root.querySelectorAll("input[type=file]")];
    const input = inputs.find((i) => /image|jpe?g|png|\*/i.test(i.accept || "")) || inputs[0];
    if (!input) return 0;
    const dt = new DataTransfer();
    const files = photos.map(dataUrlToFile);
    (input.multiple ? files : files.slice(0, 1)).forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return dt.files.length;
  }

  function priceText(v) {
    const n = Number(String(v).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : "";
  }

  function fillAll(fields, photos, root = document) {
    const found = findFields(root);
    const report = { filled: [], missing: [], photos: 0 };
    const values = { ...fields, price: priceText(fields.price) };
    for (const f of Object.keys(RULES)) {
      if (!values[f]) continue;
      if (found[f] && setValue(found[f], values[f])) report.filled.push(f);
      else report.missing.push(f);
    }
    report.photos = attachPhotos(photos, root);
    return report;
  }

  globalThis.FashFill = { findFields, setValue, attachPhotos, fillAll, labelText, RULES };
})();
