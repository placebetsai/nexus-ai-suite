#!/usr/bin/env node
// tests/e2e/run.mjs — one command that runs every end-to-end suite.
//
//   node tests/e2e/run.mjs                      run everything in tests/e2e/
//   node tests/e2e/run.mjs --list               what would run, and what it needs
//   node tests/e2e/run.mjs --only env-vars      run one suite by name
//   node tests/e2e/run.mjs --with-walks         also run tests/walk-*.mjs
//   node tests/e2e/run.mjs --allow-skip         skipped suites don't fail the run
//   node tests/e2e/run.mjs --timeout 900        per-suite budget in seconds
//
// WHY THIS EXISTS
// ---------------
// `tests/e2e/` had suites in it but no command to run them, so "the e2e tests"
// was not a thing you could actually do. This is that thing.
//
// HONESTY RULES THIS RUNNER FOLLOWS
// ---------------------------------
//   * A suite whose credentials are missing is SKIPPED, never passed. The
//     summary says so out loud, and the exit code says so out loud.
//   * A suite that exits non-zero, crashes, or times out is a FAIL.
//   * A suite that prints "N/M passed" and exits 0 is a PASS, and N/M is shown.
//   * Exit 0 means at least one suite really ran and nothing failed.
//     Exit 1 means something failed. Exit 2 means nothing ran at all.
//
// Exit codes are the contract; the printed summary is for humans.
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TESTS = path.resolve(HERE, '..');
const REPO = path.resolve(TESTS, '..');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PER_SUITE_TIMEOUT = Number(opt('--timeout', 600)) * 1000;
const ALLOW_SKIP = flag('--allow-skip');
const ONLY = opt('--only', null);
const WITH_WALKS = flag('--with-walks');

// Env vars that are ambient on any machine and must never count as "needed".
const AMBIENT = new Set([
  'PATH', 'HOME', 'PWD', 'SHELL', 'USER', 'TMPDIR', 'NODE_PATH', 'LANG', 'LC_ALL',
  'TERM', 'SHLVL', 'OLDPWD', 'HOSTNAME', 'LOGNAME', 'NODE_ENV', 'PLAYWRIGHT_HOME',
]);

/**
 * What a suite needs in order to run. We read it out of the suite itself —
 * `process.env.FOO` and the documented `FOO=... node suite.mjs` header both
 * count — so adding a new suite does not mean editing this file to remember
 * its credentials. Anything already present in the environment is not needed.
 */
function requiredEnv(file) {
  const src = readFileSync(file, 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) found.add(m[1]);
  // Header form:  CS_E2E_EMAIL=you@example.com CS_E2E_PASS=... node x.mjs
  for (const m of src.matchAll(/\b([A-Z][A-Z0-9_]{5,})=/g)) found.add(m[1]);
  return [...found].filter((e) => !AMBIENT.has(e) && !process.env[e]);
}

function discover() {
  const out = [];
  const add = (file, group) => {
    if (!existsSync(file)) return;
    out.push({ file, name: path.basename(file, '.mjs'), group });
  };
  for (const f of readdirSync(HERE).sort()) {
    if (f.endsWith('.mjs') && f !== 'run.mjs') add(path.join(HERE, f), 'e2e');
  }
  if (WITH_WALKS) {
    for (const f of readdirSync(TESTS).sort()) {
      if (/^walk-.*\.mjs$/.test(f)) add(path.join(TESTS, f), 'walk');
    }
  }
  return out;
}

function runSuite(suite) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [suite.file], {
      cwd: REPO,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PER_SUITE_TIMEOUT);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ...suite, status: 'FAIL', detail: `could not start: ${e.message}`, ms: Date.now() - t0, out });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ms = Date.now() - t0;
      if (timedOut) {
        resolve({ ...suite, status: 'FAIL', detail: `timed out after ${Math.round(PER_SUITE_TIMEOUT / 1000)}s`, ms, out });
        return;
      }
      // Suites report "N/M passed". Believe it only when the exit code agrees.
      const m = out.match(/(\d+)\s*\/\s*(\d+)\s*passed/g);
      const last = m ? m[m.length - 1].match(/(\d+)\s*\/\s*(\d+)/) : null;
      const tally = last ? `${last[1]}/${last[2]}` : '';
      if (code === 0) {
        resolve({ ...suite, status: 'PASS', detail: tally || 'exit 0', ms, out });
      } else {
        const tail = out.trim().split('\n').filter(Boolean).slice(-3).join(' | ');
        resolve({ ...suite, status: 'FAIL', detail: `${tally ? tally + ' — ' : ''}exit ${code}${tail ? ` — ${tail}` : ''}`, ms, out });
      }
    });
  });
}

const all = discover();
if (flag('--list')) {
  console.log('e2e suites discovered:\n');
  for (const s of all) {
    const need = requiredEnv(s.file);
    console.log(`  ${s.name.padEnd(22)} ${s.group.padEnd(5)} ${need.length ? 'needs: ' + need.join(', ') : 'no credentials needed'}`);
  }
  console.log(`\n${all.length} suite(s). Add --with-walks to include tests/walk-*.mjs.`);
  process.exit(0);
}

const suites = ONLY ? all.filter((s) => s.name === ONLY || s.name.includes(ONLY)) : all;
if (!suites.length) {
  console.log(ONLY ? `No suite matches --only ${ONLY}.` : 'No suites found in tests/e2e/.');
  process.exit(2);
}

console.log('=== end-to-end suites ===');
for (const s of suites) console.log(`  ${s.name}`);
console.log('');

const results = [];
for (const s of suites) {
  const need = requiredEnv(s.file);
  if (need.length) {
    results.push({ ...s, status: 'SKIP', detail: `missing ${need.join(', ')}`, ms: 0 });
    console.log(`SKIP ${s.name} — missing ${need.join(', ')}`);
    console.log(`     export them and re-run, e.g.\n       CS_E2E_EMAIL=... CS_E2E_PASS=... node tests/e2e/run.mjs --only ${s.name}`);
    continue;
  }
  process.stdout.write(`RUN  ${s.name} ... `);
  const r = await runSuite(s);
  results.push(r);
  console.log(`${r.status} ${r.detail} (${(r.ms / 1000).toFixed(1)}s)`);
}

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const skip = results.filter((r) => r.status === 'SKIP').length;
const ran = pass + fail;
const totalMs = results.reduce((a, r) => a + r.ms, 0);

console.log('\n=== summary ===');
const w = Math.max(...results.map((r) => r.name.length), 6);
for (const r of results) {
  console.log(`  ${r.name.padEnd(w)}  ${r.status.padEnd(4)}  ${r.detail}`);
}
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped — ${(totalMs / 1000).toFixed(1)}s`);

if (skip) {
  console.log('\nA SKIPPED suite is a suite that did NOT run. It is not a pass.');
  console.log('Give it what it lists above, or pass --allow-skip to accept skips explicitly.');
}
if (fail) {
  for (const r of results.filter((x) => x.status === 'FAIL')) {
    console.log(`\n----- ${r.name} (tail) -----`);
    console.log(r.out.trim().split('\n').slice(-25).join('\n'));
  }
  process.exit(1);
}
if (ran === 0) {
  console.log('\nNothing ran — every suite was skipped. Exit 2.');
  process.exit(2);
}
if (skip && !ALLOW_SKIP) {
  console.log('\nExiting 2: some suites never ran.');
  process.exit(2);
}
console.log('\nAll green.');
process.exit(0);
