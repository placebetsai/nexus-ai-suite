// Posts a listing to Poshmark through Poshmark's own web API, the same calls
// poshmark.com/create-listing makes, using the seller's logged-in session.
// Flow (from live-traffic captures): create draft -> upload photos -> save
// fields -> publish -> read back and confirm status "published".
// Poshmark often answers HTTP 200 with the real error inside the JSON, and a
// publish can silently leave a draft, so every step is checked and the final
// read-back is the only thing that counts as success.
// Exposed as globalThis.FashPosh so filler.js and the tests can use it.
(() => {
  const DEFAULT_PM_VERSION = "2026.33.00";

  // Poshmark's condition codes, read off the live condition dropdown.
  function conditionCode(c) {
    const s = String(c || "").toLowerCase();
    if (/new with tags|nwt|brand new|^new$/.test(s)) return "nwt";
    if (/like new|excellent|mint|new without/.test(s)) return "uln";
    if (/fair|poor|worn|flaw/.test(s)) return "uf";
    return "ug";
  }

  function sizeId(s) {
    const v = String(s || "").trim();
    if (!v || /^unknown$/i.test(v)) return "";
    const words = { "extra small": "XS", "x-small": "XS", xsmall: "XS", small: "S", medium: "M", large: "L", "extra large": "XL", "x-large": "XL", xlarge: "XL", "one size": "OS", os: "OS" };
    const low = v.toLowerCase();
    if (words[low]) return words[low];
    const m = v.match(/^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|\d{1,2}(\.5)?)\b/i);
    return m ? m[1].toUpperCase().replace("2XL", "XXL").replace("3XL", "XXXL") : v.slice(0, 12);
  }

  // Our item words -> Poshmark category names, tried in order.
  const CATEGORY_WORDS = [
    [/jean jacket|denim jacket|trucker|jacket|coat|parka|puffer|blazer|vest|windbreaker|bomber/, ["Jackets & Coats", "Suits & Blazers"]],
    [/jeans|denim(?! jacket)/, ["Jeans"]],
    [/pants|trousers|chinos|joggers|jumpsuit|overalls|leggings/, ["Pants & Jumpsuits", "Pants"]],
    [/shorts/, ["Shorts"]],
    [/skirt/, ["Skirts"]],
    [/dress|gown/, ["Dresses"]],
    [/sweater|cardigan|knit|pullover|jumper/, ["Sweaters"]],
    [/hoodie|sweatshirt|crewneck/, ["Sweaters", "Shirts", "Tops"]],
    [/sneaker|shoe|boot|heel|sandal|loafer|flat|trainer|slipper|clog/, ["Shoes"]],
    [/bag|purse|tote|backpack|clutch|wallet/, ["Bags"]],
    [/necklace|ring|bracelet|earring|jewel/, ["Jewelry", "Accessories"]],
    [/hat|cap|beanie|belt|scarf|sunglasses|gloves|watch|tie/, ["Accessories"]],
    [/swim|bikini/, ["Swim"]],
    [/t-shirt|tee|top|blouse|shirt|tank|polo|camisole|bodysuit|jersey/, ["Tops", "Shirts"]],
    [/outerwear/, ["Jackets & Coats"]],
    [/bottoms/, ["Pants & Jumpsuits", "Pants", "Jeans"]],
    [/tops/, ["Tops", "Shirts"]],
    [/accessor/, ["Accessories"]],
  ];

  const nameOf = (n) => n && (n.display || n.name || n.title || n.label || n.display_name || n.slug || "");
  const kidsOf = (n) => (n && (n.children || n.categories || n.category_features || n.subcategories || n.items)) || [];
  const idOf = (n) => n && (n.id || n.uid || n._id);

  // Walks catalog_v2 without assuming its exact shape: any node with an id,
  // a readable name and child nodes is a department/category/subcategory.
  function departments(tree) {
    let roots = tree && (tree.data || tree);
    if (roots && !Array.isArray(roots)) roots = roots.departments || roots.catalog || roots.children || Object.values(roots).find(Array.isArray) || [];
    return (Array.isArray(roots) ? roots : []).filter((d) => idOf(d) && nameOf(d));
  }

  function resolveCatalog(tree, fields) {
    const text = [fields.type, fields.title, fields.category].filter(Boolean).join(" ").toLowerCase();
    const deps = departments(tree);
    if (!deps.length) return { error: "Poshmark's category list didn't load" };
    const cat = String(fields.category || "").toLowerCase();
    const wantDept = /\bkid|girl|boy|baby|toddler/.test(text) ? "Kids" : (/\bmen'?s\b|\bmens\b|^men\b|\bmale\b/.test(text) && !/women/.test(text)) || /^men/.test(cat) ? "Men" : "Women";
    const dept = deps.find((d) => nameOf(d).toLowerCase() === wantDept.toLowerCase()) || deps.find((d) => /women/i.test(nameOf(d)));
    if (!dept) return { error: "no " + wantDept + " department on Poshmark" };
    const cats = kidsOf(dept).filter((c) => idOf(c) && nameOf(c));
    let category = null;
    for (const [re, names] of CATEGORY_WORDS) {
      if (!re.test(text)) continue;
      for (const n of names) { category = cats.find((c) => nameOf(c).toLowerCase() === n.toLowerCase()); if (category) break; }
      if (category) break;
    }
    if (!category) return { error: "couldn't match a Poshmark category for \"" + (fields.type || fields.title || "this item") + "\"" };
    // Subcategory: the child whose name shares the most words with the item.
    const words = new Set(text.split(/[^a-z]+/).filter((w) => w.length > 2));
    let sub = null, best = 0;
    for (const s of kidsOf(category)) {
      const n = nameOf(s).toLowerCase();
      const score = n.split(/[^a-z]+/).filter((w) => w.length > 2 && (words.has(w) || words.has(w.replace(/s$/, "")))).length;
      if (score > best && idOf(s)) { best = score; sub = s; }
    }
    return { department: idOf(dept), category: idOf(category), category_features: sub ? [idOf(sub)] : [], names: [nameOf(dept), nameOf(category), sub ? nameOf(sub) : ""].filter(Boolean) };
  }

  function wholeDollars(p) {
    const n = Number(String(p ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.max(3, Math.round(n)) : 0;
  }

  function buildPost(fields, catalog, pictureIds) {
    const size = sizeId(fields.size);
    return {
      post: {
        external_source: null, external_source_id: null,
        catalog: { department: catalog.department, category: catalog.category, category_features: catalog.category_features },
        colors: [], // Poshmark rejects anything but its own colour objects; see docs.
        inventory: { size_quantity_revision: 0, status: "available", size_quantities: [
          { size_id: size, size_obj: { id: size, display: size, size_system: "us" }, size_system: "us", quantity_available: 1, quantity_sold: 0 }] },
        price_amount: { val: wholeDollars(fields.price), currency_code: "USD" },
        original_price_amount: { val: 0, currency_code: "USD" },
        offer_auto_actions_v2_enabled: false, offer_auto_actions_min_price_amount: null,
        title: String(fields.title || "").slice(0, 80),
        description: String(fields.description || fields.title || "").slice(0, 1500),
        brand: fields.brand && !/^unknown$/i.test(fields.brand) ? String(fields.brand) : undefined,
        condition: conditionCode(fields.condition),
        cover_shot: { id: pictureIds[0] },
        pictures: pictureIds.slice(1).map((id) => ({ id })),
        videos: [], seller_private_info: {}, style_tags: [], autolist_draft: false,
        seller_shipping_discount: { id: null },
      },
    };
  }

  // Everything that could stop a publish, checked before a draft is created.
  function preflight(fields, photos) {
    const miss = [];
    if (!String(fields.title || "").trim()) miss.push("a title");
    if (!wholeDollars(fields.price)) miss.push("a price");
    if (!sizeId(fields.size)) miss.push("a size");
    if (!photos || !photos.length) miss.push("a photo");
    return miss;
  }

  // Poshmark hides real failures inside HTTP 200 bodies.
  function embeddedError(j) {
    const e = j && j.error;
    if (!e) return "";
    return e.userMessage || e.errorMessage || e.errorType || "Poshmark refused it";
  }

  function dataUrlBlob(p) {
    const [head, b64] = String(p.data).split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: p.type || head.slice(5, head.indexOf(";")) || "image/jpeg" });
  }

  // deps: { fetch, csrf(), uid, pmVersion, sleep, log }
  async function post(job, deps) {
    const f = job.fields || {};
    const log = deps.log || (() => {});
    const miss = preflight(f, job.photos);
    if (miss.length) throw new Error("Poshmark needs " + miss.join(", ") + " before it can post");
    if (!deps.uid) throw new Error("not logged in to Poshmark");
    const V = deps.pmVersion || DEFAULT_PM_VERSION;
    const base = deps.origin || "https://poshmark.com";
    const call = async (method, path, body, isForm) => {
      const headers = { "x-xsrf-token": deps.csrf() || "", accept: "application/json" };
      if (!isForm && body !== undefined) headers["content-type"] = "application/json";
      const r = await deps.fetch(base + path, { method, headers, credentials: "include", body: isForm ? body : body === undefined ? undefined : JSON.stringify(body) });
      const text = await r.text();
      let j = null; try { j = text ? JSON.parse(text) : {}; } catch { j = null; }
      if (!r.ok) throw new Error(method + " " + path.split("?")[0] + " -> HTTP " + r.status);
      const emb = embeddedError(j);
      if (emb) throw new Error(emb);
      return j || {};
    };

    log("Reading Poshmark's categories");
    const tree = await call("GET", `/vm-rest/meta/catalog_v2?pm_version=${V}`);
    const catalog = resolveCatalog(tree, f);
    if (catalog.error) throw new Error(catalog.error);
    log("Category: " + catalog.names.join(" > "));

    log("Creating a draft");
    const draft = await call("POST", `/vm-rest/users/${deps.uid}/posts?pm_version=${V}`, {});
    const draftId = (draft.data && draft.data.id) || draft.id;
    if (!draftId) throw new Error("Poshmark didn't return a draft id");

    const pictureIds = [];
    for (const [i, p] of job.photos.slice(0, 16).entries()) {
      log(`Uploading photo ${i + 1} of ${Math.min(job.photos.length, 16)}`);
      const blob = dataUrlBlob(p);
      const fd = new FormData();
      fd.append("file", blob, `file${i}.${(blob.type.split("/")[1] || "jpeg").replace("jpg", "jpeg")}`);
      const pic = await call("POST", `/api/posts/${draftId}/media/scratch?app_type=web`, fd, true);
      const pid = pic.id || (pic.data && pic.data.id);
      if (!pid) throw new Error("photo " + (i + 1) + " upload returned no id");
      pictureIds.push(pid);
    }

    log("Saving the listing");
    await call("POST", `/vm-rest/posts/${draftId}?pm_version=${V}`, buildPost(f, catalog, pictureIds));
    log("Publishing");
    await call("PUT", `/vm-rest/posts/${draftId}/status/published?app_version=2.55&pm_version=${V}`, {});

    // The publish response can look clean and still leave a draft.
    let last = null;
    for (let i = 0; i < 4; i++) {
      await (deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms))))(i ? 2000 : 800);
      const g = await call("GET", `/vm-rest/posts/${draftId}?app_version=5.04&pm_version=${V}`);
      last = g.data || g;
      if (last.status === "published") return { id: draftId, url: `${base}/listing/${draftId}`, category: catalog.names };
    }
    const why = last && last.inventory && !(last.inventory.size_quantities || []).length ? " (no size saved)"
      : last && (last.scratch_pictures || []).length ? " (photos didn't attach)" : "";
    const err = new Error("Poshmark kept it as a draft" + why + ". It's in your Poshmark drafts.");
    err.draftId = draftId;
    throw err;
  }

  // The pm_version the live page is using, if we can see it.
  function livePmVersion() {
    try {
      const hit = performance.getEntriesByType("resource").map((e) => e.name).find((u) => /pm_version=\d{4}\.\d+\.\d+/.test(u));
      if (hit) return hit.match(/pm_version=(\d{4}\.\d+\.\d+)/)[1];
    } catch (e) { console.warn("[crosslister] pm_version", e); }
    return DEFAULT_PM_VERSION;
  }

  globalThis.FashPosh = { post, preflight, resolveCatalog, buildPost, conditionCode, sizeId, wholeDollars, embeddedError, livePmVersion };
})();
