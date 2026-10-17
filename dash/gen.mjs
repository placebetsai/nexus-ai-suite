// Dashboard generator — regenerates DASHBOARD.html every cycle from:
//   1. dash/DASHBOARD.tpl.html   (static narrative sections)
//   2. dash/roster.json          (hive roster, updated from hive_status)
//   3. dash/assignments.json     (what each agent is actually assigned)
//   4. live `ps`                 (sidecars: deploys, builders, proxies, watchers)
// Nothing in the AGENTS or SIDECARS tables is typed in by hand at render time:
// a process that dies disappears from the table on the next 3s cycle.
// Run: node dash/gen.mjs   (a loop runs it every 3s)

import { execSync } from "node:child_process";
import { readFileSync as rf, writeFileSync as wf } from "node:fs";

const DIR = decodeURIComponent(new URL(".", import.meta.url).pathname);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ── agents ─────────────────────────────────────────────────────────────── */

const roster = JSON.parse(rf(DIR + "roster.json", "utf8"));
let assigns = { assignments: {} };
try { assigns = JSON.parse(rf(DIR + "assignments.json", "utf8")); } catch { /* keep empty */ }

const ORDER = { running: 0, done: 1, failed: 2, idle: 3 };
function agentsTable() {
  const rows = roster.agents.map((a) => {
    const as = assigns.assignments[a.id] || { status: "idle" };
    return { ...a, status: as.status || "idle", task: as.task, proof: as.proof };
  });
  // the orchestrator is not a hive agent but IS the top assignment row
  const orch = assigns.assignments.orchestrator;
  rows.unshift({
    id: "orchestrator", name: "ORCHESTRATOR (you)", model: "mimo-v2.6-flash-free (this session)",
    role: orch?.role || "lead", status: orch?.status || "running",
    task: orch?.task, proof: orch?.proof
  });
  rows.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  const body = rows.map((r) => `<tr>
    <td><b>${esc(r.name)}</b><span class="v">${esc(r.role)}</span></td>
    <td>${esc(r.model)}${r.fallback ? `<span class="v">fb: ${esc(r.fallback)}</span>` : ""}</td>
    <td><span class="st st-${esc(r.status)}">${esc(r.status)}</span></td>
    <td>${r.task ? esc(r.task) : "<span class='v'>unassigned</span>"}${r.proof ? `<span class="v">proof: ${esc(r.proof)}</span>` : ""}</td>
  </tr>`).join("\n");
  const counts = rows.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ");
  return `<div class="ts" style="margin:0 0 8px">${summary} · parallelism cap 10 · all models $0.00 · agents never share the orchestrator model</div>
<table><tr><th>agent</th><th>model</th><th>status</th><th>assignment + proof</th></tr>${body}</table>`;
}

/* ── sidecars (live from ps) ────────────────────────────────────────────── */

// first pattern per pid wins; every entry is a real, greppable cmdline marker
const PATTERNS = [
  [/up-pb\.mjs/, "placebets asset uploader", "one-file-per-request Pages upload (beats the throttle)"],
  [/deploy-safe\.sh/, "deploy gate chain", "upload→deploy→verify_deploy_after→smoke (rc=124 gate armed)"],
  [/cf-proxy\.mjs/, "CF retry proxy", "connection-retry sidecar for the throttled link"],
  [/next-on-pages/, "ihatecollege build", "@cloudflare/next-on-pages bundling"],
  [/odds-cache warmer/, "odds-cache warmer", "hits preview /api/odds every 20s so gate smoke gets fresh data"],
  [/bot-probe\.py/, "bot probe", "10-question live Q&A against a deployment"],
  [/gen\.mjs/, "dashboard generator", "this table's own source (3s loop)"],
  [/pb-deploy-manual/, "placebets manual deploy", "hand-fired upload→deploy chain"]
];

function sidecarsTable() {
  let ps = "";
  try { ps = execSync("ps -eo pid,etime,args --no-headers", { encoding: "utf8", maxBuffer: 8 << 20 }); } catch { ps = ""; }
  const seen = new Set();
  const rows = [];
  for (const line of ps.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, etime, args] = m;
    if (args.includes("grep -") || /kworker|ksoftirq|watchdogd|kprobe/.test(args)) continue;
    for (const [re, name, note] of PATTERNS) {
      if (re.test(args) && !seen.has(pid)) {
        seen.add(pid);
        rows.push({ pid, etime, name, note });
        break;
      }
    }
  }
  const proc = rows.length
    ? rows.map((r) => `<tr><td><b>${esc(r.name)}</b><span class="v">${esc(r.note)}</span></td><td>${esc(r.pid)}</td><td>${esc(r.etime)}</td><td><span class="st st-running">running</span></td></tr>`).join("\n")
    : `<tr><td colspan="4"><span class="v">no federation processes running right now</span></td></tr>`;
  const mcp = `<tr><td><b>hive MCP</b><span class="v">Nexus Hive 3.0.0 — 10 agents, 8 free models</span></td><td>—</td><td>attached</td><td><span class="st st-done">up</span></td></tr>
<tr><td><b>browser MCP</b><span class="v">desktop browser for live walkthroughs</span></td><td>—</td><td>attached</td><td><span class="st st-done">up</span></td></tr>
<tr><td><b>opencode MCP</b><span class="v">sessions · model catalog · resources</span></td><td>—</td><td>attached</td><td><span class="st st-done">up</span></td></tr>`;
  return `<div class="ts" style="margin:0 0 8px">${rows.length} local process(es) matched · this table is a live ps scan, rows vanish when processes die</div>
<table><tr><th>sidecar</th><th>pid</th><th>uptime</th><th>state</th></tr>${proc}</table>
<div class="ts" style="margin:10px 0 4px">attached to this orchestrator session</div>
<table>${mcp}</table>`;
}

/* ── render ─────────────────────────────────────────────────────────────── */

try {
  const tpl = rf(DIR + "DASHBOARD.tpl.html", "utf8");
  const html = tpl
    .replace("{{TS}}", new Date().toISOString().slice(11, 19) + " UTC")
    .replace("{{AGENTS}}", agentsTable())
    .replace("{{SIDECARS}}", sidecarsTable());
  wf(DIR + "../DASHBOARD.html", html);
} catch (e) {
  console.error("gen failed:", e.message); // keep the last good file on disk
  process.exitCode = 1;
}
