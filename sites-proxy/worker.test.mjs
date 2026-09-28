// Run:  node sites-proxy/worker.test.mjs
// Proves every path of the published-site proxy without touching production:
// edge cache, origin fetch, stale-serving during a database outage, and the
// difference between "no site" (wrong address) and 503 (service down).
// It stubs `caches.default` and `fetch`, so nothing here reaches the network.
import assert from 'node:assert';

const store = new Map();
globalThis.caches = {
  default: {
    async match(key) {
      const e = store.get(key.url);
      if (!e) return undefined;
      const headers = new Headers(e.headers);
      // emulate Cache API TTL on cache-control max-age
      const maxAge = Number((headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] ?? 0);
      if (maxAge && Date.now() - Number(headers.get('x-sites-cached-at') || 0) > maxAge * 1000) return undefined;
      return new Response(e.body, { status: 200, headers });
    },
    async put(key, res) {
      const buf = await res.arrayBuffer();
      store.set(key.url, {
        body: buf,
        headers: [...res.headers.entries()].reduce((a, [k, v]) => (a[k] = v, a), {}),
      });
    },
  },
};

let mode = 'ok';
let originHits = 0;
globalThis.fetch = async (u) => {
  originHits++;
  if (mode === 'ok') {
    return new Response('<html><body>REAL SITE</body></html>', {
      status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
    });
  }
  if (mode === 'notfound') return new Response('{"error":"Not found"}', { status: 404 });
  if (mode === 'd1outage') return new Response('{"error":"D1_ERROR: exceeded free tier"}', { status: 500 });
  if (mode === 'network') throw new Error('network down');
  throw new Error('bad mode');
};

const mod = await import('/home/billionaremaker/Documents/Default Project/nexus-ai-suite/sites-proxy/_worker.js');
const worker = mod.default;
const ctx = { waitUntil: (p) => p };
const hit = async (path = '/179/index.html') => worker.fetch(new Request('https://createstuff-sites.pages.dev' + path), {}, ctx);

// 1. cold start, origin healthy -> served from origin, 200
mode = 'ok';
let r = await hit();
assert.equal(r.status, 200, 'origin 200');
assert.equal(r.headers.get('x-served-by'), 'origin');
assert.equal(await r.text(), '<html><body>REAL SITE</body></html>');
assert.equal(originHits, 1, 'one origin read');
console.log('PASS 1  cold start -> origin, 200, one read');

// 2. immediate second request -> edge copy, NO origin read
r = await hit();
assert.equal(r.headers.get('x-served-by'), 'edge', 'served from edge');
assert.equal(await r.text(), '<html><body>REAL SITE</body></html>');
assert.equal(originHits, 1, 'still one origin read');
console.log('PASS 2  repeat -> edge cache, zero extra reads (x-served-by: edge)');

// 3. database runs out of budget -> last copy still served (was: 502 "no site")
mode = 'd1outage';
store.get('https://createstuff-api.fashionistas1979.workers.dev/published/179/index.html').headers['x-sites-cached-at'] = String(Date.now() - 5 * 60 * 1000); // stale (>FRESH)
r = await hit();
assert.equal(r.status, 200, 'stale copy served, not an error');
assert.equal(r.headers.get('x-served-by'), 'stale');
assert.equal(await r.text(), '<html><body>REAL SITE</body></html>');
console.log('PASS 3  D1 budget blown -> stale copy served, 200 (x-served-by: stale)');

// 4. origin network failure with no copy ever cached -> honest 503, not "no site"
mode = 'network';
r = await hit('/9999/index.html');
assert.equal(r.status, 503, 'honest 503');
const body = await r.text();
assert.ok(body.includes('Give it a minute'), 'outage wording');
assert.ok(!body.includes('This address has no site'), 'must NOT claim the site does not exist');
console.log('PASS 4  outage with no copy -> 503 "Give it a minute" (not "no site")');

// 5. genuinely unpublished -> "no site", still 404 (not 503)
mode = 'notfound';
r = await hit('/42/index.html');
assert.equal(r.status, 404, '404 for unknown address');
const b2 = await r.text();
assert.ok(b2.includes('This address has no site'), 'unknown address keeps the "no site" wording');
assert.ok(!b2.includes('Give it a minute'), 'an unpublished site is not reported as an outage');
console.log('PASS 5  unpublished address -> 404 "This address has no site" (unchanged)');

// 6. query string cannot bypass the cache (budget-burn vector)
mode = 'ok';
store.get('https://createstuff-api.fashionistas1979.workers.dev/published/179/index.html').headers['x-sites-cached-at'] = String(Date.now()); // back inside the fresh window (test 3 aged it on purpose)
const before = originHits;
r = await hit('/179/index.html?bust=' + Date.now());
assert.equal(r.headers.get('x-served-by'), 'edge', 'query string ignored');
assert.equal(originHits, before, 'no origin read');
console.log('PASS 6  ?query cannot bypass the cache');

console.log('\nall 6 assertions passed; origin reads total =', originHits);

// 7. publisher clicks "Put online" -> new bytes replace the edge copy within 60s
mode = 'ok';
globalThis.fetch = async (u) => {
  originHits++;
  return new Response('<html><body>UPDATED SITE</body></html>', {
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};
store.get('https://createstuff-api.fashionistas1979.workers.dev/published/179/index.html').headers['x-sites-cached-at'] = String(Date.now() - 61 * 1000);
r = await hit();
assert.equal(r.headers.get('x-served-by'), 'origin', 'revalidated after 60s');
assert.equal(await r.text(), '<html><body>UPDATED SITE</body></html>', 'new bytes served');
r = await hit();
assert.equal(await r.text(), '<html><body>UPDATED SITE</body></html>', 'and cached');
console.log('PASS 7  republish -> fresh copy replaces the edge copy within 60s');
console.log('\nall 7 assertions passed; origin reads total =', originHits);
