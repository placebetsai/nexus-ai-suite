#!/usr/bin/env python3
"""Build the canonical archive page for Israel Joffe's October 17, 2020
Facebook post from Trump Hotel DC.

The goal is to give Google one crawlable, text-rich page on israeljoffe.com
instead of a screenshot buried in a 249-image gallery. The page is linked from
the photo archive, the portrait page, and the related 2020 posts, and is added
to both com sitemaps.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-political-post.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COM = os.path.join(ROOT, "israeljoffe-com")
TODAY = "2026-10-20"
URL = "https://israeljoffe.com/israel-joffe-2020-facebook-post/"
IMG_PATH = "/img/g/israel-joffe-2020-facebook-post.jpg"
IMG_URL = "https://israeljoffe.com" + IMG_PATH
IMG_W, IMG_H = 799, 900
TITLE = "Israel Joffe — 2020 Facebook Post on Trump Hotel DC"
DESC = (
    "The October 17, 2020 Facebook post by Israel Joffe from Trump Hotel DC, "
    "with the original screenshot and full transcript, republished from his own archive."
)
PERSON = {"@id": "https://israeljoffe.com/#person"}

TRANSCRIPT = (
    "Trump Hotel DC #trump2020 .... My safe space....as I walked from the White House "
    "to here and saw folks saying nasty vile things to my friend wearing a MAGA hat, it "
    "makes me think about my grandma who grew up in Germany in the 1930s and the folks "
    "who bullied her for not being like them."
    "\n\n"
    "Replace the word Trump Supporter with Jew and it's the same crap. You hypocritical "
    "Democrats are the party of hate and intolerance.. Your supporters are attacking Jews "
    "in NYC every day, blaming them for covid uptick in NY and attacking anyone who "
    "doesn't think like a liberal.....and this is why you will lose bigly November 3rd"
)


def read(path):
    raw = open(path, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write(path, text, bom=False):
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    open(path, "wb").write(data)


def add_sitemap(path):
    s, bom = read(path)
    s = re.sub(r"<url><loc>" + re.escape(URL) + r"</loc>.*?</url>\s*", "", s, count=1, flags=re.S)
    entry = (
        f'  <url><loc>{URL}</loc><lastmod>{TODAY}</lastmod>'
        f'<changefreq>monthly</changefreq><priority>0.8</priority>'
        f'<image:image><image:loc>{IMG_URL}</image:loc>'
        f'<image:title>{html.escape(TITLE)}</image:title>'
        f'<image:caption>Israel Joffe&apos;s October 17, 2020 Facebook post from Trump Hotel DC.</image:caption>'
        f'</image:image></url>\n'
    )
    s = s.replace("</urlset>", entry + "</urlset>")
    write(path, s, bom)


def main():
    template, _ = read(os.path.join(COM, "israel-joffe-firefighter", "index.html"))
    head, rest = template.split("<main", 1)
    _, foot = rest.split("</main>", 1)

    def sub1(pattern, repl):
        nonlocal head
        head = re.sub(pattern, repl, head, count=1, flags=re.S | re.I)

    sub1(r"<title>.*?</title>", f"<title>{html.escape(TITLE)}</title>")
    sub1(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + html.escape(DESC) + '"')
    sub1(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + URL + '"')
    sub1(r'(<meta property="og:type" content=")[^"]*"', lambda m: m.group(1) + "article" + '"')
    sub1(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + html.escape(TITLE) + '"')
    sub1(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + html.escape(DESC) + '"')
    sub1(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + URL + '"')
    sub1(r'(<meta name="twitter:title" content=")[^"]*"', lambda m: m.group(1) + html.escape(TITLE) + '"')
    sub1(r'(<meta name="twitter:description" content=")[^"]*"', lambda m: m.group(1) + html.escape(DESC) + '"')
    sub1(
        r'<link rel="preload" as="image" href="[^"]*" />',
        f'<link rel="preload" as="image" href="{IMG_PATH}" />',
    )

    head = re.sub(r'<meta property="og:image(?::[a-z_]+)?" content="[^"]*" />\s*', "", head)
    head = re.sub(r'<meta name="twitter:image(?::[a-z_]+)?" content="[^"]*" />\s*', "", head)
    # The template is the firefighter page, so drop its Article/ImageObject
    # graph while keeping the Person and WebSite scripts.
    def drop_firefighter_graph(match):
        return "" if "israel-joffe-firefighter/#article" in match.group(0) else match.group(0)

    head = re.sub(
        r'<script type="application/ld\+json">.*?</script>\s*',
        drop_firefighter_graph,
        head,
        flags=re.S,
    )

    image = {
        "@type": "ImageObject",
        "@id": IMG_URL + "#image",
        "contentUrl": IMG_URL,
        "url": IMG_URL,
        "name": "Israel Joffe's October 17, 2020 Facebook post from Trump Hotel DC",
        "caption": "Screenshot of Israel Joffe's October 17, 2020 Facebook post from Trump Hotel DC.",
        "description": "Israel Joffe's 2020 Facebook post about walking from the White House to Trump Hotel DC.",
        "width": IMG_W,
        "height": IMG_H,
        "encodingFormat": "image/jpeg",
        "datePublished": "2020-10-17T16:14:00-04:00",
        "creator": PERSON,
        "copyrightHolder": PERSON,
        "author": PERSON,
        "about": PERSON,
        "creditText": "Israel Joffe",
        "copyrightNotice": "© 2020 Israel Joffe",
        "license": "https://israeljoffe.com/contact/",
        "acquireLicensePage": "https://israeljoffe.com/contact/",
        "representativeOfPage": True,
    }
    article = {
        "@type": "Article",
        "@id": URL + "#article",
        "headline": TITLE,
        "description": DESC,
        "url": URL,
        "mainEntityOfPage": URL,
        "image": {"@id": IMG_URL + "#image"},
        "author": PERSON,
        "publisher": PERSON,
        "about": PERSON,
        "mentions": [
            {"@type": "Place", "name": "Trump Hotel DC"},
            {"@type": "Place", "name": "White House"},
            {"@type": "Person", "name": "Donald Trump"},
            {"@type": "Event", "name": "2020 United States presidential election"},
        ],
        "datePublished": "2020-10-17T16:14:00-04:00",
        "dateModified": TODAY,
        "articleSection": "Archive",
        "isAccessibleForFree": True,
        "inLanguage": "en-US",
    }
    crumbs = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://israeljoffe.com/"},
            {"@type": "ListItem", "position": 2, "name": "Photos", "item": "https://israeljoffe.com/photos/"},
            {"@type": "ListItem", "position": 3, "name": TITLE, "item": URL},
        ],
    }
    graph = {"@context": "https://schema.org", "@graph": [article, image, crumbs]}
    head = head.replace(
        "</head>",
        f'<meta property="og:image" content="{IMG_URL}" />\n'
        f'<meta property="og:image:secure_url" content="{IMG_URL}" />\n'
        f'<meta property="og:image:type" content="image/jpeg" />\n'
        f'<meta property="og:image:width" content="{IMG_W}" />\n'
        f'<meta property="og:image:height" content="{IMG_H}" />\n'
        f'<meta property="og:image:alt" content="Screenshot of Israel Joffe&apos;s October 17, 2020 Facebook post from Trump Hotel DC" />\n'
        f'<meta name="twitter:image" content="{IMG_URL}" />\n'
        f'<meta name="twitter:image:alt" content="Screenshot of Israel Joffe&apos;s October 17, 2020 Facebook post from Trump Hotel DC" />\n'
        f'<meta property="article:published_time" content="2020-10-17T16:14:00-04:00" />\n'
        f'<meta property="article:modified_time" content="{TODAY}" />\n'
        '<script type="application/ld+json">'
        + json.dumps(graph, ensure_ascii=False, separators=(",", ":"))
        + "</script></head>",
    )

    paras = "".join(f"<p>{html.escape(p)}</p>" for p in TRANSCRIPT.split("\n\n"))
    main = (
        '<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
        '<article class="page-frame ij-body" style="padding:0 16px;max-width:820px;margin:0 auto">'
        f'<header class="page-head"><h1 class="section-title page-h">{html.escape(TITLE)}</h1>'
        f'<p class="page-lede">{html.escape(DESC)}</p></header>'
        '<figure style="margin:1.5rem 0">'
        f'<img src="{IMG_PATH}" alt="Screenshot of Israel Joffe&apos;s October 17, 2020 Facebook post from Trump Hotel DC" '
        f'width="{IMG_W}" height="{IMG_H}" fetchpriority="high" style="width:100%;height:auto;display:block;border-radius:6px" />'
        '<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">Screenshot of Israel Joffe&apos;s '
        'October 17, 2020 Facebook post from Trump Hotel DC.</figcaption></figure>'
        '<div class="ij-article-body" style="line-height:1.7">'
        '<p><strong>Posted:</strong> October 17, 2020, 4:14 PM. <strong>Source:</strong> Israel Joffe&apos;s '
        'personal Facebook account. This is the archive copy on israeljoffe.com.</p>'
        '<h2>The post</h2>'
        '<blockquote style="margin:1.5rem 0;padding:1rem 1.25rem;border-left:3px solid #b08d57;background:#f7f4ee;color:#1a1a1a">'
        + paras
        + '</blockquote>'
        '<p style="font-size:.9rem;opacity:.75">Transcribed as posted; spelling and punctuation preserved. '
        'The tags at the end of the original post were Donald J. Trump, Daniel Scavino Jr., and Donald Trump Jr.</p>'
        '</div></article></main>'
    )
    out = head + main + foot
    os.makedirs(os.path.join(COM, "israel-joffe-2020-facebook-post"), exist_ok=True)
    write(
        os.path.join(COM, "israel-joffe-2020-facebook-post", "index.html"),
        out,
    )

    # Link the screenshot in the photo archive to the dedicated page.
    photos_path = os.path.join(COM, "photos", "index.html")
    s, bom = read(photos_path)
    if f'href="{URL}"' not in s:
        s = s.replace(
            f'<figure><picture><source srcset="{IMG_PATH[:-4]}.webp" type="image/webp"><img src="{IMG_PATH}"',
            f'<figure><a href="{URL}"><picture><source srcset="{IMG_PATH[:-4]}.webp" type="image/webp"><img src="{IMG_PATH}"',
            1,
        )
        s = s.replace(
            f'</picture><figcaption>Israel Joffe — 2020 Facebook post</figcaption></figure>',
            f'</picture></a><figcaption><a href="{URL}">Israel Joffe — 2020 Facebook post</a></figcaption></figure>',
            1,
        )
        write(photos_path, s, bom)

    # Link from the clean portrait page and the related 2020 posts.
    portrait_path = os.path.join(COM, "israel-joffe-portrait", "index.html")
    s, bom = read(portrait_path)
    if f'href="{URL}"' not in s:
        s = s.replace(
            "</article></main>",
            f'<p style="max-width:820px;margin:1.5rem auto;padding:0 16px"><strong>Archive:</strong> '
            f'<a href="{URL}">Israel Joffe — 2020 Facebook Post on Trump Hotel DC</a></p></article></main>',
            1,
        )
        write(portrait_path, s, bom)

    block = (
        f'<p><strong>Permanent archive:</strong> <a href="{URL}">Israel Joffe — 2020 Facebook Post on '
        'Trump Hotel DC</a></p>'
    )
    for post in [
        "2020/11/05/dont-worry-be-happy/index.html",
        "2020/11/06/its-election-day-again/index.html",
        "2020/11/07/its-election-day-yet-again-and/index.html",
    ]:
        path = os.path.join(COM, post)
        s, bom = read(path)
        if URL in s:
            continue
        marker = "\t</div><!-- .entry-content -->"
        if marker not in s:
            marker = "</div><!-- .entry-content -->"
        if marker in s:
            s = s.replace(marker, block + "\n\t" + marker, 1)
            write(path, s, bom)

    for sm in ["sitemap.xml", "sitemap-images.xml"]:
        path = os.path.join(COM, sm)
        if os.path.exists(path):
            add_sitemap(path)
    print("built", URL)


if __name__ == "__main__":
    main()
