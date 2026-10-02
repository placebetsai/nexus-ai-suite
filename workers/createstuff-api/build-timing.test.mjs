// Run:  node workers/createstuff-api/build-timing.test.mjs
//
// Why this file exists. A build measured 218.6 s end to end (2026-10-02) and the
// owner reads that as "createstuff doesnt do shit". Two things were costing
// wall-clock, and curl cannot show either of them, because curl cannot see
// WHICH model call is running in which second:
//
//   1. the post-writer repair asks ran one after another — the missing-asset
//      ask, then up to two script-health asks, each a full model round trip;
//   2. a Groq model that had already refused the request was tried again on
//      every later call of the SAME build. A 429 there is not free: groqGen
//      sleeps up to 8 s and retries once before it moves on.
//
// So this drives the Worker's own request handler in-process, against an
// in-memory D1/KV and a fake Groq that answers after a scripted delay. It
// measures the SHAPE of the fix, not a production latency: the delays below are
// the rig's, so what the numbers prove is that N post-writer asks now cost
// max(d) of wall clock instead of N x d.
//
// Nothing here touches the network.

import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = (await import(path.join(here, "src/index.js"))).default;

// ── delays chosen so the arithmetic is legible, not flattering ────────────
const D_SMALL = 120;   // classifier / planner, both on the cheap model
const D_WRITER = 900;  // the one long call: index.html + styles.css + app.js
const D_ASK = 400;     // each post-writer repair ask

// ── the file sets ────────────────────────────────────────────────────────
// siteOk() demands >= 400 chars and a real <html>, so the rig's page is a real
// page: a shorter stand-in made the writer look like a failure and the rig
// measured nothing.
const GOOD_INDEX = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Timing Rig</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<main class="wrap">
  <h1>Timing Rig</h1>
  <p>A page with a button, which is all the brief asked for.</p>
  <form id="goForm"><button id="go" type="submit">Go</button></form>
  <ul id="list"></ul>
