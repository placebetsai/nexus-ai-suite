// Edits the static HTML for israeljoffe.com, israeljoffe.org, and wuwonline.com.
// The publish URL is the address Israel asked for. Substack redirects it to the
// public essay, which is the URL Google can actually list.

export const REDDIT_URL = "https://www.reddit.com/r/ISRAEL_JOFFE/comments/1ww9zjv/israel_joffe/";
export const SUBSTACK_PUBLISH_URL = "https://israeljoffe.substack.com/publish/post/138435205";
export const SUBSTACK_PUBLIC_URL = "https://israeljoffe.substack.com/p/israel-joffe-jews";

export const MENTIONS = [
  { href: REDDIT_URL, label: "Israel Joffe on Reddit" },
  { href: SUBSTACK_PUBLISH_URL, label: "Israel Joffe on Substack" },
  { href: SUBSTACK_PUBLIC_URL, label: "Israel Joffe" },
];

export function decode(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function encodeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function encodeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (!match) return null;
  return match[2] ?? match[3] ?? "";
}

export function urlToRel(urlPath) {
  const cleaned = String(urlPath || "/").replace(/\\/g, "/");
  if (cleaned === "/" || cleaned === "") return "index.html";
  const trimmed = cleaned.replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.includes("..") || trimmed.includes("?")) {
    throw new Error("That page address is not allowed");
  }
  if (trimmed.endsWith(".html") || trimmed.endsWith(".xml") || trimmed.endsWith(".txt")) return trimmed;
  return `${trimmed}/index.html`;
}

export function relToUrl(rel) {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  // Next/Cloudflare Pages emit `about.html`, which is served at `/about` (both
  // resolve — measured 2026-10-13). Reporting `/about.html` would never match
  // the `<loc>` in the sitemap, so every page read back as "not in sitemap".
  if (rel.endsWith(".html")) return `/${rel.slice(0, -".html".length)}`;
  return `/${rel}`;
}

// The flat sibling of a directory-style path, for sites that emit about.html
// instead of about/index.html. Returns null when there is no flat form.
export function flatSibling(rel) {
  if (!rel.endsWith("/index.html")) return null;
  // "about/index.html" minus "index.html" is "about/" — that trailing slash has
  // to go first, otherwise you get "about/.html" and every flat page 404s.
  return `${rel.slice(0, -"index.html".length).replace(/\/+$/, "")}.html`;
}

function getMetaName(html, name) {
  const tag = html.match(new RegExp(`<meta\\b[^>]*\\bname=["']${name}["'][^>]*>`, "i"));
  if (!tag) return "";
  const content = attr(tag[0], "content");
  return content == null ? "" : decode(content);
}

function setMetaName(html, name, value) {
  const encoded = encodeAttr(value);
  const contentFirst = new RegExp(
    `(<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=["'])[^>]*\\bcontent=["'])[^"']*(["'])`,
    "i",
  );
  if (contentFirst.test(html)) return html.replace(contentFirst, `$1${encoded}$2`);
  return html;
}

function setMetaProperty(html, property, value) {
  const encoded = encodeAttr(value);
  const re = new RegExp(
    `(<meta\\b(?=[^>]*\\bproperty=["']${property}["'])(?=[^>]*\\bcontent=["'])[^>]*\\bcontent=["'])[^"']*(["'])`,
    "i",
  );
  if (re.test(html)) return html.replace(re, `$1${encoded}$2`);
  return html;
}

function setTitle(html, value) {
  const encoded = encodeText(value);
  const re = /(<title\b[^>]*>)[^<]*(<\/title>)/i;
  if (re.test(html)) return html.replace(re, `$1${encoded}$2`);
  // No <title> at all — insert one rather than silently doing nothing.
  const head = /<\/head>/i;
  if (head.test(html)) return html.replace(head, `<title>${encoded}</title>\n</head>`);
  return html;
}

function setCanonical(html, value) {
  const encoded = encodeAttr(value);
  return html.replace(/(<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["'])[^"']*(["'])/i, `$1${encoded}$2`);
}

export function parseAnchors(inner) {
  const links = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(inner))) {
    const href = attr(match[0], "href") || "";
    const className = attr(match[0], "class") || "";
    const label = decode(match[2].replace(/<[^>]+>/g, "")).trim();
    links.push({ href, label, className });
  }
  return links;
}

