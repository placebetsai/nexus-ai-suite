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
//   anything else     ->  404 (this is not an open proxy)

const ORIGIN = "https://createstuff-api.fashionistas1979.workers.dev";

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

function html(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // short branded form: /<projectId>/<file>
    const short = path.match(/^\/(\d+)(\/.*)?$/);
    if (short) path = "/published/" + short[1] + (short[2] || "/index.html");

    if (path === "/published" || path.startsWith("/published/")) {
      const res = await fetch(ORIGIN + path + url.search, {
        headers: { "accept-encoding": "identity", "user-agent": "createstuff-sites" },
      });
      if (res.status === 404 || res.status === 410) return html(MISSING, 404);
      if (res.status >= 500) return html(MISSING, 502);
      return res;
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
