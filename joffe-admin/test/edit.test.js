import test from "node:test";
import assert from "node:assert/strict";
import {
  MENTIONS,
  addNavLink,
  appendParagraph,
  applyBacklinks,
  ensureMentions,
  flatSibling,
  insertImage,
  readFooter,
  readPage,
  removeImage,
  removeNavLink,
  renameNavLink,
  writeFooter,
  writeIcons,
  removeSitemap,
  writePage,
  writeNav,
  writeAlts,
  urlToRel,
  relToUrl,
  upsertSitemap,
} from "../lib/edit.js";

// mirrors lib/edit.js's entry format so tests can assert byte equality
function sitemapEntryForTest(loc) {
  return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
}

const SAMPLE = `<!doctype html><html><head>
<title>Old title</title>
<meta name="description" content="Old description" />
<link rel="canonical" href="https://israeljoffe.org/about/" />
<meta property="og:title" content="Old title" />
<meta property="og:description" content="Old description" />
<meta property="og:url" content="https://israeljoffe.org/about/" />
<meta name="twitter:title" content="Old title" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Israel Joffe","sameAs":["https://israeljoffe.com/"]}</script>
</head><body>
<nav class="primary" aria-label="Primary">
    <a href="/">Home</a>
    <a href="/about/">About</a>
  </nav>
<div class="mobile-nav"><nav class="mobile-nav-inner" aria-label="Mobile primary">
    <a href="/">Home</a>
    <a href="/about/">About</a>
  </nav></div>
<main class="wp-page"><h1>About</h1><p>Hello</p><img src="/img/a.jpg" alt="old"></main>
<footer class="colophon"><div class="colophon-meta">
      <p><a href="https://israeljoffe.substack.com">Substack</a></p>
    </div></footer>
</body></html>`;

