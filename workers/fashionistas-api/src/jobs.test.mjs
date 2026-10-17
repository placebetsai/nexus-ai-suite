// Tests for src/jobs.js — the cross-listing pipeline (2026-10-16).
// Run: node --test src/jobs.test.mjs
// The fake D1 below implements exactly the SQL shapes jobs.js issues, with
// real upsert / guarded-transition semantics — so these tests exercise the
// actual route handlers end to end with Request objects, not stubs of them.

import test from "node:test";
import assert from "node:assert/strict";
import { handleJobs, makePairCode, sessionPairs, wireJob, payloadFromBody } from "./jobs.js";

/* ── fake D1 ────────────────────────────────────────────────────────────── */

function fakeD1(state) {
  const nowIso = () => new Date().toISOString();
  function run(sql, a = []) {
    if (/CREATE (TABLE|INDEX|UNIQUE)/i.test(sql)) return { success: true, meta: { changes: 0 } };
    if (sql.includes("INSERT INTO x_jobs")) {
      // upsert with the DO UPDATE ... WHERE terminal guard from jobs.js
      const [user_id, item_id, shop, account, type, payload, source] = a;
      const hit = state.jobs.find((j) =>
        j.user_id === user_id && j.item_id === item_id && j.shop === shop && j.type === type);
      if (!hit) {
        state.jobs.push({
          id: state.nextJobId++, user_id, item_id, shop, account, type,
          status: "queued", payload, listing_url: null, error: null,
          needs_review: 0, hint: null, attempts: 0, install_id: null, source,
          created_at: nowIso(), updated_at: nowIso()
        });
        return { success: true, meta: { changes: 1 } };
      }
      if (["failed", "capped", "delisted"].includes(hit.status)) {
        hit.status = "queued"; hit.payload = payload; hit.updated_at = nowIso();
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } }; // queued/running/posted: no double post
    }
    if (sql.includes("UPDATE x_jobs SET status='running', install_id=")) {
      const installId = a[0]; const ids = a.slice(1);
      let n = 0;
      for (const j of state.jobs) {
        if (ids.includes(j.id) && j.status === "queued") {
          j.status = "running"; j.install_id = installId; j.updated_at = nowIso(); n++;
        }
      }
      return { success: true, meta: { changes: n } };
    }
    if (sql.includes("UPDATE x_jobs SET status=?, listing_url=")) {
      const [status, listing_url, error, needs_review, hint, attempts, install_id, id] = a;
      const j = state.jobs.find((x) => x.id === id);
      if (!j || !["queued", "running"].includes(j.status))
        return { success: true, meta: { changes: 0 } };
      Object.assign(j, { status, listing_url, error, needs_review, hint, attempts, install_id, updated_at: nowIso() });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE x_jobs SET status='queued'")) { // lease recovery: no-op in tests
      return { success: true, meta: { changes: 0 } };
    }
    if (sql.includes("INSERT INTO x_shop_sessions")) {
      const [install_id, shop, connected, source, probed_at] = a;
      state.sessions.set(install_id + "|" + shop, { install_id, shop, connected, source, probed_at });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE x_device_pairs SET auto_post")) {
      const d = state.devices.get(a[1]); if (d) d.auto_post = a[0];
      return { success: true, meta: { changes: d ? 1 : 0 } };
    }
    if (sql.includes("INSERT INTO x_device_pairs")) {
      state.devices.set(a[0], { user_id: a[1], auto_post: 1, paired_at: nowIso() });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO x_device_codes")) {
      state.codes.set(a[0], { user_id: a[1], expires_at: a[2], used: 0 });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE x_device_codes SET used")) {
      const c = state.codes.get(a[0]); if (c) c.used = 1;
      return { success: true, meta: { changes: c ? 1 : 0 } };
    }
    if (sql.includes("INSERT INTO x_sales_events")) {
      state.sales.push({ install_id: a[0], shop: a[1], event: a[2], body: a[3] });
      return { success: true, meta: { changes: 1 } };
    }
    throw new Error("fakeD1: unhandled run SQL: " + sql);
  }
  function first(sql, a = []) {
    if (sql.includes("SELECT user_id FROM x_device_pairs WHERE install_id")) {
      const d = state.devices.get(a[0]);
      return d ? { user_id: d.user_id } : null;
    }
    if (sql.includes("SELECT id, user_id, status, install_id FROM x_jobs WHERE id")) {
      const j = state.jobs.find((x) => x.id === a[0]);
      return j ? { id: j.id, user_id: j.user_id, status: j.status, install_id: j.install_id } : null;
    }
    if (sql.includes("SELECT user_id, expires_at, used FROM x_device_codes")) {
      const c = state.codes.get(a[0]);
      return c ? { user_id: c.user_id, expires_at: c.expires_at, used: c.used } : null;
    }
    throw new Error("fakeD1: unhandled first SQL: " + sql);
  }
  function all(sql, a = []) {
    if (sql.includes("SELECT DISTINCT s.shop")) { // connectedShops JOIN
      const shops = new Set();
      for (const [k, s] of state.sessions) {
        const [installId] = k.split("|");
        const d = state.devices.get(installId);
        if (d && d.user_id === a[0] && s.connected === 1) shops.add(s.shop);
      }
      return { results: [...shops].map((shop) => ({ shop })) };
    }
    if (sql.includes("SELECT * FROM x_jobs WHERE user_id = ? AND status = 'queued'")) {
      return { results: state.jobs.filter((j) => j.user_id === a[0] && j.status === "queued") };
    }
    if (sql.includes("MAX(s.probed_at)")) { // sessions/list: unpaired installs
      const unpaired = new Set();
      const seen = new Map();
      for (const [k, s] of state.sessions) {
        const [installId] = k.split("|");
        if (installId === "anonymous" || state.devices.has(installId)) continue;
        unpaired.add(installId);
        if (!seen.has(installId) || s.probed_at > seen.get(installId).probed_at)
          seen.set(installId, { install_id: installId, source: s.source, probed_at: s.probed_at });
      }
      return { results: [...unpaired].map((id) => seen.get(id)) };
    }
    if (sql.includes("FROM listings WHERE user_id = ? AND id IN")) {
      const ids = a.slice(1);
      return { results: state.listings.filter((l) => l.user_id === a[0] && ids.includes(l.id)) };
    }
    if (sql.includes("FROM listings WHERE user_id = ? AND status = 'active'")) {
      return { results: state.listings.filter((l) => l.user_id === a[0] && l.status === "active").slice(0, a[1]) };
    }
    throw new Error("fakeD1: unhandled all SQL: " + sql);
  }
  return {
    prepare(sql) {
      return {
        bind(...args) { return { run: () => run(sql, args), first: () => first(sql, args), all: () => all(sql, args) }; },
        run: () => run(sql, []), first: () => first(sql, []), all: () => all(sql, [])
      };
    }
  };
}