</main>
<script src="app.js"></script>
</body>
</html>`;
const STYLES = "body{margin:0;font-family:system-ui}h1{color:#111}";
// A script the gate must flag: the submit handler has no preventDefault() as its
// first line, so the browser reloads the page and cancels the request it started.
const BAD_JS = `const byId = (id) => document.getElementById(id);
const list = byId('list');
async function save(e) {
  const n = byId('go');
  n.textContent = 'Saving';
  list.textContent = 'done';
}
byId('goForm').addEventListener('submit', save);
byId('go').addEventListener('click', save);
`;
const GOOD_JS = "const byId = (id) => document.getElementById(id);\nconst list = byId('list');\nasync function save(e) { e.preventDefault(); byId('go').textContent = 'Saving'; list.textContent = 'done'; }\nbyId('goForm').addEventListener('submit', save);\nbyId('go').addEventListener('click', save);\n";
const J = (files) => JSON.stringify(files);
const WRITER_SET = [{ path: "index.html", content: GOOD_INDEX }, { path: "app.js", content: BAD_JS }];

// ── an in-memory D1 ──────────────────────────────────────────────────────
// Every statement the build path issues, handled by shape. An unmocked one is
// answered empty rather than throwing: a build that dies on a missing mock would
// prove nothing about timing.
function makeD1(seed = {}) {
  const rows = {
    projects: seed.projects || [{ id: 1, user_id: 7, name: "Timing Rig", status: "new" }],
    builds: (seed.builds || []).slice(),
    project_files: seed.project_files || [],
  };
  const stmts = [];
  const prepare = (sql) => {
    const s = String(sql).replace(/\s+/g, " ").trim();
    stmts.push(s);
    const api = {
      bind: (...b) => ({
        first: async () => {
          if (/^SELECT id FROM projects WHERE id=\? AND user_id=\?/.test(s)) {
            return rows.projects.find((r) => r.id === b[0] && r.user_id === b[1]) || null;
          }
          if (/^SELECT id, name FROM projects WHERE id=\? AND user_id=\?/.test(s)) {
            const r = rows.projects.find((x) => x.id === b[0] && x.user_id === b[1]);
            return r ? { id: r.id, name: r.name } : null;
          }
          if (/^SELECT id, project_id FROM builds WHERE id=\?/.test(s)) {
            const r = rows.builds.find((x) => x.id === b[0]);
            return r ? { id: r.id, project_id: r.project_id } : null;
          }
          if (/FROM builds b JOIN projects p/.test(s)) {
            // The log route and its write side both reach a build THROUGH its
            // project so ownership can be checked in the same statement.
            const r = rows.builds.find((x) => x.id === b[0]);
            if (!r || !rows.projects.some((p) => p.id === r.project_id && p.user_id === b[1])) return null;
            const out = { id: r.id, project_id: r.project_id, status: r.status, agent_log: r.agent_log };
            if (/started_at/.test(s)) { out.started_at = r.started_at; out.completed_at = r.completed_at; }
            return out;
          }
          if (/^SELECT project_id FROM builds WHERE id=\?/.test(s)) {
            const r = rows.builds.find((x) => x.id === b[0]);
            return r ? { project_id: r.project_id } : null;
          }
          if (/FROM project_files WHERE project_id=\?/.test(s)) {
            const out = rows.project_files.filter((f) => f.project_id === b[0]);
            return out[0] ? { path: out[0].path, file_path: out[0].file_path, content: out[0].content } : null;
          }
          if (/FROM project_files/.test(s)) {
            return { results: rows.project_files.filter((f) => f.project_id === b[0]) };
          }
          return null;
        },
        all: async () => (/FROM project_files/.test(s) ? { results: rows.project_files.filter((f) => f.project_id === b[0]) } : { results: [] }),
        run: async () => {
          if (/^INSERT INTO builds/.test(s)) {
            const id = rows.builds.length ? Math.max(...rows.builds.map((r) => r.id)) + 1 : 1;
            rows.builds.push({
              id, project_id: b[0], status: b[1], prompt: b[2],
              generated_code: b[3], preview_html: b[4], agent_log: b[5],
              started_at: b[6], completed_at: b[7] || null,
            });
            return { meta: { last_row_id: id }, success: true };
          }
          if (/^INSERT OR REPLACE INTO build_files/.test(s)) return { success: true };
          if (/^INSERT INTO project_files/.test(s)) {
            rows.project_files.push({ project_id: b[0], build_id: b[1], path: b[2], file_path: b[3], content: b[4] });
            return { success: true };
          }
          if (/^DELETE FROM project_files/.test(s)) {
            rows.project_files = rows.project_files.filter((f) => !(f.project_id === b[0] && f.path === b[1]));
            return { success: true };
          }
          if (/^SELECT build_id FROM project_files/.test(s)) {
            const r = rows.project_files.filter((f) => f.project_id === b[0]).pop();
            return r ? { build_id: r.build_id } : null;
          }
          if (/^UPDATE builds SET agent_log=\? WHERE id=\?/.test(s)) {
            const r = rows.builds.find((x) => x.id === b[1]);
            if (r) r.agent_log = b[0];
            return { success: true };
          }
          if (/^UPDATE builds SET status=\?, generated_code=\?/.test(s)) {
            const r = rows.builds.find((x) => x.id === b[4]);
            if (r) Object.assign(r, { status: b[0], generated_code: b[1], preview_html: b[2], completed_at: b[3] });
            return { success: true };
          }
          if (/^UPDATE projects SET status=\?, updated_at=\? WHERE id=\?/.test(s)) {
            const r = rows.projects.find((x) => x.id === b[2]);
            if (r) Object.assign(r, { status: b[0], updated_at: b[1] });
            return { success: true };
          }
          return { success: true };
        },
      }),
    };
    api.first = async () => api.bind().first();
    api.all = async () => api.bind().all();
    api.run = async () => api.bind().run();
    return api;
  };
  return { prepare, _rows: rows, _stmts: stmts };
}

const makeKV = () => {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
  };
};

const makeEnv = (seed) => ({
  DB: makeD1(seed),
  KV: makeKV(),
  // The Worker signs sessions with SESSION_SECRET when one is bound and derives
  // one from a bound secret when it is not. The rig binds it, so the token below
  // is signed the same way a real login signs one.
  SESSION_SECRET: "timing-rig-secret",
  GROQ_API_KEY: "rig-key",
  CLOUD_FIRST: "1",
  AI: { run: async () => { throw new Error("workers-ai must not be reached in this rig"); } },
});

// The Worker signs `body.hmac(secret)`, so the rig signs the same thing rather
// than hard-coding a token that would only work once.
async function token(env, sub = 7) {
  const enc = new TextEncoder();
  const b64u = (b) => Buffer.from(b).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const body = b64u(JSON.stringify({ sub, exp: Date.now() + 3600_000 }));
  return `${body}.${b64u(await crypto.subtle.sign("HMAC", key, enc.encode(body)))}`;
}

const mkReq = (p, m, b, t) =>
  new Request("https://createstuff-api.test" + p, {
    method: m,
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
    body: b == null ? undefined : JSON.stringify(b),
  });

// ── the fake Groq ────────────────────────────────────────────────────────
// One scripted answer per KIND of prompt. The rig showed the classifier and the
// planner both send the bare sentence, so a call counter cannot tell them apart
// and the routing below is by prompt content instead.
function installGroq(script) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (!u.includes("api.groq.com")) return real(url, init);
    const body = JSON.parse(String(init.body));
    const model = body.model;
    const nth = calls.filter((c) => c.model === model).length;
    const step = script({ model, nth, body });
    calls.push({ model, nth, ms: step.ms, status: step.status });
    if (step.ms) await new Promise((r) => setTimeout(r, step.ms));
    if (step.status && step.status >= 400) {
      return new Response(JSON.stringify({ error: { message: "rate limit exceeded" } }), {
        status: step.status, headers: { "retry-after": "2" },
      });
    }
    return new Response(JSON.stringify({ model, choices: [{ message: { content: step.text } }] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

// The writer returns index.html + a DEFECTIVE app.js and no styles.css. That is
// the one shape that makes both post-writer asks fire: one file is absent from
// the list (missing-assets gate), the other is in it and broken (script-health
// gate). Those two sets cannot overlap, which is why the asks can run together.
const answer = ({ body, isLlama }) => {
  const u = String((body.messages[1] || {}).content || "");
  const say = (text, ms) => ({ ms, status: 200, text });
  if (/You were asked to build a site/.test(u)) return say(J([{ path: "index.html", content: GOOD_INDEX }]), D_SMALL);
  if (/left out the file\(s\) it links/.test(u)) return say(J([{ path: "styles.css", content: STYLES }]), D_ASK);
  if (/A visitor cannot use this page/.test(u)) return say(J([{ path: "app.js", content: GOOD_JS }]), D_ASK);
  if (/REAL BACKEND|BUILD SPEC FROM THE PLANNER|BRIEF FROM THE USER/.test(u)) {
    return say(J(WRITER_SET), isLlama ? D_SMALL : D_WRITER);
  }
  // The classifier and the planner both send the bare sentence. One answer has
  // to serve both: it parses as the classifier's verdict and reads as a plan,
  // which is all the timing depends on.
  return say('{"kind":"build","rule":"r1","tool":"editor"}', D_SMALL);
};

// ── the rig ──────────────────────────────────────────────────────────────
async function runBuild({ llamaDead = false } = {}) {
  const env = makeEnv();
  const tok = await token(env);
  const { calls, restore } = installGroq(({ model, nth, body }) => {
    const isLlama = model === "llama-3.3-70b-versatile";
    // A rate-limited model 429s everything, which is what the free tier does.
    if (isLlama && llamaDead) return { ms: 30, status: 429, text: "" };
    return answer({ nth, body, isLlama });
  });
  try {
    // Exactly the two calls the UI makes, in the order it makes them.
    const prep = await worker.fetch(mkReq("/api/builds", "POST", { project_id: 1, prompt: "a page with a button", prepare: 1 }, tok), env, {});
    const prepJson = await prep.json();
    const t0 = Date.now();
    const res = await worker.fetch(mkReq("/api/ai/generate", "POST", { projectId: 1, plan: "a page with a button", buildId: prepJson.id }, tok), env, {});
    const ms = Date.now() - t0;
    const body = await res.json();
    const row = env.DB._rows.builds.find((r) => r.id === prepJson.id);
    return { ms, status: res.status, body, log: JSON.parse((row && row.agent_log) || "[]"), calls, row };
  } finally {
    restore();
  }
}

let pass = 0;
const ok = (what) => { pass++; console.log(`   PASS  ${what}`); };

// ── 1. both post-writer asks, one slot of wall clock ─────────────────────
console.log("── 1. post-writer asks: missing assets + a defective script ──────");
const par = await runBuild();
const asks = par.log.filter((l) => /Asking the editor/.test(l.message));
const sequential = D_SMALL + D_WRITER + D_ASK * asks.length;   // what it cost before
console.log(`   asks fired              : ${asks.length}  (${asks.map((a) => a.message.match(/->\s*(.*?)\s+has|->\s*the page links\s*(.*?)\s+but/)).map((m) => m && (m[1] || m[2])).join(" + ")})`);
console.log(`   writer (one long call)  : ${D_WRITER} ms`);
console.log(`   each repair ask         : ${D_ASK} ms`);
console.log(`   sequential would cost   : ${sequential} ms`);
console.log(`   measured now            : ${par.ms} ms`);
console.log(`   wall clock removed      : ${sequential - par.ms} ms`);
assert.ok(asks.length >= 2, `both post-writer asks must fire or this measures nothing (got ${asks.length})`);
assert.ok(par.ms < sequential, `asks did not overlap: ${par.ms}ms vs ${sequential}ms sequential`);
ok(`${asks.length} repair asks share one ${D_ASK} ms slot instead of ${asks.length * D_ASK} ms`);

// ── 2. a Groq model that said no is not asked again this request ─────────
console.log("\n── 2. Groq model memory: llama answers 429 for the whole build ─────");
const mem = await runBuild({ llamaDead: true });
const llamaTries = mem.calls.filter((c) => c.model === "llama-3.3-70b-versatile").length;
const realTries = mem.calls.filter((c) => c.model === "openai/gpt-oss-120b").length;
const doomedMs = mem.calls.filter((c) => c.model === "llama-3.3-70b-versatile").reduce((n, c) => n + c.ms, 0);
console.log(`   model calls             : ${mem.calls.length}`);
console.log(`   gpt-oss-120b (working)  : ${realTries}`);
console.log(`   llama-3.3-70b (doomed)  : ${llamaTries} attempt(s), ${doomedMs} ms of fetch + a retry-after sleep before each`);
console.log(`   build wall clock        : ${mem.ms} ms`);
assert.ok(realTries >= 3, `the build must still get real answers (gpt-oss called ${realTries}x)`);
// Not 1, and that is the honest number: the classifier and the planner start
// TOGETHER (runGenerate line "Promise.all([classifyWithModel, planP])"), so both
// read the memory while it is still empty and both try the doomed model. What
// the memory buys is that it is not tried again on the LATER calls — the writer
// and the two repair asks. Each doomed attempt also sleeps retry-after before
// it gives up, which is where the seconds went.
const before2 = realTries * 2;
console.log(`   without the memory      : ${before2} doomed fetches, ${before2 * 2}s of retry-after sleep`);
console.log(`   with the memory         : ${llamaTries} doomed fetches, ${llamaTries * 2}s of retry-after sleep`);
assert.ok(llamaTries < before2, `doomed attempts must not scale with the number of calls (${llamaTries} vs ${before2})`);
const genCalls = realTries;                       // every gen() call ends up on gpt-oss
const doomedCalls = llamaTries / 2;                  // each doomed attempt = 1 fetch + 1 retry
assert.equal(doomedCalls, 2, `only the two calls that start together may try it (${doomedCalls})`);
ok(`doomed model skipped on ${genCalls - doomedCalls} of ${genCalls} calls: ${llamaTries} fetches instead of ${before2}`);

// ── 3. the two routes the owner hit ──────────────────────────────────────
console.log("\n── 3. GET /api/builds/:id/log  +  bare POST /api/builds ──────────");
const env3 = makeEnv({
  builds: [{ id: 900, project_id: 1, status: "running", agent_log: JSON.stringify([{ agent: "Planner", message: "Accepted brief: hi" }]), started_at: new Date().toISOString(), completed_at: null }],
});
const tok3 = await token(env3);
const g = await worker.fetch(mkReq("/api/builds/900/log", "GET", null, tok3), env3, {});
const gj = await g.json();
console.log(`   GET  /api/builds/900/log      -> ${g.status}  entries=${gj.count} status=${gj.status}`);
assert.equal(g.status, 200);
assert.equal(gj.count, 1);

const before = env3.DB._rows.builds.length;
const t0b = Date.now();
const bare = await worker.fetch(mkReq("/api/builds", "POST", { project_id: 1, prompt: "x" }, tok3), env3, {});
const bMs = Date.now() - t0b;
const bj = await bare.json();
console.log(`   POST /api/builds (no prepare) -> ${bare.status} in ${bMs} ms`);
console.log(`     "${String(bj.error || "").slice(0, 96)}…"`);
assert.equal(bare.status, 400);
assert.match(bj.error || "", /prepare:1 required/);
assert.equal(env3.DB._rows.builds.length, before, "a refused prepare must not create a row");
assert.ok(bMs < 200, `the refusal must be immediate, took ${bMs}ms`);
ok("log readable; bare POST refused in <200 ms with nothing stranded");

// ── 4. the "Put online" button on a build row ───────────────────────────
console.log("\n── 4. POST /api/builds/:id/deploy (the button that answered 404) ──");
const env4 = makeEnv({
  builds: [{ id: 901, project_id: 1, status: "completed", started_at: new Date().toISOString() }],
  project_files: [
    { project_id: 1, path: "index.html", file_path: "index.html", content: GOOD_INDEX, build_id: 901 },
    { project_id: 1, path: "styles.css", file_path: "styles.css", content: STYLES, build_id: 901 },
    { project_id: 1, path: "app.js", file_path: "app.js", content: GOOD_JS, build_id: 901 },
  ],
});
const tok4 = await token(env4);
const d = await worker.fetch(mkReq("/api/builds/901/deploy", "POST", {}, tok4), env4, {});
const dj = await d.json();
console.log(`   POST /api/builds/901/deploy   -> ${d.status}  ${dj.publishUrl || dj.error}`);
assert.equal(d.status, 200);
assert.ok(dj.publishUrl, "publish must return an address");
assert.equal(dj.url, dj.publishUrl, "the browser reads result.url, so both names must agree");
ok(`publishes and answers both url and publishUrl (${dj.publishUrl})`);

console.log(`\nALL ${pass} CHECKS PASS`);