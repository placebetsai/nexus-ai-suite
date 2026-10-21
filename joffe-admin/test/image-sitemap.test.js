import test from "node:test";
import assert from "node:assert/strict";
import {
  insertImage,
  listImages,
  removeSitemapImages,
  upsertSitemapImages,
  writeAlts,
} from "../lib/edit.js";

const NS = 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

test("insertImage writes real width and height plus lazy decoding", () => {
  const html = insertImage("<main></main>", "/img/a.jpg", "Israel Joffe", { width: 800, height: 600 });
  assert.match(html, /width="800"/);
  assert.match(html, /height="600"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /loading="lazy"/);
});

test("listImages reads the dimensions back", () => {
  const html = '<img src="/img/a.jpg" alt="A" width="800" height="600">';
  assert.deepEqual(listImages(html)[0].width, 800);
  assert.deepEqual(listImages(html)[0].height, 600);
});

test("saving alts can also add missing intrinsic dimensions", () => {
  const html = writeAlts('<img src="/img/a.jpg" alt="Old">', [
    { alt: "New", width: 800, height: 600 },
  ]);
  assert.match(html, /alt="New"/);
  assert.match(html, /width="800"/);
  assert.match(html, /height="600"/);
});

test("a percentage width is not overwritten by the file's pixel width", () => {
  const html = writeAlts('<img src="/img/a.jpg" alt="A" width="100%">', [
    { alt: "A", width: 800, height: 600 },
  ]);
  assert.match(html, /width="100%"/);
  assert.match(html, /height="600"/);
});

test("image sitemap entries are added to the page URL without duplicates", () => {
  const xml = `<urlset ${NS}><url><loc>https://example.com/</loc></url></urlset>`;
  const once = upsertSitemapImages(xml, "https://example.com/", [
    { src: "https://example.com/img/a.jpg", title: "A", caption: "A photo" },
  ]);
  assert.match(once, /<image:loc>https:\/\/example.com\/img\/a.jpg<\/image:loc>/);
  const twice = upsertSitemapImages(once, "https://example.com/", [
    { src: "https://example.com/img/a.jpg", title: "A", caption: "A photo" },
  ]);
  assert.equal(twice, once);
});

test("an image sitemap without the image namespace is not made invalid", () => {
  const xml = "<urlset><url><loc>https://example.com/</loc></url></urlset>";
  assert.equal(upsertSitemapImages(xml, "https://example.com/", [{ src: "https://example.com/a.jpg" }]), xml);
});

test("removing a page's image entries leaves the URL entry intact", () => {
  const xml = `<urlset ${NS}><url><loc>https://example.com/</loc><image:image><image:loc>https://example.com/a.jpg</image:loc></image:image></url></urlset>`;
  const next = removeSitemapImages(xml, "https://example.com/");
  assert.match(next, /<url><loc>https:\/\/example.com\/<\/loc><\/url>/);
  assert.doesNotMatch(next, /<image:image>/);
});
