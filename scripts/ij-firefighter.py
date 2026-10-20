#!/usr/bin/env python3
"""Build the visible Israel Joffe firefighter / public-service photo page.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-firefighter.py

This is a real article page, not a hidden link page. It is linked from About,
Press, Photos, and the org story page, and added to the com image sitemaps.
"""
import html
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COM = os.path.join(ROOT, "israeljoffe-com")
ORG = os.path.join(ROOT, "israeljoffe-org")
TODAY = "2026-10-20"
PERSON = {"@id": "https://israeljoffe.com/#person"}
URL = "https://israeljoffe.com/israel-joffe-firefighter/"


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


def copy_img(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)


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
        "representativeOfPage": True,
    }


def article_head(base, *, title, desc, canonical, images):
    head, rest = base.split("<main", 1)
    _, foot = rest.split("</main>", 1)

    def sub1(pattern, repl):
        nonlocal head
        head = re.sub(pattern, repl, head, count=1, flags=re.S | re.I)

    sub1(r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    sub1(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + esc(desc) + '"')
    sub1(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + esc(canonical) + '"')
    sub1(r'(<meta property="og:type" content=")[^"]*"', lambda m: m.group(1) + "article" + '"')
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
        for i in images
    )
    article = {
        "@type": "Article",
        "@id": canonical + "#article",
        "headline": title,
        "description": desc,
        "url": canonical,
        "mainEntityOfPage": canonical,
        "image": [{"@id": i["url"] + "#image"} for i in images],
        "author": PERSON,
        "publisher": PERSON,
        "about": PERSON,
        "mentions": [
            {"@type": "Organization", "name": "Lawrence-Cedarhurst Fire Department"},
            {"@type": "Organization", "name": "Federal Deposit Insurance Corporation", "sameAs": "https://www.fdic.gov/"},
        ],
        "datePublished": TODAY,
        "dateModified": TODAY,
        "inLanguage": "en-US",
    }
    breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://israeljoffe.com/"},
            {"@type": "ListItem", "position": 2, "name": "About", "item": "https://israeljoffe.com/about/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ],
    }
    graph = {"@context": "https://schema.org", "@graph": [article] + [i["ld"] for i in images] + [breadcrumb]}
    head = head.replace(
        "</head>",
        imgs + '<script type="application/ld+json">' + json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + "</script></head>",
    )
    return head, foot


def build_page(*, title, desc, images, body, more_links):
    base, _ = read(os.path.join(COM, "israel-joffe-portrait/index.html"))
    head, foot = article_head(base, title=title, desc=desc, canonical=URL, images=images)
    figs = []
    for im in images[1:]:
        figs.append(
            f'<figure style="margin:0"><img src="{esc(im["path"])}" alt="{esc(im["alt"])}" '
            f'width="{im["width"]}" height="{im["height"]}" style="width:100%;height:auto;display:block;border-radius:6px" />'
            f'<figcaption style="font-size:.82rem;opacity:.75;margin-top:.4rem">{esc(im["caption"])}</figcaption></figure>'
        )
    hero = (
        f'<figure style="margin:1.5rem 0"><img src="{esc(images[0]["path"])}" alt="{esc(images[0]["alt"])}" '
        f'width="{images[0]["width"]}" height="{images[0]["height"]}" fetchpriority="high" '
        f'style="width:100%;height:auto;display:block;border-radius:6px" />'
        f'<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">{esc(images[0]["caption"])}</figcaption></figure>'
    )
    gallery = (
        '<section class="ij-refs"><h2>Firehouse and federal service</h2>'
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin:1rem 0">'
        + "".join(figs)
        + "</div></section>"
    )
    links = " · ".join(f'<a href="{esc(href)}">{esc(label)}</a>' for href, label in more_links)
    main = (
        '<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
        '<article class="page-frame ij-body" style="padding:0 16px;max-width:820px;margin:0 auto">'
        f'<header class="page-head"><h1 class="section-title page-h">{esc(title)}</h1>'
        f'<p class="page-lede">{esc(desc)}</p></header>'
        + hero
        + f'<div class="ij-article-body" style="line-height:1.7">{body}</div>'
        + gallery
        + f'<section class="ij-refs"><h2>Read next</h2><p>{links}</p></section>'
        "</article></main>"
    )
    out = head + main + foot
    os.makedirs(os.path.join(COM, "israel-joffe-firefighter"), exist_ok=True)
    write(os.path.join(COM, "israel-joffe-firefighter", "index.html"), out)


