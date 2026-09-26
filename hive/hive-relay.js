#!/usr/bin/env node
// hive-relay.js — OpenAI-compatible endpoint in front of the free OpenCode Hive.
//
// WHY THIS EXISTS (measured 2026-09-25):
//   1. A Cloudflare Worker calling opencode.ai/zen directly gets HTTP 429
//      "FreeUsageLimitError" on 6/6 attempts — Zen rate-limits Cloudflare's
//      egress IP ranges. Same call from this machine: 6/6 HTTP 200.
//   2. 7 of the 8 free models return HTTP 403 "OpenCode's free tier can only
//      be used from within OpenCode". Running them through the opencode CLI IS
//      within OpenCode, so the CLI path serves every model.
//
// So: this relay sits on an unblocked IP and speaks OpenAI protocol. Workers
// call it, it fans out across the free Hive with failover.
//
//   POST /v1/chat/completions   {model, messages, max_tokens}
//   GET  /v1/models             the free roster
//
// Auth: Authorization: Bearer <HIVE_TOKEN> (never committed).

import { spawn } from "node:child_process";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

const PORT = Number(process.env.HIVE_PORT || 8787);
const TOKEN = process.env.HIVE_TOKEN || "";
const ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const OPENCODE = process.env.OPENCODE_BIN || "/home/billionaremaker/.opencode/bin/opencode";

// Order matters: fast/direct first, CLI-backed models after.
export const FREE_MODELS = [
  "space-bunny-free",
  "mimo-v2.6-flash-free",
  "nemotron-3.5-lightning-free",
  "nemotron-3-ultra-free",
  "ling-3.0-flash-fin-free",
  "muse-spark-1.2-contributor-free",
  "muse-spark-1.3-contributor-free",
  "big-pickle",
];

const ok = (v) => typeof v === "string" && v.trim().length > 0;
const nowIso = () => new Date().toISOString();

function completion(model, content) {
  return {
    id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    cost: "0",
  };
}

// Backend 1 — the fast HTTP path. Works only for models Zen allows keyless
// and only when our IP is not rate-limited.
//
// reasoning_effort:"low" is not cosmetic — it is the difference between a
// working build and a dead one. space-bunny-free defaults to very heavy
// thinking, and on the real build prompt it burned 31,532 chars of reasoning
// and answered with NOTHING, three runs in a row (84.6s / 7.5s / 31,532).
// Measured on the same build prompt:
//   effort=low    -> HTTP 200 in  34.4s, 24,482 chars, reasoning 0, real HTML
//   effort=medium -> no response at 130s
//   effort=high   -> no response at 130s
async function viaHttp(model, messages, maxTokens, deadline = Date.now() + 110_000) {
  const remaining = () => Math.max(0, deadline - Date.now());
  const ask = (tokens, timeoutMs) =>
    fetch(ZEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: tokens, stream: false, reasoning_effort: "low" }),
      signal: AbortSignal.timeout(Math.max(5_000, timeoutMs)),
    });

  const r = await ask(maxTokens || 4000, Math.min(remaining(), 100_000));
  const text = await r.text();
  if (!r.ok) throw new Error("http " + r.status + " " + text.slice(0, 140));
  const j = JSON.parse(text);
  const msg = j?.choices?.[0]?.message;
  const c = msg?.content;
  if (ok(c)) return c;

  // Last resort: give the model a bigger ceiling, but never spend time we do
  // not have — an over-long retry here is what pushed builds into the cap.
  const reasoning = msg?.reasoning_content || "";
  if (remaining() < 35_000) throw new Error("empty completion (" + reasoning.length + " chars reasoning, no time left to retry)");
  console.log("[chat] empty answer with", reasoning.length, "chars of reasoning — retrying with", maxTokens * 2, "tokens");
  const r2 = await ask(maxTokens * 2, Math.min(remaining(), 40_000));
  const t2 = await r2.text();
  if (!r2.ok) throw new Error("http " + r2.status + " (retry) " + t2.slice(0, 120));
  const c2 = JSON.parse(t2)?.choices?.[0]?.message?.content;
  if (!ok(c2)) throw new Error("empty completion even at " + maxTokens * 2 + " tokens");
  return c2;
}

