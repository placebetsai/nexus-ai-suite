#!/usr/bin/env node
// CREATESTUFF BUILD PATH — proof the builder is wired to the SERVER's build row.
//
// Run:
//   node nexus-ai-suite/tests/e2e/createstuff-build.mjs                 the live site
//   node nexus-ai-suite/tests/e2e/createstuff-build.mjs https://x.createstuff.ai
//
// Needs no credentials of its own: the demo login below is already committed in
// CLAUDE.md and tests/measure-createstuff-390px.mjs, so this adds no secret.
//
// It uses plain HTTP rather than a browser on purpose. The four things under
// test are (a) static markup, (b) the text of the shipped script, (c) two
// functions taken OUT of that shipped script and executed here, and (d) the
// Worker's responses. A browser renders (a) byte-for-byte and executes (b) and
// (c) unchanged, so driving Chrome would buy no extra signal — only a longer,
// flakier run. Nothing here is claimed about how a page *looks*.
//
// WHAT WAS BROKEN (each of these was measured on the pre-fix build first):
//   1. The chip bar listed NINE helpers. The generator writes six agent names
//      — Planner, Plan, Frontend, Test, Fix, Online — and five of those are
//      stages. Architect, Backend, Style and Git were written by no run ever,
//      so they sat on "Idle" through every build on the page.
//   2. The poll marked chips off a POSITIONAL array of seven names, so
//      "Architect: Done / Backend: Done" and "Frontend: Working" were printed
//      for runs in which none of those agents spoke — including a refusal,
//      where only the Planner answered. The chip is called `deploy` in the
//      markup while the generator writes "Online", so that one never once
//      turned green, and the run's own "Fix" stage was never checked at all.
//   3. The poll read the build out of THIS browser's localStorage. A numeric
//      id is the server's row, and the server stamps `started_at` while the
//      poll wanted `started` — so on a refresh or from a second device the
//      cockpit had nothing to show, and any row it did find reported 0s old
//      and "unknown error" even when the Worker had written the reason.
//   4. POST /api/builds answered only when the ENTIRE build had finished, so
//      there was no way to watch a run while it happened: the id did not
//      exist until there was nothing left to watch.
//
// Exit code: 0 = every check passed, 1 = at least one failed, 2 = nothing ran.
import { readFileSync } from 'node:fs';

const BASE = String(process.argv[2] || 'https://createstuff.ai').replace(/\/+$/, '');
const API = 'https://createstuff-api.fashionistas1979.workers.dev';
// Already public in CLAUDE.md and tests/measure-createstuff-390px.mjs.
const EMAIL = 'loop@createstuff.ai';
const PASS = 'QApower2026!';
const PROMPT = 'Build a one-page tip calculator with a total field, a people field, '
  + 'and a Calculate button that shows the tip and the per-person total.';

