#!/usr/bin/env python3
"""Build the visible Israel Joffe / Johnny Rodz photo articles and internal links.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-johnny-rodz.py

This intentionally does NOT create hidden link pages. Every link below is visible
on a real page and every page is in the sitemap. The two political screenshots
from the Facebook post are deliberately excluded; the standing rule for these
sites is no politics, and the clean photos are the ones worth ranking.
"""
import html
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COM = os.path.join(ROOT, "israeljoffe-com")
ORG = os.path.join(ROOT, "israeljoffe-org")
WUW = os.path.abspath(os.path.join(ROOT, "..", "wuwonline-com"))

MNW = "https://www.mondaynightwrestling.com/p/israel-joffe-antisemitism-explodes-mit-harvard"
MNW_TITLE = "Same feeling years later"
PERSON = {"@id": "https://israeljoffe.com/#person"}
TODAY = "2026-10-20"


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
    return True


def insert_once(path, marker, block, before=True):
    text, bom = read(path)
    if block[:120] in text:
        return False
    if marker not in text:
        raise SystemExit(f"marker not found in {path}: {marker[:80]}")
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


def article_head(base, *, title, desc, canonical, hero_url, hero_w, hero_h, hero_alt, images, article_ld):
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

    # Drop the template's OG/twitter image and Article graph, then add ours.
    head = re.sub(r"<meta property=\"og:image(?::[a-z_]+)?\" content=\"[^\"]*\" />\s*", "", head)
    head = re.sub(r"<meta name=\"twitter:image(?::[a-z_]+)?\" content=\"[^\"]*\" />\s*", "", head)
    head = re.sub(
        r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@graph": \[.*?</script>',
        "",
        head,
        flags=re.S,
    )
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
    graph = {"@context": "https://schema.org", "@graph": [article_ld] + [i["ld"] for i in images] + [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": canonical.split("/israel-joffe-johnny-rodz/")[0] + "/"},
            {"@type": "ListItem", "position": 2, "name": "Israel Joffe", "item": canonical.split("/israel-joffe-johnny-rodz/")[0] + "/about/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ]},
    ]}
    head = head.replace("</head>", imgs + '<script type="application/ld+json">' + json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + "</script></head>")
    return head, foot


def build_page(*, site_dir, template, title, desc, canonical, images, body, more_links, hero):
    base, _ = read(os.path.join(site_dir, template))
    base_doc = base
    # The template's <main> starts the content; keep its header/footer shell.
    head, foot = article_head(
        base_doc,
        title=title,
        desc=desc,
        canonical=canonical,
        hero_url=hero["url"],
        hero_w=hero["width"],
        hero_h=hero["height"],
        hero_alt=hero["alt"],
        images=images,
        article_ld={
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
            "mentions": {"@type": "Person", "name": "Johnny Rodz", "sameAs": "https://www.wwe.com/superstars/johnny-rodz"},
            "datePublished": TODAY,
            "dateModified": TODAY,
            "inLanguage": "en-US",
        },
    )
    figs = []
    for idx, im in enumerate(images):
        figs.append(
            f'<figure style="margin:0"><img src="{esc(im["path"])}" alt="{esc(im["alt"])}" '
            f'width="{im["width"]}" height="{im["height"]}" '
            f'style="width:100%;height:auto;display:block;border-radius:6px" />'
            f'<figcaption style="font-size:.82rem;opacity:.75;margin-top:.4rem">{esc(im["caption"])}</figcaption></figure>'
        )
    hero = (
        f'<figure style="margin:1.5rem 0"><img src="{esc(images[0]["path"])}" alt="{esc(images[0]["alt"])}" '
        f'width="{images[0]["width"]}" height="{images[0]["height"]}" fetchpriority="high" '
        f'style="width:100%;height:auto;display:block;border-radius:6px" />'
        f'<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">{esc(images[0]["caption"])}</figcaption></figure>'
    )
    gallery = ""
    if len(images) > 1:
        grid = "".join(figs[1:])
        gallery = (
            '<section class="ij-refs"><h2>More from the WUW room</h2>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin:1rem 0">'
            + grid
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
    os.makedirs(os.path.join(site_dir, "israel-joffe-johnny-rodz"), exist_ok=True)
    write(os.path.join(site_dir, "israel-joffe-johnny-rodz", "index.html"), out)


def main():
    # Images: use the personal two-shot and the training-room photo already on
    # the site. No Facebook screenshots, no third-party broadcast stills.
    com_two = os.path.join(COM, "img", "israel-joffe-johnny-rodz-wuw.jpg")
    com_train = os.path.join(COM, "img", "israel-joffe-johnny-rodz-training.jpg")
    org_train = os.path.join(ORG, "img", "israel-joffe-johnny-rodz-training.jpg")
    wuw_two = os.path.join(WUW, "img", "israel-joffe-johnny-rodz-wuw.jpg")
    copy_img(os.path.join(COM, "img", "g", "israel-joffe-jgrmp1.jpg"), com_two)
    copy_img(os.path.join(COM, "img", "g", "israel-joffe-ij-training-gleasons.jpg"), com_train)
    copy_img(os.path.join(COM, "img", "g", "israel-joffe-ij-training-gleasons.jpg"), org_train)
    copy_img(os.path.join(COM, "img", "g", "israel-joffe-jgrmp1.jpg"), wuw_two)

    com_url = "https://israeljoffe.com/israel-joffe-johnny-rodz/"
    org_url = "https://israeljoffe.org/israel-joffe-johnny-rodz/"
    com_imgs = [
        {
            "path": "/img/israel-joffe-johnny-rodz-wuw.jpg",
            "url": "https://israeljoffe.com/img/israel-joffe-johnny-rodz-wuw.jpg",
            "width": 961, "height": 1024,
            "alt": "Israel Joffe with WWE Hall of Famer Johnny Rodz at Gleason's Gym in Brooklyn",
            "caption": "Israel Joffe and WWE Hall of Famer Johnny Rodz at World of Unpredictable Wrestling, Gleason's Gym, Brooklyn.",
            "title": "Israel Joffe and Johnny Rodz at Gleason's Gym",
        },
        {
            "path": "/img/israel-joffe-johnny-rodz-training.jpg",
            "url": "https://israeljoffe.com/img/israel-joffe-johnny-rodz-training.jpg",
            "width": 900, "height": 675,
            "alt": "Israel Joffe training at Gleason's Gym with Johnny Rodz and the WUW roster",
            "caption": "Johnny Rodz (left) teaching in the WUW ring at Gleason's Gym, with Israel Joffe at right.",
            "title": "Israel Joffe training with Johnny Rodz at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-wuw-show.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-wuw-show.jpg",
            "width": 900, "height": 496,
            "alt": "Israel Joffe at a WUW show at Gleason's Gym with the WUW roster",
            "caption": "Israel Joffe with the WUW roster after a show at Gleason's Gym.",
            "title": "Israel Joffe with the WUW roster at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-ufc-training.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-ufc-training.jpg",
            "width": 900, "height": 900,
            "alt": "Israel Joffe with training partners at Gleason's Gym",
            "caption": "Israel Joffe with training partners at Gleason's Gym.",
            "title": "Israel Joffe training at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-representing-wuw.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-representing-wuw.jpg",
            "width": 900, "height": 675,
            "alt": "Israel Joffe holding a World of Unpredictable Wrestling sign at Gleason's Gym",
            "caption": "Israel Joffe representing World of Unpredictable Wrestling at Gleason's Gym.",
            "title": "Israel Joffe representing WUW at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-juanito-training.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-juanito-training.jpg",
            "width": 675, "height": 900,
            "alt": "Israel Joffe with Juanito at Gleason's Gym",
            "caption": "Israel Joffe with Juanito at Gleason's Gym.",
            "title": "Israel Joffe and Juanito at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-wuw-gleasons.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-wuw-gleasons.jpg",
            "width": 506, "height": 900,
            "alt": "Israel Joffe at Gleason's Gym during a WUW session",
            "caption": "Israel Joffe at Gleason's Gym during a WUW session.",
            "title": "Israel Joffe at Gleason's Gym",
        },
        {
            "path": "/img/g/israel-joffe-ij-more-training.jpg",
            "url": "https://israeljoffe.com/img/g/israel-joffe-ij-more-training.jpg",
            "width": 675, "height": 900,
            "alt": "Israel Joffe in the ring during a WUW training session",
            "caption": "Israel Joffe in the ring during a WUW training session.",
            "title": "Israel Joffe in the WUW ring",
        },
    ]
    org_imgs = [{
        "path": "/img/israel-joffe-johnny-rodz-training.jpg",
        "url": "https://israeljoffe.org/img/israel-joffe-johnny-rodz-training.jpg",
        "width": 900, "height": 675,
        "alt": "Israel Joffe training in the WUW ring at Gleason's Gym with Johnny Rodz",
        "caption": "Johnny Rodz teaching in the WUW ring at Gleason's Gym, with Israel Joffe at right.",
        "title": "Israel Joffe at Gleason's Gym with Johnny Rodz",
    }]
    for i in com_imgs + org_imgs:
        i["ld"] = image_ld(i["url"], i["title"], i["caption"], i["width"], i["height"], i["alt"])

    com_body = (
        "<p>Israel Joffe spent years in the World of Unpredictable Wrestling room at Gleason's Gym in Brooklyn, "
        "training under WWE Hall of Famer Johnny Rodz. The photo above is from that room: Rodz on the right, "
        "Joffe on the left, with the WUW championship belt between them.</p>"
        "<p>Rodz was inducted into the WWE Hall of Fame in 1996 and has trained wrestlers for decades at Gleason's. "
        "His alumni list includes Tazz, Tommy Dreamer, D-Von Dudley and Big Cass. The school is still at 130 Water "
        "Street, under the Brooklyn Bridge.</p>"
        "<p>Joffe's connection was not only in the ring. He helped build and maintain Rodz's websites and social "
        f"media, and he wrote a guest post for Rodz's <em>Monday Night Wrestling</em> publication: "
        f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a>.</p>'
        "<p>Outside the gym, Joffe is a PMP and PMI-CPMAI certified senior project manager, a former "
        "Lawrence-Cedarhurst firefighter who served through Hurricane Sandy, and a 2nd-degree Brazilian Jiu-Jitsu "
        "black belt under Matt Serra. The through-line is the same one Rodz teaches: show up, do the boring work, "
        "and keep coming back.</p>"
        "<p>More of the archive is at "
        '<a href="https://wuwonline.com/israel-joffe/">Israel Joffe at WUW</a> and the '
        '<a href="https://wuwonline.com/johnny-rodz/">Johnny Rodz biography</a>. The companion piece on '
        '<a href="https://israeljoffe.org/israel-joffe-johnny-rodz/">israeljoffe.org</a> covers the personal side '
        "of those years.</p>"
    )
    build_page(
        site_dir=COM,
        template="israel-joffe-portrait/index.html",
        title="Israel Joffe and Johnny Rodz — WUW Years at Gleason's Gym",
        desc="Israel Joffe trained with WWE Hall of Famer Johnny Rodz at World of Unpredictable Wrestling in Brooklyn. Photos, the Gleason's Gym years, and Joffe's guest post for Monday Night Wrestling.",
        canonical=com_url,
        images=com_imgs,
        hero=com_imgs[0],
        body=com_body,
        more_links=[
            (MNW, MNW_TITLE),
            ("https://israeljoffe.org/israel-joffe-johnny-rodz/", "The personal side on israeljoffe.org"),
            ("https://wuwonline.com/israel-joffe/", "Israel Joffe at WUW"),
            ("https://wuwonline.com/johnny-rodz/", "Johnny Rodz — WWE Hall of Fame biography"),
            ("/photos/", "Israel Joffe photo gallery"),
        ],
    )

    org_body = (
        "<p>The mat at Gleason's Gym is where Israel Joffe spent years learning from Johnny Rodz, the WWE Hall of "
        "Famer who founded World of Unpredictable Wrestling. The photo above is from a WUW session in Brooklyn: "
        "Rodz at the edge of the ring, Joffe in the grey shirt, the rest of the room watching.</p>"
        "<p>Joffe came to the gym as a Brazilian Jiu-Jitsu black belt under Matt Serra, but the WUW room taught a "
        "different kind of discipline: timing, ring psychology, and the unglamorous repetition that makes a "
        "performance look easy.</p>"
        "<p>He also helped Rodz with the practical side — the websites, the social accounts, the archive — and "
        f"wrote a guest post for Rodz's <em>Monday Night Wrestling</em> publication: "
        f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a>.</p>'
        "<p>The rest of his life runs on the same current: service as a Lawrence-Cedarhurst firefighter through "
        "Hurricane Sandy, public-sector work at the FDA, the FDIC and the U.S. International Development Finance "
        "Corporation, and a project-management career built on PMP and PMI-CPMAI credentials.</p>"
        "<p>For the photo-led version, see "
        '<a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — WUW Years at '
        "Gleason's Gym</a> on israeljoffe.com. The WUW archive is at "
        '<a href="https://wuwonline.com/israel-joffe/">wuwonline.com/israel-joffe/</a>.</p>'
    )
    build_page(
        site_dir=ORG,
        template="israel-joffe-photo-2020/index.html",
        title="Israel Joffe, Johnny Rodz, and the WUW Years",
        desc="The personal side of Israel Joffe's years at Gleason's Gym: training under WWE Hall of Famer Johnny Rodz, the WUW family, and the archive he helped build.",
        canonical=org_url,
        images=org_imgs,
        hero=org_imgs[0],
        body=org_body,
        more_links=[
            (MNW, MNW_TITLE),
            ("https://israeljoffe.com/israel-joffe-johnny-rodz/", "The photo-led article on israeljoffe.com"),
            ("https://wuwonline.com/israel-joffe/", "Israel Joffe at WUW"),
            ("https://wuwonline.com/johnny-rodz/", "Johnny Rodz — WWE Hall of Fame biography"),
        ],
    )

    # Visible feature blocks on existing pages.
    com_block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        "<h2>Israel Joffe and Johnny Rodz</h2>"
        '<p><a href="/israel-joffe-johnny-rodz/"><img src="/img/israel-joffe-johnny-rodz-wuw.jpg" '
        'alt="Israel Joffe with WWE Hall of Famer Johnny Rodz at Gleason\'s Gym" width="961" height="1024" '
        'loading="lazy" style="max-width:260px;width:100%;height:auto;display:block" /></a></p>'
        '<p><a href="/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — the WUW years</a> · '
        f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a></p></section>'
    )
    for page in ["about/index.html", "photos/index.html", "publications/index.html"]:
        path = os.path.join(COM, page)
        text, bom = read(path)
        if 'href="/israel-joffe-johnny-rodz/"' in text:
            continue
        marker = '<section class="ijg-wrap" id="photos-gallery">'
        if marker in text:
            text = text.replace(marker, com_block + marker, 1)
        else:
            text = text.replace("</main>", com_block + "</main>", 1)
        write(path, text, bom)
        print("linked", page)

    insert_once(
        os.path.join(COM, "israel-joffe-portrait/index.html"),
        '<p><a href="https://israeljoffe.org/israel-joffe-photo-2020/">',
        '<p><a href="/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — WUW years at Gleason\'s Gym</a> · '
        f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a></p>',
    )

    org_block = (
        '<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto">'
        "<h2>Israel Joffe and Johnny Rodz</h2>"
        '<p><a href="/israel-joffe-johnny-rodz/"><img src="/img/israel-joffe-johnny-rodz-training.jpg" '
        'alt="Israel Joffe training in the WUW ring at Gleason\'s Gym with Johnny Rodz" width="900" height="675" '
        'loading="lazy" style="max-width:360px;width:100%;height:auto;display:block" /></a></p>'
        '<p><a href="/israel-joffe-johnny-rodz/">Israel Joffe, Johnny Rodz, and the WUW years</a> · '
        '<a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">Photo-led version on israeljoffe.com</a> · '
        f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a></p></section>'
    )
    for page in ["story/index.html", "wuw/index.html", "writing/index.html"]:
        path = os.path.join(ORG, page)
        text, bom = read(path)
        if 'href="/israel-joffe-johnny-rodz/"' in text:
            continue
        text = text.replace("</main>", org_block + "</main>", 1)
        write(path, text, bom)
        print("linked", page)

    # The old archival post links to /p/israel-joffe. Add the new guest post too.
    post = os.path.join(ORG, "2023/06/11/israel-joffe-at-mondaynightwrestling-com/index.html")
    if os.path.exists(post):
        text, bom = read(post)
        if MNW not in text:
            block = (
                '<p><strong>Guest post:</strong> '
                f'<a href="{esc(MNW)}">{esc(MNW_TITLE)}</a> · '
                '<a href="/israel-joffe-johnny-rodz/">Israel Joffe, Johnny Rodz, and the WUW years</a></p>'
            )
            text = text.replace("Archive note", block + "Archive note", 1)
            write(post, text, bom)
            print("linked archival post")

    # WUW: one visible feature on the Israel Joffe archive and one paragraph on
    # the Johnny Rodz bio. These are already in the WUW sitemap.
    wuw_block = (
        '<section class="ij-refs ij-more">'
        "<h2>Israel Joffe and Johnny Rodz</h2>"
        '<p><a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">'
        '<img src="/img/israel-joffe-johnny-rodz-wuw.jpg" alt="Israel Joffe with WWE Hall of Famer Johnny Rodz at Gleason\'s Gym" '
        'width="961" height="1024" loading="lazy" style="max-width:280px;width:100%;height:auto;display:block;border-radius:6px" /></a></p>'
        '<p>The photo-led article is at '
        '<a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">israeljoffe.com/israel-joffe-johnny-rodz</a>. '
        'The personal side is at '
        '<a href="https://israeljoffe.org/israel-joffe-johnny-rodz/">israeljoffe.org/israel-joffe-johnny-rodz</a>. '
        f'Joffe\'s guest post for Rodz\'s publication: <a href="{esc(MNW)}">{esc(MNW_TITLE)}</a>.</p></section>'
    )
    wuw_ij = os.path.join(WUW, "israel-joffe/index.html")
    if os.path.exists(wuw_ij):
        text, bom = read(wuw_ij)
        if "israel-joffe-johnny-rodz" not in text:
            text = text.replace('<section class="ij-photos">', wuw_block + '<section class="ij-photos">', 1)
            write(wuw_ij, text, bom)
            print("linked WUW /israel-joffe/")

    wuw_rodz = os.path.join(WUW, "johnny-rodz/index.html")
    if os.path.exists(wuw_rodz):
        text, bom = read(wuw_rodz)
        if "israel-joffe-johnny-rodz" not in text:
            para = (
                "<p><strong>Israel Joffe at WUW:</strong> the photo-led archive of Joffe's years training under Rodz is at "
                '<a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">israeljoffe.com/israel-joffe-johnny-rodz</a>. '
                f'His guest post for Rodz\'s publication: <a href="{esc(MNW)}">{esc(MNW_TITLE)}</a>.</p>'
            )
            text = text.replace('<p class="rodz-cta-line">', para + '<p class="rodz-cta-line">', 1)
            write(wuw_rodz, text, bom)
            print("linked WUW /johnny-rodz/")

    # WUW articles page: add a visible link block.
    wuw_articles = os.path.join(WUW, "israel-joffe-articles/index.html")
    if os.path.exists(wuw_articles):
        text, bom = read(wuw_articles)
        if "israel-joffe-johnny-rodz" not in text:
            text = text.replace("</main>", wuw_block + "</main>", 1)
            write(wuw_articles, text, bom)
            print("linked WUW /israel-joffe-articles/")

    # Sitemaps.
    for path, url, imgs in [
        (os.path.join(COM, "sitemap.xml"), com_url, com_imgs),
        (os.path.join(COM, "sitemap-images.xml"), com_url, com_imgs),
        (os.path.join(ORG, "sitemap.xml"), org_url, org_imgs),
        (os.path.join(ORG, "sitemap-images.xml"), org_url, org_imgs),
    ]:
        if os.path.exists(path):
            print(("added " if sitemap_add(path, url, imgs) else "exists ") + path)
    print("done")


if __name__ == "__main__":
    main()
