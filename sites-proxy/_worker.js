// createstuff-sites — the branded address for published CreateStuff apps.
//
// Why this exists: the publishing worker hands back
//   https://createstuff-api.fashionistas1979.workers.dev/published/<id>/index.html
// which works but is a 76-character workers.dev path with an account name in it.
// Users share that address, so it has to read like a product, not infrastructure.
// This Pages project owns sites.createstuff.ai (zone = same Cloudflare account)
// and proxies the bytes straight from the publishing worker — one extra hop on
// Cloudflare's own network, no second copy of anybody's site.
//
// Routing:
//   /179/index.html   ->  /published/179/index.html   (the short branded form)
//   /published/...    ->  same path on the worker     (old links keep working)
//   <name>.createstuff.ai/... -> that project's file  (its own address)
//   anything else     ->  404 (this is not an open proxy)
//
// Why the cache below exists: the bytes come out of a database that is shared
// with two other products under one free daily row-read budget. When that budget
// runs out (it did on 2026-09-27, at 103% of 5,000,000), the origin answers 500
// and a published site that was perfectly fine a minute ago starts telling
// visitors "This address has no site" — which was both false and the worst
// possible wording for a link somebody pasted to other people. So:
//   * every published file is kept at the edge for 7 days,
//   * the newest 60 seconds are served without touching the database at all,
//   * if the database is out of budget or unreachable, the last copy we have is
//     served instead of an error (the site keeps working through the outage),
//   * and only a genuinely unknown address says "no site"; an outage says 503
//     and means it.
// The query string is deliberately not part of the cache key: a published file
// is static, and letting anyone append ?x=1 would be a free way to bypass the
// cache and burn the shared budget again.

const ORIGIN = "https://createstuff-api.fashionistas1979.workers.dev";
// Suffix of a project's own address. A project claims
// <something>.createstuff.ai through `Connect it`; this file is what serves it.
const CUSTOM_SUFFIX = ".createstuff.ai";
const FRESH = 60; // seconds served from the edge without asking the origin
const KEEP = 7 * 24 * 3600; // seconds we hold a copy to ride out an outage
const STAMP = "x-sites-cached-at"; // when this copy was last confirmed current

