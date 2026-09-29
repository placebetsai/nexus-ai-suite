// Real, citable sources for the site chatbots. No API keys.
//   Google News RSS + Bing News RSS  -> current events (headline, publisher, date, snippet, link)
//   Wikipedia                         -> background facts
//   DuckDuckGo lite                   -> general web fallback
// Every source fails soft: a blocked or slow feed returns [] and the others carry on.
// Canonical copy lives in nexus-ai-suite/shared/real-sources.js; each site keeps a copy in lib/.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

const decode = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, " ").trim();

const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

async function get(url, timeout, accept) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept || "*/*", "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(url.split("?")[0] + " " + r.status);
  return r.text();
}

// Bing wraps article links in apiclick.aspx?...&url=<real>.
function unwrapBing(link) {
  try { const u = new URL(link); const real = u.searchParams.get("url"); return real && /^https?:/.test(real) ? real : link; } catch { return link; }
}

async function googleNews(q, timeout) {
  const xml = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`, timeout, "application/rss+xml");
  return xml.split(/<item>/i).slice(1, 9).map((it) => {
    const srcTag = it.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
    const source = srcTag ? decode(srcTag[2]) : "";
    let title = decode(tag(it, "title"));
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    return { title, url: decode(tag(it, "link")), source: source || "Google News", date: tag(it, "pubDate") ? new Date(decode(tag(it, "pubDate"))).toISOString() : "", snippet: "", from: "google-news" };
  }).filter((x) => x.title && x.url);
}

async function bingNews(q, timeout) {
  const xml = await get(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=en-US`, timeout, "application/rss+xml");
  return xml.split(/<item>/i).slice(1, 9).map((it) => {
    const url = unwrapBing(decode(tag(it, "link")));
    const d = decode(tag(it, "pubDate"));
    return { title: decode(tag(it, "title")), url, source: decode(tag(it, "News:Source")) || hostOf(url), date: d ? new Date(d).toISOString() : "", snippet: decode(tag(it, "description")).slice(0, 300), from: "bing-news" };
  }).filter((x) => x.title && x.url);
}

async function wikipedia(q, timeout) {
  const s = JSON.parse(await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=2&origin=*`, timeout, "application/json"));
  const out = [];
  for (const hit of (s.query && s.query.search) || []) {
    try {
      const p = JSON.parse(await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`, timeout, "application/json"));
      if (p.extract && p.type !== "disambiguation") out.push({ title: p.title, url: (p.content_urls && p.content_urls.desktop && p.content_urls.desktop.page) || `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`, source: "Wikipedia", date: p.timestamp || "", snippet: p.extract.slice(0, 500), from: "wikipedia" });
    } catch { /* one missing summary shouldn't drop the other */ }
  }
  return out;
}

async function ddgLite(q, timeout) {
  const html = await get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`, timeout, "text/html");
  const links = [...html.matchAll(/<a[^>]+class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi)];
  const snips = [...html.matchAll(/<td[^>]+class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1]));
  return links.slice(0, 6).map((m, i) => {
    let url = decode(m[1]);
    try { const u = new URL(url, "https://duckduckgo.com"); url = u.searchParams.get("uddg") || u.href; } catch { /* keep as-is */ }
    return { title: decode(m[2]), url, source: hostOf(url), date: "", snippet: (snips[i] || "").slice(0, 300), from: "duckduckgo" };
  }).filter((x) => x.title && /^https?:/.test(x.url) && !/duckduckgo\.com\/y\.js/.test(x.url));
}

/**
 * @param {string} query
 * @param {{ news?: boolean, wiki?: boolean, web?: boolean, max?: number, timeout?: number }} [opts]
 * @returns {Promise<Array<{title:string,url:string,source:string,date:string,snippet:string,from:string}>>}
 */
export async function findSources(query, opts = {}) {
  const q = String(query || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!q) return [];
  const { news = true, wiki = true, web = true, max = 6, timeout = 6000 } = opts;
  const jobs = [];
  if (news) jobs.push(bingNews(q, timeout), googleNews(q, timeout));
  if (wiki) jobs.push(wikipedia(q, timeout));
  const settled = await Promise.allSettled(jobs);
  let all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  if (web && all.length < 3) { try { all = all.concat(await ddgLite(q, timeout)); } catch { /* fallback only */ } }
  // Newest news first, then reference material; one item per URL and per headline.
  const seen = new Set();
  const out = [];
  const byDate = (a, b) => (b.date || "").localeCompare(a.date || "");
  const news_ = all.filter((x) => x.from.endsWith("news")).sort(byDate);
  const rest = all.filter((x) => !x.from.endsWith("news"));
  // Bing first within ties: it carries a snippet and the publisher's own URL.
  for (const x of [...news_.filter((x) => x.from === "bing-news"), ...news_.filter((x) => x.from !== "bing-news")].sort(byDate).concat(rest)) {
    const k1 = x.url.split("?")[0], k2 = x.title.toLowerCase().slice(0, 60);
    if (seen.has(k1) || seen.has(k2)) continue;
    seen.add(k1); seen.add(k2); out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

/** Numbered block for the model prompt. */
export function formatSources(sources) {
  if (!sources || !sources.length) return "";
  return sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.source}${s.date ? ", " + s.date.slice(0, 10) : ""}\n    ${s.snippet ? s.snippet + "\n    " : ""}${s.url}`).join("\n");
}

/** Rules the model gets alongside the sources. */
export const CITE_RULES = "Use the numbered sources for anything current or factual and cite them inline like [1] or [2]. Never invent a source, number, date or quote. If the sources don't answer it, say so plainly and answer only what you can stand behind. Keep it conversational and short.";

/** Compact list for the chat UI. */
export const sourceList = (sources) => (sources || []).map((s) => ({ title: s.title, url: s.url, source: s.source, date: s.date ? s.date.slice(0, 10) : "" }));
