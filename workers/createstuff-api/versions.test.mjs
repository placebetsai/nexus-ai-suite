// Run:  node workers/createstuff-api/versions.test.mjs
//
// Version history ("Version history" / "Go back to this") without a Cloudflare
// account in the way. It does two things that matter:
//
//   1. pulls the four statements out of the Worker's own source text, joins the
//      split string literals back together, and runs them against a real SQLite
//      database — so the SQL is proven to execute, not merely to parse. This is
//      the only pre-deploy check available for a database this machine has no
//      D1 permission on;
//   2. feeds those rows through the exported versionsPayload() to check the
//      numbering, the "you are here" flag and the character count that the
//      builder's panel renders, including a simulated restore.
//
// Nothing here touches the network or a real database.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'src/index.js'), 'utf8');
// "A " +\n  "B"  ->  "A B", so a statement written across lines is searchable whole.
const flat = src.replace(/"\s*\+\s*\n\s*"/g, '');

const SQL = {
  owner: 'SELECT id FROM projects WHERE id=? AND user_id=?',
  versions:
    "SELECT id, prompt, generated_code, completed_at, started_at FROM builds WHERE project_id=? AND generated_code<>'' AND status='completed' ORDER BY id ASC LIMIT 100",
  restoreSource:
    'SELECT id, project_id, prompt, generated_code, preview_html FROM builds WHERE id=?',
  insert:
    'INSERT INTO builds (project_id, status, prompt, generated_code, preview_html, agent_log, started_at, completed_at) VALUES (?,?,?,?,?,?,?,?)',
};

// ── 1. the statements are the ones this file claims to test ────────────────
for (const [name, sql] of Object.entries(SQL)) {
  assert.ok(flat.includes(sql), `Worker source no longer contains the ${name} statement`);
}
console.log('PASS  all 4 statements found verbatim in the Worker source');

// The insert must bind exactly as many values as it has columns: D1 would
// reject a mismatch at runtime, which is a 500 on the one button being tested.
const insertCols = (SQL.insert.match(/\(([^)]+)\)/)[1]).split(',').length;
const insertQs = (SQL.insert.match(/VALUES \(([^)]+)\)/)[1]).split(',').length;
assert.equal(insertCols, 8, 'insert column count');
assert.equal(insertQs, insertCols, 'placeholder count must equal column count');
console.log('PASS  restore insert: 8 columns, 8 placeholders');

const { versionsPayload } = await import(new URL('./src/index.js', import.meta.url));

// ── 2. run the real SQL against a real database ────────────────────────────
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE projects (id INTEGER PRIMARY KEY, user_id TEXT, name TEXT, status TEXT, updated_at TEXT);
  CREATE TABLE builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, status TEXT, prompt TEXT,
    generated_code TEXT, preview_html TEXT, agent_log TEXT, started_at TEXT, completed_at TEXT
  );