const LANDING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Published sites - CreateStuff</title>
<meta name="description" content="Sites published from CreateStuff live on this address.">
<meta name="robots" content="noindex">
<style>
:root{color-scheme:light dark}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f1115;color:#e8eaed;display:grid;place-items:center;min-height:100vh}
main{max-width:34rem;padding:2rem 1.25rem}
h1{font-size:1.4rem;margin:0 0 .5rem;letter-spacing:-.01em}
p{margin:.6rem 0;color:#b9bec7}
code{background:#1a1d23;border:1px solid #2a2f38;border-radius:6px;padding:.15rem .45rem;word-break:break-all}
a{color:#7fb3ff}.mut{color:#8b919b;font-size:.92em}
</style></head>
<body><main>
<h1>Published CreateStuff sites</h1>
<p>Every site you publish gets its own number on this address:</p>
<p><code>https://sites.createstuff.ai/<b>179</b>/index.html</code></p>
<p class="mut">Open <b>Put online</b> in CreateStuff to see the full address for your site.</p>
<p><a href="https://createstuff.ai">createstuff.ai</a></p>
</main></body></html>`;

const MISSING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site not found</title>
<meta name="robots" content="noindex">
<style>
:root{color-scheme:light dark}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f1115;color:#e8eaed;display:grid;place-items:center;min-height:100vh}
main{max-width:32rem;padding:2rem 1.25rem;text-align:center}
h1{font-size:1.3rem;margin:0 0 .5rem}
p{color:#b9bec7}.mut{color:#8b919b;font-size:.92em}
a{color:#7fb3ff}
</style></head>
<body><main>
<h1>This address has no site</h1>
<p>It may have been unpublished, or the address was mistyped.</p>
<p class="mut">Check <b>Put online</b> in CreateStuff for the current address.</p>
<p><a href="https://createstuff.ai">createstuff.ai</a></p>
</main></body></html>`;

// Shown only when the site IS published but the database behind it cannot be
// reached. Distinct from MISSING on purpose: one means "wrong address", the
// other means "try again shortly", and a visitor has to be able to tell them
// apart.
const UNAVAILABLE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site temporarily unavailable</title>
<meta name="robots" content="noindex">
<style>
:root{color-scheme:light dark}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f1115;color:#e8eaed;display:grid;place-items:center;min-height:100vh}
main{max-width:32rem;padding:2rem 1.25rem;text-align:center}
h1{font-size:1.3rem;margin:0 0 .5rem}
p{color:#b9bec7}.mut{color:#8b919b;font-size:.92em}
a{color:#7fb3ff}
</style></head>
<body><main>
<h1>Give it a minute</h1>
<p>The address is right and the site is published — our publishing service is briefly overloaded.</p>
<p class="mut">This is temporary. Refresh in a moment and it will load.</p>
<p><a href="https://createstuff.ai">createstuff.ai</a></p>
</main></body></html>`;

function html(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

// Tag a response with how it was produced, so a curl can prove which path ran.
function tagged(res, how) {
  const headers = new Headers(res.headers);
  headers.set("x-served-by", how);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// Serve one file the origin hands back: edge copy first, origin second,
// last-known copy when the origin is down. `originUrl` is the exact URL to ask,
// so the same cache-and-ride-out logic covers both ways a site can be reached.
// Returns {response} shaped answers only.
async function published(originUrl, ctx) {
  const cache = caches.default;
  // Query string excluded from the PATH below — see the note at the top of the
  // file. For a hostname-served site the query IS part of the key, because the
  // hostname lives in it: two projects must never share an edge copy.
  const key = new Request(originUrl, { method: "GET" });

  let cached = null;
  try { cached = await cache.match(key); } catch { cached = null; }

  const stampedAt = Number((cached && cached.headers.get(STAMP)) || 0);
  const ageSeconds = stampedAt ? (Date.now() - stampedAt) / 1000 : Infinity;
  if (cached && ageSeconds < FRESH) return tagged(cached, "edge");

  let res = null;
  try {
    res = await fetch(originUrl, {
      headers: { "accept-encoding": "identity", "user-agent": "createstuff-sites" },
    });
  } catch {
    res = null; // origin unreachable (network / outage)
  }

  if (res && (res.status === 404 || res.status === 410)) return html(MISSING, 404);

  if (res && res.ok) {
    const buf = await res.arrayBuffer();
    const headers = {
      "content-type": res.headers.get("content-type") || "text/html; charset=utf-8",
      "cache-control": `public, max-age=${KEEP}`,
      [STAMP]: String(Date.now()),
    };
    try {
      const stored = new Response(buf.slice(0), { status: 200, headers });
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(key, stored).catch(() => {}));
      }
    } catch { /* caching is best-effort; never fail the visitor for it */ }
    return tagged(new Response(buf, { status: 200, headers }), "origin");
  }

  // 5xx or the origin could not be reached at all.
  if (cached) return tagged(cached, "stale"); // riding out a database outage
  return html(UNAVAILABLE, 503);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    const host = (url.hostname || "").toLowerCase();

    // ── a project's OWN address: <name>.createstuff.ai ────────────────────
    // This project is attached to a handful of hostnames rather than a
    // wildcard, so the only names that reach this branch are ones somebody
    // deliberately claimed for one project (see `Connect it`). There is no
    // wildcard route anywhere, which is why claiming a name can never shadow
    // app., sites., www. or the apex — those hostnames are simply never
    // attached to this project.
    //
    // The hostname carries no project id, so it is resolved by the API that
    // owns the mapping and the bytes come back from there. One hop on
    // Cloudflare's own network, and the same edge cache as below.
    if (host.endsWith(CUSTOM_SUFFIX) && host !== "sites" + CUSTOM_SUFFIX && host !== CUSTOM_SUFFIX) {
      let p = path || "/";
      if (p.endsWith("/")) p += "index.html";
      else if (!/(^|\/)[^/]+\.[^/]+$/.test(p)) p += "/index.html";
      const originUrl =
        ORIGIN + "/api/hosts/serve?host=" + encodeURIComponent(host) +
        "&path=" + encodeURIComponent(p);
      return await published(originUrl, ctx);
    }

    // short branded form: /<projectId>/<file>
    const short = path.match(/^\/(\d+)(\/.*)?$/);
    if (short) path = "/published/" + short[1] + (short[2] || "/index.html");

    if (path === "/published" || path.startsWith("/published/")) {
      return await published(ORIGIN + path, ctx);
    }

    // Everything else must be one of THIS project's own files. Pages' asset
    // fallback answers unknown paths (like /api/health) with index.html and a
    // 200, which reads as "the route exists" — it does not, so the allowlist
    // is explicit rather than "whatever the asset layer happens to return".
    // /favicon.ico is in the list because every browser requests it on its own
    // for any page that does not declare an icon — including the published
    // user pages we do not control — and a 404 there is a console error on
    // somebody else's site.
    const OWN_FILES = ["/", "/index.html", "/favicon.ico"];
    if (OWN_FILES.includes(path)) {
      if (env && env.ASSETS) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) return asset;
      }
      // only reachable if the ASSETS binding is missing: keep the page alive
      if (path === "/" || path === "/index.html") return html(LANDING, 200);
    }
    return html(MISSING, 404);
  },
};
