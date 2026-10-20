#!/usr/bin/env python3
"""Build the visible Israel Joffe publisher/profile hub.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-profiles.py

This page links to the real author/publisher pages on the sites Israel Joffe
operates. It is a public directory, not a hidden link block, and it is added to
the com sitemaps.
"""
import html
import json
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COM = os.path.join(ROOT, "israeljoffe-com")
ORG = os.path.join(ROOT, "israeljoffe-org")
PARENT = os.path.abspath(os.path.join(ROOT, ".."))
TODAY = "2026-10-20"
URL = "https://israeljoffe.com/israel-joffe-profiles/"
PERSON = {"@id": "https://israeljoffe.com/#person"}


def read(path):
    raw = open(path, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write(path, text, bom=False):
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    open(path, "wb").write(data)


def esc(s):
    return html.escape(s, quote=True)


def sitemap_add(path, url, images, priority="0.8"):
    text, bom = read(path)
    if f"<loc>{url}</loc>" in text:
        text = re.sub(r"<url><loc>" + re.escape(url) + r"</loc>.*?</url>\s*", "", text, count=1, flags=re.S)
    rows = "".join(
        f'<image:image><image:loc>{esc(i["url"])}</image:loc>'
        f'<image:title>{esc(i["title"])}</image:title>'
        f'<image:caption>{esc(i["caption"])}</image:caption></image:image>'
        for i in images
    )
    entry = (
        f'  <url><loc>{url}</loc><lastmod>{TODAY}</lastmod>'
        f'<changefreq>monthly</changefreq><priority>{priority}</priority>'
        f"{rows}</url>\n"
    )
    text = text.replace("</urlset>", entry + "</urlset>")
    write(path, text, bom)


def insert_once(path, marker, block, before=True):
    text, bom = read(path)
    if block[:120] in text:
        return False
    if marker not in text:
        return False
    text = text.replace(marker, (block + marker) if before else (marker + block), 1)
    write(path, text, bom)
    return True


def image_ld(url, name, caption, width, height, desc):
    return {
        "@type": "ImageObject",
        "@id": url + "#image",
        "contentUrl": url,
        "url": url,
        "name": name,
        "caption": caption,
        "description": desc,
        "width": width,
        "height": height,
        "encodingFormat": "image/jpeg",
        "creator": PERSON,
        "copyrightHolder": PERSON,
        "author": PERSON,
        "about": PERSON,
        "creditText": "Israel Joffe",
        "copyrightNotice": "© Israel Joffe",
        "license": "https://israeljoffe.com/contact/",
        "acquireLicensePage": "https://israeljoffe.com/contact/",
    }


def thumb(src, dst, max_w=700):
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "JPEG", quality=82, optimize=True)
    return im.size


def collection_head(base, *, title, desc, canonical, images, items):
    head, rest = base.split("<main", 1)
    _, foot = rest.split("</main>", 1)

    def sub1(pattern, repl):
        nonlocal head
        head = re.sub(pattern, repl, head, count=1, flags=re.S | re.I)

    sub1(r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    sub1(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + esc(desc) + '"')
    sub1(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + esc(canonical) + '"')
    sub1(r'(<meta property="og:type" content=")[^"]*"', lambda m: m.group(1) + "website" + '"')
    sub1(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + esc(title) + '"')
    sub1(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + esc(desc) + '"')
    sub1(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + esc(canonical) + '"')
    sub1(r'(<meta name="twitter:title" content=")[^"]*"', lambda m: m.group(1) + esc(title) + '"')
    sub1(r'(<meta name="twitter:description" content=")[^"]*"', lambda m: m.group(1) + esc(desc) + '"')

    head = re.sub(r'<meta property="og:image(?::[a-z_]+)?" content="[^"]*" />\s*', "", head)
    head = re.sub(r'<meta name="twitter:image(?::[a-z_]+)?" content="[^"]*" />\s*', "", head)
    head = re.sub(
        r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@graph": \[.*?</script>',
        "",
        head,
        flags=re.S,
    )
    hero_url = images[0]["url"]
    head = re.sub(
        r'<link rel="preload" as="image" href="[^"]*" />\s*',
        f'<link rel="preload" as="image" href="{esc(hero_url)}" />\n',
        head,
        count=1,
    )
    imgs = "".join(
        f'<meta property="og:image" content="{esc(i["url"])}" />\n'
        f'<meta property="og:image:secure_url" content="{esc(i["url"])}" />\n'
        f'<meta property="og:image:type" content="image/jpeg" />\n'
        f'<meta property="og:image:width" content="{i["width"]}" />\n'
        f'<meta property="og:image:height" content="{i["height"]}" />\n'
        f'<meta property="og:image:alt" content="{esc(i["alt"])}" />\n'
        f'<meta name="twitter:image" content="{esc(i["url"])}" />\n'
        f'<meta name="twitter:image:alt" content="{esc(i["alt"])}" />\n'
        for i in images[:4]
    )
    collection = {
        "@type": "CollectionPage",
        "@id": canonical + "#page",
        "url": canonical,
        "name": title,
        "description": desc,
        "about": PERSON,
        "isPartOf": {"@id": "https://israeljoffe.com/#website"},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(items),
            "itemListElement": [
                {"@type": "ListItem", "position": n + 1, "name": it["name"], "url": it["url"]}
                for n, it in enumerate(items)
            ],
        },
    }
    breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://israeljoffe.com/"},
            {"@type": "ListItem", "position": 2, "name": "About", "item": "https://israeljoffe.com/about/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ],
    }
    graph = {"@context": "https://schema.org", "@graph": [collection] + [i["ld"] for i in images] + [breadcrumb]}
    head = head.replace(
        "</head>",
        imgs + '<script type="application/ld+json">' + json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + "</script></head>",
    )
    return head, foot