// Backend 2 — the opencode CLI. "Within OpenCode" by definition, so all free
// models are usable here regardless of the 403 gate.
//
// It is SLOW: measured 234.2s / 275.5s for one site generation. Cloudflare
// caps an inbound Worker request at ~180s (build 73 died at 180.7s, build 74's
// attempt 1 at 181.3s), so a CLI fallback inside a build can ONLY make the
// build miss the cap. It stays available behind an explicit cli:true flag for
// interactive/manual use, but is OFF by default on the build path.
function viaCli(model, messages, maxTokens, timeoutMs = 240_000) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = (system ? system + "\n\n" : "") + (lastUser ? lastUser.content : "");
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn(
      OPENCODE,
      ["run", "-m", "opencode/" + model, "--format", "default", prompt],
      { stdio: ["ignore", "pipe", "pipe"], detached: false }
    );
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      reject(new Error("cli timeout after " + timeoutMs + "ms"));
    }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      // opencode prints a leading echo/prompt banner; the answer follows it.
      const body = out.replace(/^>.*$/m, "").trim();
      if (code === 0 && ok(body)) resolve(body);
      else reject(new Error("cli exit " + code + " " + (err || out).slice(0, 200)));
    });
  });
}

async function run(model, messages, maxTokens, allowCli = false, deadline = Date.now() + 140_000) {
  const errors = [];
  // Deadline-aware: the Worker's request dies at ~180s, so a backend that
  // cannot plausibly finish inside the remaining budget is skipped rather than
  // allowed to burn 240s and take the whole build down with it.
  const backends = allowCli ? [viaHttp, viaCli] : [viaHttp];
  for (const fn of backends) {
    if (fn === viaCli && Date.now() + 150_000 > deadline) {
      errors.push("cli skipped (would exceed the build deadline)");
      continue;
    }
    try {
      // viaHttp takes a deadline; viaCli takes a timeout — pass each its own.
      const content = fn === viaCli
        ? await viaCli(model, messages, maxTokens)
        : await viaHttp(model, messages, maxTokens, deadline);
      return { content, backend: fn === viaHttp ? "http" : "cli" };
    } catch (e) { errors.push(String(e && e.message)); }
  }
  throw new Error("all backends failed for " + model + ": " + errors.join(" | "));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    let size = 0;
    req.on("data", (d) => {
      size += d.length;
      if (size > 1_000_000) { reject(new Error("body too large")); req.destroy(); return; }
      b += d;
    });
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json;charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

const started = Date.now();
let served = 0;
// In-memory async job store for POST /v1/chat/completions {async:true}.
const jobs = new Map();
let jobSeq = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { ok: true, uptime_s: Math.round((Date.now() - started) / 1000), served, models: FREE_MODELS.length });
  }

  if (TOKEN) {
    const auth = req.headers.authorization || "";
    if (auth !== "Bearer " + TOKEN) return send(res, 401, { error: { type: "invalid_request_error", message: "unauthorized" } });
  }

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return send(res, 200, { object: "list", data: FREE_MODELS.map((id) => ({ id, object: "model", owned_by: "opencode" })) });
  }

  if (req.method === "POST" && url.pathname === "/hive/run") {
    // Called by the Worker right after it creates a build row. We answer 202
    // instantly and do the work in the background: the Worker's ctx.waitUntil
    // context is torn down at ~30s, so the build has to be driven from here.
    let body;
    try { body = JSON.parse(await readBody(req)); }
    catch (e) { return send(res, 400, { error: { type: "invalid_request_error", message: String(e.message) } }); }
    const runUrl = String(body.run_url || "");
    if (!/^https?:\/\//.test(runUrl)) return send(res, 400, { error: { type: "invalid_request_error", message: "run_url required" } });

    send(res, 202, { queued: true, run_url: runUrl });
    const t0 = Date.now();
    (async () => {
      // A dropped connection must not strand a build in 'running' forever.
      // Measured 2026-09-25, build 73: the writer finished locally (59,617
      // chars via the opencode CLI) but this callback died at 180.7s with
      // "fetch failed" when the host's connection flapped, so the result never
      // landed. POST /api/builds/:id/run re-reads the row and returns early
      // unless status is still 'running', so retrying is idempotent.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await fetch(runUrl, {
            method: "POST",
            headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(600_000), // up to 10 min for a full build
          });
          const txt = await r.text();
          console.log("[hive-run]", r.status, ((Date.now() - t0) / 1000).toFixed(1) + "s", "attempt " + attempt, runUrl, txt.slice(0, 240));
          if (r.ok || r.status === 401 || r.status === 404) return; // done or unrecoverable
        } catch (e) {
          console.log("[hive-run] attempt " + attempt + " FAILED after " + ((Date.now() - t0) / 1000).toFixed(1) + "s", String(e && e.message));
        }
        await new Promise((r) => setTimeout(r, 15_000)); // let the link recover
      }
      console.log("[hive-run] gave up after 2 attempts", runUrl);
    })();
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    let body;
    try { body = JSON.parse(await readBody(req)); }
    catch (e) { return send(res, 400, { error: { type: "invalid_request_error", message: String(e.message) } }); }

    const model = String(body.model || FREE_MODELS[0]).replace(/^opencode\//, "").replace(/^zen\//, "");
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return send(res, 400, { error: { type: "invalid_request_error", message: "messages required" } });

    // Model failover: walk the roster until one serves, bounded by a deadline
    // because the Worker waiting on us dies at ~180s.
    const walk = async () => {
      const order = [model, ...FREE_MODELS.filter((m) => m !== model)];
      const failures = [];
      const t0 = Date.now();
      const deadline = t0 + Math.min(Number(body.deadline_ms) || 140_000, 170_000);
      const allowCli = body.cli === true;
      const secs = () => ((Date.now() - t0) / 1000).toFixed(1) + "s";
      for (const m of order) {
        if (Date.now() > deadline) { failures.push("deadline reached at " + secs()); break; }
        try {
          const { content, backend } = await run(m, messages, body.max_tokens, allowCli, deadline);
          served++;
          console.log("[chat]", m, backend, secs(), content.length + " chars");
          return { model: m, content, backend };
        } catch (e) {
          const msg = String(e && e.message);
          failures.push(m + ": " + msg.slice(0, 90));
          console.log("[chat] FAIL", m, secs(), msg.slice(0, 160));
        }
      }
      throw new Error("every free model failed — " + failures.join(" | "));
    };

    // ASYNC: hand back a job id immediately and let the caller poll.
    // Both hops in front of us have hard ceilings — the quick tunnel answers
    // HTTP 524 at ~126s (measured 3/3) and Cloudflare kills a Worker request
    // at ~180s — while a single generation takes 40-200s. A long-lived POST
    // therefore cannot carry it; short requests on each hop can.
    if (body.async === true) {
      const id = "job-" + (++jobSeq) + "-" + Date.now().toString(36);
      jobs.set(id, { status: "running", started: Date.now(), model });
      send(res, 202, { job_id: id });
      walk().then(
        (r) => { const j = jobs.get(id); jobs.set(id, Object.assign({}, r, { status: "done", elapsedMs: Date.now() - j.started })); },
        (e) => { const j = jobs.get(id); jobs.set(id, { status: "failed", error: String((e && e.message) || e), elapsedMs: Date.now() - j.started }); }
      );
      return;
    }

    try {
      const r = await walk();
      const out = completion(r.model, r.content);
      out.backend = r.backend;
      if (r.model !== model) out.requested_model = model;
      return send(res, 200, out);
    } catch (e) {
      return send(res, 502, { error: { type: "api_error", message: String((e && e.message) || e) } });
    }
  }

  const jobM = url.pathname.match(/^\/v1\/jobs\/([^/]+)$/);
  if (jobM && req.method === "GET") {
    const j = jobs.get(jobM[1]);
    if (!j) return send(res, 404, { error: { type: "invalid_request_error", message: "unknown job" } });
    return send(res, 200, j);
  }

  return send(res, 404, { error: { type: "invalid_request_error", message: "Not Found" } });
});

server.listen(PORT, "127.0.0.1", () => {
  fs.writeFileSync("/tmp/opencode/hive-relay.pid", String(process.pid));
  console.log("[hive-relay] listening on 127.0.0.1:" + PORT + " pid=" + process.pid + " auth=" + (TOKEN ? "on" : "OFF"));
});
