import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  MENTIONS,
  addNavLink,
  appendParagraph,
  applyBacklinks,
  absoluteImage,
  ensureMentions,
  flatSibling,
  insertImage,
  readBacklinkNav,
  readFooter,
  readPage,
  removeImage,
  removeNavLink,
  relToUrl,
  renameNavLink,
  removeSitemap,
  removeSitemapImages,
  upsertSitemap,
  upsertSitemapImages,
  urlToRel,
  writeFooter,
  writeIcons,
  writePage,
  pageShell,
} from "./lib/edit.js";
import { imageSize, humanBytes } from "./lib/images.js";
import { createGovernance, sha256 } from "./lib/governance.js";
import { auditSite } from "./lib/seo.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NEXUS = path.resolve(ROOT, "..");
const PASSWORD_FILE = process.env.JOFFE_ADMIN_PASSWORD_FILE || path.join(NEXUS, ".secrets", "joffe-admin.password");
const PUBLIC = path.join(ROOT, "public");
const STATE_DIR = process.env.JOFFE_ADMIN_STATE || path.join(ROOT, ".state");
const governance = createGovernance({ stateDir: STATE_DIR });
const seoCache = new Map();
const loginAttempts = new Map();
const SESSION_MS = 1000 * 60 * 60 * 12;
const CSRF_COOKIE = "joffe_admin_csrf";
const CSRF_HEADER = "x-joffe-csrf";

// Every federation property, minus ketiservice.com (owner: leave alone).
//
// mode "static" — `dir` is the source of truth; an edit here survives forever.
// mode "build"  — `dir` is generated output (`.vercel/output/static` or `out`).
//                 The portal edits real HTML and publishing works, but the NEXT
//                 build overwrites it. The UI shows that warning per site so
//                 nobody edits one of these and assumes it is permanent.
const BUILD_NOTE = "Generated output — publish right after editing; the next build overwrites these files.";
const PROJECTS_ROOT = path.resolve(NEXUS, "..");

const SITES = [
  { id: "com", host: "israeljoffe.com", label: "israeljoffe.com", dir: path.join(NEXUS, "israeljoffe-com"), project: "israeljoffe-com", eyebrow: "Israel Joffe", mode: "static", safeDeploy: ["israeljoffe-com"] },
  { id: "org", host: "israeljoffe.org", label: "israeljoffe.org", dir: path.join(NEXUS, "israeljoffe-org"), project: "israeljoffe-org", eyebrow: "Israel Joffe", mode: "static" },
  { id: "wuw", host: "wuwonline.com", label: "wuwonline.com", dir: path.join(PROJECTS_ROOT, "wuwonline-com"), project: "wuwonline-com", eyebrow: "WUW", mode: "static" },
  { id: "rjw", host: "religiousjews.com", label: "religiousjews.com", dir: path.join(PROJECTS_ROOT, "religiousjews-com"), project: "religiousjews", eyebrow: "Religious Jews", mode: "static" },
  // The live fashionistas.ai source is the project copy. A stale copy in the
  // home directory was silently being edited instead, so menu and SEO saves
  // never reached the site people actually see.
  { id: "fash", host: "fashionistas.ai", label: "fashionistas.ai", dir: path.join(PROJECTS_ROOT, "fashionistas-ai"), project: "fashionistas-ai", eyebrow: "Fashionistas", mode: "static" },
  { id: "cs", host: "createstuff.ai", label: "createstuff.ai", dir: path.join(NEXUS, "apps", "createstuff-marketing"), project: "createstuff-marketing", eyebrow: "CreateStuff", mode: "static", safeDeploy: ["createstuff-marketing", "apps/createstuff-marketing"] },

  { id: "hid", host: "hiddencameras.tv", label: "hiddencameras.tv", dir: path.join(PROJECTS_ROOT, "hiddencameras-tv", "out"), project: "hiddencameras", eyebrow: "HiddenCameras", mode: "build", note: BUILD_NOTE },
  { id: "stv", host: "spanishtvshows.com", label: "spanishtvshows.com", dir: path.join(PROJECTS_ROOT, "Spanishtvshows.com", ".vercel", "output", "static"), project: "spanishtvshows-site", eyebrow: "Spanish TV Shows", mode: "build", note: BUILD_NOTE },
  { id: "sco", host: "scooter.exchange", label: "scooter.exchange", dir: path.join(PROJECTS_ROOT, "scooters-exchange", "apps", "web", ".vercel", "output", "static"), project: "scooters-exchange", eyebrow: "Scooter Exchange", mode: "build", note: BUILD_NOTE },
  { id: "dia", host: "diamonds.forsale", label: "diamonds.forsale", dir: path.join(PROJECTS_ROOT, "diamonds-forsale", ".vercel", "output", "static"), project: "diamonds-forsale", eyebrow: "Diamonds", mode: "build", note: BUILD_NOTE },
  // ihatecollege.com/sitemap.xml is a <sitemapindex>; its <urlset> lives in
  // sitemap-static.xml, which is what actually gets submitted. Pointing the
  // portal at the index would have silently written nothing.
  { id: "ihc", host: "ihatecollege.com", label: "ihatecollege.com", dir: path.join(PROJECTS_ROOT, "Ihatecollege", ".vercel", "output", "static"), project: "ihatecollege", eyebrow: "IHateCollege", mode: "build", sitemap: "sitemap-static.xml", note: `${BUILD_NOTE} Its sitemap lives in sitemap-static.xml.` },
  // Both sites below are served by a Worker, so they have no index.html on
  // disk: the home page cannot be edited, everything else can.
  { id: "pb", host: "placebets.ai", label: "placebets.ai", dir: path.join(PROJECTS_ROOT, "Placebetsai-src", ".vercel", "output", "static"), project: "placebetsai", eyebrow: "PlaceBets", mode: "build", note: `${BUILD_NOTE} Its home page is rendered by a Worker, so it is not editable here.` },
  { id: "mkt", host: "marketpicks.ai", label: "marketpicks.ai", dir: path.join(PROJECTS_ROOT, "marketpicks-ai", ".vercel", "output", "static"), project: "marketpicks-ai", eyebrow: "MarketPicks", mode: "build", note: `${BUILD_NOTE} Its home page and sitemap are generated by its Next routes, so only the prerendered pages below are editable.` },
];

