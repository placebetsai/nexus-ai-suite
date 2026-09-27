#!/usr/bin/env node
/* createstuff gh-pair — connect GitHub to createstuff.ai WITHOUT pasting a token.
 *
 * How it works (same shape as `gh auth login`):
 *   1. reads the GitHub login this computer already has, via the GitHub CLI
 *   2. shows a one-time pair code and opens createstuff.ai carrying that code
 *   3. the page asks this script for the token over localhost (127.0.0.1 only)
 *   4. this script exits. The token never appears on screen, never lands in a
 *      URL, never reaches our servers — it travels keyring -> browser directly.
 *
 * Run it:   curl -sSL https://createstuff.ai/gh-pair.js | node - login
 *           node gh-pair.js login
 * Options:  --no-open        do not open a browser
 *           --port N         local port (default 53123)
 *           --site URL       where to send the browser (default createstuff.ai)
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');

const argv = process.argv.slice(2);
const positional = [];
let SITE = 'https://createstuff.ai';
let BASE_PORT = 53123;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--site') { SITE = String(argv[++i] || SITE); continue; }
  if (a === '--port') { BASE_PORT = parseInt(argv[++i] || '53123', 10); continue; }
  if (a.startsWith('--')) continue;
  positional.push(a);
}
const cmd = positional[0] || 'login';
const NO_OPEN = argv.includes('--no-open');
SITE = SITE.replace(/\/+$/, '');

const ALLOWED = new Set([
  'https://createstuff.ai',
  'https://app.createstuff.ai',
  'https://createstuff-marketing.pages.dev',
  'https://createstuff-app.pages.dev',
  'http://localhost:8788',
]);

const say = (s) => process.stdout.write(s + '\n');
const fail = (s) => { process.stderr.write('\n' + s + '\n\n'); process.exit(1); };

if (cmd === 'help' || argv.includes('--help')) {
  say('createstuff gh-pair — connect GitHub without pasting a token.');
  say('');
  say('  node gh-pair.js login     pair this computer with createstuff.ai');
  say('  node gh-pair.js status    show which GitHub account this computer uses');
  say('  node gh-pair.js --no-open do not open a browser automatically');
  process.exit(0);
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

try {
  gh(['--version']);
} catch {
  fail(
    'The GitHub CLI is not installed on this computer.\n' +
    'Install it, sign in once, then run this again:\n' +
    '  Linux:    sudo apt install gh     (or https://github.com/cli/cli)\n' +
    '  macOS:    brew install gh\n' +
    '  Windows:  winget install GitHub.cli\n' +
    'Then:      gh auth login'
  );
}

try {
  gh(['auth', 'status', '--hostname', 'github.com']);
} catch {
  fail('The GitHub CLI is installed but you are not signed in.\nRun this once (it opens github.com):\n\n  gh auth login\n\nThen run this script again.');
}

let ghToken = '';
let ghLogin = '';
try {
  ghToken = gh(['auth', 'token']);
  ghLogin = gh(['api', 'user', '--jq', '.login']);
} catch (e) {
  fail('Could not read your GitHub login from the CLI: ' + String((e && e.message) || e).slice(0, 200));
}
if (!ghToken) fail('The GitHub CLI returned an empty token. Run: gh auth login');

if (cmd === 'status') {
  say('GitHub account on this computer: ' + ghLogin);
  say('Token: read from the GitHub CLI and never printed.');
  process.exit(0);
}

// Eight characters, no 0/O/1/I, so a code can be read off a screen cleanly.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rnd = crypto.randomBytes(8);
let rawCode = '';
for (let i = 0; i < 8; i++) rawCode += ALPHABET[rnd[i] % ALPHABET.length];
const PAIR_CODE = rawCode.slice(0, 4) + '-' + rawCode.slice(4);

let served = false;
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const allowed = !origin || ALLOWED.has(origin);
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-store',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(allowed ? 204 : 403, cors);
    res.end();
    return;
  }
  if (!allowed) { res.writeHead(403, cors); res.end(JSON.stringify({ error: 'origin not allowed' })); return; }

  const url = new URL(req.url, 'http://127.0.0.1');
  const got = String(url.searchParams.get('code') || '').toUpperCase();
  if (got !== PAIR_CODE) { res.writeHead(404, cors); res.end(JSON.stringify({ error: 'wrong pair code' })); return; }
  if (served) { res.writeHead(410, cors); res.end(JSON.stringify({ error: 'this pair code was already used' })); return; }

  served = true;
  const wantsJson = url.searchParams.get('format') === 'json' || String(req.headers.accept || '').includes('application/json');
  if (wantsJson) {
    res.writeHead(200, cors);
    res.end(JSON.stringify({ token: ghToken, login: ghLogin }));
  } else {
    // A real browser page just navigated here. Hand the login back through the
    // address bar fragment: fragments are never sent to our servers, so the
    // token travels your keyring -> this machine -> your browser and nowhere
    // else. The page strips it out of the address bar the moment it lands.
    const back = SITE + '/#gh-pair-result/' + encodeURIComponent(ghToken + '|' + ghLogin + '|' + PAIR_CODE);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(
      '<!doctype html><meta charset="utf-8"><title>Connecting GitHub</title>' +
      '<body style="font-family:system-ui,sans-serif;padding:2rem;color:#111">' +
      '<p>Handing your GitHub login to ' + SITE.replace(/^https?:\/\//, '') + ' as <b>' + ghLogin + '</b>…</p>' +
      '<p style="color:#666;font-size:.9rem">If nothing happens, <a href="' + back + '">press here</a>.</p>' +
      '<script>location.replace(' + JSON.stringify(back) + ');</script></body>'
    );
  }
  say('');
  say('Handed your GitHub login to ' + SITE.replace(/^https?:\/\//, '') + ' as ' + ghLogin + '.');
  say('You can close this terminal.');
  setTimeout(() => { try { server.close(); } catch (e) {} process.exit(0); }, 400);
});

function listen(port, attempt) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && attempt < 5) return listen(port + 1, attempt + 1);
    fail('Could not open a local port (' + e.code + '). Re-run with --port 54000');
  });
  server.listen(port, '127.0.0.1', () => {
    const bound = server.address().port;
    const url = SITE + '/#gh-pair/' + PAIR_CODE + '/' + bound;
    say('');
    say('  GitHub account:  ' + ghLogin);
    say('  Pair code:       ' + PAIR_CODE);
    say('');
    say('  Open this address (it should have opened by itself):');
    say('    ' + url);
    say('');
    say('  Waiting for your browser... (2 minutes)');
    say('');
    if (!NO_OPEN) {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
      try { spawn(opener, args, { stdio: 'ignore', detached: true }).unref(); } catch (e) {}
    }
    setTimeout(() => {
      if (!served) fail('Timed out after 2 minutes — nothing came back from the browser.\nRun this script again, keep it open, and press Pair on the page.');
    }, 120000);
  });
}
listen(BASE_PORT, 0);
