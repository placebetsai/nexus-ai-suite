#!/usr/bin/env python3
"""Replace the political 2020 screenshot with a clean LCFD portrait and clean
the image-search surfaces.

Run from the nexus-ai-suite repo root:
    python3 scripts/ij-clean-portrait.py

This is a one-off repair for pages built before the no-politics rule was applied
to the portrait article. It keeps the existing URLs, overwrites the old image
files with the clean portrait, and removes the election/White House images from
the photo galleries and image sitemaps. Archive posts are left alone.
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

CLEAN_SRC = os.path.join(
    PARENT, "hiddencameras-tv", "public", "israel-joffe",
    "7ee38-screenshot_20230814_171151_onedrive.jpg",
)
CLEAN_ALT = "Israel Joffe in Lawrence-Cedarhurst Fire Department firefighter gear"
CLEAN_CAPTION = "Israel Joffe in Lawrence-Cedarhurst Fire Department firefighter gear."

COM_DESC = (
    "Portrait of Israel Joffe in Lawrence-Cedarhurst Fire Department firefighter "
    "gear, with the public-service record behind the photo."
)
ORG_DESC = (
    "A portrait of Israel Joffe in Lawrence-Cedarhurst Fire Department firefighter "
    "gear, with the public-service record behind the photo."
)

# Images that should not be promoted on the new SEO pages or in image search.
BLOCKED = [
    "israel-joffe-fb-img-1604720478848",
    "israel-joffe-well-its-election-day-again-meme",
    "israel-joffe-img-20201017-152536-1",
    "israel-joffe-screenshot-20201105-064044",
]


def read(path):
    raw = open(path, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write(path, text, bom=False):
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    open(path, "wb").write(data)


def clean_portrait():
    im = Image.open(CLEAN_SRC).convert("RGB")
    im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
    # 1080x1283; crop a few pixels if the source ratio differs slightly.
    if im.size != (1080, 1283):
        im = im.crop((0, 0, 1080, min(im.height, 1283)))
    for path in [
        os.path.join(COM, "img", "israel-joffe-portrait.jpg"),
        os.path.join(COM, "img", "israel-joffe-portrait-2020.jpg"),
        os.path.join(ORG, "img", "israel-joffe-portrait.jpg"),
        os.path.join(ORG, "img", "israel-joffe-2020.jpg"),
    ]:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path, "JPEG", quality=90, optimize=True)
    return im.size


def clean_main_com():
    return (
        '<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
        '<article class="page-frame ij-body" style="padding:0 16px;max-width:820px;margin:0 auto">'
        '<header class="page-head"><h1 class="section-title page-h">Israel Joffe — Portrait</h1>'
        f'<p class="page-lede">{html.escape(COM_DESC)}</p></header>'
        f'<figure style="margin:1.5rem 0"><img src="/img/israel-joffe-portrait.jpg" alt="{html.escape(CLEAN_ALT)}" '
        'width="1080" height="1283" fetchpriority="high" style="width:100%;height:auto;display:block;border-radius:6px" />'
        f'<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">{html.escape(CLEAN_CAPTION)}</figcaption></figure>'
        '<div class="ij-article-body" style="line-height:1.7">'
        '<p>This portrait shows Israel Joffe in the gear of the Lawrence-Cedarhurst Fire Department (LCFD), '
        "the volunteer department that serves the Five Towns on Long Island's South Shore. He answered calls "
        'with LCFD through Hurricane Sandy.</p>'
        '<p>The firehouse was one part of a life built around public service. Joffe later worked at the FDA, '
        'the FDIC, and the U.S. International Development Finance Corporation (DFC), where he is a senior '
        'project portfolio manager.</p>'
        '<p>He is a PMP and PMI-CPMAI certified project leader. Earlier he worked in media, IT and web '
        'production for Fox 5 News, ABC News and Fox News.</p>'
        '<p>Outside the office, he holds a 2nd-degree black belt in Brazilian Jiu-Jitsu, earned under UFC Hall '
        'of Famer Matt Serra. He also trained for years with WWE Hall of Famer Johnny Rodz at World of '
        'Unpredictable Wrestling in Brooklyn.</p></div>'
        '<section class="ij-refs"><h2>More</h2>'
        '<p><a href="/about/">About Israel Joffe</a> · <a href="/publications/">Publications &amp; press</a> · '
        '<a href="/photos/">Photo gallery</a> · <a href="/certifications/">Certifications</a></p>'
        '<p><a href="/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — WUW years at Gleason\'s Gym</a> · '
        '<a href="/israel-joffe-firefighter/">Israel Joffe — Firefighter, LCFD, and Public Service</a> · '
        '<a href="/israel-joffe-profiles/">Publisher pages and profiles</a></p>'
        '<p><a href="https://israeljoffe.org/israel-joffe-photo-2020/">The portrait and public-service story on '
        'israeljoffe.org</a></p></section></article></main>'
    )


def clean_main_org():
    return (
        '<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
        '<article class="page-frame ij-body" style="padding:0 16px;max-width:820px;margin:0 auto">'
        '<header class="page-head"><h1 class="section-title page-h">Israel Joffe — Portrait and Public Service</h1>'
        f'<p class="page-lede">{html.escape(ORG_DESC)}</p></header>'
        f'<figure style="margin:1.5rem 0"><img src="/img/israel-joffe-portrait.jpg" alt="{html.escape(CLEAN_ALT)}" '
        'width="1080" height="1283" fetchpriority="high" style="width:100%;height:auto;display:block;border-radius:6px" />'
        f'<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">{html.escape(CLEAN_CAPTION)}</figcaption></figure>'
        '<div class="ij-article-body" style="line-height:1.7">'
        '<p>This portrait shows Israel Joffe in the gear of the Lawrence-Cedarhurst Fire Department (LCFD), '
        "the volunteer department that serves the Five Towns on Long Island's South Shore. He answered calls "
        'with LCFD through Hurricane Sandy.</p>'
        '<p>The thread through his life has been service. He grew up in New York and the Five Towns, and the '
        'firehouse was one part of a commitment rooted in a family story of refugees and Holocaust survivors '
        'who rebuilt their lives in America.</p>'
        '<p>That sense of duty carried into public-sector work at the FDA, the FDIC and today the U.S. '
        'International Development Finance Corporation, where he is a PMP and PMI-CPMAI certified project '
        'leader.</p>'
        '<p>On the mat, he is a 2nd-degree Brazilian Jiu-Jitsu black belt under Matt Serra, and he trained for '
        'years with WWE Hall of Famer Johnny Rodz at World of Unpredictable Wrestling in Brooklyn.</p></div>'
        '<section class="ij-refs"><h2>More</h2>'
        '<p><a href="/about/">About Israel Joffe</a> · <a href="/story/">The story</a> · '
        '<a href="/writing/">Writing &amp; essays</a> · <a href="/photos/">Photo gallery</a></p>'
        '<p><a href="https://israeljoffe.com/israel-joffe-johnny-rodz/">Israel Joffe and Johnny Rodz — WUW years '
        'at Gleason\'s Gym</a> · <a href="https://israeljoffe.com/israel-joffe-firefighter/">Firefighter and '
        'public service</a> · <a href="https://israeljoffe.com/israel-joffe-profiles/">Publisher pages</a></p>'
        '<p><a href="https://israeljoffe.com/israel-joffe-portrait/">The portrait and professional background on '
        'israeljoffe.com</a></p></section></article></main>'
    )


def patch_page(path, *, old_title, new_title, old_desc, new_desc, old_caption, new_caption, main):
    s, bom = read(path)
    s = s.replace(old_title, new_title)
    s = s.replace(old_desc, new_desc)
    s = s.replace(old_caption, new_caption)
    s = s.replace("/img/israel-joffe-portrait-2020.jpg", "/img/israel-joffe-portrait.jpg")
    s = s.replace("/img/israel-joffe-2020.jpg", "/img/israel-joffe-portrait.jpg")
    s = s.replace("1358", "1080").replace("1530", "1283")
    s = s.replace('"dateModified": "2026-10-14"', f'"dateModified": "{TODAY}"')
    s = s.replace('"dateModified":"2026-10-14"', f'"dateModified":"{TODAY}"')
    s = re.sub(
        r'(<meta property="og:image:alt" content=")[^"]*"',
        lambda m: m.group(1) + html.escape(CLEAN_ALT) + '"',
        s,
        count=1,
    )
    s = re.sub(
        r'(<meta name="twitter:image:alt" content=")[^"]*"',
        lambda m: m.group(1) + html.escape(CLEAN_ALT) + '"',
        s,
        count=1,
    )
    s = re.sub(r"<main\b.*?</main>", main, s, count=1, flags=re.S)
    write(path, s, bom)


def patch_feature_blocks(root):
    for page in ["about/index.html", "publications/index.html", "writing/index.html"]:
        path = os.path.join(root, page)
        if not os.path.exists(path):
            continue
        s, bom = read(path)
        s = s.replace("Israel Joffe — 2020 photo", "Israel Joffe — Portrait")
        s = s.replace("Israel Joffe — Portrait, 2020", "Israel Joffe — Portrait")
        s = s.replace("Israel Joffe — A 2020 Photo and a Life of Service", "Israel Joffe — Portrait and Public Service")
        s = s.replace("/img/israel-joffe-portrait-2020.jpg", "/img/israel-joffe-portrait.jpg")
        s = s.replace("/img/israel-joffe-2020.jpg", "/img/israel-joffe-portrait.jpg")
        s = s.replace('alt="Israel Joffe" width="1358" height="1530"', f'alt="{html.escape(CLEAN_ALT)}" width="1080" height="1283"')
        s = s.replace("1358", "1080").replace("1530", "1283")
        text = s.replace(html.escape(CLEAN_ALT), "")
        # Only write when the feature block was actually present.
        if "Israel Joffe — Portrait" in text or "israel-joffe-portrait.jpg" in text:
            write(path, s, bom)


def clean_json_ld(s):
    def walk(obj):
        if isinstance(obj, dict):
            for key in ("contentUrl", "url"):
                v = obj.get(key)
                if isinstance(v, str) and any(b in v for b in BLOCKED):
                    return None
            for key in list(obj.keys()):
                if key in ("contentUrl", "url"):
                    continue
                v = obj[key]
                if isinstance(v, list):
                    obj[key] = [x for x in (walk(x) for x in v) if x is not None]
                elif isinstance(v, dict):
                    nv = walk(v)
                    if nv is None:
                        del obj[key]
                    else:
                        obj[key] = nv
            return obj
        if isinstance(obj, list):
            return [x for x in (walk(v) for v in obj) if x is not None]
        return obj

    def repl(m):
        try:
            data = json.loads(m.group(1))
        except Exception:
            return m.group(0)
        return '<script type="application/ld+json">' + json.dumps(
            walk(data), ensure_ascii=False, separators=(",", ":")
        ) + "</script>"

    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', repl, s, flags=re.S)


def clean_gallery_pages(root):
    for page in ["about/index.html", "photos/index.html", "publications/index.html", "writing/index.html"]:
        path = os.path.join(root, page)
        if not os.path.exists(path):
            continue
        s, bom = read(path)
        before = s
        s = re.sub(
            r"<figure\b[^>]*>.*?</figure>",
            lambda m: "" if any(b in m.group(0) for b in BLOCKED) else m.group(0),
            s,
            flags=re.S,
        )
        s = clean_json_ld(s)
        if s != before:
            write(path, s, bom)
            print("cleaned", path)


def clean_sitemaps(root):
    for page in ["sitemap.xml", "sitemap-images.xml"]:
        path = os.path.join(root, page)
        if not os.path.exists(path):
            continue
        s, bom = read(path)
        s = s.replace("https://israeljoffe.com/img/israel-joffe-portrait-2020.jpg", "https://israeljoffe.com/img/israel-joffe-portrait.jpg")
        s = s.replace("https://israeljoffe.org/img/israel-joffe-2020.jpg", "https://israeljoffe.org/img/israel-joffe-portrait.jpg")
        s = s.replace("Israel Joffe, 2020. Photo and post by Israel Joffe.", CLEAN_CAPTION)
        s = s.replace("Israel Joffe, 2020. From his own post.", CLEAN_CAPTION)
        s = re.sub(
            r"<image:image>.*?</image:image>",
            lambda m: "" if any(b in m.group(0) for b in BLOCKED) else m.group(0),
            s,
            flags=re.S,
        )
        write(path, s, bom)


def main():
    size = clean_portrait()
    print("clean portrait", size)
    patch_page(
        os.path.join(COM, "israel-joffe-portrait", "index.html"),
        old_title="Israel Joffe — Portrait, 2020",
        new_title="Israel Joffe — Portrait",
        old_desc="Portrait of Israel Joffe, PMP and PMI-CPMAI certified Senior Project Portfolio Manager at the U.S. International Development Finance Corporation, from his own 2020 post.",
        new_desc=COM_DESC,
        old_caption="Israel Joffe, 2020. Photo and post by Israel Joffe.",
        new_caption=CLEAN_CAPTION,
        main=clean_main_com(),
    )
    patch_page(
        os.path.join(ORG, "israel-joffe-photo-2020", "index.html"),
        old_title="Israel Joffe — A 2020 Photo and a Life of Service",
        new_title="Israel Joffe — Portrait and Public Service",
        old_desc="A 2020 photo of Israel Joffe, former Lawrence-Cedarhurst firefighter during Hurricane Sandy, public servant at the FDA, FDIC and DFC, and Brazilian Jiu-Jitsu black belt.",
        new_desc=ORG_DESC,
        old_caption="Israel Joffe, 2020. From his own post.",
        new_caption=CLEAN_CAPTION,
        main=clean_main_org(),
    )
    patch_feature_blocks(COM)
    patch_feature_blocks(ORG)
    # Political images are allowed on israeljoffe.com when they come from the
    # user's own domains; keep them off israeljoffe.org.
    clean_gallery_pages(ORG)
    clean_sitemaps(ORG)
    print("done")


if __name__ == "__main__":
    main()