const sessions = new Map();
let publishJob = { running: false, log: "", code: null, host: "" };

function password() {
  if (!fs.existsSync(PASSWORD_FILE)) {
    fs.mkdirSync(path.dirname(PASSWORD_FILE), { recursive: true });
    const created = crypto.randomBytes(12).toString("base64url");
    fs.writeFileSync(PASSWORD_FILE, `${created}\n`, { mode: 0o600 });
  }
  return fs.readFileSync(PASSWORD_FILE, "utf8").trim();
}

function siteById(id) {
  const site = SITES.find((item) => item.id === id);
  if (!site) throw Object.assign(new Error("Unknown site"), { status: 404 });
  if (!fs.existsSync(site.dir)) throw Object.assign(new Error(`Site folder is missing: ${site.dir}`), { status: 500 });
  return site;
}

function inside(site, rel) {
  const file = path.resolve(site.dir, rel);
  const root = path.resolve(site.dir);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    throw Object.assign(new Error("That file is outside the site"), { status: 400 });
  }
  return file;
}

const IMAGE_REL = /^img\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;

function noteOf(body) {
  return String(body?.note || "").trim().slice(0, 500);
}

function clearSeo(site) {
  seoCache.delete(site.id);
}

function writeAudited(site, rel, next, { action = "save", note = "", actionId } = {}) {
  const file = inside(site, rel);
  const result = governance.write({ file, site: site.id, rel, next, action, note, actionId });
  if (result.changed) clearSeo(site);
  return result;
}

function deleteAudited(site, rel, note = "") {
  const file = inside(site, rel);
  const result = governance.remove({ file, site: site.id, rel, note });
  if (result.changed) clearSeo(site);
  return result;
}

function revisionOf(file) {
  if (!fs.existsSync(file)) return "";
  return sha256(fs.readFileSync(file));
}

function assertRevision(site, rel, revision, { required = false } = {}) {
  if (!revision) {
    if (required) {
      throw Object.assign(new Error("Reload this page before saving — the editor needs its current revision."), { status: 428 });
    }
    return;
  }
  const current = revisionOf(inside(site, rel));
  if (current !== revision) {
    throw Object.assign(new Error("This page changed on disk since you opened it. Reload the page and reapply your edit."), { status: 409 });
  }
}

function imageSitemapPathOf(site) {
  return path.join(site.dir, "sitemap-images.xml");
}

function imagesForSitemap(site, html) {
  const page = readPage(html);
  const origin = `https://${site.host}/`;
  const images = [];
  for (const image of page.images) {
    const src = image.src || "";
    if (!src || /^data:/i.test(src)) continue;
    images.push({
      src: absoluteImage(src, origin),
      title: page.title || "",
      caption: image.alt || "",
    });
  }
  if (page.socialImage) {
    images.unshift({
      src: absoluteImage(page.socialImage, origin),
      title: page.title || "",
      caption: page.socialAlt || "",
    });
  }
  const seen = new Set();
  return images.filter((image) => {
    if (!image.src || seen.has(image.src)) return false;
    seen.add(image.src);
    return true;
  }).slice(0, 30);
}

function withImageDimensions(site, page) {
  for (const image of page.images) {
    if (Number(image.width) > 0 && Number(image.height) > 0) continue;
    const src = String(image.src || "").split("?")[0];
    if (!src || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("data:")) continue;
    try {
      const rel = decodeURIComponent(src.replace(/^\/+/, ""));
      if (!rel || rel.includes("..")) continue;
      const file = path.join(site.dir, rel);
      if (!fs.existsSync(file)) continue;
      const size = imageSize(fs.readFileSync(file));
      if (size) {
        image.width = size.width;
        image.height = size.height;
      }
    } catch {
      // Leave a broken or non-image reference alone; the audit will flag it.
    }
  }
  return page;
}

function syncImageSitemap(site, urlPath, html, include = true) {
  const file = imageSitemapPathOf(site);
  if (!fs.existsSync(file)) return { updated: false, reason: "no image sitemap" };
  const loc = pageLoc(site, urlPath);
  const xml = fs.readFileSync(file, "utf8");
  const next = include
    ? upsertSitemapImages(xml, loc, imagesForSitemap(site, html))
    : removeSitemapImages(xml, loc);
  if (next === xml) return { updated: false };
  writeAudited(site, "sitemap-images.xml", next, { action: include ? "image-sitemap" : "image-sitemap-remove", note: urlPath });
  return { updated: true };
}

function walkPages(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "img" || entry.name === "functions") continue;
    if (entry.name.includes("?")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, root, out);
    // `x.html` in ANY directory: Next/Cloudflare Pages emits `about.html`,
    // `blog/post.html` etc. Restricting .html to the root folder hid 208 of
    // ihatecollege's 254 pages and 243 of scooter.exchange's 265 from here.
    else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  return out;
}

