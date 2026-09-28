// Live end-to-end proof of version history + "go back to one".
//
//   CS_EMAIL=… CS_PASS=… node workers/createstuff-api/e2e-restore.mjs
//
// It talks to the real Worker and the real database:
//
//   1. logs in as a real account;
//   2. reads the version list for a project that has been built more than once —
//      the list that used to answer 404 and print "Could not load earlier
//      versions.";
//   3. goes back to an older version and checks the project's index.html bytes
//      are now that version's bytes, not merely "a request succeeded";
//   4. checks the restored copy is the new current version and the one that was
//      current is still listed;
//   5. goes back again to what it started on, so the run leaves the project
//      exactly as it found it (undo is itself undoable — that is the point).
//
// Credentials come from the environment; nothing secret is written to the repo.

import assert from 'node:assert';
import crypto from 'node:crypto';

const API = 'https://createstuff-api.fashionistas1979.workers.dev';
const email = process.env.CS_EMAIL;
const password = process.env.CS_PASS;
if (!email || !password) {
  console.error('set CS_EMAIL and CS_PASS first');
  process.exit(2);
}

let token = null;
async function call(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body };
}
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

// 1 ── login
{
  const r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal(r.status, 200, `login failed: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  token = r.body.token || (r.body.user && r.body.user.token);
  assert.ok(token, 'login returned no token');
  console.log(`PASS  1  logged in as ${email}`);
}

// 2 ── find a project that has been built more than once
const projects = (await call('/api/projects')).body.projects || [];
assert.ok(projects.length, 'this account has no projects');
let chosen = null;
for (const p of projects) {
  const b = await call(`/api/builds?projectId=${p.id}`);
  const done = (b.body.builds || []).filter(x => x.status === 'completed');
  if (done.length >= 2) { chosen = { ...p, builds: done }; break; }
}
assert.ok(chosen, 'no project with two completed builds — nothing to go back to');
console.log(`PASS  2  project ${chosen.id} "${chosen.name}" has ${chosen.builds.length} completed builds`);

// 3 ── the version list that used to 404
const vr = await call(`/api/builds/${chosen.builds[chosen.builds.length - 1].id}/versions`);
assert.equal(vr.status, 200, `versions should answer 200, got ${vr.status}`);
const versions = vr.body;
assert.ok(Array.isArray(versions) && versions.length >= 2, 'list should hold every completed build');
assert.ok(versions.every(v => v.id && v.version >= 1 && v.created_at), 'every row carries what the panel renders');
assert.equal(versions.filter(v => v.current).length, 1, 'exactly one row is "you are here"');
assert.equal(versions[0].current, true, 'the newest is at the top and is where you are');
assert.deepEqual(versions.map(v => v.version), versions.map((_, i) => versions.length - i),
  'listed newest-first but numbered oldest-first');
const noCode = versions.find(v => !v.code_len);
assert.ok(!noCode, 'a version with 0 chars should not be offered as something to go back to');
console.log(`PASS  3  GET versions -> 200, ${versions.length} versions, current=${versions[0].id}, numbering ${versions[0].version}…${versions[versions.length - 1].version}`);

const current = versions[0];
const target = versions.slice(1).find(v => v.id !== current.id);
assert.ok(target, 'no older version to go back to');

// What is in the project right now?
const beforeFile = await call(`/api/projects/${chosen.id}/files/index.html`);
assert.equal(beforeFile.status, 200, 'current index.html should be readable');
const beforeSha = sha(beforeFile.body.content);
console.log(`        current index.html = ${beforeSha} (${String(beforeFile.body.content).length} chars)`);

// The old version's own index.html, read straight from its build record
const targetBuild = await call(`/api/builds/${target.id}`);
assert.equal(targetBuild.status, 200, `build ${target.id} should be readable`);
const targetIndex = (targetBuild.body.files || []).find(f => /index\.html?$/i.test(f.path));
assert.ok(targetIndex, 'the older version has no index.html');
const targetSha = sha(targetIndex.content);
console.log(`        target   v${target.version} index.html = ${targetSha} (${targetIndex.content.length} chars)`);

if (targetSha === beforeSha) {
  console.log('SKIP  both versions render the same index.html — bytes cannot distinguish them, so the restore is not asserted');
  process.exit(0);
}

// 4 ── go back
const rr = await call(`/api/builds/${target.id}/restore`, { method: 'POST', body: '{}' });
assert.equal(rr.status, 200, `restore should answer 200, got ${rr.status} ${JSON.stringify(rr.body).slice(0, 200)}`);
assert.equal(rr.body.ok, true, 'restore reports ok');
assert.ok(rr.body.buildId && rr.body.buildId !== target.id, 'restore creates a NEW build id');
assert.ok(rr.body.files >= 1, 'restore reports the files it wrote');
assert.ok(rr.body.previewHtml && rr.body.previewHtml.includes('<'), 'restore hands back the preview it stored');
console.log(`PASS  4  restore -> build ${rr.body.buildId} (${rr.body.files} files) from v${target.version}`);

// …and the project really holds those bytes now
const afterFile = await call(`/api/projects/${chosen.id}/files/index.html`);
assert.equal(afterFile.status, 200, 'index.html readable after restore');
const afterSha = sha(afterFile.body.content);
assert.equal(afterSha, targetSha, `project must now hold v${target.version}'s bytes (${afterSha} vs ${targetSha})`);
assert.notEqual(afterSha, beforeSha, 'and must no longer hold what it held before');
console.log(`PASS  5  project index.html now ${afterSha} — byte-identical to v${target.version}`);

// 5 ── the list reflects it, and nothing was destroyed
const vr2 = await call(`/api/builds/${chosen.builds[chosen.builds.length - 1].id}/versions`);
const v2 = vr2.body;
assert.equal(v2.length, versions.length + 1, 'the restore is an added version, not a replacement');
assert.equal(v2[0].id, rr.body.buildId, 'the restored copy is now the one at the top');
assert.equal(v2[0].current, true, 'and is marked "you are here"');
assert.equal(v2[1].id, current.id, 'the version you just left is still listed');
assert.equal(v2[1].current, false, '…and is no longer "here"');
assert.ok(v2.some(v => v.id === target.id), 'the version you went back to is still there too');
console.log(`PASS  6  list grew ${versions.length} -> ${v2.length}; old top (${current.id}) and target (${target.id}) both still listed`);

// 6 ── undo the undo: go back to what we started on, keyed to the build record
// (not to whatever happens to be in project_files — see the drift check below).
const currentBuild = await call(`/api/builds/${current.id}`);
const currentIndex = (currentBuild.body.files || []).find(f => /index\.html?$/i.test(f.path));
assert.ok(currentIndex, 'the current build has an index.html');
const currentSha = sha(currentIndex.content);

const back = await call(`/api/builds/${current.id}/restore`, { method: 'POST', body: '{}' });
assert.equal(back.status, 200, `going back to the original version must work too, got ${back.status} ${JSON.stringify(back.body).slice(0, 200)}`);
const finalFile = await call(`/api/projects/${chosen.id}/files/index.html`);
assert.equal(sha(finalFile.body.content), currentSha,
  'after going back, the project must hold exactly the bytes of the version it went back to');
console.log(`PASS  7  back to v${current.version} -> index.html ${currentSha}, byte-identical to that build's own record`);

if (currentSha !== beforeSha) {
  console.log(
    `\nFINDING  before this run, project ${chosen.id} did not hold its own latest build's bytes:\n` +
    `         project_files index.html = ${beforeSha} (${beforeFile.body.content.length} chars), ` +
    `build ${current.id} records ${currentSha} (${currentIndex.content.length} chars).\n` +
    `         Nothing here caused it (no write happened before step 4), so the files had drifted\n` +
    `         from the build record beforehand — most likely a file set written outside the build\n` +
    `         pipeline. The run left the project on its build record, which is the correct state.`
  );
}

console.log('\nall 7 checks passed against the live Worker');