test("seo, h1, and main round-trip", () => {
  const next = writePage(SAMPLE, {
    title: "About — Israel Joffe",
    description: "A & B",
    canonical: "https://israeljoffe.org/about/",
    h1: "About — Israel Joffe",
    main: '<main class="wp-page"><h1>About — Israel Joffe</h1><p>Updated</p></main>',
  });
  const page = readPage(next);
  assert.equal(page.title, "About — Israel Joffe");
  assert.equal(page.description, "A & B");
  assert.equal(page.h1, "About — Israel Joffe");
  assert.match(page.main, /Updated/);
  assert.match(next, /og:title" content="About — Israel Joffe"/);
  assert.match(next, /content="A &amp; B"/);
});

test("social card and link image update the matching tags", () => {
  const share = SAMPLE.replace(
    "</head>",
    `<meta property="og:image" content="https://israeljoffe.org/img/wide.jpg" />
<meta property="og:image:secure_url" content="https://israeljoffe.org/img/wide.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:alt" content="Wide" />
<meta property="og:image" content="https://israeljoffe.org/img/square.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:alt" content="Square" />
<meta name="twitter:image" content="https://israeljoffe.org/img/wide.jpg" />
<meta name="twitter:image:alt" content="Wide" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</head>`,
  );
  const next = writePage(share, {
    canonical: "https://israeljoffe.org/about/",
    socialImage: "/img/card.png",
    socialAlt: "Israel Joffe",
    linkImage: "/img/link.jpg",
    linkAlt: "Israel Joffe square",
  });
  assert.match(next, /property="og:image" content="https:\/\/israeljoffe.org\/img\/card.png"/);
  assert.match(next, /og:image:secure_url" content="https:\/\/israeljoffe.org\/img\/card.png"/);
  assert.match(next, /name="twitter:image" content="https:\/\/israeljoffe.org\/img\/card.png"/);
  assert.match(next, /property="og:image" content="https:\/\/israeljoffe.org\/img\/link.jpg"/);
  assert.match(next, /og:image:type" content="image\/png"/);
  const page = readPage(next);
  assert.equal(page.socialImage, "/img/card.png");
  assert.equal(page.linkImage, "/img/link.jpg");
  assert.equal(page.socialAlt, "Israel Joffe");
  const icons = writeIcons(next, { favicon: "/img/mark.png", appleIcon: "/img/mark-apple.png" });
  assert.match(icons, /rel="icon" href="\/img\/mark.png" type="image\/png"/);
  assert.match(icons, /rel="apple-touch-icon" href="\/img\/mark-apple.png"/);
  assert.equal((icons.match(/rel="icon"/g) || []).length, 1);
});

test("alt tags update by image order and fill a missing alt", () => {
  const html = '<main><img src="/a.jpg"><img src="/b.jpg" alt="keep"></main>';
  const next = writeAlts(html, [
    { alt: "Israel Joffe" },
    { alt: "Israel Joffe training" },
  ]);
  assert.match(next, /alt="Israel Joffe"/);
  assert.match(next, /alt="Israel Joffe training"/);
  assert.equal(readPage(next).images[0].missing, false);
});

test("navigation replaces desktop and mobile together", () => {
  const next = writeNav(SAMPLE, [
    { href: "/", label: "Home", className: "" },
    { href: "/story/", label: "Story", className: "" },
  ]);
  assert.equal(readPage(next).nav.map((link) => link.href).join(","), "/,/story/");
  assert.equal((next.match(/\/story\//g) || []).length, 2);
});

test("mentions are inserted once and attached to the Israel Joffe person", () => {
  const once = ensureMentions(SAMPLE);
  const twice = ensureMentions(once);
  for (const link of MENTIONS) {
    assert.equal(twice.split(link.href).length - 1, once.split(link.href).length - 1);
    assert.ok(twice.includes(link.href));
  }
  const person = JSON.parse(twice.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(person.sameAs.includes(MENTIONS[0].href));
  assert.ok(person.sameAs.includes(MENTIONS[1].href));
});

test("page paths stay inside the site", () => {
  assert.equal(urlToRel("/about/"), "about/index.html");
  assert.equal(urlToRel("/"), "index.html");
  assert.throws(() => urlToRel("/../.secrets/cf.env"));
});

test("an uploaded image and a paragraph land in the page body", () => {
  const html = '<main class="wp-page"><div class="wpp-body"><p>Old</p></div></main>';
  const withImage = insertImage(html, "/img/photo.jpg", 'Israel Joffe & "Roxy"');
  assert.match(withImage, /src="\/img\/photo.jpg"/);
  assert.match(withImage, /alt="Israel Joffe &amp; &quot;Roxy&quot;"/);
  const withText = appendParagraph(withImage, "New line");
  assert.match(withText, /<p>New line<\/p><figure/);
  assert.equal(insertImage(withImage, "/img/photo.jpg", "again"), withImage);
});

test("backlinks can be added and removed without duplicating the footer", () => {
  const html = `<footer class="colophon"><p><a href="https://example.com/old" target="_blank" rel="noopener me">Old</a></p></footer>`;
  const links = [{ href: "https://example.com/new-page", label: "Israel Joffe interview" }];
  const once = applyBacklinks(html, links, ["https://example.com/old"]);
  const twice = applyBacklinks(once, links, links.map((link) => link.href));
  assert.equal(twice, once);
  assert.match(once, /class="admin-backlinks"/);
  assert.match(once, /Israel Joffe interview/);
  assert.equal(once.includes("example.com/old"), false);
  const xml = upsertSitemap('<?xml version="1.0"?><urlset>\n</urlset>', "https://israeljoffe.org/notes/");
  assert.equal(removeSitemap(xml, "https://israeljoffe.org/notes/").includes("/notes/"), false);
});

test("removing an image takes the figure with it", () => {
  const html = `<main><p>Keep</p><figure class="wp-block-image"><img src="/img/1791578480587-joffe.jpg" alt="World of Unpredictable Wrestling" loading="lazy" /></figure></main>`;
  const next = removeImage(html, "/img/1791578480587-joffe.jpg");
  assert.equal(next.includes("joffe.jpg"), false);
  assert.equal(next.includes("<figure"), false);
  assert.match(next, /Keep/);
});

test("footer follow links can change without dropping the network row", () => {
  const html = `<footer class="colophon"><div class="col-social"><p class="col-h">Follow</p><p><a href="https://twitter.com/Rodzjohnny" target="_blank" rel="noopener">Twitter</a></p></div><span class="cn-links"><a href="/network/placebets-ai/">placebets.ai</a></span></footer>`;
  const groups = readFooter(html);
  groups.find((group) => group.id === "social").links = [{ label: "Instagram", href: "https://instagram.com/wuw" }];
  const next = writeFooter(html, groups);
  assert.match(next, /Instagram/);
  assert.equal(next.includes("twitter.com"), false);
  assert.match(next, /placebets.ai/);
  assert.match(next, /Follow/);
});

test("extra footer links do not delete the follow column", () => {
  const html = `<footer class="colophon"><div class="colophon-meta"><p><a href="https://example.com/keep" target="_blank" rel="noopener me">Keep</a></p></div></footer>`;
  const next = applyBacklinks(html, [{ href: "https://example.com/keep", label: "Keep" }], ["https://example.com/keep"]);
  assert.match(next, /class="colophon-meta"[\s\S]*example.com\/keep/);
  assert.match(next, /class="admin-backlinks"/);
});

test("sitemap gains a page once", () => {
  const xml = '<?xml version="1.0"?><urlset>\n</urlset>';
  const once = upsertSitemap(xml, "https://israeljoffe.org/notes/");
  const twice = upsertSitemap(once, "https://israeljoffe.org/notes/");
  assert.equal(twice, once);
  assert.match(once, /israeljoffe.org\/notes\//);
});

// --- added for the "every federation site in the portal" round (2026-10-13) ---

test("a title carrying attributes still reads back and rewrites in place", () => {
  // ihatecollege.com ships <title data-next-head="">…</title>. The old pattern
  // required a bare <title>, so the title read as empty and a save did nothing.
  const html = `<!doctype html><html><head><title data-next-head="">Old title</title></head><body><main><h1>x</h1></main></body></html>`;
  assert.equal(readPage(html).title, "Old title");
  const next = writePage(html, { title: "New title" });
  assert.equal(readPage(next).title, "New title");
  assert.match(next, /<title data-next-head="">New title<\/title>/);
  assert.equal(next.includes("Old title"), false);
});

test("setting a title on a page that has no title inserts one", () => {
  const html = `<!doctype html><html><head><meta name="description" content="d" /></head><body></body></html>`;
  assert.equal(readPage(html).title, "");
  const next = writePage(html, { title: "Brand new" });
  assert.equal(readPage(next).title, "Brand new");
});

test("flat html files map to the URL that actually resolves", () => {
  // Next/Cloudflare Pages emit about.html, served at /about (both 200 —
  // measured). Reporting /about.html never matched the <loc> in the sitemap.
  assert.equal(relToUrl("index.html"), "/");
  assert.equal(relToUrl("about/index.html"), "/about/");
  assert.equal(relToUrl("about.html"), "/about");
  assert.equal(relToUrl("blog/post.html"), "/blog/post");
  assert.equal(urlToRel(relToUrl("about/index.html")), "about/index.html");
});

test("adding a page to a sitemap index fails loudly instead of doing nothing", () => {
  // ihatecollege.com/sitemap.xml is a <sitemapindex>. The old writer found no
  // </urlset>, returned the input unchanged, and the toggle still said it saved.
  const xml =
    '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://ihatecollege.com/sitemap-static.xml</loc></sitemap></sitemapindex>';
  assert.throws(() => upsertSitemap(xml, "https://ihatecollege.com/new/"), /index/i);
});

test("a flat file is found for a directory-style path", () => {
  // Regression: slicing "index.html" off "about/index.html" leaves "about/",
  // and appending ".html" to that produced "about/.html" — every flat-file
  // page returned 404 from the portal until this was caught in a live test.
  assert.equal(flatSibling("about/index.html"), "about.html");
  assert.equal(flatSibling("blog/post/index.html"), "blog/post.html");
  assert.equal(flatSibling("index.html"), null);
  assert.equal(flatSibling("about.html"), null);
  // what the server actually asks for: the pure converter, then the sibling
  assert.equal(flatSibling(urlToRel("/about")), "about.html");
  assert.equal(relToUrl(flatSibling(urlToRel("/about"))), "/about");
});

test("adding then removing a sitemap entry restores the file byte for byte", () => {
  // religiousjews.com/sitemap.xml is a single line with no newline anywhere
  // (measured: 2464 bytes, 0 newlines). The entry upsertSitemap writes ends in
  // "\n" but removeSitemap only ate whitespace BEFORE the tag, so every
  // add/remove cycle on a one-line sitemap left one extra byte behind.
  const oneLine = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc><priority>1.0</priority></url></urlset>`;
  const loc = "https://example.com/new/";
  const added = upsertSitemap(oneLine, loc);
  assert.notEqual(added, oneLine, "entry should have been added");
  // the whole point: removal gives the original back, byte for byte
  const removed = removeSitemap(added, loc);
  assert.equal(removed, oneLine);
  assert.equal(removed.length, oneLine.length);

  // A pretty-printed sitemap must survive the same round trip too.
  const pretty = `<?xml version="1.0"?>\n<urlset>\n  <url><loc>https://example.com/</loc></url>\n</urlset>\n`;
  const prettyAdded = upsertSitemap(pretty, loc);
  assert.equal(prettyAdded, pretty.replace("</urlset>", sitemapEntryForTest(loc) + "</urlset>"));
  assert.equal(removeSitemap(prettyAdded, loc), pretty);
});

test("removing a page the portal did not add still works", () => {
  // Generator-written entries differ from the portal's own format; the generic
  // fallback has to find those.
  const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc><priority>1.0</priority></url><url><loc>https://example.com/about/</loc><priority>0.8</priority></url></urlset>`;
  const out = removeSitemap(xml, "https://example.com/about/");
  assert.equal(out.includes("<loc>https://example.com/about/</loc>"), false);
  assert.equal(out.includes("<loc>https://example.com/</loc>"), true);
  assert.doesNotThrow(() => upsertSitemap(out, "https://example.com/about/"));
});

// --- surgical menu edits (regression for the grouped-nav flattening bug) ---

const GROUPED_PAGE = `<!doctype html><html><body>
<nav class="primary" aria-label="Primary">
    <div class="nav-group">
      <span class="nav-group-label">Find</span>
      <a href="/synagogues/">Synagogues</a>
      <a href="/kosher-restaurants/">Restaurants</a>
    </div>
    <div class="nav-group">
      <span class="nav-group-label">Community</span>
      <a href="/jobs/">Jewish Jobs</a>
      <a href="/contact/">Contact</a>
    </div>
  </nav>
<nav class="mobile-nav-inner" aria-label="Mobile primary">
    <a href="/" class="mn-home">Home</a>
    <p class="mn-group-label">Find Near You</p>
    <a href="/synagogues/">Synagogues</a>
    <a href="/kosher-restaurants/">Kosher Restaurants</a>
    <a href="/contact/" class="mn-contact">Contact</a>
  </nav>
</body></html>`;

test("adding then removing a menu link restores the page byte for byte", () => {
  // The old path rebuilt every <nav> from a parsed list; parseAnchors() drops
  // the <nav-group> wrappers, so one menu save flattened religiousjews.com's
  // desktop menu across 31 files.
  const added = addNavLink(GROUPED_PAGE, "/articles/", "Articles");
  assert.notEqual(added, GROUPED_PAGE, "link should have been added");
  assert.equal((added.match(/<div class="nav-group">/g) || []).length, 2, "groups must survive");
  assert.equal(added.includes('<a href="/articles/">Articles</a>'), true);
  assert.equal(removeNavLink(added, "/articles/"), GROUPED_PAGE);
});

test("a new link lands inside a group, not loose in the menu bar", () => {
  const added = addNavLink(GROUPED_PAGE, "/articles/", "Articles");
  assert.match(added, /<\/span>\s*<a href="\/synagogues\/">/);
  assert.match(added, /Contact<\/a>\s*<a href="\/articles\/">Articles<\/a>\s*<\/div>/);
  // added to the mobile menu too, and left at its own level
  assert.match(added, /<a href="\/contact\/" class="mn-contact">Contact<\/a>\s*<a href="\/articles\/">Articles<\/a>/);
});

test("adding a link that is already in both menus changes nothing", () => {
  assert.equal(addNavLink(GROUPED_PAGE, "/synagogues/", "Synagogues"), GROUPED_PAGE);
});

test("removing a menu link touches only that link", () => {
  const next = removeNavLink(GROUPED_PAGE, "/kosher-restaurants/");
  assert.equal(next.includes('href="/kosher-restaurants/"'), false);
  assert.equal((next.match(/<div class="nav-group">/g) || []).length, 2);
  assert.match(next, /Jewish Jobs/);
  assert.match(next, /Find Near You/);
  assert.equal(removeNavLink(GROUPED_PAGE, "/not-in-this-menu/"), GROUPED_PAGE, "no-op when absent");
});

test("renaming keeps a mobile label that legitimately differs", () => {
  // Desktop says "Restaurants", mobile says "Kosher Restaurants" — renaming by
  // href alone would rewrite the mobile one too.
  const next = renameNavLink(GROUPED_PAGE, "/kosher-restaurants/", "Restaurants", "Kosher Dining");
  assert.match(next, /<a href="\/kosher-restaurants\/">Kosher Dining<\/a>/);
  assert.match(next, /<a href="\/kosher-restaurants\/">Kosher Restaurants<\/a>/);
  assert.equal(renameNavLink(GROUPED_PAGE, "/jobs/", "Jewish Jobs", "Jewish Jobs"), GROUPED_PAGE, "same label is a no-op");
});

const CTA_PAGE = `<!doctype html><html><body>
<nav class="primary" aria-label="Primary">
    <a href="/events/">Events</a>
    <a href="/contact/">Contact</a>
    <a href="/contact/" class="primary-cta">Train</a>
  </nav>
<nav class="mobile-nav-inner" aria-label="Mobile primary">
    <a href="/events/">Events</a>
    <a href="/contact/">Contact</a>
    <div class="mobile-nav-fine">
      <a href="tel:7187972872">718-797-2872</a>
    </div>
  </nav>
</body></html>`;

test("a new link never lands after the call to action or the contact block", () => {
  const next = addNavLink(CTA_PAGE, "/gallery/", "Gallery");
  const desktop = next.match(/<nav class="primary"[^>]*>[\s\S]*?<\/nav>/i)[0];
  const mobile = next.match(/<nav class="mobile-nav-inner"[^>]*>[\s\S]*?<\/nav>/i)[0];
  assert.match(desktop, /<a href="\/gallery\/">Gallery<\/a>\s*<a href="\/contact\/" class="primary-cta">/);
  assert.match(mobile, /<a href="\/gallery\/">Gallery<\/a>\s*<div class="mobile-nav-fine">/);
  assert.match(mobile, /tel:7187972872/, "the phone number must stay put");
});