function walkImages(dir, root, out, depth = 0) {
  if (depth > 4 || !fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkImages(full, root, out, depth + 1);
    else if (entry.isFile() && IMAGE_TYPES[path.extname(entry.name).toLowerCase()] && path.extname(entry.name).toLowerCase() !== ".svg") {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  return out;
}

// urlToRel() is pure and maps /about -> about/index.html. On a Next output dir
// the file is actually about.html, so a path straight out of urlToRel 404s on
// read. Resolve against what is really on disk before falling back.
function urlToRelFor(site, urlPath) {
  const rel = urlToRel(urlPath);
  if (fs.existsSync(path.join(site.dir, rel))) return rel;
  const flat = flatSibling(rel);
  if (flat && fs.existsSync(path.join(site.dir, flat))) return flat;
  return rel; // no such file — readHtml() reports the real 404
}

function pagesOf(site) {
  return walkPages(site.dir, site.dir, []).sort((a, b) => relToUrl(a).localeCompare(relToUrl(b)));
}

function readHtml(site, rel) {
  const file = inside(site, rel);
  if (!fs.existsSync(file)) throw Object.assign(new Error("Page not found"), { status: 404 });
  return { file, html: fs.readFileSync(file, "utf8") };
}

function mentionReport(site) {
  const pages = pagesOf(site);
  let withAll = 0;
  for (const rel of pages) {
    const html = fs.readFileSync(inside(site, rel), "utf8");
    if (MENTIONS.every((link) => html.includes(link.href))) withAll += 1;
  }
  return { pages: pages.length, withAll, links: MENTIONS };
}

function applyMentions(site) {
  let changed = 0;
  const actionId = crypto.randomUUID();
  for (const rel of pagesOf(site)) {
    const file = inside(site, rel);
    const html = fs.readFileSync(file, "utf8");
    const next = ensureMentions(html, {
      personPage: rel === "israel-joffe/index.html",
      origin: `https://${site.host}/`,
    });
    if (next !== html) {
      writeAudited(site, rel, next, { action: "mentions", note: "Added Israel Joffe profile links", actionId });
      changed += 1;
    }
  }
  return { changed, ...mentionReport(site) };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2_000_000) {
        reject(Object.assign(new Error("That update is too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Send JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

const IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("That file is over 20 MB"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) throw Object.assign(new Error("Choose an image file"), { status: 400 });
  const boundary = Buffer.from(`--${(match[1] || match[2]).trim()}`);
  const parts = [];
  let cursor = buffer.indexOf(boundary);
  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;
    else if (buffer[cursor] === 10) cursor += 1;
    const next = buffer.indexOf(boundary, cursor);
    if (next === -1) break;
    let chunk = buffer.subarray(cursor, next);
    if (chunk.length >= 2 && chunk[chunk.length - 2] === 13 && chunk[chunk.length - 1] === 10) chunk = chunk.subarray(0, -2);
    const sep = chunk.indexOf(Buffer.from("\r\n\r\n"));
    const gap = sep === -1 ? 2 : 4;
    const headerEnd = sep === -1 ? chunk.indexOf(Buffer.from("\n\n")) : sep;
    if (headerEnd < 0) break;
    const headers = chunk.subarray(0, headerEnd).toString("utf8");
    parts.push({
      name: /name="([^"]*)"/.exec(headers)?.[1] || "",
      filename: /filename="([^"]*)"/.exec(headers)?.[1] || "",
      body: chunk.subarray(headerEnd + gap),
    });
    cursor = next;
  }
  return parts;
}

function partValue(parts, name) {
  return (parts.find((part) => part.name === name)?.body.toString("utf8") || "").trim();
}

function bodyRevision(req, parts) {
  return partValue(parts, "revision");
}

function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return ".png";
  if (buf.length > 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return ".gif";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return ".webp";
  if (buf.length > 12 && buf.toString("ascii", 4, 8) === "ftyp") return ".avif";
  return "";
}

function sniffSvg(buf) {
  if (buf.length > 200 * 1024) return "";
  const text = buf.toString("utf8");
  if (/<script|foreignObject|<!ENTITY/i.test(text)) return "";
  if (!/<svg[\s>]/i.test(text)) return "";
  return ".svg";
}

function defaultAlt(site) {
  return site.id === "wuw" ? "World of Unpredictable Wrestling" : "Israel Joffe";
}

function adminFile(site) {
  return path.join(site.dir, "admin.json");
}

function currentBacklinks(site) {
  const file = adminFile(site);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data.backlinks) ? data.backlinks : [];
  }
  // Fallback discovery reads the home page. placebets.ai and marketpicks.ai are
  // Worker-rendered and have no index.html, so there is nothing to read from.
  const indexPath = path.join(site.dir, "index.html");
  if (!fs.existsSync(indexPath)) return [];
  const html = fs.readFileSync(indexPath, "utf8");
  const managed = readBacklinkNav(html);
  if (managed.length) return managed;
  return MENTIONS.filter((link) => html.includes(link.href)).map(({ href, label }) => ({ href, label }));
}

function cleanBacklinks(links) {
  if (!Array.isArray(links)) throw Object.assign(new Error("Add a label and an https URL"), { status: 400 });
  return links.map((link) => {
    const label = String(link.label || "").trim();
    const href = String(link.href || "").trim();
    if (!label || !/^https:\/\/\S+$/i.test(href)) {
      throw Object.assign(new Error("Each backlink needs a label and an https URL"), { status: 400 });
    }
    return { label, href };
  });
}

function cleanFooterGroups(groups) {
  if (!Array.isArray(groups)) throw Object.assign(new Error("Footer links are missing"), { status: 400 });
  return groups.map((group) => {
    const id = String(group.id || "");
    if (!["social", "meta", "network", "refs", "backlinks"].includes(id)) {
      throw Object.assign(new Error("Unknown footer section"), { status: 400 });
    }
    const links = (Array.isArray(group.links) ? group.links : []).map((link) => {
      const label = String(link.label || "").trim();
      const href = String(link.href || "").trim();
      const relativeOk = id === "network" || id === "social" || id === "meta";
      const ok = /^https:\/\/\S+$/i.test(href) || (relativeOk && /^\/\S*$/.test(href)) || /^(mailto:|tel:)\S+$/i.test(href);
      if (!label || !ok) {
        throw Object.assign(new Error(`“${label || "A footer link"}” needs a label and a URL`), { status: 400 });
      }
      return { label, href };
    });
    return { id, label: String(group.label || ""), links };
  });
}

function writeFooterLinks(site, groups) {
  const clean = cleanFooterGroups(groups);
  const actionId = crypto.randomUUID();
  const back = clean.find((group) => group.id === "backlinks");
  if (back) {
    writeAudited(site, "admin.json", `${JSON.stringify({ backlinks: back.links }, null, 2)}\n`, {
      action: "footer-config",
      note: "Saved footer backlinks",
      actionId,
    });
  }
  let updated = 0;
  for (const rel of pagesOf(site)) {
    const file = inside(site, rel);
    const html = fs.readFileSync(file, "utf8");
    const next = writeFooter(html, clean);
    if (next !== html) {
      writeAudited(site, rel, next, { action: "footer", note: "Updated footer links", actionId });
      updated += 1;
    }
  }
  return { updated, groups: clean };
}

function writeBacklinks(site, links) {
  const previous = currentBacklinks(site).map((link) => link.href);
  const clean = cleanBacklinks(links);
  const actionId = crypto.randomUUID();
  writeAudited(site, "admin.json", `${JSON.stringify({ backlinks: clean }, null, 2)}\n`, {
    action: "backlinks-config",
    note: "Saved extra footer links",
    actionId,
  });
  let updated = 0;
  for (const rel of pagesOf(site)) {
    const file = inside(site, rel);
    const html = fs.readFileSync(file, "utf8");
    const next = applyBacklinks(html, clean, previous);
    if (next !== html) {
      writeAudited(site, rel, next, { action: "backlinks", note: "Updated extra footer links", actionId });
      updated += 1;
    }
  }
  return { updated, links: clean };
}

