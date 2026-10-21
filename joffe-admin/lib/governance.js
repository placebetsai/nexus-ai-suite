// Editing governance for the local admin: a content-addressed snapshot of every
// file before and after a change, plus an append-only JSONL history. Nothing
// here is a substitute for git — it exists so a save in the admin can always be
// inspected and undone without leaving the browser, including bulk operations
// that touch every page on a site.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function createGovernance({ stateDir, maxEntries = 20_000 } = {}) {
  if (!stateDir) throw new Error("stateDir is required");
  const blobs = path.join(stateDir, "blobs");
  const auditFile = path.join(stateDir, "audit.jsonl");
  fs.mkdirSync(blobs, { recursive: true });

  function store(buf) {
    const hash = sha256(buf);
    const file = path.join(blobs, hash);
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf, { mode: 0o600 });
    return hash;
  }

  function snapshot(file) {
    if (!fs.existsSync(file)) return "";
    return store(fs.readFileSync(file));
  }

  function writeAtomic(file, bytes) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o664;
    const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
    fs.writeFileSync(temp, bytes, { mode });
    fs.renameSync(temp, file);
  }

  function append(entry) {
    fs.appendFileSync(auditFile, `${JSON.stringify(entry)}\n`);
    // Keep the log bounded without rewriting it on every single save.
    try {
      const size = fs.statSync(auditFile).size;
      if (size > 8 * 1024 * 1024) {
        const lines = fs.readFileSync(auditFile, "utf8").trim().split("\n").filter(Boolean);
        if (lines.length > maxEntries) {
          const kept = `${lines.slice(-maxEntries).join("\n")}\n`;
          fs.writeFileSync(auditFile, kept, { mode: 0o600 });
        }
      }
    } catch {
      // History must never make a content save fail.
    }
  }

  function write({ file, site, rel, next, action = "save", note = "", actionId }) {
    const beforeBuf = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
    const before = beforeBuf.length ? store(beforeBuf) : "";
    const after = store(Buffer.from(next));
    if (before === after) return { changed: false, before, after, actionId };
    writeAtomic(file, next);
    const id = actionId || crypto.randomUUID();
    append({
      id,
      at: new Date().toISOString(),
      site,
      action,
      path: rel,
      before,
      after,
      bytes: Buffer.byteLength(next),
      note,
    });
    return { changed: true, before, after, actionId: id };
  }

  function record({ site, action, rel = "", note = "", before = "", after = "", actionId }) {
    const id = actionId || crypto.randomUUID();
    append({
      id,
      at: new Date().toISOString(),
      site,
      action,
      path: rel,
      before,
      after,
      bytes: 0,
      note,
    });
    return id;
  }

  function readEntries() {
    if (!fs.existsSync(auditFile)) return [];
    return fs
      .readFileSync(auditFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  function history(site, { limit = 100, rel = "" } = {}) {
    return readEntries()
      .filter((entry) => entry.site === site && (!rel || entry.path === rel))
      .slice(-limit)
      .reverse();
  }

  function revisions(site, rel, { limit = 40 } = {}) {
    return history(site, { limit, rel }).filter((entry) => entry.before || entry.after);
  }

  function readBlob(hash) {
    if (!/^[a-f0-9]{64}$/.test(String(hash || ""))) {
      throw Object.assign(new Error("That revision is not valid"), { status: 400 });
    }
    const file = path.join(blobs, hash);
    if (!fs.existsSync(file)) throw Object.assign(new Error("That revision is no longer stored"), { status: 404 });
    return fs.readFileSync(file);
  }

  function restore({ file, site, rel, hash, note = "" }) {
    const target = readBlob(hash);
    const before = snapshot(file);
    const after = store(target);
    if (before === after) return { changed: false, before, after };
    writeAtomic(file, target);
    const id = crypto.randomUUID();
    append({
      id,
      at: new Date().toISOString(),
      site,
      action: "restore",
      path: rel,
      before,
      after,
      bytes: target.length,
      note: note || "Restored an earlier revision",
    });
    return { changed: true, before, after, actionId: id };
  }

  function remove({ file, site, rel, note = "" }) {
    if (!fs.existsSync(file)) return { changed: false, before: "", after: "" };
    const before = snapshot(file);
    fs.unlinkSync(file);
    const id = crypto.randomUUID();
    append({
      id,
      at: new Date().toISOString(),
      site,
      action: "delete",
      path: rel,
      before,
      after: "",
      bytes: 0,
      note,
    });
    return { changed: true, before, after: "", actionId: id };
  }

  return { stateDir, auditFile, snapshot, write, record, history, revisions, readBlob, restore, remove };
}
