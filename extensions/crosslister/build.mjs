// Builds the two things the app serves:
//   apps/fashionistas/fashionistas-fill-bookmarklet.txt  (javascript: link for the "Fashionistas Fill" bookmark)
//   apps/fashionistas/fashionistas-crosslister.zip        (the extension)
// Run: node extensions/crosslister/build.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "../../apps/fashionistas");

// Comments are stripped line by line (only whole-line // comments) so the link
// stays short; everything else is kept verbatim.
const strip = (src) => src.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const code = "(()=>{" + strip(fs.readFileSync(path.join(HERE, "fill.js"), "utf8")) + "\n" + strip(fs.readFileSync(path.join(HERE, "bookmarklet.js"), "utf8")) + "\n})();void 0";
const href = "javascript:" + encodeURIComponent(code);
fs.writeFileSync(path.join(APP, "fashionistas-fill-bookmarklet.txt"), href);
console.log("bookmarklet", href.length, "chars");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xlzip-"));
const dir = path.join(tmp, "fashionistas-crosslister");
fs.mkdirSync(path.join(dir, "icons"), { recursive: true });
for (const f of ["manifest.json", "background.js", "bridge.js", "fill.js", "filler.js", "popup.html", "popup.js"]) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
for (const f of fs.readdirSync(path.join(HERE, "icons"))) fs.copyFileSync(path.join(HERE, "icons", f), path.join(dir, "icons", f));
const zip = path.join(APP, "fashionistas-crosslister.zip");
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "fashionistas-crosslister"], { cwd: tmp });
console.log("zip", fs.statSync(zip).size, "bytes");
