// Site-wide SEO and image audit. It is intentionally read-only and dependency
// free: every finding points at a page the editor can open, so the report is a
// work queue instead of a score.

function titleOf(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim() : "";
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

function attr(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag || "");
  return match ? (match[2] ?? match[3] ?? match[4] ?? "") : "";
}

function meta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ((attr(tag, "name") || attr(tag, "property")).toLowerCase() === key.toLowerCase()) {
      return decodeEntities(attr(tag, "content")).trim();
    }
  }
  return "";
}

function canonicalOf(html) {
  const tag = (html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i) || [""])[0];
  return decodeEntities(attr(tag, "href")).trim();
}

function stripQuery(value) {
  return String(value || "").split("#")[0].split("?")[0];
}

function normalizeUrl(value) {
  const raw = stripQuery(String(value || "").trim());
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function sitemapLocs(xml) {
  const locs = new Set();
  for (const match of String(xml || "").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const value = decodeEntities(match[1]).trim();
    locs.add(value);
    locs.add(value.replace(/\/+$/, ""));
    locs.add(value.endsWith("/") ? value : `${value}/`);
  }
  return locs;
}

function imageLocs(xml) {
  const locs = new Set();
  for (const match of String(xml || "").matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) {
    locs.add(decodeEntities(match[1]).trim());
  }
  return locs;
}

function imagePageLocs(xml) {
  const locs = new Set();
  for (const block of String(xml || "").matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    if (!/<image:image>/.test(block[1])) continue;
    const page = /<loc>([^<]+)<\/loc>/.exec(block[1]);
    if (page) locs.add(decodeEntities(page[1]).trim());
  }
  return locs;
}

function imagesOf(html) {
  return (html.match(/<img\b[^>]*>/gi) || []).map((tag) => ({
    src: attr(tag, "src"),
    alt: decodeEntities(attr(tag, "alt")).trim(),
    hasAlt: /\balt\s*=/.test(tag),
    width: attr(tag, "width"),
    height: attr(tag, "height"),
  }));
}

function genericAlt(alt, src) {
  const value = alt.trim().toLowerCase();
  if (!value) return false;
  if (["image", "photo", "picture", "img", "screenshot", "untitled", "hero image"].includes(value)) return true;
  const file = stripQuery(src).split("/").pop().toLowerCase();
  return Boolean(file && value === file);
}

function issue(list, severity, code, pagePath, detail) {
  list.push({ severity, code, path: pagePath, detail });
}

function pathFromLoc(loc, host) {
  try {
    const url = new URL(loc);
    if (url.host !== host) return "";
    return `${url.pathname}`.endsWith("/") ? url.pathname : `${url.pathname}/`;
  } catch {
    return "";
  }
}

export function auditSite({
  site,
  pages,
  read,
  sitemap = "",
  imageSitemap = "",
  robots = "",
  hasImageSitemap = false,
  checkLinks = false,
  checkSitemapLocals = false,
  pageExists = () => true,
}) {
  const issues = [];
  const summaries = {
    pages: 0,
    images: 0,
    missingTitle: 0,
    longTitle: 0,
    shortTitle: 0,
    missingDescription: 0,
    longDescription: 0,
    shortDescription: 0,
    missingCanonical: 0,
    canonicalMismatch: 0,
    noindex: 0,
    missingH1: 0,
    multipleH1: 0,
    missingAlt: 0,
    genericAlt: 0,
    imageNoDimensions: 0,
    missingSocialImage: 0,
    missingSocialAlt: 0,
    notInSitemap: 0,
    brokenInternalLinks: 0,
    staleSitemapUrls: 0,
    imagePagesMissingFromImageSitemap: 0,
  };
  const titles = new Map();
  const descriptions = new Map();
  const sitemapSet = sitemapLocs(sitemap);
  const imageSet = imageLocs(imageSitemap);
  const imagePageSet = imagePageLocs(imageSitemap);
  const pageSet = new Set(pages.map((page) => normalizeUrl(page.path)));
  let totalImages = 0;
  let pagesWithImages = 0;
  let pagesInImageSitemap = 0;

  for (const page of pages) {
    let html;
    try {
      html = read(page.rel);
    } catch {
      continue;
    }
    summaries.pages += 1;
    const pagePath = page.path;
    const title = titleOf(html);
    const description = meta(html, "description");
    const canonical = canonicalOf(html);
    const robotsMeta = meta(html, "robots");
    const noindex = /\bnoindex\b/i.test(robotsMeta);
    const h1s = html.match(/<h1\b[^>]*>/gi) || [];
    const images = imagesOf(html);
    const pageUrl = `https://${site.host}${pagePath}`;

    if (!title) {
      summaries.missingTitle += 1;
      issue(issues, "error", "missing-title", pagePath, "No <title>.");
    } else {
      titles.set(title, [...(titles.get(title) || []), pagePath]);
      if (title.length > 65) {
        summaries.longTitle += 1;
        issue(issues, "warning", "long-title", pagePath, `Title is ${title.length} characters; Google may truncate it.`);
      } else if (title.length < 15) {
        summaries.shortTitle += 1;
        issue(issues, "warning", "short-title", pagePath, `Title is only ${title.length} characters.`);
      }
    }

    if (!description) {
      summaries.missingDescription += 1;
      issue(issues, "warning", "missing-description", pagePath, "No meta description.");
    } else {
      descriptions.set(description, [...(descriptions.get(description) || []), pagePath]);
      if (description.length > 165) {
        summaries.longDescription += 1;
        issue(issues, "warning", "long-description", pagePath, `Description is ${description.length} characters; it will be cut off.`);
      } else if (description.length < 50) {
        summaries.shortDescription += 1;
        issue(issues, "warning", "short-description", pagePath, `Description is only ${description.length} characters.`);
      }
    }

    if (!canonical) {
      summaries.missingCanonical += 1;
      issue(issues, "error", "missing-canonical", pagePath, "No canonical URL.");
    } else if (normalizeUrl(canonical) !== normalizeUrl(pageUrl)) {
      summaries.canonicalMismatch += 1;
      issue(issues, "warning", "canonical-mismatch", pagePath, `Canonical points to ${canonical}.`);
    }

    if (noindex) {
      summaries.noindex += 1;
      issue(issues, "notice", "noindex", pagePath, "This page asks search engines not to index it.");
    }

    if (!h1s.length) {
      summaries.missingH1 += 1;
      issue(issues, "error", "missing-h1", pagePath, "No <h1>.");
    } else if (h1s.length > 1) {
      summaries.multipleH1 += 1;
      issue(issues, "warning", "multiple-h1", pagePath, `${h1s.length} <h1> elements.`);
    }

    totalImages += images.length;
    if (images.length) pagesWithImages += 1;
    for (const image of images) {
      if (!image.hasAlt || !image.alt) {
        summaries.missingAlt += 1;
        issue(issues, "warning", "missing-alt", pagePath, `Image has no alt text: ${image.src || "(no src)"}`);
      } else if (genericAlt(image.alt, image.src)) {
        summaries.genericAlt += 1;
        issue(issues, "warning", "generic-alt", pagePath, `Alt text is too generic: “${image.alt}”`);
      } else if (image.alt.length > 160) {
        issue(issues, "notice", "long-alt", pagePath, `Alt text is ${image.alt.length} characters.`);
      }
      if (!image.width || !image.height) {
        summaries.imageNoDimensions += 1;
        issue(issues, "notice", "image-no-dimensions", pagePath, `Image has no width/height: ${image.src || "(no src)"}`);
      }
    }

    const social = meta(html, "og:image");
    if (!social) {
      summaries.missingSocialImage += 1;
      issue(issues, "warning", "missing-og-image", pagePath, "No Open Graph image.");
    } else if (!meta(html, "og:image:alt")) {
      summaries.missingSocialAlt += 1;
      issue(issues, "notice", "missing-og-image-alt", pagePath, "No Open Graph image alt text.");
    }

    if (!noindex && !sitemapSet.has(pageUrl) && !sitemapSet.has(pageUrl.replace(/\/$/, ""))) {
      summaries.notInSitemap += 1;
      issue(issues, "warning", "not-in-sitemap", pagePath, "Indexable page is not in the sitemap.");
    }

    if (hasImageSitemap && images.length) {
      if (imagePageSet.has(pageUrl) || imagePageSet.has(pageUrl.replace(/\/$/, ""))) pagesInImageSitemap += 1;
      else summaries.imagePagesMissingFromImageSitemap += 1;
    }

    if (checkLinks) {
      const seen = new Set();
      for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
        const href = decodeEntities(match[1]).trim();
        if (!href.startsWith("/") || href.startsWith("//")) continue;
        const target = stripQuery(href);
        if (!target || target === "/" || target.startsWith("/#")) continue;
        if (/^\/(?:img|images|assets|fonts|css|js)\//i.test(target)) continue;
        if (/\.[a-z0-9]{1,6}$/i.test(target) && !/\.html?$/i.test(target)) continue;
        const normalized = normalizeUrl(target);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        if (!pageExists(normalized) && !pageExists(target)) {
          summaries.brokenInternalLinks += 1;
          issue(issues, "warning", "broken-internal-link", pagePath, `Internal link goes nowhere: ${href}`);
        }
      }
    }
  }

  // Duplicate titles/descriptions are a site-level problem, not 40 separate
  // page problems, so report one finding per duplicate with the first few paths.
  for (const [value, paths] of titles) {
    if (paths.length < 2) continue;
    issue(issues, "warning", "duplicate-title", "", `${paths.length} pages share “${value}”: ${paths.slice(0, 5).join(", ")}`);
  }
  for (const [value, paths] of descriptions) {
    if (paths.length < 2) continue;
    issue(issues, "notice", "duplicate-description", "", `${paths.length} pages share the same description: ${paths.slice(0, 5).join(", ")}`);
  }

  if (!sitemap) {
    issue(issues, "error", "missing-sitemap", "/", "No sitemap.xml found in this site's source.");
  } else if (!/<urlset|<sitemapindex/i.test(sitemap)) {
    issue(issues, "error", "invalid-sitemap", "/", "sitemap.xml does not contain a <urlset> or <sitemapindex>.");
  } else if (!robots.includes("Sitemap:")) {
    issue(issues, "warning", "robots-no-sitemap", "/robots.txt", "robots.txt does not point at a sitemap.");
  }

  if (pagesWithImages && !hasImageSitemap) {
    issue(issues, "warning", "no-image-sitemap", "/sitemap-images.xml", `${pagesWithImages} pages have images but this site has no image sitemap.`);
  } else if (hasImageSitemap) {
    const missing = summaries.imagePagesMissingFromImageSitemap;
    if (missing) {
      issue(issues, "notice", "image-sitemap-gaps", "/sitemap-images.xml", `${missing} pages with images are not represented in the image sitemap yet.`);
    }
    const orphanImages = [...imageSet].length;
    if (!orphanImages) issue(issues, "warning", "empty-image-sitemap", "/sitemap-images.xml", "The image sitemap has no <image:loc> entries.");
  }

  if (checkSitemapLocals) {
    const seen = new Set();
    for (const loc of sitemapSet) {
      if (!loc.startsWith(`https://${site.host}`) && !loc.startsWith(`http://${site.host}`)) continue;
      const path = pathFromLoc(loc, site.host);
      if (!path || path === "/") continue;
      const normalized = normalizeUrl(path);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      if (!pageSet.has(normalized)) {
        summaries.staleSitemapUrls += 1;
        issue(issues, "warning", "stale-sitemap-url", "", `Sitemap lists a page that is not on disk: ${loc}`);
      }
    }
  }

  const rank = { error: 0, warning: 1, notice: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path));
  const counts = {
    errors: issues.filter((item) => item.severity === "error").length,
    warnings: issues.filter((item) => item.severity === "warning").length,
    notices: issues.filter((item) => item.severity === "notice").length,
  };
  const summary = {
    ...summaries,
    images: totalImages,
    pagesWithImages,
    pagesInImageSitemap,
    sitemapUrls: [...new Set([...sitemapSet].map((loc) => loc.replace(/\/$/, "")))].length,
    imageSitemapImages: imageSet.size,
    ...counts,
  };
  return {
    site: site.host,
    generatedAt: new Date().toISOString(),
    counts,
    summary,
    issues: issues.slice(0, 800),
    truncated: issues.length > 800,
  };
}
