import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createGovernance } from "../lib/governance.js";

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "joffe-governance-"));
  return { root, state: path.join(root, ".state"), file: path.join(root, "page.html") };
}

test("a save keeps the previous version and can restore it", () => {
  const { state, file } = workspace();
  fs.writeFileSync(file, "<h1>Old</h1>");
  const gov = createGovernance({ stateDir: state });
  const first = gov.write({ file, site: "com", rel: "page.html", next: "<h1>New</h1>", note: "test" });
  assert.equal(first.changed, true);
  assert.equal(fs.readFileSync(file, "utf8"), "<h1>New</h1>");
  assert.equal(gov.readBlob(first.before).toString(), "<h1>Old</h1>");
  const restored = gov.restore({ file, site: "com", rel: "page.html", hash: first.before });
  assert.equal(restored.changed, true);
  assert.equal(fs.readFileSync(file, "utf8"), "<h1>Old</h1>");
  const history = gov.history("com", { rel: "page.html" });
  assert.equal(history.length, 2);
  assert.equal(history[0].action, "restore");
});

test("an identical save is not recorded as a change", () => {
  const { state, file } = workspace();
  fs.writeFileSync(file, "same");
  const gov = createGovernance({ stateDir: state });
  const result = gov.write({ file, site: "com", rel: "page.html", next: "same" });
  assert.equal(result.changed, false);
  assert.equal(gov.history("com").length, 0);
});

test("history is scoped to one site and newest first", () => {
  const { state, file } = workspace();
  fs.writeFileSync(file, "one");
  const gov = createGovernance({ stateDir: state });
  gov.write({ file, site: "com", rel: "page.html", next: "two" });
  gov.write({ file, site: "org", rel: "page.html", next: "three" });
  const com = gov.history("com");
  assert.equal(com.length, 1);
  assert.equal(com[0].after.length, 64);
  assert.equal(gov.history("org").length, 1);
});

test("delete keeps a restorable snapshot", () => {
  const { state, file } = workspace();
  fs.writeFileSync(file, "keep me");
  const gov = createGovernance({ stateDir: state });
  const result = gov.remove({ file, site: "com", rel: "page.html" });
  assert.equal(result.changed, true);
  assert.equal(fs.existsSync(file), false);
  assert.equal(gov.readBlob(result.before).toString(), "keep me");
  gov.restore({ file, site: "com", rel: "page.html", hash: result.before });
  assert.equal(fs.readFileSync(file, "utf8"), "keep me");
});