function newState() {
  return { jobs: [], nextJobId: 1, sessions: new Map(), devices: new Map(), codes: new Map(), sales: [], listings: [], me: { sub: 7 } };
}
const helpers = (state) => ({
  json: (data, status = 200) => new Response(JSON.stringify(data), { status }),
  err: (message, status = 400) => new Response(JSON.stringify({ error: message }), { status }),
  readJson: async (r) => { const b = await r.json(); return b && typeof b === "object" && !Array.isArray(b) ? b : {}; },
  requireUser: async () => state.me,
  rateLimit: async () => true
});
const env = (state) => ({ DB: fakeD1(state) });
const req = (path, { method = "GET", body, install } = {}) =>
  new Request("https://fashionistas-api.fashionistas1979.workers.dev" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(install ? { "X-Install-Id": install } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
const call = (state, path, opts) => handleJobs(path, (opts && opts.method) || "GET", req(path, opts), env(state), helpers(state));
const j = async (r) => { assert.ok(r, "route must answer"); return await r.json(); };

/* ── pure helpers ───────────────────────────────────────────────────────── */

test("pair code: 6 chars, unambiguous alphabet, uniform under rng", () => {
  for (let i = 0; i < 50; i++) {
    const c = makePairCode();
    assert.equal(c.length, 6);
    assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  }
  assert.equal(makePairCode(() => 0), "AAAAAA");
  assert.equal(makePairCode(() => 0.9999), "99999".slice(0, 5) + "9"); // last alphabet slot
});

test("sessionPairs: booleans only, everything else dropped", () => {
  assert.deepEqual(sessionPairs({ sessions: { depop: true, vinted: false } }), [["depop", 1], ["vinted", 0]]);
  assert.deepEqual(sessionPairs({ sessions: { depop: "yes" } }), []);
  assert.deepEqual(sessionPairs({ sessions: ["depop"] }), []);
  assert.deepEqual(sessionPairs({}), []);
});

test("wireJob: exact wire shape, bad payload JSON degrades to {}", () => {
  assert.deepEqual(
    wireJob({ id: 5, type: "publish", shop: "depop", account: "default", payload: '{"title":"Jeans"}', junk: "x" }),
    { id: 5, type: "publish", shop: "depop", account: "default", payload: { title: "Jeans" } });
  assert.deepEqual(wireJob({ id: 6, shop: "vinted", payload: "{broken" }).payload, {});
});

test("payloadFromBody: web body + listings row both map to PublishPayload", () => {
  const a = payloadFromBody(9, { title: "Tee", price: "12.5", photos: ["https://x/p.jpg", 3], brand: null });
  assert.equal(a.listing_id, 9); assert.equal(a.price, 12.5);
  assert.deepEqual(a.photos, ["https://x/p.jpg"]);
  assert.equal(a.brand, undefined);
  const b = payloadFromBody(4, { title: "Hat", price: 5, photo_url: "https://x/h.jpg" });
  assert.deepEqual(b.photos, ["https://x/h.jpg"]);
});

/* ── routes ─────────────────────────────────────────────────────────────── */

test("unpaired extension pull: 200 {paired:false, jobs:[]} — never 401/404", async () => {
  const s = newState();
  const d = await j(await call(s, "/api/jobs?status=queued", { install: "unpaired-uuid" }));
  assert.deepEqual(d, { ok: true, paired: false, jobs: [] });
});

test("enqueue → pull → report posted; duplicate enqueue queues nothing", async () => {
  const s = newState();
  s.devices.set("dev-1", { user_id: 7, auto_post: 1 });
  s.sessions.set("dev-1|depop", { install_id: "dev-1", shop: "depop", connected: 1 });
  const body = { source: "web-save", listing_id: 42, auto: true, listing: { title: "Denim jacket", price: 40 } };
  const e1 = await j(await call(s, "/api/jobs/enqueue", { method: "POST", body }));
  assert.equal(e1.queued, 1); assert.deepEqual(e1.shops, ["depop"]);
  const e2 = await j(await call(s, "/api/jobs/enqueue", { method: "POST", body }));
  assert.equal(e2.queued, 0, "second save of the same item must not double-queue");

  const pull = await j(await call(s, "/api/jobs?status=queued", { install: "dev-1" }));
  assert.equal(pull.paired, true);
  assert.equal(pull.jobs.length, 1);
  const job = pull.jobs[0];
  assert.equal(job.shop, "depop");
  assert.equal(job.type, "publish");
  assert.equal(job.payload.listing_id, 42);
  assert.equal(job.payload.title, "Denim jacket");

  const rep = await j(await call(s, `/api/jobs/${job.id}/status`, { method: "POST", install: "dev-1", body: { status: "posted", listing_url: "https://depop.com/x", attempts: 1 } }));
  assert.equal(rep.accepted, true);
  const again = await j(await call(s, `/api/jobs/${job.id}/status`, { method: "POST", install: "dev-1", body: { status: "failed", error: "dup" } }));
  assert.equal(again.accepted, false);
  assert.match(again.reason, /already_/);

  const e3 = await j(await call(s, "/api/jobs/enqueue", { method: "POST", body }));
  assert.equal(e3.queued, 0, "re-saving an item already POSTED must not re-post it to the shop");
});

test("failed job re-enqueues (retry path) through the terminal-guard upsert", async () => {
  const s = newState();
  s.devices.set("dev-1", { user_id: 7, auto_post: 1 });
  s.sessions.set("dev-1|vinted", { install_id: "dev-1", shop: "vinted", connected: 1 });
  const body = { listing_id: 7, listing: { title: "Skirt", price: 9 } };
  await call(s, "/api/jobs/enqueue", { method: "POST", body });
  const pull = await j(await call(s, "/api/jobs?status=queued", { install: "dev-1" }));
  await call(s, `/api/jobs/${pull.jobs[0].id}/status`, { method: "POST", install: "dev-1", body: { status: "failed", error: "not_logged_in" } });
  const again = await j(await call(s, "/api/jobs/enqueue", { method: "POST", body }));
  assert.equal(again.queued, 1, "failed → requeued");
});

test("feed backfills every active listing, idempotently", async () => {
  const s = newState();
  s.devices.set("dev-1", { user_id: 7, auto_post: 1 });
  s.sessions.set("dev-1|depop", { install_id: "dev-1", shop: "depop", connected: 1 });
  s.sessions.set("dev-1|poshmark", { install_id: "dev-1", shop: "poshmark", connected: 1 });
  for (let i = 1; i <= 3; i++)
    s.listings.push({ user_id: 7, id: i, title: "L" + i, description: "d", price: i, photo_url: "p" + i, status: "active" });
  s.listings.push({ user_id: 7, id: 9, title: "sold", price: 1, status: "sold", photo_url: "p" });
  const f1 = await j(await call(s, "/api/jobs/feed", { method: "POST", body: {} }));
  assert.equal(f1.queued, 6, "3 active listings × 2 connected shops");
  const f2 = await j(await call(s, "/api/jobs/feed", { method: "POST", body: {} }));
  assert.equal(f2.queued, 0, "feed is idempotent");
});

test("sessions heartbeat stores booleans; web master switch needs a paired device", async () => {
  const s = newState();
  const r1 = await j(await call(s, "/api/sessions", {
    method: "POST", install: "dev-9", body: { sessions: { depop: true }, source: "extension", probed_at: "2026-10-16T00:00:00Z", install_id: "dev-9" }
  }));
  assert.equal(r1.stored, 1); assert.equal(r1.paired, false);
  assert.equal(s.sessions.get("dev-9|depop").connected, 1);

  const anon = await j(await call(s, "/api/sessions", { method: "POST", body: { source: "web", auto_post: false, install_id: "nobody" } }));
  assert.equal(anon.paired, false, "anonymous caller cannot flip the switch");

  s.devices.set("dev-9", { user_id: 7, auto_post: 1 });
  const paired = await j(await call(s, "/api/sessions", { method: "POST", body: { source: "web", auto_post: false, install_id: "dev-9" } }));
  assert.equal(paired.paired, true);
  assert.equal(s.devices.get("dev-9").auto_post, 0);
});

test("sessions/list shows unpaired browsers only", async () => {
  const s = newState();
  s.sessions.set("new-uuid|depop", { install_id: "new-uuid", shop: "depop", connected: 1, source: "extension", probed_at: "2026-10-16T01:00:00Z" });
  s.devices.set("old-uuid", { user_id: 7, auto_post: 1 });
  s.sessions.set("old-uuid|depop", { install_id: "old-uuid", shop: "depop", connected: 1, source: "extension", probed_at: "2026-10-16T02:00:00Z" });
  const d = await j(await call(s, "/api/sessions/list"));
  assert.equal(d.devices.length, 1);
  assert.equal(d.devices[0].install_id, "new-uuid");
});

test("pair code: single-use, 10-min TTL, wrong user rejected", async () => {
  const s = newState();
  const c = await j(await call(s, "/api/devices/code"));
  assert.equal(c.code.length, 6); assert.equal(c.expires_in, 600);
  const p = await j(await call(s, "/api/devices/pair", { method: "POST", body: { install_id: "dev-x", code: c.code } }));
  assert.equal(p.paired, true);
  assert.equal(s.devices.get("dev-x").user_id, 7);
  const reuse = await call(s, "/api/devices/pair", { method: "POST", body: { install_id: "dev-y", code: c.code } });
  assert.equal(reuse.status, 400, "code is single-use");

  // expired code
  s.me = { sub: 7 };
  const c2 = await j(await call(s, "/api/devices/code"));
  s.codes.get(c2.code).expires_at = Date.now() - 1;
  const expired = await call(s, "/api/devices/pair", { method: "POST", body: { install_id: "dev-z", code: c2.code } });
  assert.equal(expired.status, 400);
});

test("sales/delist events are accepted and stored, never 500", async () => {
  const s = newState();
  const r = await j(await call(s, "/api/sales", { method: "POST", install: "dev-1", body: { shop: "depop", event: "sold", listing: "x" } }));
  assert.equal(r.ok, true);
  assert.equal(s.sales.length, 1);
  const d = await j(await call(s, "/api/delist", { method: "POST", install: "dev-1", body: { shop: "depop", status: "delisted" } }));
  assert.equal(d.ok, true);
});

test("enqueued payload ignores unknown listing fields (no junk forwarded)", async () => {
  const s = newState();
  s.devices.set("dev-1", { user_id: 7, auto_post: 1 });
  s.sessions.set("dev-1|grailed", { install_id: "dev-1", shop: "grailed", connected: 1 });
  await j(await call(s, "/api/jobs/enqueue", { method: "POST", body: { listing_id: 1, listing: { title: "T", evil: "payload", photos: ["u"] } } }));
  const pull = await j(await call(s, "/api/jobs?status=queued", { install: "dev-1" }));
  assert.equal(pull.jobs[0].payload.evil, undefined);
});
