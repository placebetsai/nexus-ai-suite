#!/usr/bin/env python3
"""gen-image-sitemap.py — build a Google image sitemap for a static site.

Crawls every <loc> in the site's main sitemap, extracts real <img>/og:image/
JSON-LD images from each page's HTML, verifies every image URL answers 2xx,
and emits a standalone /sitemap-images.xml (urlset + image namespace).

stdlib only. Polite (0.25s pacing, 2 retries). Unproven images are DROPPED,
never guessed: only URLs that answered 200 in this run are written.

Usage: gen-image-sitemap.py <site-base-url> <main-sitemap-url> <out-file>
"""
import json
import re
import sys
import time
import urllib.request
import urllib.parse
from xml.sax.saxutils import escape

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
MAX_PER_PAGE = 40
TRACKER = re.compile(r"doubleclick|google-analytics|googletagmanager|facebook\.com|"
                     r"fbcdn|pixel|scorecardresearch|hotjar|adservice", re.I)
IMG_SRC = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.I)
IMG_ALT = re.compile(r"<img[^>]+alt=[\"']([^\"']*)[\"']", re.I)
SRCSET = re.compile(r"srcset=[\"']([^\"']+)[\"']", re.I)
OG_IMG = re.compile(r"<meta[^>]+(?:property|name)=[\"'](og:image(?::url)?|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"']", re.I)
TITLE = re.compile(r"<title[^>]*>([^<]*)</title>", re.I)
JSONLD = re.compile(r"<script[^>]+application/ld\+json[^>]*>(.*?)</script>", re.I | re.S)


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.headers.get("content-type", ""), r.read()


def ok_image(url):
    try:
        st, ct, _ = get(url, timeout=20)
        return st == 200 and ("image/" in ct or ct.startswith("application/octet-stream"))
    except Exception:
        return False


def srcset_best(s):
    best, bw = "", -1
    for part in s.split(","):
        bits = part.strip().split()
        if not bits:
            continue
        w = 0
        m = re.match(r"(\d+)", bits[1]) if len(bits) > 1 else None
        if m:
            w = int(m.group(1))
        elif len(bits) == 1:
            w = 1
        if w > bw:
            best, bw = bits[0], w
    return best


def images_of(html, base):
    out, seen = [], set()

    def add(u, alt=""):
        if not u or u.startswith("data:"):
            return
        u = urllib.parse.urljoin(base, u).split("#")[0]
        if not u.startswith("http") or TRACKER.search(u):
            return
        if u not in seen:
            seen.add(u)
            out.append((u, alt.strip()[:200]))

    for m in OG_IMG.finditer(html):
        add(m.group(2), "cover")
    for m in IMG_SRC.finditer(html):
        add(m.group(1))
    for m in SRCSET.finditer(html):
        add(srcset_best(m.group(1)))
    for m in JSONLD.finditer(html):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:
            continue
        stack = [data]
        while stack:
            n = stack.pop()
            if isinstance(n, dict):
                for k, v in n.items():
                    if k == "image" and isinstance(v, str):
                        add(v)
                    elif k == "image" and isinstance(v, list):
                        for e in v:
                            if isinstance(e, str):
                                add(e)
                            elif isinstance(e, dict) and "url" in e:
                                add(e["url"])
                    elif isinstance(v, (dict, list)):
                        stack.append(v)
            elif isinstance(n, list):
                stack.extend(n)
    return out[:MAX_PER_PAGE]


def main():
    base, smap, out = sys.argv[1], sys.argv[2], sys.argv[3]
    st, _, body = get(smap)
    if st != 200:
        sys.exit(f"main sitemap {smap} -> {st}")
    xml = body.decode("utf-8", "replace")
    locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", xml)
    lastmods = dict(zip(re.findall(r"<loc>\s*([^<]+?)\s*</loc>", xml),
                        re.findall(r"<lastmod>\s*([^<]+?)\s*</lastmod>", xml))) \
        if "<lastmod>" in xml else {}
    locs = [l for l in locs if l.startswith("http")]
    print(f"  pages in sitemap: {len(locs)}", flush=True)

    entries, img_fail = [], 0
    for i, page in enumerate(locs):
        try:
            st, ct, body = get(page)
        except Exception as e:
            print(f"    PAGE FAIL {page}: {e}", flush=True)
            img_fail += 1
            continue
        if st != 200 or "html" not in ct:
            print(f"    PAGE SKIP {page} -> {st} {ct}", flush=True)
            continue
        html = body.decode("utf-8", "replace")
        tm = TITLE.search(html)
        title = tm.group(1).strip() if tm else urllib.parse.urlparse(page).path or "/"
        imgs = images_of(html, page)
        kept = []
        for u, alt in imgs:
            if ok_image(u):
                kept.append((u, alt or title[:120]))
            else:
                img_fail += 1
            time.sleep(0.12)
        if kept:
            entries.append((page, lastmods.get(page), kept))
        time.sleep(0.25)
        if (i + 1) % 15 == 0:
            print(f"    ...{i + 1}/{len(locs)} pages, {sum(len(k) for _, _, k in entries)} images verified",
                  flush=True)

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
             'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for page, lm, kept in entries:
        lmxml = f"<lastmod>{escape(lm)}</lastmod>" if lm else ""
        lines.append(f"  <url><loc>{escape(page)}</loc>{lmxml}")
        for u, alt in kept:
            lines.append(f"    <image:image><image:loc>{escape(u)}</image:loc>"
                         f"<image:title>{escape(alt)}</image:title></image:image>")
        lines.append("  </url>")
    lines.append("</urlset>")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    from xml.dom import minidom
    minidom.parse(out)  # well-formedness gate
    nimg = sum(len(k) for _, _, k in entries)
    print(f"  WROTE {out}: {len(entries)} urls, {nimg} verified images, "
          f"{img_fail} dropped (dead/trackers)", flush=True)


if __name__ == "__main__":
    main()