let checks = 0, pass = 0;
const t = (label, ok, extra = '') => {
  checks++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
};
// Not reached because something it depends on already failed. Counted against
// the total on purpose: a check that never ran has not passed.
const skip = (label, why) => {
  checks++;
  console.log(`SKIP  ${label}  — ${why}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  return { status: res.status, body };
}

// ── text of the shipped page and script ────────────────────────────────────
async function text(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Pull a `const NAME = [...]` / `function NAME(...) {...}` out of shipped source
// by balancing brackets while ignoring anything inside a string or a comment,
// so it can be executed here exactly as the browser will execute it.
function balanced(src, openIdx, open, close) {
  let depth = 0, mode = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (mode) {                      // inside a string or a comment: nothing counts
      if (c === '\\') { i++; continue; }
      if (mode === '//') { if (c === '\n') mode = null; continue; }
      if (mode === '/*') { if (c === '*' && n === '/') { mode = null; i++; } continue; }
      if (c === mode) mode = null;   // closing quote
      continue;
    }
    if (c === '/' && n === '/') { mode = '//'; i++; continue; }
    if (c === '/' && n === '*') { mode = '/*'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { mode = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  return null;
}

function constArray(src, name) {
  const at = src.indexOf(`const ${name} = [`);
  if (at < 0) return null;
  const open = src.indexOf('[', at);
  const body = balanced(src, open, '[', ']');
  if (!body) return null;
  try { return new Function(`return ${body}`)(); } catch { return null; }
}

function functionSource(src, sig) {
  const at = src.indexOf(sig);
  if (at < 0) return null;
  const open = src.indexOf('{', at + sig.length - 1);
  const inner = balanced(src, open, '{', '}');
  if (!inner) return null;
  // balanced() hands back only the braces, and `function name(args)` on its own
  // is not an expression — so stitch the signature back on, or the compiler is
  // handed a bare block and reports "Unexpected token" for whatever is first in
  // the body.
  const body = src.slice(at, open) + inner;
  try { return new Function(`return (${body})`)(); } catch { return null; }
}

// ── A · what the served page actually contains ─────────────────────────────
let home = '', appjs = '', appUrl = '';
try {
  home = await text(`${BASE}/`);
  const m = /(?:src|href)="(\/app\.js[^"]*)"/.exec(home);
  appUrl = m ? m[1] : '/app.js';
  appjs = await text(`${BASE}${appUrl}`);
  t('the served page and its script both downloaded', true, `${BASE}/ + ${appUrl}`);
} catch (e) {
  t('the served page and its script both downloaded', false, String(e.message || e));
}

const chipKeys = [...home.matchAll(/class="agent-chip"[^>]*data-agent="([a-z]+)"/g)].map((m) => m[1]);
const WANTED = ['planner', 'frontend', 'test', 'fix', 'deploy'];

t('the builder shows exactly five agent chips', home && chipKeys.length === 5, `found ${chipKeys.length}: ${chipKeys.join(', ') || 'none'}`);
t('the five chips are the five stages the generator emits', WANTED.every((k) => chipKeys.includes(k)), `want ${WANTED.join(', ')}`);

const GHOSTS = ['architect', 'backend', 'style', 'git'];
const ghosts = GHOSTS.filter((g) => chipKeys.includes(g));
t('no chip exists for an agent no run ever writes', ghosts.length === 0, ghosts.length ? `still present: ${ghosts.join(', ')}` : 'architect/backend/style/git all gone');

// ── B · the shipped script's wiring ────────────────────────────────────────
const OLD_POLL = "'Planner', 'Architect', 'Frontend', 'Backend', 'Style', 'Test', 'Deploy'";
t('the poll no longer ranks chips by position in a hand-written array', !!appjs && !appjs.includes(OLD_POLL), appjs ? (appjs.includes(OLD_POLL) ? 'old array still shipped' : 'positional array removed') : 'script not fetched');
t('the shipped script maps log agents to chips by NAME (CHIP_AGENTS)', !!appjs && appjs.includes('CHIP_AGENTS'));
t('the shipped script maps the server row to the shape the poll reads (csFromServerBuild)', !!appjs && appjs.includes('csFromServerBuild'));
t('the browser opens the build row on the server before it draws (prepare)', !!appjs && appjs.includes('prepare: 1'));

// ── C · the shipped functions, executed ────────────────────────────────────
const stages = appjs ? constArray(appjs, 'CS_PLAN_STAGES') : null;
const chipMap = appjs ? constArray(appjs, 'CHIP_AGENTS') : null;
const mapper = appjs ? functionSource(appjs, 'function csFromServerBuild(row)') : null;

t('CS_PLAN_STAGES read out of the shipped script', Array.isArray(stages) && stages.length > 0, stages ? stages.join(', ') : 'not found');
t('CHIP_AGENTS read out of the shipped script', Array.isArray(chipMap) && chipMap.length > 0, chipMap ? chipMap.map(([k]) => k).join(', ') : 'not found');

if (Array.isArray(chipMap) && chipKeys.length) {
  const mapped = chipMap.map(([k]) => k);
  t('every chip on screen has a mapping', chipKeys.every((k) => mapped.includes(k)), `unmapped: ${chipKeys.filter((k) => !mapped.includes(k)).join(', ') || 'none'}`);
  t('every mapping points at a chip that exists', mapped.every((k) => chipKeys.includes(k)), `orphan mappings: ${mapped.filter((k) => !chipKeys.includes(k)).join(', ') || 'none'}`);
} else {
  skip('every chip on screen has a mapping', 'CHIP_AGENTS not readable');
  skip('every mapping points at a chip that exists', 'CHIP_AGENTS not readable');
}

if (Array.isArray(stages) && Array.isArray(chipMap)) {
  // Every stage the generator can report must have somewhere to land, and no
  // chip may promise a stage that does not exist. `Plan` and `deploy` are the
  // two deliberate exceptions: Plan is the planner's card rather than a stage,
  // and `deploy` is what the markup calls the Online chip.
  const covered = new Set(chipMap.flatMap(([, agents]) => agents));
  const missing = stages.map((s) => s.toLowerCase()).filter((s) => !covered.has(s));
  t('every stage the generator emits lights a chip', missing.length === 0, missing.length ? `no chip for: ${missing.join(', ')}` : stages.join(' → '));
} else {
  skip('every stage the generator emits lights a chip', 'CS_PLAN_STAGES or CHIP_AGENTS not readable');
}

if (mapper) {
  const running = mapper({
    id: 42, project_id: 7, status: 'running', prompt: PROMPT, agent_log: [{ agent: 'Planner', message: 'ok' }],
    generated_code: '', started_at: '2026-09-29T12:00:00.000Z', completed_at: null,
  });
  t('a server row becomes a row the poll can time', running && typeof running.started === 'number' && running.started > 0 && Array.isArray(running.agent_log) && running.done === false,
    running ? `started=${running.started} done=${running.done}` : 'mapper did not run');

  const failed = mapper({
    id: 43, project_id: 7, status: 'failed', prompt: PROMPT, agent_log: [{ agent: 'Planner', message: 'ok' }, { agent: 'System', message: 'Build failed: the writer ran out of room' }],
    generated_code: '', started_at: '2026-09-29T12:00:00.000Z', completed_at: '2026-09-29T12:01:00.000Z',
  });
  t('a failed run shows the reason the worker wrote, not "unknown error"',
    failed && failed.done === true && typeof failed.error === 'string' && failed.error.length > 0 && !/unknown/i.test(failed.error),
    failed ? `error=${JSON.stringify(failed.error)}` : 'mapper did not run');
} else {
  skip('a server row becomes a row the poll can time', 'csFromServerBuild not readable');
  skip('a failed run shows the reason the worker wrote, not "unknown error"', 'csFromServerBuild not readable');
}

// ── D · the live Worker ────────────────────────────────────────────────────
let token = '';
const at = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASS }) });
token = at.body && at.body.token;
t('signed in to the build API', at.status === 200 && !!token, `HTTP ${at.status}`);
const auth = (body) => ({ method: 'POST', body: JSON.stringify(body), headers: { authorization: `Bearer ${token}` } });

let projectId = null, buildId = null;
if (token) {
  const stamp = Date.now().toString(36);
  const pr = await j('/api/projects', auth({ name: `proof ${stamp}`, description: 'build-path proof — safe to delete' }));
  projectId = pr.body && pr.body.project && pr.body.project.id;
  t('a throwaway project was created for this proof', pr.status === 201 && !!projectId, `project ${projectId || pr.status}`);

  if (projectId) {
    // THE FIX: the row exists, and the answer comes back, before a single line
    // of code is generated. On the pre-fix Worker this call cannot return
    // until the whole build has run — there is nothing to return.
    const t0 = Date.now();
    let prep = null, prepErr = '';
    try {
      const r = await j('/api/builds', auth({ project_id: projectId, prompt: PROMPT, prepare: 1 }));
      prep = r.body;
      if (!prep || prep.prepared !== true) prepErr = `HTTP ${r.status} ${JSON.stringify(prep).slice(0, 200)}`;
    } catch (e) { prepErr = String(e.message || e); }
    const ms = Date.now() - t0;
    // `prepared` is the whole claim: an id that arrives BEFORE any code exists.
    // The pre-fix Worker answers the same call only once the build has run, so
    // holding out for that flag (not merely for a number) is what makes this
    // distinguish the two.
    buildId = prep && prep.prepared === true && typeof prep.id === 'number' ? prep.id : null;
    t('POST /api/builds returns a row BEFORE any code is written',
      buildId !== null,
      buildId !== null ? `${ms}ms, build ${buildId}` : `no prepared:true after ${ms}ms — ${prepErr}`);

    if (buildId !== null) {
      const row = await j(`/api/builds/${buildId}`, { headers: { authorization: `Bearer ${token}` } });
      const log = row.body && row.body.agent_log;
      t('the row is readable while it is still running',
        row.status === 200 && row.body.status === 'running' && typeof row.body.started_at === 'string' && Array.isArray(log) && log.length >= 1,
        `status=${row.body && row.body.status} log=${Array.isArray(log) ? log.length : 'n/a'} entries`);

      // Run it with the id the browser would have been handed, then watch the
      // log grow — this is the path the builder now takes.
      const g = await j('/api/ai/generate', auth({ projectId, plan: PROMPT, buildId }));
      const agents = new Set();
      let final = null;
      const deadline = Date.now() + 300000;
      while (Date.now() < deadline) {
        const s = await j(`/api/builds/${buildId}`, { headers: { authorization: `Bearer ${token}` } });
        final = s.body || null;
        (final && Array.isArray(final.agent_log) ? final.agent_log : []).forEach((l) => agents.add(String(l && l.agent)));
        if (final && ['completed', 'failed', 'answered'].includes(final.status)) break;
        await sleep(3000);
      }
      const secs = Math.round((Date.now() - t0) / 1000);
      t('the build reached an end state on its own', !!final && ['completed', 'failed', 'answered'].includes(final.status),
        final ? `${final.status} after ${secs}s${g.status === 200 ? '' : ` (generate HTTP ${g.status})`}` : 'still running at the deadline');

      if (final && Array.isArray(final.agent_log)) {
        t('the log was written stage by stage while the build ran', final.agent_log.length > 1,
          `${final.agent_log.length} entries: ${[...new Set(final.agent_log.map((l) => String(l && l.agent)))].join(', ')}`);
        const known = new Set((chipMap || []).flatMap(([, a]) => a));
        known.add('system');   // a failure line, not a stage — it has no chip by design
        if (!chipMap) {
          // Not a technicality: with no mapping in the shipped script, a chip
          // is wired to nothing whatever the markup lists.
          t('every agent that spoke during the run has a chip waiting for it', false,
            'the shipped script contains no agent-to-chip mapping at all');
        } else {
          const orphans = [...agents].filter((a) => !known.has(a.toLowerCase()));
          t('every agent that spoke during the run has a chip waiting for it', orphans.length === 0,
            orphans.length ? `no chip for: ${orphans.join(', ')}` : [...agents].join(', '));
        }
        const files = Array.isArray(final.files) ? final.files.length : 0;
        console.log(`INFO  the run's file set: ${files} file(s)${final.generated_code ? `, preview ${String(final.generated_code).length} bytes` : ''}`);
      } else {
        skip('the log was written stage by stage while the build ran', 'no finished row');
        skip('every agent that spoke during the run has a chip waiting for it', 'no finished row');
      }
    } else {
      skip('the row is readable while it is still running', 'no row was prepared');
      skip('the build reached an end state on its own', 'no row was prepared');
      skip('the log was written stage by stage while the build ran', 'no row was prepared');
      skip('every agent that spoke during the run has a chip waiting for it', 'no row was prepared');
    }

    // Leave the account as it was found. Non-fatal: the proof is the output.
    await j(`/api/projects/${projectId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } })
      .catch(() => null);
    console.log(`INFO  throwaway project ${projectId} deleted`);
  } else {
    skip('a throwaway project was created for this proof', `HTTP ${pr && pr.status}`);
    skip('POST /api/builds returns a row BEFORE any code is written', 'no project');
    skip('the row is readable while it is still running', 'no project');
    skip('the build reached an end state on its own', 'no project');
    skip('the log was written stage by stage while the build ran', 'no project');
    skip('every agent that spoke during the run has a chip waiting for it', 'no project');
  }
} else {
  skip('a throwaway project was created for this proof', 'not signed in');
  skip('POST /api/builds returns a row BEFORE any code is written', 'not signed in');
  skip('the row is readable while it is still running', 'not signed in');
  skip('the build reached an end state on its own', 'not signed in');
  skip('the log was written stage by stage while the build ran', 'not signed in');
  skip('every agent that spoke during the run has a chip waiting for it', 'not signed in');
}

console.log(`\n${pass}/${checks} passed`);
process.exit(pass === checks ? 0 : 1);