def main():
    src = os.path.join(COM, "img", "g")
    copy_img(os.path.join(src, "israel-joffe-228mct.jpg"), os.path.join(COM, "img", "israel-joffe-lcfd-firehouse.jpg"))
    copy_img(os.path.join(src, "israel-joffe-hrj86z.jpg"), os.path.join(COM, "img", "israel-joffe-lcfd-dress-uniform.jpg"))
    copy_img(os.path.join(src, "israel-joffe-image-editor-output-image-899285497-16839252147332.jpg"), os.path.join(COM, "img", "israel-joffe-fdic-public-service.jpg"))
    copy_img(os.path.join(COM, "img", "israel-joffe-lcfd-firehouse.jpg"), os.path.join(ORG, "img", "israel-joffe-lcfd-firehouse.jpg"))

    images = [
        {
            "path": "/img/israel-joffe-lcfd-firehouse.jpg",
            "url": "https://israeljoffe.com/img/israel-joffe-lcfd-firehouse.jpg",
            "width": 900, "height": 596,
            "alt": "Israel Joffe and the Lawrence-Cedarhurst Fire Department at the firehouse",
            "caption": "Israel Joffe (front row, second from left) with the Lawrence-Cedarhurst Fire Department.",
            "title": "Israel Joffe with the Lawrence-Cedarhurst Fire Department",
        },
        {
            "path": "/img/israel-joffe-lcfd-dress-uniform.jpg",
            "url": "https://israeljoffe.com/img/israel-joffe-lcfd-dress-uniform.jpg",
            "width": 900, "height": 877,
            "alt": "Israel Joffe in Lawrence-Cedarhurst Fire Department dress uniform at a department event",
            "caption": "Israel Joffe (right) at an LCFD department event.",
            "title": "Israel Joffe in LCFD dress uniform",
        },
        {
            "path": "/img/israel-joffe-fdic-public-service.jpg",
            "url": "https://israeljoffe.com/img/israel-joffe-fdic-public-service.jpg",
            "width": 506, "height": 900,
            "alt": "FDIC Public Service Recognition Week post featuring Israel Joffe",
            "caption": "The FDIC recognized Israel Joffe during Public Service Recognition Week as a former New York firefighter and a member of Team FDIC.",
            "title": "Israel Joffe in the FDIC Public Service Recognition Week post",
        },
    ]
    for i in images:
        i["ld"] = image_ld(i["url"], i["title"], i["caption"], i["width"], i["height"], i["alt"])

    body = (
        "<p>Before the federal titles and the project-management certifications, Israel Joffe was a firefighter. "
        "He was a long-time member of the Lawrence-Cedarhurst Fire Department (LCFD) in the Five Towns, on Long "
        "Island's South Shore.</p>"
        "<p>He served through Hurricane Sandy, when the department answered calls in flooded neighborhoods and "
        "without power. The group photo above is the LCFD company at the firehouse; Joffe is in the front row, "
        "second from left.</p>"
        "<p>The firehouse was not the end of his public service. Joffe later worked at the FDA, the FDIC, and the "
        "U.S. International Development Finance Corporation. In 2023 the FDIC recognized him during Public Service "
        "Recognition Week as a former first responder in New York and a member of Team FDIC.</p>"
        "<blockquote style=\"margin:1.5rem 0;padding:1rem 1.25rem;border-left:3px solid #b08d57;background:#f7f4ee\">"
        "<p style=\"margin:0 0 .5rem\">&ldquo;I served as a firefighter in New York, proudly supporting the community "
        "for many years. Now at FDIC, my service extends to all of America!&rdquo;</p>"
        "<footer style=\"font-size:.85rem;opacity:.7\">&mdash; Israel Joffe, quoted by the FDIC</footer></blockquote>"
        "<p>Outside government, he is a PMP and PMI-CPMAI certified senior project manager and a 2nd-degree "
        "Brazilian Jiu-Jitsu black belt under Matt Serra. The through-line is the same: service, preparation, and "
        "showing up when it counts.</p>"
        "<p>More context: <a href=\"/about/\">About Israel Joffe</a> &middot; "
        "<a href=\"https://israeljoffe.org/story/\">The full story on israeljoffe.org</a> &middot; "
        "<a href=\"/israel-joffe-johnny-rodz/\">The WUW years with Johnny Rodz</a>.</p>"
    )
    build_page(
        title="Israel Joffe — Firefighter, LCFD, and Public Service",
        desc="Israel Joffe served with the Lawrence-Cedarhurst Fire Department through Hurricane Sandy and later worked in federal public service at the FDIC. Photos and the public-service record.",
        images=images,
        body=body,
        more_links=[
            ("/about/", "About Israel Joffe"),
            ("https://israeljoffe.org/story/", "The full story on israeljoffe.org"),
            ("/press/", "Press and mentions"),
            ("/photos/", "Israel Joffe photo gallery"),
            ("/israel-joffe-johnny-rodz/", "Israel Joffe and Johnny Rodz at Gleason's Gym"),
        ],
    )

    com_block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        "<h2>Israel Joffe — Firefighter and Public Service</h2>"
        '<p><a href="/israel-joffe-firefighter/"><img src="/img/israel-joffe-lcfd-firehouse.jpg" '
        'alt="Israel Joffe with the Lawrence-Cedarhurst Fire Department" width="900" height="596" '
        'loading="lazy" style="max-width:360px;width:100%;height:auto;display:block;border-radius:6px" /></a></p>'
        '<p><a href="/israel-joffe-firefighter/">Israel Joffe — LCFD, Hurricane Sandy, and public service</a></p></section>'
    )
    for page in ["about/index.html", "press/index.html", "photos/index.html"]:
        insert_once(os.path.join(COM, page), "</main>", com_block, before=True)

    org_block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        "<h2>Israel Joffe — Firefighter and Public Service</h2>"
        '<p><a href="https://israeljoffe.com/israel-joffe-firefighter/"><img src="/img/israel-joffe-lcfd-firehouse.jpg" '
        'alt="Israel Joffe with the Lawrence-Cedarhurst Fire Department" width="900" height="596" '
        'loading="lazy" style="max-width:360px;width:100%;height:auto;display:block;border-radius:6px" /></a></p>'
        '<p><a href="https://israeljoffe.com/israel-joffe-firefighter/">Israel Joffe — LCFD, Hurricane Sandy, and '
        "public service</a></p></section>"
    )
    for page in ["story/index.html", "photos/index.html"]:
        insert_once(os.path.join(ORG, page), "</main>", org_block, before=True)

    for path in [
        os.path.join(COM, "sitemap.xml"),
        os.path.join(COM, "sitemap-images.xml"),
    ]:
        if os.path.exists(path):
            sitemap_add(path, URL, images)
    print("built", URL)


if __name__ == "__main__":
    main()