function pageLoc(site, urlPath) {
  return `https://${site.host}${urlPath}`;
}

function sitemapPathOf(site) {
  return path.join(site.dir, site.sitemap || "sitemap.xml");
}

function placement(site, urlPath, navHrefs, sitemapLocs) {
  return {
    inNav: navHrefs.has(urlPath),
    inSitemap: sitemapLocs.has(pageLoc(site, urlPath)),
  };
}

function siteNavAndSitemap(site) {
  const indexPath = path.join(site.dir, "index.html");
  // placebets.ai and marketpicks.ai are rendered by a Worker: there is no
  // index.html on disk. Absence of a home page must not 500 the whole site.
  const home = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
  const navHrefs = home ? new Set(readPage(home).nav.map((link) => link.href)) : new Set();
  const sitemapPath = sitemapPathOf(site);
  const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  // Sitemaps disagree about a trailing slash (`https://host/x` vs `/x/`) —
  // match both so a page that IS listed never reads back as "not in sitemap".
  const sitemapLocs = new Set();
  for (const found of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const value = found[1].trim();
    sitemapLocs.add(value);
    sitemapLocs.add(value.replace(/\/+$/, ""));
    sitemapLocs.add(value.endsWith("/") ? value : `${value}/`);
  }
  return { navHrefs, sitemap, sitemapPath, sitemapLocs };
}

function setInSitemap(site, urlPath, include, html = "") {
  const sitemapPath = sitemapPathOf(site);
  const loc = pageLoc(site, urlPath);
  if (!fs.existsSync(sitemapPath)) {
    // Never mint a sitemap here: on marketpicks.ai the real sitemap is
    // generated by a route (143 URLs). A one-URL file could shadow it.
    throw Object.assign(
      new Error(`${site.host} has no ${site.sitemap || "sitemap.xml"} in its build output — its sitemap is generated, so add the page in source instead.`),
      { status: 409 },
    );
  }
  const xml = fs.readFileSync(sitemapPath, "utf8");
  let next = include ? upsertSitemap(xml, loc) : removeSitemap(xml, loc);
  if (include && html) next = upsertSitemapImages(next, loc, imagesForSitemap(site, html));
  if (next !== xml) {
    writeAudited(site, site.sitemap || "sitemap.xml", next, {
      action: include ? "sitemap-add" : "sitemap-remove",
      note: urlPath,
    });
  }
  syncImageSitemap(site, urlPath, html, include);
}

function setInNav(site, urlPath, label, include) {
  if (urlPath === "/") return 0;
  if (!fs.existsSync(path.join(site.dir, "index.html"))) {
    // The navigation lives in the home page, which these sites do not have as
    // a file. Saying "0 updated" would look like success — say what happened.
    throw Object.assign(
      new Error(`${site.host} has no home page file, so navigation links cannot be added there.`),
      { status: 409 },
    );
  }
  const home = fs.readFileSync(inside(site, "index.html"), "utf8");
  const homeNav = readPage(home).nav;
  const found = homeNav.find((link) => link.href === urlPath);
  const exists = Boolean(found);
  let change = null;
  if (include && !exists) change = (html) => addNavLink(html, urlPath, label);
  else if (!include && exists) change = (html) => removeNavLink(html, urlPath);
  else if (include && exists && label && found.label !== label) {
    const from = found.label;
    change = (html) => renameNavLink(html, urlPath, from, label);
  }
  if (!change) return 0;
  // Touch only the one <a> that changed. Rebuilding each <nav> from the parsed
  // model loses structure on the way in — on religiousjews.com that flattened
  // three <nav-group> blocks out of 31 files from a single menu save.
  let updated = 0;
  const actionId = crypto.randomUUID();
  for (const rel of pagesOf(site)) {
    const file = inside(site, rel);
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes('class="primary"')) continue;
    const next = change(html);
    if (next !== html) {
      writeAudited(site, rel, next, { action: "nav", note: urlPath, actionId });
      updated += 1;
    }
  }
  return updated;
}

function cookieValue(req, name) {
  const header = req.headers.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function cookieToken(req) {
  return cookieValue(req, "joffe_admin");
}

function csrfToken(req) {
  return cookieValue(req, CSRF_COOKIE);
}

function secureCookies(req) {
  return Boolean(req.socket.encrypted) || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "local";
}

function loginAllowed(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return true;
  if (entry.blockedUntil && entry.blockedUntil > now) return false;
  if (entry.reset < now) {
    loginAttempts.delete(ip);
    return true;
  }
  return entry.count < 5;
}

function noteLoginFailure(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, reset: now + 10 * 60 * 1000, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) entry.blockedUntil = now + 10 * 60 * 1000;
  loginAttempts.set(ip, entry);
}

function sameToken(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function checkCsrf(req, url) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || url.pathname === "/api/login") return null;
  const origin = String(req.headers.origin || "");
  if (origin) {
    try {
      if (new URL(origin).host !== String(req.headers.host || "")) return "Cross-site request blocked";
    } catch {
      return "Cross-site request blocked";
    }
  }
  if (!sameToken(csrfToken(req), req.headers[CSRF_HEADER])) return "Missing or stale security token — reload the admin";
  return null;
}

