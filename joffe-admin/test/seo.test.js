import test from "node:test";
import assert from "node:assert/strict";
import { auditSite } from "../lib/seo.js";

const home = `<!doctype html><html><head>
<title>Israel Joffe, Brooklyn</title>
<meta name="description" content="A sufficiently long description for the home page of the example site.">
<link rel="canonical" href="https://example.com/">
<meta property="og:image" content="https://example.com/img/hero.jpg">
</head><body><h1>Israel Joffe</h1><img src="/img/hero.jpg"><a href="/b/">B</a></body></html>`;

const pageB = `<!doctype html><html><head>
<title>A page about the work</title>
<meta name="description" content="A perfectly ordinary description that is long enough to pass the basic check.">
</head><body><h1>Work</h1><img src="/img/work.jpg" alt="Israel Joffe at work" width="900" height="600"><a href="/missing/">Missing</a></body></html>`;

const pages = [
  { rel: "index.html", path: "/" },
  { rel: "b/index.html", path: "/b/" },
];

function read(rel) {
  if (rel === "index.html") return home;
  if (rel === "b/index.html") return pageB;
  throw new Error("gone");
}

test("site audit finds the actionable page and image problems", () => {
  const report = auditSite({
    site: { host: "example.com" },
    pages,
    read,
    sitemap: `<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com/</loc></url></urlset>`,
    imageSitemap: `<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com/</loc><image:image><image:loc>https://example.com/img/hero.jpg</image:loc></image:image></url></urlset>`,
    robots: "User-agent: *\nSitemap: https://example.com/sitemap.xml",
    hasImageSitemap: true,
    checkLinks: true,
    checkSitemapLocals: true,
    pageExists: (path) => path === "/" || path === "/b/" || path === "/b",
  });
  assert.equal(report.summary.pages, 2);
  assert.equal(report.summary.missingAlt, 1);
  assert.equal(report.summary.imageNoDimensions, 1);
  assert.equal(report.summary.missingCanonical, 1);
  assert.equal(report.summary.notInSitemap, 1);
  assert.equal(report.summary.brokenInternalLinks, 1);
  assert.equal(report.summary.pagesInImageSitemap, 1);
  assert.equal(report.summary.imagePagesMissingFromImageSitemap, 1);
  assert.ok(report.issues.some((item) => item.code === "missing-alt" && item.path === "/"));
  assert.ok(report.issues.some((item) => item.code === "broken-internal-link" && item.path === "/b/"));
});

test("a generated sitemap with a missing page is a hard error", () => {
  const report = auditSite({
    site: { host: "example.com" },
    pages,
    read,
    sitemap: "",
    imageSitemap: "",
    robots: "",
    hasImageSitemap: false,
    checkLinks: false,
    checkSitemapLocals: false,
  });
  assert.equal(report.summary.errors >= 1, true);
  assert.ok(report.issues.some((item) => item.code === "missing-sitemap"));
});

test("a page not represented by image entries is counted as an image-sitemap gap", () => {
  const report = auditSite({
    site: { host: "example.com" },
    pages,
    read,
    sitemap: `<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com/</loc></url><url><loc>https://example.com/b/</loc></url></urlset>`,
    imageSitemap: `<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com/</loc><image:image><image:loc>https://example.com/img/hero.jpg</image:loc></image:image></url></urlset>`,
    robots: "Sitemap: https://example.com/sitemap.xml",
    hasImageSitemap: true,
    checkLinks: false,
    checkSitemapLocals: false,
  });
  assert.equal(report.summary.pagesInImageSitemap, 1);
  assert.equal(report.summary.imagePagesMissingFromImageSitemap, 1);
  assert.ok(report.issues.some((item) => item.code === "image-sitemap-gaps"));
});