def main():
    specs = [
        ("israeljoffe-com", "israeljoffe.com", "https://israeljoffe.com/", "The primary site: biography, photos, BJJ, press, certifications, and the Johnny Rodz/WUW archive.", "israeljoffe-com.jpg"),
        ("israeljoffe-org", "israeljoffe.org", "https://israeljoffe.org/", "The personal and BJJ side: the full story, essays, firefighter memories, and the WUW years.", "israeljoffe-org.jpg"),
        ("wuw", "World of Unpredictable Wrestling", "https://wuwonline.com/israel-joffe/", "Israel Joffe at WUW: the training archive with Johnny Rodz at Gleason's Gym in Brooklyn.", "israeljoffe-wuw.jpg"),
        ("religiousjews", "ReligiousJews.com", "https://religiousjews.com/israel-joffe/", "Five Towns roots, Orthodox family life, and the Jewish community archive.", "israeljoffe-religiousjews.jpg"),
        ("diamonds", "diamonds.forsale", "https://diamonds.forsale/israel-joffe/", "Founder page for the markup-free marketplace for natural and lab-grown diamonds.", "israeljoffe-diamonds-forsale.jpg"),
        ("hidden", "HiddenCameras.tv", "https://hiddencameras.tv/israel-joffe/", "Founder page for the security-camera and home-surveillance publication.", "israeljoffe-hiddencameras.jpg"),
        ("ihate", "IHateCollege.com", "https://ihatecollege.com/israel-joffe/", "Founder page for the no-degree jobs, trades, and civil-service publication.", "israeljoffe-ihatecollege.jpg"),
        ("market", "MarketPicks.ai", "https://marketpicks.ai/israel-joffe/", "Project executive page for the fintech and AI-delivery publication.", "israeljoffe-marketpicks.jpg"),
        ("spanish", "SpanishTVShows.com", "https://spanishtvshows.com/israel-joffe/", "Founder page for the Spanish-language television publication.", "israeljoffe-spanishtvshows.jpg"),
        ("placebets", "PlaceBets.ai", "https://placebets.ai/israel-joffe/", "Founder page covering federal service and the Johnny Rodz/WUW years.", "israeljoffe-placebets.jpg"),
    ]
    srcs = {
        "israeljoffe-com": os.path.join(COM, "img", "israel-joffe-portrait.jpg"),
        "israeljoffe-org": os.path.join(ORG, "img", "israel-joffe-johnny-rodz-training.jpg"),
        "wuw": os.path.join(PARENT, "wuwonline-com", "img", "israel-joffe-johnny-rodz-wuw.jpg"),
        "religiousjews": os.path.join(PARENT, "religiousjews-com", "israel-joffe", "7054d-screenshot_20221223_110241_instagram.jpg"),
        "diamonds": os.path.join(PARENT, "diamonds-forsale", "public", "israel-joffe", "4e9f2-20170429_150815-1.jpg"),
        "hidden": os.path.join(PARENT, "hiddencameras-tv", "public", "israel-joffe", "7ee38-screenshot_20230814_171151_onedrive.jpg"),
        "ihate": os.path.join(PARENT, "Ihatecollege", "public", "israel-joffe", "f2156-20170429_150820-1.jpg"),
        "market": os.path.join(PARENT, "marketpicks-ai", "public", "israel-joffe", "4db9c-20230801_143722.jpg"),
        "spanish": os.path.join(PARENT, "Spanishtvshows.com", "public", "israel-joffe", "5ed53-rq2j3r-1.jpg"),
        "placebets": os.path.join(PARENT, "Placebetsai-src", "public", "israel-joffe", "8c6db-20160723_201134.jpg"),
    }
    outdir = os.path.join(COM, "img", "pub")
    os.makedirs(outdir, exist_ok=True)
    items = []
    images = []
    for key, name, url, desc, fname in specs:
        dst = os.path.join(outdir, fname)
        w, h = thumb(srcs[key], dst)
        img_url = f"https://israeljoffe.com/img/pub/{fname}"
        alt = f"Israel Joffe — {name}"
        caption = f"Israel Joffe on {name}."
        img = {
            "path": f"/img/pub/{fname}",
            "url": img_url,
            "width": w, "height": h,
            "alt": alt,
            "caption": caption,
            "title": f"Israel Joffe on {name}",
        }
        img["ld"] = image_ld(img_url, img["title"], caption, w, h, alt)
        images.append(img)
        items.append({"name": name, "url": url, "desc": desc, "img": img})

    cards = ""
    for it in items:
        cards += (
            '<a class="pub-card" href="' + esc(it["url"]) + '" '
            'style="display:flex;flex-direction:column;border:1px solid #ddd;border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;background:#fff">'
            f'<img src="{esc(it["img"]["path"])}" alt="{esc(it["img"]["alt"])}" width="{it["img"]["width"]}" height="{it["img"]["height"]}" '
            'loading="lazy" style="width:100%;height:190px;object-fit:cover;display:block" />'
            '<span style="padding:14px 16px;display:block">'
            f'<strong style="display:block;font-size:1.05rem;margin-bottom:6px">{esc(it["name"])}</strong>'
            f'<span style="display:block;font-size:.9rem;line-height:1.5;opacity:.78">{esc(it["desc"])}</span>'
            '</span></a>'
        )

    base, _ = read(os.path.join(COM, "israel-joffe-portrait/index.html"))
    title = "Israel Joffe — Publisher Pages and Profiles"
    desc = ("The official author and publisher pages for Israel Joffe across the sites he operates, "
            "including israeljoffe.com, israeljoffe.org, WUW, and the federation's specialist publications.")
    head, foot = collection_head(base, title=title, desc=desc, canonical=URL, images=images, items=items)
    body = (
        '<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
        '<article class="page-frame ij-body" style="padding:0 16px;max-width:1000px;margin:0 auto">'
        f'<header class="page-head"><h1 class="section-title page-h">{esc(title)}</h1>'
        f'<p class="page-lede">{esc(desc)}</p></header>'
        '<div class="ij-article-body" style="line-height:1.7;max-width:760px">'
        '<p>Israel Joffe writes, publishes, and operates sites across media, public service, technology, and '
        'consumer publishing. Each page below is the official author or publisher page for that property, with '
        'its own bio and photo archive. They are listed here so readers, editors, and search engines can find the '
        'canonical version instead of a scraped copy.</p>'
        '<p>The photo-led Johnny Rodz article is at '
        '<a href="/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — WUW Years at Gleason\'s Gym</a>. '
        'The public-service record is at '
        '<a href="/israel-joffe-firefighter/">Israel Joffe — Firefighter, LCFD, and Public Service</a>.</p>'
        '</div>'
        '<section style="margin:2rem 0"><h2 style="font-size:1.4rem;margin-bottom:1rem">Official pages</h2>'
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px">'
        + cards
        + '</div></section>'
        '<section class="ij-refs"><h2>Canonical hub</h2><p>'
        '<a href="/about/">About Israel Joffe</a> · '
        '<a href="/photos/">Photo gallery</a> · '
        '<a href="/press/">Press and mentions</a> · '
        '<a href="/publications/">Publications</a>'
        '</p></section>'
        '</article></main>'
    )
    out = head + body + foot
    os.makedirs(os.path.join(COM, "israel-joffe-profiles"), exist_ok=True)
    write(os.path.join(COM, "israel-joffe-profiles", "index.html"), out)

    block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        '<h2>Israel Joffe across the web</h2>'
        '<p><a href="/israel-joffe-profiles/">Israel Joffe — publisher pages and profiles</a> · '
        '<a href="/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — the WUW years</a> · '
        '<a href="/israel-joffe-firefighter/">Firefighter and public service</a></p></section>'
    )
    for page in ["about/index.html", "contact/index.html", "press/index.html"]:
        insert_once(os.path.join(COM, page), "</main>", block, before=True)
    org_block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        '<h2>Israel Joffe across the web</h2>'
        '<p><a href="https://israeljoffe.com/israel-joffe-profiles/">Israel Joffe — publisher pages and profiles</a> · '
        '<a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — the WUW years</a> · '
        '<a href="https://israeljoffe.com/israel-joffe-firefighter/">Firefighter and public service</a></p></section>'
    )
    for page in ["story/index.html", "about/index.html"]:
        insert_once(os.path.join(ORG, page), "</main>", org_block, before=True)

    for path in [os.path.join(COM, "sitemap.xml"), os.path.join(COM, "sitemap-images.xml")]:
        if os.path.exists(path):
            sitemap_add(path, URL, images)
    print("built", URL)


if __name__ == "__main__":
    main()