`);
db.prepare('INSERT INTO projects (id, user_id, name, status) VALUES (?,?,?,?)')
  .run(7, 'user-a', 'Savings tracker', 'built');
db.prepare('INSERT INTO projects (id, user_id, name, status) VALUES (?,?,?,?)')
  .run(8, 'user-b', 'Someone else', 'built');

const filesFor = (word, n) => JSON.stringify([
  { path: 'index.html', content: `<html><body>${word}</body></html>`.padEnd(n, 'x') },
  { path: 'styles.css', content: `body{content:"${word}"}` },
]);
const ins = db.prepare(
  'INSERT INTO builds (project_id, status, prompt, generated_code, preview_html, agent_log, started_at, completed_at) VALUES (?,?,?,?,?,?,?,?)'
);
ins.run(7, 'completed', 'a savings tracker with goals', filesFor('one', 100), '<html>one</html>', '[]', '2026-09-27T10:00:00Z', '2026-09-27T10:01:00Z');
ins.run(7, 'completed', '  add   a dark theme  ', filesFor('two', 250), '<html>two</html>', '[]', '2026-09-27T11:00:00Z', '2026-09-27T11:01:00Z');
ins.run(7, 'failed', 'this one broke', '', '', '[]', '2026-09-27T12:00:00Z', null);            // excluded: failed
ins.run(7, 'completed', 'empty code', '', '', '[]', '2026-09-27T13:00:00Z', '2026-09-27T13:01:00Z'); // excluded: no code
ins.run(7, 'completed', 'third try that worked', filesFor('three', 400), '<html>three</html>', '[]', '2026-09-27T14:00:00Z', '2026-09-27T14:01:00Z');
ins.run(8, 'completed', 'not yours', filesFor('other', 900), '<html>other</html>', '[]', '2026-09-27T15:00:00Z', '2026-09-27T15:01:00Z');

const rows = db.prepare(SQL.versions).all(7);
assert.equal(rows.length, 3, 'failed + empty builds and the other project are excluded');
const payload = versionsPayload(rows);

// listed newest first, numbered oldest first, "you are here" on the newest
assert.deepEqual(payload.map(v => v.id), [5, 2, 1], 'newest first in the panel');
assert.deepEqual(payload.map(v => v.version), [3, 2, 1], 'numbers stay ascending to the user');
assert.deepEqual(payload.map(v => v.current), [true, false, false], 'only the newest is "you are here"');

const row5 = rows.find(r => r.id === 5);
const expectedLen = JSON.parse(row5.generated_code).reduce((n, f) => n + f.content.length, 0);
assert.equal(payload.find(v => v.id === 5).code_len, expectedLen, 'code_len is the real file bytes');
assert.equal(payload[1].note, 'add a dark theme', 'note is whitespace-collapsed');
assert.equal(payload[0].created_at, '2026-09-27T14:01:00Z', 'uses completed_at');
assert.ok(payload.every(v => v.id && v.version && v.created_at), 'every row has what the panel reads');
console.log('PASS  versions SQL runs; 3 of 6 builds listed; ids 5,2,1 numbered 3,2,1; current=5');

// ownership gate: the same query with somebody else's id answers nothing
assert.equal(db.prepare(SQL.owner).get(7, 'user-b'), undefined, "another user's project is not visible");
assert.ok(db.prepare(SQL.owner).get(7, 'user-a'), 'the owner sees it');
console.log('PASS  ownership gate: project 7 belongs to user-a, invisible to user-b');

// ── 3. the restore, end to end, on the same database ───────────────────────
const srcRow = db.prepare(SQL.restoreSource).get(2);
assert.ok(srcRow, 'source version is readable');
const restored = JSON.parse(srcRow.generated_code);
db.prepare(SQL.insert).run(
  srcRow.project_id, 'completed', String(srcRow.prompt || '').slice(0, 4000),
  srcRow.generated_code, srcRow.preview_html, '[]',
  '2026-09-27T16:00:00Z', '2026-09-27T16:00:00Z'
);
const after = versionsPayload(db.prepare(SQL.versions).all(7));
assert.equal(after.length, 4, 'the restore is a NEW version, nothing replaced');
assert.equal(after[0].id, 7, 'the restored copy is now the newest (6 belongs to the other project)');
assert.equal(after[0].current, true, 'and it is the one marked you are here');
assert.equal(after[1].id, 5, 'the version you left is still listed');
assert.equal(after[1].current, false, 'and is no longer "here"');
assert.equal(after[1].version, 3, 'existing version numbers do not shift');
assert.equal(after[3].id, 1, 'the oldest version is still listed at the bottom');
assert.equal(JSON.parse(db.prepare(SQL.restoreSource).get(7).generated_code)[0].path,
  restored[0].path, 'the restored copy carries the old version\'s files');
console.log('PASS  restore: appends v4 (id 7) from v2, keeps v3 listed, old numbers unchanged');

// every row the panel reads must still be well formed after the restore
assert.ok(after.every(v => v.id && v.version >= 1 && typeof v.current === 'boolean' && v.created_at),
  'every payload row stays well formed');

console.log('\nall 8 checks passed');