export function renderAnchors(links) {
  return links
    .map((link) => {
      const href = encodeAttr(link.href || "/");
      const label = encodeText(link.label || "Page");
      const className = link.className ? ` class="${encodeAttr(link.className)}"` : "";
      return `<a href="${href}"${className}>${label}</a>`;
    })
    .join("\n    ");
}

export function readNav(html) {
  const match = html.match(/<nav class="primary"[^>]*>([\s\S]*?)<\/nav>/i);
  return match ? parseAnchors(match[1]) : [];
}

export function writeNav(html, links) {
  const block = renderAnchors(links);
  let next = html.replace(/(<nav class="primary"[^>]*>)[\s\S]*?(<\/nav>)/i, `$1\n    ${block}\n  $2`);
  next = next.replace(/(<nav class="mobile-nav-inner"[^>]*>)([\s\S]*?)(<\/nav>)/i, (_, open, inner, close) => {
    const fineAt = inner.indexOf('<div class="mobile-nav-fine">');
    const tail = fineAt >= 0 ? `\n    ${inner.slice(fineAt).trim()}\n  ` : "\n  ";
    return `${open}\n    ${block}${tail}${close}`;
  });
  return next;
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Surgical navigation edits ------------------------------------------------
// writeNav() rebuilds the whole <nav> from a parsed model. parseAnchors() throws
// away structure on the way in, so on religiousjews.com — whose desktop menu is
// three <div class="nav-group"> blocks — one save flattened the menu on 31 files
// at once. These helpers touch only the single <a> that changed.

const NAV_SELECTORS = [
  /<nav class="primary"[^>]*>[\s\S]*?<\/nav>/i,
  /<nav class="mobile-nav-inner"[^>]*>[\s\S]*?<\/nav>/i,
];

function editNavBlocks(html, change) {
  let next = html;
  for (const re of NAV_SELECTORS) {
    next = next.replace(re, (block) => change(block));
  }
  return next;
}

function navInner(block) {
  const start = block.indexOf(">");
  const end = block.lastIndexOf("</nav>");
  return { open: block.slice(0, start + 1), inner: block.slice(start + 1, end), close: block.slice(end) };
}

function insertAnchor(inner, anchor) {
  if (new RegExp(`href=["']${escapeRe(anchorPath(anchor))}["']`).test(inner)) return inner; // already there

  // Inside the last group, so the new item is grouped and styled like the rest.
  const group = inner.match(/([\s\S]*?)(\s*<\/div>\s*)$/);
  if (group && group[1].includes('<div class="nav-group">')) {
    return `${group[1]}\n      ${anchor}${group[2]}`;
  }
  // Before the trailing contact block (phone/email), never after it.
  const fine = inner.indexOf('<div class="mobile-nav-fine">');
  if (fine >= 0) return `${inner.slice(0, fine)}    ${anchor}\n    ${inner.slice(fine)}`;
  // Before a trailing call-to-action link, so the CTA stays last.
  const cta = inner.search(/<a\b[^>]*class=["'][^"']*primary-cta/i);
  if (cta >= 0) return `${inner.slice(0, cta)}${anchor}\n    ${inner.slice(cta)}`;
  // Flat menus: append at the end, keeping the existing indentation.
  return inner.replace(/\n(\s*)$/, `\n    ${anchor}\n$1`);
}

function anchorPath(anchor) {
  const href = anchor.match(/href=["']([^"']*)["']/i);
  return href ? href[1] : "";
}

export function addNavLink(html, urlPath, label) {
  const anchor = `<a href="${urlPath}">${label || urlPath}</a>`;
  return editNavBlocks(html, (block) => {
    const { open, inner, close } = navInner(block);
    const next = insertAnchor(inner, anchor);
    return next === inner ? block : `${open}${next}${close}`;
  });
}

export function removeNavLink(html, urlPath) {
  const re = new RegExp(`[ \\t]*<a\\b[^>]*\\bhref=["']${escapeRe(urlPath)}["'][^>]*>[\\s\\S]*?<\\/a>[ \\t]*\\n?`, "gi");
  return editNavBlocks(html, (block) => block.replace(re, ""));
}

export function renameNavLink(html, urlPath, from, to) {
  // Only rewrite an anchor whose text is the old label. religiousjews.com's
  // mobile menu says "Kosher Restaurants" where the desktop says "Restaurants";
  // renaming by href alone would rewrite those too and edit files the owner
  // never touched.
  const re = new RegExp(`(<a\\b[^>]*\\bhref=["']${escapeRe(urlPath)}["'][^>]*>)([^<]*)(</a>)`, "gi");
  return editNavBlocks(html, (block) =>
    block.replace(re, (m, open, text, close) => (from != null && text !== from ? m : `${open}${to || text}${close}`)),
  );
}

export function listImages(html) {
  const images = [];
  const re = /<img\b[^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const src = attr(match[0], "src") || "";
    const rawAlt = attr(match[0], "alt");
    images.push({
      src,
      alt: rawAlt == null ? "" : decode(rawAlt),
      missing: rawAlt == null || decode(rawAlt).trim() === "",
    });
  }
  return images;
}

export function writeAlts(html, images) {
  let index = 0;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const spec = images[index++];
    if (!spec) return tag;
    const alt = encodeAttr(spec.alt ?? "");
    if (/\balt\s*=/.test(tag)) return tag.replace(/\balt\s*=\s*("[^"]*"|'[^']*')/i, `alt="${alt}"`);
    return tag.replace(/<img\b/i, `<img alt="${alt}"`);
  });
}

function simpleH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return { text: "", editable: false };
  if (/<[a-z!/]/i.test(match[1])) return { text: "", editable: false };
  return { text: decode(match[1]).trim(), editable: true };
}

function writeH1(html, text) {
  const current = simpleH1(html);
  if (!current.editable) return html;
  return html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${encodeText(text)}$2`);
}

function pageOrigin(html, fields = {}) {
  const raw = fields.canonical || decode(attr((html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i) || [""])[0], "href") || "");
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const IMAGE_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export function imageMime(src) {
  const ext = String(src || "").split("?")[0].split(".").pop().toLowerCase();
  return IMAGE_MIME[ext] || "image/jpeg";
}

export function absoluteImage(src, origin) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const pathOnly = value.startsWith("/") ? value : `/${value}`;
  return `${String(origin || "").replace(/\/$/, "")}${pathOnly}`;
}

export function displayImage(src, origin) {
  const value = String(src || "").trim();
  if (!value || value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (origin && url.origin !== origin) return value;
    return url.pathname;
  } catch {
    return value;
  }
}

function metaTags(html) {
  return html.match(/<meta\b[^>]*>/gi) || [];
}

function setNthMetaContent(html, { property, name, index, value }) {
  let seen = 0;
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const hit = property ? attr(tag, "property") === property : attr(tag, "name") === name;
    if (!hit || seen++ !== index) return tag;
    const encoded = encodeAttr(value);
    if (/\bcontent\s*=/.test(tag)) return tag.replace(/\bcontent\s*=\s*("[^"]*"|'[^']*')/i, `content="${encoded}"`);
    return tag.replace(/\s*\/?>$/, ` content="${encoded}" />`);
  });
}

export function readShare(html) {
  const origin = pageOrigin(html);
  const images = [];
  const alts = [];
  for (const tag of metaTags(html)) {
    if (attr(tag, "property") === "og:image") images.push(decode(attr(tag, "content") || ""));
    if (attr(tag, "property") === "og:image:alt") alts.push(decode(attr(tag, "content") || ""));
  }
  const icon = html.match(/<link\b[^>]*\brel=["'](?:shortcut icon|icon)["'][^>]*>/i);
  const apple = html.match(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>/i);
  return {
    socialImage: displayImage(images[0] || "", origin),
    socialAlt: alts[0] || "",
    linkImage: displayImage(images[1] || "", origin),
    linkAlt: alts[1] || "",
    favicon: icon ? decode(attr(icon[0], "href") || "") : "",
    appleIcon: apple ? decode(attr(apple[0], "href") || "") : "",
  };
}

function ensureLinkImage(html, url, alt) {
  const count = metaTags(html).filter((tag) => attr(tag, "property") === "og:image").length;
  if (count >= 2) return html;
  const block = [
    `<meta property="og:image" content="${encodeAttr(url)}" />`,
    `<meta property="og:image:type" content="${imageMime(url)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="1200" />`,
    `<meta property="og:image:alt" content="${encodeAttr(alt || "")}" />`,
  ].join("\n");
  const firstAlt = html.match(/<meta\b[^>]*\bproperty=["']og:image:alt["'][^>]*>/i);
  if (firstAlt) {
    const at = html.indexOf(firstAlt[0]) + firstAlt[0].length;
    return `${html.slice(0, at)}\n${block}${html.slice(at)}`;
  }
  return html.replace(/<\/head>/i, `${block}\n</head>`);
}

export function writeShare(html, fields) {
  const origin = pageOrigin(html, fields);
  let next = html;
  if (typeof fields.socialImage === "string" && fields.socialImage.trim()) {
    const url = absoluteImage(fields.socialImage, origin);
    next = setNthMetaContent(next, { property: "og:image", index: 0, value: url });
    next = setNthMetaContent(next, { property: "og:image:secure_url", index: 0, value: url });
    next = setNthMetaContent(next, { property: "og:image:type", index: 0, value: imageMime(url) });
    next = setMetaName(next, "twitter:image", url);
  }
  if (typeof fields.socialAlt === "string") {
    next = setNthMetaContent(next, { property: "og:image:alt", index: 0, value: fields.socialAlt });
    next = setMetaName(next, "twitter:image:alt", fields.socialAlt);
  }
  if (typeof fields.linkImage === "string" && fields.linkImage.trim()) {
    const url = absoluteImage(fields.linkImage, origin);
    next = ensureLinkImage(next, url, fields.linkAlt || "");
    next = setNthMetaContent(next, { property: "og:image", index: 1, value: url });
    next = setNthMetaContent(next, { property: "og:image:type", index: 1, value: imageMime(url) });
  }
  if (typeof fields.linkAlt === "string" && fields.linkAlt) {
    next = setNthMetaContent(next, { property: "og:image:alt", index: 1, value: fields.linkAlt });
  }
  return next;
}

export function writeIcons(html, { favicon, appleIcon } = {}) {
  let next = html;
  if (favicon) {
    const tag = `<link rel="icon" href="${encodeAttr(favicon)}" type="${imageMime(favicon)}" />`;
    next = /<link\b[^>]*\brel=["'](?:shortcut icon|icon)["'][^>]*>/i.test(next)
      ? next.replace(/<link\b[^>]*\brel=["'](?:shortcut icon|icon)["'][^>]*>/i, tag)
      : next.replace(/<\/head>/i, `${tag}\n</head>`);
  }
  if (appleIcon) {
    const tag = `<link rel="apple-touch-icon" href="${encodeAttr(appleIcon)}" />`;
    next = /<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>/i.test(next)
      ? next.replace(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>/i, tag)
      : next.replace(/<\/head>/i, `${tag}\n</head>`);
  }
  return next;
}

export function readPage(html) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  const h1 = simpleH1(html);
  return {
    title: decode((html.match(/<title\b[^>]*>([^<]*)<\/title>/i) || [, ""])[1]),
    description: getMetaName(html, "description"),
    canonical: decode(attr((html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i) || [""])[0], "href") || ""),
    robots: getMetaName(html, "robots"),
    h1: h1.text,
    h1Editable: h1.editable,
    main: main ? main[0] : "",
    images: listImages(html),
    nav: readNav(html),
    mentions: MENTIONS.map((link) => ({ ...link, present: html.includes(link.href) })),
    ...readShare(html),
  };
}

export function writePage(html, fields) {
  let next = html;
  if (typeof fields.title === "string") {
    next = setTitle(next, fields.title);
    next = setMetaProperty(next, "og:title", fields.title);
    next = setMetaName(next, "twitter:title", fields.title);
  }
  if (typeof fields.description === "string") {
    next = setMetaName(next, "description", fields.description);
    next = setMetaProperty(next, "og:description", fields.description);
    next = setMetaName(next, "twitter:description", fields.description);
  }
  if (typeof fields.canonical === "string" && fields.canonical) {
    next = setCanonical(next, fields.canonical);
    next = setMetaProperty(next, "og:url", fields.canonical);
  }
  if (typeof fields.robots === "string") next = setMetaName(next, "robots", fields.robots);
  if (typeof fields.main === "string" && fields.main.includes("<main")) {
    if (!/<main\b[^>]*>[\s\S]*?<\/main>/i.test(next)) throw new Error("This page has no <main> block to replace");
    next = next.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, fields.main);
  }
  if (typeof fields.h1 === "string") next = writeH1(next, fields.h1);
  if (Array.isArray(fields.images)) next = writeAlts(next, fields.images);
  next = writeShare(next, fields);
  return next;
}

function linkParagraph(link) {
  return `<p><a href="${link.href}" target="_blank" rel="noopener me">${encodeText(link.label)}</a></p>`;
}

function insertBeforeClose(html, marker, block) {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const close = html.indexOf("</div>", start);
  if (close < 0) return null;
  return `${html.slice(0, close)}${block}\n    ${html.slice(close)}`;
}

function addSameAs(html, urls) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, json) => {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      return full;
    }
    let changed = false;
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node["@type"] === "Person" && node.name === "Israel Joffe" && Array.isArray(node.sameAs)) {
        for (const url of urls) {
          if (!node.sameAs.includes(url)) {
            node.sameAs.push(url);
            changed = true;
          }
        }
      }
      for (const value of Object.values(node)) visit(value);
    };
    visit(data);
    if (!changed) return full;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  });
}

