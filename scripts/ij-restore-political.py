#!/usr/bin/env python3
"""Restore Israel Joffe's own 2020 political/Facebook images to the com photo
archive and image sitemap.

The user's rule: political Facebook images are allowed when they come from his
own israeljoffe.com, wuwonline.com, or mondaynightwrestling.com. These files are
hosted on israeljoffe.com. They stay off israeljoffe.org.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-restore-political.py
"""
import html
import json
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COM = os.path.join(ROOT, "israeljoffe-com")
TODAY = "2026-10-20"
PHOTOS_URL = "https://israeljoffe.com/photos/"
PERSON = {"@id": "https://israeljoffe.com/#person"}
RECOVERED = "/tmp/opencode/old-99283d22.jpg"


def read(path):
    raw = open(path, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write(path, text, bom=False):
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    open(path, "wb").write(data)


def prepare_recovered():
    """The old portrait screenshot was overwritten with the clean LCFD photo.
    Recover the original from the previous Cloudflare deployment and publish it
    under a new, honest filename."""
    if not os.path.exists(RECOVERED):
        raise SystemExit("recovered 2020 screenshot not found at " + RECOVERED)
    im = Image.open(RECOVERED).convert("RGB")
    im.thumbnail((900, 900), Image.LANCZOS)
    for base in [os.path.join(COM, "img", "g"), os.path.join(COM, "img")]:
        os.makedirs(base, exist_ok=True)
        im.save(os.path.join(base, "israel-joffe-2020-facebook-post.jpg"), "JPEG", quality=82, optimize=True)
        im.save(os.path.join(base, "israel-joffe-2020-facebook-post.webp"), "WEBP", quality=76)
    return im.size


def main():
    w, h = prepare_recovered()
    items = [
        {
            "slug": "israel-joffe-2020-facebook-post",
            "alt": "Israel Joffe — 2020 Facebook post",
            "w": w, "h": h,
        },
        {
            "slug": "israel-joffe-fb-img-1604720478848",
            "alt": "Israel Joffe — It’s Election Day.. yet again..and ..",
            "w": 900, "h": 894,
        },
        {
            "slug": "israel-joffe-well-its-election-day-again-meme",
            "alt": "Israel Joffe Election Day Meme",
            "w": 800, "h": 524,
        },
        {
            "slug": "israel-joffe-img-20201017-152536-1",
            "alt": "Israel Joffe at the White House",
            "w": 673, "h": 900,
        },
        {
            "slug": "israel-joffe-screenshot-20201105-064044",
            "alt": "Israel Joffe — election meme",
            "w": 900, "h": 739,
        },
    ]

    photos = os.path.join(COM, "photos", "index.html")
    s, bom = read(photos)
    figs = []
    for it in items:
        if f"/img/g/{it['slug']}.jpg" in s:
            continue
        a = html.escape(it["alt"], quote=True)
        figs.append(
            f'<figure><picture><source srcset="/img/g/{it["slug"]}.webp" type="image/webp">'
            f'<img src="/img/g/{it["slug"]}.jpg" alt="{a}" width="{it["w"]}" height="{it["h"]}" '
            f'loading="lazy" decoding="async"></picture><figcaption>{a}</figcaption></figure>'
        )
    if figs:
        marker = "</div></section>"
        idx = s.find(marker, s.find('<div class="ijg">'))
        if idx == -1:
            raise SystemExit("photos grid closing marker not found")
        s = s[:idx] + "".join(figs) + s[idx:]

    # Add the same images to the ImageGallery JSON-LD.
    def add_to_ld(m):
        try:
            data = json.loads(m.group(1))
        except Exception:
            return m.group(0)
        if data.get("@type") != "ImageGallery":
            return m.group(0)
        media = data.setdefault("associatedMedia", [])
        have = {x.get("contentUrl") for x in media if isinstance(x, dict)}
        for it in items:
            url = f"https://israeljoffe.com/img/g/{it['slug']}.jpg"
            if url in have:
                continue
            media.append({
                "@type": "ImageObject",
                "contentUrl": url,
                "name": it["alt"],
                "caption": it["alt"],
                "width": it["w"],
                "height": it["h"],
                "about": PERSON,
            })
        return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"

    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', add_to_ld, s, flags=re.S)
    write(photos, s, bom)

    # Add image entries to both com sitemaps under the photos URL.
    for sm in ["sitemap.xml", "sitemap-images.xml"]:
        path = os.path.join(COM, sm)
        s, bom = read(path)
        m = re.search(r"<url><loc>https://israeljoffe\.com/photos/</loc>.*?</url>", s, re.S)
        if not m:
            raise SystemExit("photos URL block not found in " + sm)
        block = m.group(0)
        block = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{TODAY}</lastmod>", block, count=1)
        add = ""
        for it in items:
            loc = f"https://israeljoffe.com/img/g/{it['slug']}.jpg"
            if loc in block:
                continue
            add += (
                f"<image:image><image:loc>{loc}</image:loc>"
                f"<image:title>{html.escape(it['alt'])}</image:title>"
                f"<image:caption>{html.escape(it['alt'])}</image:caption></image:image>"
            )
        if add:
            block = block.replace("</url>", add + "</url>", 1)
        s = s[:m.start()] + block + s[m.end():]
        write(path, s, bom)

    print("restored", len(items), "images to", PHOTOS_URL)


if __name__ == "__main__":
    main()