function authed(req) {
  const token = cookieToken(req);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function startPublish(site) {
  if (publishJob.running) throw Object.assign(new Error("A publish is already running"), { status: 409 });
  const viaGate = Boolean(site.safeDeploy);
  const command = viaGate ? "bash" : "./deploy.sh";
  const args = viaGate
    ? ["scripts/deploy-safe-static.sh", ...site.safeDeploy]
    : ["pages", site.project, site.dir];
  publishJob = {
    running: true,
    log: `Publishing ${site.host}${viaGate ? " through the preview → smoke → production gate" : " directly"}…\n`,
    code: null,
    host: site.host,
    site: site.id,
    gate: viaGate,
  };
  governance.record({
    site: site.id,
    action: "publish-start",
    note: `${viaGate ? "safe gate" : "direct deploy"}: ${command} ${args.join(" ")}`,
  });
  const child = spawn(command, args, { cwd: NEXUS });
  const append = (chunk) => {
    publishJob.log += chunk.toString();
    if (publishJob.log.length > 180_000) publishJob.log = publishJob.log.slice(-150_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("close", (code) => {
    publishJob.running = false;
    publishJob.code = code;
    publishJob.log += `\nPublish finished with exit code ${code}.\n`;
    governance.record({
      site: site.id,
      action: code === 0 ? "publish-ok" : "publish-failed",
      note: `${site.host}: exit ${code}`,
    });
  });
}

function localPageExists(site, pathname) {
  const clean = String(pathname || "").split("#")[0].split("?")[0];
  if (!clean) return true;
  try {
    const rel = urlToRelFor(site, clean);
    if (fs.existsSync(path.join(site.dir, rel))) return true;
    if (fs.existsSync(path.join(site.dir, clean.replace(/^\/+/, "")))) return true;
  } catch {
    return false;
  }
  return false;
}

function seoAudit(site, { refresh = false } = {}) {
  const cached = seoCache.get(site.id);
  if (!refresh && cached && Date.now() - cached.at < 60_000) return cached.report;
  const pages = pagesOf(site).map((rel) => ({ rel, path: relToUrl(rel) }));
  const sitemapPath = sitemapPathOf(site);
  const imagePath = imageSitemapPathOf(site);
  const robotsPath = path.join(site.dir, "robots.txt");
  const report = auditSite({
    site,
    pages,
    read: (rel) => fs.readFileSync(inside(site, rel), "utf8"),
    sitemap: fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "",
    imageSitemap: fs.existsSync(imagePath) ? fs.readFileSync(imagePath, "utf8") : "",
    robots: fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf8") : "",
    hasImageSitemap: fs.existsSync(imagePath),
    // Worker-rendered sites do not have every route on disk, so link and
    // sitemap-local checks would report false breakage. Page-level SEO is
    // still useful for the files that do exist.
    checkLinks: site.mode === "static",
    checkSitemapLocals: site.mode === "static",
    pageExists: (pathname) => localPageExists(site, pathname),
  });
  seoCache.set(site.id, { at: Date.now(), report });
  return report;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8"));
    }
    if (req.method === "GET" && url.pathname.startsWith("/vendor/")) {
      const file = path.resolve(PUBLIC, url.pathname.slice(1));
      const root = path.resolve(PUBLIC);
      const ext = path.extname(file);
      const types = { ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
      if (!file.startsWith(`${root}${path.sep}`) || !types[ext] || !fs.existsSync(file)) {
        return send(res, 404, { error: "Not found" });
      }
      res.writeHead(200, {
        "Content-Type": types[ext],
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
      });
      return res.end(fs.readFileSync(file));
    }
    if (req.method === "POST" && url.pathname === "/api/login") {
      const ip = clientIp(req);
      if (!loginAllowed(ip)) {
        return send(res, 429, { error: "Too many wrong passwords. Wait 10 minutes and try again." });
      }
      const body = await readBody(req);
      const expected = Buffer.from(password());
      const given = Buffer.from(String(body.password || ""));
      const ok = expected.length === given.length && crypto.timingSafeEqual(expected, given);
      if (!ok) {
        noteLoginFailure(ip);
        return send(res, 401, { error: "Wrong password" });
      }
      loginAttempts.delete(ip);
      const token = crypto.randomBytes(24).toString("base64url");
      const csrf = crypto.randomBytes(24).toString("base64url");
      sessions.set(token, { expires: Date.now() + SESSION_MS });
      const secure = secureCookies(req) ? "; Secure" : "";
      return send(res, 200, { ok: true }, {
        "Set-Cookie": [
          `joffe_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`,
          `${CSRF_COOKIE}=${encodeURIComponent(csrf)}; SameSite=Strict; Path=/; Max-Age=43200${secure}`,
        ],
      });
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      sessions.delete(cookieToken(req));
      const secure = secureCookies(req) ? "; Secure" : "";
      return send(res, 200, { ok: true }, {
        "Set-Cookie": [
          `joffe_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
          `${CSRF_COOKIE}=; SameSite=Strict; Path=/; Max-Age=0${secure}`,
        ],
      });
    }
    const csrfError = checkCsrf(req, url);
    if (csrfError) return send(res, 403, { error: csrfError });
    if (!authed(req)) return send(res, 401, { error: "Sign in" });

    if (req.method === "GET" && url.pathname === "/api/sites") {
      return send(res, 200, {
        sites: SITES.map((site) => {
          const ready = fs.existsSync(site.dir);
          return {
            id: site.id,
            host: site.host,
            label: site.label,
            project: site.project,
            ready,
            mode: site.mode || "static",
            note: site.note || "",
            home: ready && fs.existsSync(path.join(site.dir, "index.html")),
            gate: Boolean(site.safeDeploy),
          };
        }),
        publish: { running: publishJob.running, code: publishJob.code, host: publishJob.host },
      });
    }
    if (req.method === "GET" && url.pathname === "/api/publish") {
      return send(res, 200, publishJob);
    }

    const siteMatch = url.pathname.match(/^\/api\/sites\/([a-z]+)(\/.*)?$/);
    if (!siteMatch) return send(res, 404, { error: "Not found" });
    const site = siteById(siteMatch[1]);
    const rest = siteMatch[2] || "";

    if (req.method === "GET" && rest === "/seo") {
      return send(res, 200, seoAudit(site, { refresh: url.searchParams.get("refresh") === "1" }));
    }
    if (req.method === "GET" && rest === "/history") {
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const pagePath = url.searchParams.get("path") || "";
      const rel = pagePath ? urlToRelFor(site, pagePath) : "";
      const entries = governance.history(site.id, { limit, rel }).map((entry) => ({
        ...entry,
        url: entry.path ? relToUrl(entry.path) : "",
      }));
      return send(res, 200, { entries, state: governance.stateDir });
    }
    if (req.method === "POST" && rest === "/restore") {
      const body = await readBody(req);
      const pagePath = String(body.path || "");
      if (!pagePath) throw Object.assign(new Error("Choose a page to restore"), { status: 400 });
      const rel = urlToRelFor(site, pagePath);
      const result = governance.restore({
        file: inside(site, rel),
        site: site.id,
        rel,
        hash: String(body.hash || ""),
        note: noteOf(body) || `Restored ${pagePath}`,
      });
      clearSeo(site);
      return send(res, 200, {
        path: relToUrl(rel),
        restored: result.changed,
        revision: revisionOf(inside(site, rel)),
      });
    }

    if (req.method === "GET" && rest === "/pages") {
      const { navHrefs, sitemapLocs } = siteNavAndSitemap(site);
      const pages = pagesOf(site).map((rel) => {
        const html = fs.readFileSync(inside(site, rel), "utf8");
        const title = (html.match(/<title\b[^>]*>([^<]*)<\/title>/i) || [, rel])[1];
        const missingAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
        const pathName = relToUrl(rel);
        return { path: pathName, title, missingAlt, ...placement(site, pathName, navHrefs, sitemapLocs) };
      });
      return send(res, 200, { pages });
    }
    if (req.method === "GET" && rest === "/nav") {
      // Worker-rendered sites (placebets, marketpicks) have no home page file.
      if (!fs.existsSync(path.join(site.dir, "index.html"))) return send(res, 200, { nav: [], home: false });
      const { html } = readHtml(site, "index.html");
      return send(res, 200, { nav: readPage(html).nav, home: true });
    }
    if (req.method === "PUT" && rest === "/nav") {
      const body = await readBody(req);
      if (!Array.isArray(body.nav) || !body.nav.length) throw Object.assign(new Error("Add at least one link"), { status: 400 });
      const target = body.nav
        .filter((link) => link && typeof link.href === "string" && link.href.startsWith("/"))
        .map((link) => ({ href: link.href, label: String(link.label || link.href) }));
      if (!target.length) throw Object.assign(new Error("Menu links have to start with /"), { status: 400 });
      const wanted = new Set(target.map((link) => link.href));
      let updated = 0;
      const actionId = crypto.randomUUID();
      for (const rel of pagesOf(site)) {
        const file = inside(site, rel);
        const html = fs.readFileSync(file, "utf8");
        if (!html.includes('class="primary"')) continue;
        // Apply only the difference against THIS page's own desktop menu.
        // Rebuilding from the posted list flattened religiousjews.com's grouped
        // menu on all 31 pages from a single save, so a save that changes
        // nothing now changes nothing.
        const current = readPage(html).nav;
        let next = html;
        for (const link of current) {
          if (!wanted.has(link.href)) next = removeNavLink(next, link.href);
        }
        for (const link of target) {
          next = addNavLink(next, link.href, link.label);
          const now = current.find((item) => item.href === link.href);
          if (now && now.label !== link.label) next = renameNavLink(next, link.href, now.label, link.label);
        }
        if (next !== html) {
          writeAudited(site, rel, next, { action: "nav", note: "Saved site menu", actionId });
          updated += 1;
        }
      }
      return send(res, 200, { updated });
    }
    if (req.method === "GET" && rest === "/footer") {
      if (!fs.existsSync(path.join(site.dir, "index.html"))) return send(res, 200, { groups: [], home: false });
      const html = fs.readFileSync(path.join(site.dir, "index.html"), "utf8");
      return send(res, 200, { groups: readFooter(html), home: true });
    }
    if (req.method === "PUT" && rest === "/footer") {
      const body = await readBody(req);
      return send(res, 200, writeFooterLinks(site, body.groups));
    }
    if (req.method === "GET" && rest === "/backlinks") return send(res, 200, { links: currentBacklinks(site) });
    if (req.method === "PUT" && rest === "/backlinks") {
      const body = await readBody(req);
      return send(res, 200, writeBacklinks(site, body.links));
    }
    if (req.method === "GET" && rest === "/mentions") return send(res, 200, mentionReport(site));
    if (req.method === "POST" && rest === "/mentions") return send(res, 200, applyMentions(site));
    if (req.method === "POST" && rest === "/publish") {
      const body = await readBody(req);
      if (body.confirm !== true) {
        throw Object.assign(new Error("Confirm the publish before it starts"), { status: 400 });
      }
      startPublish(site);
      return send(res, 202, { started: true, host: site.host, gate: Boolean(site.safeDeploy) });
    }
    if (req.method === "POST" && rest === "/pages") {
      const body = await readBody(req);
      const slug = String(body.slug || "").trim().replace(/^\/+|\/+$/g, "");
      const parts = slug.split("/").filter(Boolean);
      if (!parts.length || parts.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) {
        throw Object.assign(new Error("Use a lowercase slug such as notes or press/interviews"), { status: 400 });
      }
      const urlPath = `/${parts.join("/")}/`;
      const rel = urlToRel(urlPath);
      const file = inside(site, rel);
      if (fs.existsSync(file)) throw Object.assign(new Error("That page already exists"), { status: 409 });
      // Pick a real page to build from. `about/index.html`/`index.html` are the
      // static-site cases; placebets.ai and marketpicks.ai are Worker-rendered
      // and have neither, which used to raise a bare ENOENT 500. A candidate
      // also has to contain a <main> block — marketpicks' first file on disk is
      // 500.html, which does not.
      const candidates = ["about/index.html", "about.html", "index.html", ...pagesOf(site)];
      const templateRel = candidates.find((candidate) => {
        const candidateFile = path.join(site.dir, candidate);
        if (!fs.existsSync(candidateFile)) return false;
        try {
          return /<main\b[^>]*>[\s\S]*?<\/main>/i.test(fs.readFileSync(candidateFile, "utf8"));
        } catch {
          return false;
        }
      });
      if (!templateRel) {
        throw Object.assign(
          new Error(`${site.host} has no page here with a <main> block to start a new one from.`),
          { status: 409 },
        );
      }
      const template = fs.readFileSync(inside(site, templateRel), "utf8");
      const title = String(body.title || "New page").trim();
      const description = String(body.description || title).trim();
      let html = pageShell(template, {
        title,
        description,
        canonical: `https://${site.host}${urlPath}`,
        main: String(body.body || "<p></p>"),
        eyebrow: site.eyebrow,
      });
      const links = currentBacklinks(site);
      html = applyBacklinks(html, links, links.map((link) => link.href));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      writeAudited(site, rel, html, { action: "create-page", note: urlPath });
      // The page is on disk now. If the sitemap or nav cannot take it, say so
      // in the response rather than failing the call or reporting success.
      const inSitemapWanted = body.inSitemap !== false;
      const inNavWanted = Boolean(body.addToNav || body.inNav);
      const warnings = [];
      let inSitemap = inSitemapWanted;
      let inNav = inNavWanted;
      try {
        setInSitemap(site, urlPath, inSitemapWanted, html);
      } catch (error) {
        inSitemap = false;
        warnings.push(`Sitemap: ${error.message}`);
      }
      if (inNavWanted) {
        try {
          setInNav(site, urlPath, String(body.navLabel || title), true);
        } catch (error) {
          inNav = false;
          warnings.push(`Navigation: ${error.message}`);
        }
      }
      return send(res, 201, { path: urlPath, inNav, inSitemap, warnings, revision: revisionOf(file) });
    }
    if (req.method === "GET" && rest === "/library") {
      const dir = path.join(site.dir, "img");
      const images = walkImages(dir, dir, [])
        .map((rel) => {
          const file = path.join(dir, rel);
          const stat = fs.statSync(file);
          const buf = fs.readFileSync(file);
          const size = imageSize(buf);
          return {
            src: `/img/${rel}`,
            mtime: stat.mtimeMs,
            bytes: stat.size,
            size: humanBytes(stat.size),
            width: size?.width || 0,
            height: size?.height || 0,
            webp: fs.existsSync(file.replace(/\.[^.]+$/, ".webp")),
          };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 240);
      return send(res, 200, { images });
    }
    if (req.method === "GET" && rest.startsWith("/media/")) {
      const rel = decodeURIComponent(rest.slice("/media/".length));
      const allowed =
        IMAGE_REL.test(rel) ||
        /^(?:favicon\.svg|favicon\.png|favicon\.ico|apple-touch-icon\.png)$/.test(rel);
      if (!allowed || rel.includes("..")) throw Object.assign(new Error("That image is not available"), { status: 404 });
      const file = inside(site, rel);
      const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
      if (!type || !fs.existsSync(file)) throw Object.assign(new Error("Image not found"), { status: 404 });
      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      return res.end(fs.readFileSync(file));
    }
    if (req.method === "POST" && rest === "/upload") {
      const raw = await readRaw(req, 20 * 1024 * 1024);
      const parts = parseMultipart(raw, req.headers["content-type"]);
      const filePart = parts.find((part) => part.filename);
      if (!filePart || !filePart.body.length) throw Object.assign(new Error("Choose an image"), { status: 400 });
      const role = (parts.find((part) => part.name === "role")?.body.toString("utf8") || "").trim();
      const ext = sniffImage(filePart.body) || (role === "icon" ? sniffSvg(filePart.body) : "");
      if (!ext) throw Object.assign(new Error("Use a JPG, PNG, GIF, or WebP photo"), { status: 400 });
      if (role === "apple" && ext !== ".png") throw Object.assign(new Error("The home-screen icon needs to be a PNG"), { status: 400 });
      const stem = path.basename(filePart.filename, path.extname(filePart.filename)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "photo";
      const name = `${Date.now()}-${stem}${ext}`;
      const dest = inside(site, `img/${name}`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, filePart.body);
      const dimensions = imageSize(filePart.body);
      governance.record({
        site: site.id,
        action: "upload-image",
        rel: `img/${name}`,
        note: `${role || "photo"} ${humanBytes(filePart.body.length)}${dimensions ? `, ${dimensions.width}×${dimensions.height}` : ""}`,
      });
      const src = `/img/${name}`;
      const alt = (parts.find((part) => part.name === "alt")?.body.toString("utf8") || "").trim() || defaultAlt(site);
      const pagePath = (parts.find((part) => part.name === "path")?.body.toString("utf8") || "").trim();
      const insert = !role && (parts.find((part) => part.name === "insert")?.body.toString("utf8") || "") === "1";
      let revision = "";
      if (insert && pagePath) {
        const rel = urlToRelFor(site, pagePath);
        assertRevision(site, rel, bodyRevision(req, parts), { required: true });
        const { file, html } = readHtml(site, rel);
        const next = insertImage(html, src, alt, dimensions || {});
        if (next !== html) writeAudited(site, rel, next, { action: "insert-image", note: src });
        revision = revisionOf(file);
      }
      return send(res, 201, {
        src,
        alt,
        role,
        inserted: Boolean(insert && pagePath),
        width: dimensions?.width || 0,
        height: dimensions?.height || 0,
        bytes: filePart.body.length,
        size: humanBytes(filePart.body.length),
        revision,
      });
    }
    if (req.method === "PUT" && rest === "/icons") {
      const body = await readBody(req);
      const favicon = String(body.favicon || "");
      const appleIcon = String(body.appleIcon || "");
      const allowedSrc = (src) => !src || /^(?:\/img\/[A-Za-z0-9._-]+|\/favicon\.svg|\/favicon\.png|\/apple-touch-icon\.png)$/.test(src);
      if (!favicon && !appleIcon) throw Object.assign(new Error("Choose an icon first"), { status: 400 });
      if (!allowedSrc(favicon) || !allowedSrc(appleIcon)) throw Object.assign(new Error("That icon is not on this site"), { status: 400 });
      for (const src of [favicon, appleIcon].filter(Boolean)) {
        if (!fs.existsSync(inside(site, src.slice(1)))) throw Object.assign(new Error("That icon is not on this site"), { status: 404 });
      }
      let updated = 0;
      const actionId = crypto.randomUUID();
      for (const rel of pagesOf(site)) {
        const file = inside(site, rel);
        const html = fs.readFileSync(file, "utf8");
        const next = writeIcons(html, { favicon, appleIcon });
        if (next !== html) {
          writeAudited(site, rel, next, { action: "icons", note: "Updated site icons", actionId });
          updated += 1;
        }
      }
      return send(res, 200, { updated, favicon, appleIcon });
    }
    if (req.method === "POST" && rest === "/remove-image") {
      const body = await readBody(req);
      const src = String(body.src || "");
      if (!/^\/img\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/.test(src)) throw Object.assign(new Error("That photo is not on this page"), { status: 400 });
      const rel = urlToRelFor(site, body.path || "/");
      assertRevision(site, rel, body.revision, { required: true });
      const { file, html } = readHtml(site, rel);
      const next = removeImage(html, src);
      if (next === html) throw Object.assign(new Error("That photo is not on this page"), { status: 404 });
      writeAudited(site, rel, next, { action: "remove-image", note: src });
      return send(res, 200, { src, path: relToUrl(rel), removed: true, revision: revisionOf(file) });
    }
    if (req.method === "POST" && rest === "/insert-image") {
      const body = await readBody(req);
      const src = String(body.src || "");
      if (!/^\/img\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/.test(src)) throw Object.assign(new Error("Pick a photo from this site"), { status: 400 });
      const fileOnDisk = inside(site, src.slice(1));
      if (!fs.existsSync(fileOnDisk)) throw Object.assign(new Error("That photo is not on this site"), { status: 404 });
      const alt = String(body.alt || "").trim() || defaultAlt(site);
      const rel = urlToRelFor(site, body.path || "/");
      assertRevision(site, rel, body.revision, { required: true });
      const { file, html } = readHtml(site, rel);
      const dimensions = imageSize(fs.readFileSync(fileOnDisk)) || {};
      const next = insertImage(html, src, alt, dimensions);
      if (next !== html) writeAudited(site, rel, next, { action: "insert-image", note: src });
      return send(res, 200, { src, alt, path: relToUrl(rel), width: dimensions.width || 0, height: dimensions.height || 0, revision: revisionOf(file) });
    }
    if (req.method === "POST" && rest === "/paragraph") {
      const body = await readBody(req);
      const text = String(body.text || "").trim();
      if (!text) throw Object.assign(new Error("Write something first"), { status: 400 });
      const rel = urlToRelFor(site, body.path || "/");
      assertRevision(site, rel, body.revision, { required: true });
      const { file, html } = readHtml(site, rel);
      const next = appendParagraph(html, text);
      if (next !== html) writeAudited(site, rel, next, { action: "paragraph", note: text.slice(0, 80) });
      return send(res, 200, { path: relToUrl(rel), saved: true, revision: revisionOf(file) });
    }

    const pageMatch = rest.match(/^\/page$/);
    if (pageMatch && req.method === "GET") {
      const rel = urlToRelFor(site, url.searchParams.get("path") || "/");
      const { file, html } = readHtml(site, rel);
      const pathName = relToUrl(rel);
      const { navHrefs, sitemapLocs } = siteNavAndSitemap(site);
      return send(res, 200, {
        path: pathName,
        revision: revisionOf(file),
        ...withImageDimensions(site, readPage(html)),
        ...placement(site, pathName, navHrefs, sitemapLocs),
      });
    }
    if (pageMatch && req.method === "PUT") {
      const body = await readBody(req);
      const rel = urlToRelFor(site, body.path || "/");
      assertRevision(site, rel, body.revision, { required: true });
      const { file, html } = readHtml(site, rel);
      const next = writePage(html, body);
      const result = writeAudited(site, rel, next, { action: "save-page", note: noteOf(body) || String(body.title || relToUrl(rel)) });
      const pathName = relToUrl(rel);
      const warnings = [];
      try {
        if (typeof body.inNav === "boolean") setInNav(site, pathName, String(body.navLabel || body.title || pathName), body.inNav);
      } catch (error) {
        warnings.push(`Navigation: ${error.message}`);
      }
      try {
        if (typeof body.inSitemap === "boolean") setInSitemap(site, pathName, body.inSitemap, next);
      } catch (error) {
        warnings.push(`Sitemap: ${error.message}`);
      }
      return send(res, 200, {
        path: pathName,
        saved: true,
        changed: result.changed,
        warnings,
        revision: revisionOf(file),
      });
    }
    if (pageMatch && req.method === "DELETE") {
      const body = await readBody(req);
      const rel = urlToRelFor(site, body.path || "/");
      if (rel === "index.html") throw Object.assign(new Error("The home page stays"), { status: 400 });
      const file = inside(site, rel);
      if (!fs.existsSync(file)) throw Object.assign(new Error("Page not found"), { status: 404 });
      assertRevision(site, rel, body.revision, { required: true });
      const uri = relToUrl(rel);
      deleteAudited(site, rel, noteOf(body) || `Deleted ${uri}`);
      let dir = path.dirname(file);
      while (dir !== path.resolve(site.dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      }
      const sitemap = sitemapPathOf(site);
      const loc = `https://${site.host}${uri}`;
      if (fs.existsSync(sitemap)) {
        const xml = fs.readFileSync(sitemap, "utf8");
        const next = removeSitemap(xml, loc);
        if (next !== xml) {
          writeAudited(site, site.sitemap || "sitemap.xml", next, { action: "sitemap-remove", note: uri });
        }
      }
      const imageSitemap = imageSitemapPathOf(site);
      if (fs.existsSync(imageSitemap)) {
        const xml = fs.readFileSync(imageSitemap, "utf8");
        const next = removeSitemapImages(xml, loc);
        if (next !== xml) {
          writeAudited(site, "sitemap-images.xml", next, { action: "image-sitemap-remove", note: uri });
        }
      }
      const urlPath = uri;
      for (const pageRel of pagesOf(site)) {
        const pageFile = inside(site, pageRel);
        const pageHtml = fs.readFileSync(pageFile, "utf8");
        if (!pageHtml.includes('class="primary"')) continue;
        // Surgical: only unlink this one path, leave the menu's structure alone.
        const next = removeNavLink(pageHtml, urlPath);
        if (next !== pageHtml) writeAudited(site, pageRel, next, { action: "nav-remove", note: uri });
      }
      return send(res, 200, { deleted: urlPath });
    }
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Something went wrong" });
  }
});

const port = Number(process.env.PORT || 8788);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`Joffe admin  http://${host}:${port}`);
  console.log(`Password file  ${PASSWORD_FILE}`);
  console.log(`History        ${STATE_DIR}`);
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    console.log("Remote bind enabled. Put this behind Cloudflare Tunnel + Access or a private network; never expose it raw.");
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expires < now) sessions.delete(token);
  }
  for (const [ip, entry] of loginAttempts) {
    if (entry.reset < now && (!entry.blockedUntil || entry.blockedUntil < now)) loginAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();