export function ensureMentions(html, { personPage = false, origin = "https://israeljoffe.com" } = {}) {
  let next = html;
  const missing = MENTIONS.filter((link) => !next.includes(link.href));
  if (missing.length) {
    const block = missing.map(linkParagraph).join("\n      ");
    const inserted =
      insertBeforeClose(next, 'class="colophon-meta"', block) ||
      insertBeforeClose(next, 'class="col-social"', block);
    if (inserted) next = inserted;
    else if (next.includes("</footer>")) {
      const nav = `<nav class="bg-refs" aria-label="Israel Joffe">\n    ${missing
        .map((link) => `<a href="${link.href}" target="_blank" rel="noopener me">${encodeText(link.label)}</a>`)
        .join("")}\n  </nav>\n`;
      next = next.replace("</footer>", `${nav}</footer>`);
    }
  }

  const profileAt = next.indexOf('href="https://israeljoffe.substack.com"');
  if (profileAt >= 0) {
    const ulEnd = next.indexOf("</ul>", profileAt);
    if (ulEnd >= 0) {
      const extra = MENTIONS.filter((link) => !next.includes(link.href))
        .map((link) => `<li><a href="${link.href}" target="_blank" rel="noopener me">${encodeText(link.label)}</a></li>`)
        .join("");
      if (extra) next = `${next.slice(0, ulEnd)}${extra}${next.slice(ulEnd)}`;
    }
  }

  next = addSameAs(next, MENTIONS.map((link) => link.href));
  if (personPage && !next.includes('"name":"Israel Joffe"')) {
    const person = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Israel Joffe",
      url: origin,
      sameAs: MENTIONS.map((link) => link.href),
    };
    next = next.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(person)}</script>\n</head>`,
    );
  }
  return next;
}

export function insertImage(html, src, alt) {
  const encoded = encodeAttr(src);
  if (html.includes(`src="${encoded}"`)) return html;
  const figure = `<figure class="wp-block-image"><img src="${encoded}" alt="${encodeAttr(alt)}" loading="lazy" /></figure>`;
  if (html.includes('class="wpp-body"')) return html.replace('<div class="wpp-body">', `<div class="wpp-body">${figure}`);
  if (html.includes('class="page-body"')) return html.replace('<div class="page-body">', `<div class="page-body">${figure}`);
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${figure}\n</main>`);
  throw new Error("This page has nowhere to place an image");
}

