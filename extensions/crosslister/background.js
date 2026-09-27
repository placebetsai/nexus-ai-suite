// Holds one pending listing per shop and opens each shop's sell page.
// Nothing leaves the browser except the photo download from the Fashionistas API.

const SHOP_URLS = {
  depop: "https://www.depop.com/products/create/",
  ebay: "https://www.ebay.com/sl/sell",
  poshmark: "https://poshmark.com/create-listing",
  mercari: "https://www.mercari.com/sell/",
  vinted: "https://www.vinted.com/items/new",
  grailed: "https://www.grailed.com/sell/new",
};
const SHOP_HOSTS = {
  depop: "depop.com", ebay: "ebay.com", poshmark: "poshmark.com",
  mercari: "mercari.com", vinted: "vinted.com", grailed: "grailed.com",
};
const API_ORIGIN = "https://fashionistas-api.fashionistas1979.workers.dev";
const MAX_PHOTOS = 4;
const JOB_TTL_MS = 6 * 3600 * 1000;

async function toDataUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("photo " + r.status);
  const blob = await r.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { type: blob.type || "image/jpeg", data: "data:" + (blob.type || "image/jpeg") + ";base64," + btoa(bin) };
}

async function queue(job) {
  if (!job || !Array.isArray(job.shops) || !job.shops.length) return { ok: false, error: "no shops picked" };
  const shops = job.shops.filter((s) => s && SHOP_URLS[s.id]);
  if (!shops.length) return { ok: false, error: "none of those shops are supported yet" };

  // Photos are only fetched from the Fashionistas API, never from arbitrary URLs.
  const photos = [];
  for (const u of (job.photos || []).slice(0, MAX_PHOTOS)) {
    try {
      if (typeof u === "string" && u.startsWith(API_ORIGIN + "/")) photos.push(await toDataUrl(u));
    } catch (e) {
      console.warn("[crosslister] photo", u, e);
    }
  }

  const now = Date.now();
  const store = {};
  for (const s of shops) {
    store["job:" + s.id] = {
      shop: s.id, listingId: job.listingId || null, createdAt: now,
      fields: {
        title: s.title || "", description: s.description || "", price: s.price ?? "",
        brand: s.brand || "", size: s.size || "", color: s.color || "", condition: s.condition || "",
      },
      photos, filled: false,
    };
  }
  await chrome.storage.local.set(store);
  for (const s of shops) await chrome.tabs.create({ url: SHOP_URLS[s.id], active: s === shops[0] });
  return { ok: true, opened: shops.map((s) => s.id) };
}

function shopForHost(host) {
  return Object.keys(SHOP_HOSTS).find((k) => host === SHOP_HOSTS[k] || host.endsWith("." + SHOP_HOSTS[k])) || null;
}

async function jobFor(host) {
  const shop = shopForHost(host);
  if (!shop) return null;
  const key = "job:" + shop;
  const got = await chrome.storage.local.get(key);
  const job = got[key];
  if (!job) return null;
  if (Date.now() - job.createdAt > JOB_TTL_MS) { await chrome.storage.local.remove(key); return null; }
  return job;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "queue") return reply(await queue(msg.job));
    if (msg.type === "job") return reply({ job: await jobFor(msg.host) });
    if (msg.type === "done") {
      const shop = shopForHost(msg.host);
      if (shop) await chrome.storage.local.remove("job:" + shop);
      return reply({ ok: true });
    }
    if (msg.type === "list") {
      const all = await chrome.storage.local.get(null);
      return reply({ jobs: Object.values(all).filter((j) => j && j.shop) });
    }
    if (msg.type === "clear") { await chrome.storage.local.clear(); return reply({ ok: true }); }
    reply({ ok: false, error: "unknown message" });
  })().catch((e) => { console.warn("[crosslister]", e); reply({ ok: false, error: String(e && e.message || e) }); });
  return true; // async reply
});
