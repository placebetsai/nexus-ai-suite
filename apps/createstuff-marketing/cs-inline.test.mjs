// Run:  node apps/createstuff-marketing/cs-inline.test.mjs
//
// csInline() decides what every preview actually looks like: it is what the
// builder puts in the preview frame after a build, after opening the app, and
// after going back to an earlier version. Two things make it load-bearing:
//
//   * a preview is ONE document in a frame, so <link href="styles.css"> does
//     not resolve against this app — it resolves against whoever is serving
//     the frame, which is this builder. Left in place, the app comes up wearing
//     the builder's stylesheet instead of its own;
//   * the CSS/JS must be in the document itself, so the preview shows the same
//     bytes the published site will.
//
// The function is read straight out of app.js, so this test cannot pass while
// shipping something other than what ships.

import assert from 'node:assert';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const m = src.match(/function csInline\(files(, projectId)?\) \{[\s\S]*?\n\}/);
assert.ok(m, 'csInline could not be located in app.js — the test is now testing nothing');

// eslint-disable-next-line no-eval
const csInline = eval(`(${m[0]})`);
assert.equal(typeof csInline, 'function');

const build = [
  {
    path: 'index.html',
    content: `<!doctype html><html><head><title>Bakery</title>
      <link rel="stylesheet" href="styles.css">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope&display=swap">
      </head><body><h1>Open 7-4</h1><script src="script.js"></script></body></html>`,
  },
  { path: 'styles.css', content: 'body{background:#101418;color:#f5f7fa} h1{letter-spacing:.02em}' },
  { path: 'script.js', content: 'document.title = "Bakery" + " !";' },
];

// 1 ── the app's own CSS reaches the document
const doc = csInline(build);
assert.ok(doc.includes('body{background:#101418'), "the app's CSS must be inlined into the preview");
assert.ok(doc.includes('document.title = "Bakery"'), "the app's JS must be inlined into the preview");

// 2 ── the local stylesheet link is gone, because in a frame it points at the
//      builder, not at this app
assert.ok(!/rel="stylesheet" href="styles.css"/i.test(doc),
  'the local stylesheet link must be dropped — it loads whoever serves the frame');
assert.ok(/fonts\.googleapis\.com/.test(doc), 'an absolute (CDN) stylesheet link must be left alone');
assert.ok(!/<script[^>]*src="script\.js"/i.test(doc), 'the local script tag must be replaced by the script itself');

// 3 ── no double-injection when the page already inlined everything itself
const twice = build.map(f => f.path === 'index.html'
  ? { ...f, content: `<html><head><style>${build[1].content}</style></head>` +
      `<body><script>${build[2].content}</script></body></html>` }
  : f);
const merged = csInline(twice);
const hits = merged.split(build[1].content).length - 1;
assert.equal(hits, 1, `CSS must appear exactly once (found ${hits})`);

// 4 ── a page with one inline style and the rest linked still gets its CSS
// (the old test was "does a <style> tag exist", which passed and shipped no CSS)
const partial = [
  { path: 'index.html', content: '<html><head><style>body{margin:0}</style>' +
      '<link rel="stylesheet" href="styles.css"></head><body>hi</body></html>' },
  { path: 'styles.css', content: 'h1{color:red}' },
];
const partialDoc = csInline(partial);
assert.ok(partialDoc.includes('h1{color:red}'), "linked CSS must be inlined even when a small <style> exists");
assert.ok(!/href="styles.css"/.test(partialDoc), 'and that link must not survive into the frame');

// 5 ── a link to a file the build does not contain is dropped too: the
//      published site serves only the build's files, so that URL would 404
//      there — and leaving it in the frame would load the builder's CSS behind
//      an app that is never going to have that file.
const unknown = [
  { path: 'index.html', content: '<html><head><link rel="stylesheet" href="vendor.css"></head><body>x</body></html>' },
  { path: 'styles.css', content: 'a{color:blue}' },
];
assert.ok(!/href="vendor.css"/.test(csInline(unknown)), 'a local link the build cannot serve must not survive into the frame');

// 6 ── degenerate input never throws
assert.equal(csInline([]), '');
assert.equal(csInline(null), '');
assert.equal(csInline([{ path: 'a.txt', content: 'nothing to see' }]), 'nothing to see');

// 7 ── the preview is handed the same window.__APP the server injects into the
//      served page, so an app that talks to its own database behaves the same
//      way before and after publish. Without a project id it must stay clean:
//      there is no backend to point at.
const withApp = csInline(build, 417);
assert.ok(withApp.includes('window.__APP='), 'a preview with a project id must be given its backend handle');
const handle = JSON.parse(withApp.match(/window\.__APP=(\{.*?\});/)[1]);
assert.equal(handle.projectId, 417, 'the handle must name the right project');
assert.equal(handle.api, 'https://createstuff-api.fashionistas1979.workers.dev/app/417/api',
  'the handle must be an absolute API url — a relative one would hit the builder, not the backend');
assert.ok(withApp.indexOf('window.__APP=') < withApp.indexOf('document.title'),
  "the handle must be defined before the app's own script runs");
assert.ok(!csInline(build).includes('window.__APP='),
  'no project id, no handle — an app with no backend must not be told it has one');
assert.equal(withApp.split('window.__APP=').length - 1, 1, 'the handle must appear exactly once');

console.log('csInline: 12 checks passed');