export function removeImage(html, src) {
  const encoded = String(src || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!encoded) return html;
  const img = `<img\\b[^>]*src=["']${encoded}["'][^>]*>`;
  let next = html.replace(new RegExp(`\\s*<figure\\b[^>]*>\\s*${img}\\s*(?:<figcaption[\\s\\S]*?<\\/figcaption>\\s*)?<\\/figure>`, "gi"), "");
  next = next.replace(new RegExp(`\\s*${img}`, "gi"), "");
  return next;
}

export function appendParagraph(html, text) {
  const block = `<p>${encodeText(text)}</p>`;
  if (html.includes('class="wpp-body"')) return html.replace('<div class="wpp-body">', `<div class="wpp-body">${block}`);
  if (html.includes('class="page-body"')) return html.replace('<div class="page-body">', `<div class="page-body">${block}`);
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${block}\n</main>`);
  throw new Error("This page has nowhere to place that text");
}

export function pageShell(html, { title, description, canonical, main, eyebrow }) {
  let next = writePage(html, { title, description, canonical, h1: title });
  const body = main && main.includes("<") ? main : `<p>${encodeText(main || "")}</p>`;
  const useWp = html.includes("wpp-frame");
  const replacement = useWp
    ? `<main class="wp-page reveal"><div class="wpp-frame">\n  <header class="wpp-head">\n    <p class="eyebrow">${encodeText(eyebrow || "Israel Joffe")}</p>\n    <h1 class="wpp-title">${encodeText(title)}</h1>\n  </header>\n  <div class="wpp-body">${body}</div>\n</div></main>`
    : `<main class="page"><div class="page-frame">\n  <h1 class="page-h">${encodeText(title)}</h1>\n  <div class="page-body">${body}</div>\n</div></main>`;
  if (!/<main\b[^>]*>[\s\S]*?<\/main>/i.test(next)) throw new Error("Template page has no <main>");
  next = next.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, replacement);
  return next;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function holdFooterBlocks(html) {
  const saved = [];
  const next = html.replace(
    /<(?:div class="(?:colophon-meta|col-social)"|span class="cn-links"|nav class="bg-refs")[^>]*>[\s\S]*?<\/(?:div|span|nav)>/gi,
    (block) => {
      const token = `%%FOOTERBLOCK${saved.length}%%`;
      saved.push(block);
      return token;
    },
  );
  return { html: next, saved };
}

function restoreFooterBlocks(html, saved) {
  return html.replace(/%%FOOTERBLOCK(\d+)%%/g, (_, index) => saved[Number(index)] || "");
}

export function applyBacklinks(html, links, previousHrefs = []) {
  const owned = [...new Set([...previousHrefs, ...links.map((link) => link.href)])];
  const held = holdFooterBlocks(html);
  let next = held.html.replace(/<nav class="admin-backlinks"[\s\S]*?<\/nav>\s*/gi, "");
  for (const href of owned) {
    const pattern = escapeRegExp(href);
    next = next.replace(new RegExp(`\\s*<p>\\s*<a href="${pattern}"[^>]*>[\\s\\S]*?</a>\\s*</p>`, "g"), "");
    next = next.replace(new RegExp(`\\s*<li>\\s*<a href="${pattern}"[^>]*>[\\s\\S]*?</a>\\s*</li>`, "g"), "");
  }
  if (links.length) {
    const inner = links
      .map((link) => `<a href="${encodeAttr(link.href)}" target="_blank" rel="noopener">${encodeText(link.label)}</a>`)
      .join("");
    const block = `<nav class="admin-backlinks" aria-label="Backlinks">${inner}</nav>\n`;
    next = next.includes("</footer>") ? next.replace("</footer>", `${block}</footer>`) : `${next}\n${block}`;
  }
  next = restoreFooterBlocks(next, held.saved);
  return syncBacklinkSameAs(next, owned, links.map((link) => link.href));
}

function footerAnchor(link, rel) {
  const href = encodeAttr(link.href || "/");
  const label = encodeText(link.label || "Link");
  if (/^https?:/i.test(link.href || "")) {
    return `<a href="${href}" target="_blank" rel="${rel}">${label}</a>`;
  }
  return `<a href="${href}">${label}</a>`;
}

export function readFooter(html) {
  const pull = (id, label, re) => {
    const match = html.match(re);
    if (!match) return null;
    return {
      id,
      label,
      links: parseAnchors(match[1]).map((link) => ({ href: link.href, label: link.label })),
    };
  };
  const groups = [
    pull("social", "Follow", /<div class="col-social"[^>]*>([\s\S]*?)<\/div>/i),
    pull("meta", "Footer", /<div class="colophon-meta"[^>]*>([\s\S]*?)<\/div>/i),
    pull("network", "Across the network", /<span class="cn-links"[^>]*>([\s\S]*?)<\/span>/i),
    pull("refs", "Documents", /<nav class="bg-refs"[^>]*>([\s\S]*?)<\/nav>/i),
  ].filter(Boolean);
  const back = html.match(/<nav class="admin-backlinks"[^>]*>([\s\S]*?)<\/nav>/i);
  groups.push({
    id: "backlinks",
    label: "Extra footer links",
    links: back ? parseAnchors(back[1]).map((link) => ({ href: link.href, label: link.label })) : [],
  });
  return groups;
}

export function writeFooter(html, groups) {
  const byId = Object.fromEntries((groups || []).map((group) => [group.id, group.links || []]));
  let next = html;
  if (byId.social && /class="col-social"/i.test(next)) {
    next = next.replace(/(<div class="col-social"[^>]*>)([\s\S]*?)(<\/div>)/i, (_, open, inner, close) => {
      const heading = inner.match(/<p class="col-h">[\s\S]*?<\/p>/i);
      const head = heading ? heading[0] : `<p class="col-h">Follow</p>`;
      const paras = byId.social.map((link) => `<p>${footerAnchor(link, "noopener")}</p>`).join("\n      ");
      return `${open}\n      ${head}\n      ${paras}\n    ${close}`;
    });
  }
  if (byId.meta && /class="colophon-meta"/i.test(next)) {
    next = next.replace(/(<div class="colophon-meta"[^>]*>)[\s\S]*?(<\/div>)/i, (_, open, close) => {
      const paras = byId.meta.map((link) => `<p>${footerAnchor(link, "noopener me")}</p>`).join("\n      ");
      return `${open}\n      ${paras}\n    ${close}`;
    });
  }
  if (byId.network && /class="cn-links"/i.test(next)) {
    const inner = byId.network.map((link) => footerAnchor(link, "noopener")).join(" · ");
    next = next.replace(/(<span class="cn-links"[^>]*>)[\s\S]*?(<\/span>)/i, `$1${inner}$2`);
  }
  if (byId.refs && /class="bg-refs"/i.test(next)) {
    const inner = byId.refs.map((link) => footerAnchor(link, "noopener")).join("");
    next = next.replace(/(<nav class="bg-refs"[^>]*>)[\s\S]*?(<\/nav>)/i, `$1${inner}$2`);
  }
  if (byId.backlinks) {
    const previous = readBacklinkNav(next).map((link) => link.href);
    next = applyBacklinks(next, byId.backlinks, previous);
  }
  return next;
}

function syncBacklinkSameAs(html, ownedHrefs, nextHrefs) {
  const owned = new Set(ownedHrefs);
  const nextSet = new Set(nextHrefs);
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, json) => {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      return full;
    }
    let changed = false;
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node["@type"] === "Person" && node.name === "Israel Joffe" && Array.isArray(node.sameAs)) {
        const filtered = node.sameAs.filter((url) => !(owned.has(url) && !nextSet.has(url)));
        for (const url of nextHrefs) if (!filtered.includes(url)) filtered.push(url);
        if (filtered.length !== node.sameAs.length || filtered.some((url, index) => url !== node.sameAs[index])) {
          node.sameAs = filtered;
          changed = true;
        }
      }
      for (const value of Object.values(node)) visit(value);
    };
    visit(data);
    if (!changed) return full;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  });
}

export function readBacklinkNav(html) {
  const match = html.match(/<nav class="admin-backlinks"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!match) return [];
  return parseAnchors(match[1]).map((link) => ({ href: link.href, label: link.label }));
}

function sitemapEntry(loc) {
  return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
}

export function upsertSitemap(xml, loc) {
  if (xml.includes(`<loc>${loc}</loc>`)) return xml;
  // A <sitemapindex> (ihatecollege.com serves one) has no </urlset>. Writing
  // anyway would have been a silent no-op — the toggle reported success and
  // persisted nothing. Fail loudly instead.
  if (xml.includes("<sitemapindex")) {
    throw Object.assign(
      new Error("This sitemap is an index that points to other sitemap files, so a page cannot be added here directly."),
      { status: 409 },
    );
  }
  const entry = sitemapEntry(loc);
  if (xml.includes("</urlset>")) return xml.replace("</urlset>", `${entry}</urlset>`);
  throw Object.assign(new Error("That sitemap file has no <urlset> to add a page to."), { status: 409 });
}

export function removeSitemap(xml, loc) {
  // Remove byte-for-byte what upsertSitemap wrote. Its entry ends in "\n", and
  // the generic pattern below only eats whitespace BEFORE the tag — so on a
  // one-line sitemap (religiousjews.com) an add-then-remove left one stray
  // newline behind every cycle.
  const exact = sitemapEntry(loc);
  if (xml.includes(exact)) return xml.replace(exact, "");
  return xml.replace(new RegExp(`\\s*<url>\\s*<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>[\\s\\S]*?</url>`, "g"), "");
}
