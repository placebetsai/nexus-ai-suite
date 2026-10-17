#!/usr/bin/env python3
"""Build the standalone Israel Joffe 2020 photo articles on israeljoffe.com and .org (2026-10-14)."""
import json, re, html, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSON={"@id":"https://israeljoffe.com/#person"}
SITES={
 "com":dict(dir="israeljoffe-com",base="https://israeljoffe.com",slug="israel-joffe-portrait",img="israel-joffe-portrait-2020.jpg",tpl="publications/index.html",
   title="Israel Joffe — Portrait, 2020",
   desc="Portrait of Israel Joffe, PMP and PMI-CPMAI certified Senior Project Portfolio Manager at the U.S. International Development Finance Corporation, from his own 2020 post.",
   caption="Israel Joffe, 2020. Photo and post by Israel Joffe.",
   body=["This portrait comes from a post shared on his own account in October 2020. It is published here, on his official site, as the original source of the image.",
     "He is a PMP and PMI-CPMAI certified project manager and a Senior Project Portfolio Manager at the U.S. International Development Finance Corporation (DFC), where his work centers on portfolio delivery and AI-driven projects.",
     "Before the DFC, he served the federal government as a Program Specialist at the FDIC and as a Senior Advisor and Senior Project Manager at the FDA. Earlier he worked in media, IT and web production for Fox 5 News, ABC News and Fox News.",
     "Outside the office, he holds a 2nd-degree black belt in Brazilian Jiu-Jitsu, earned under UFC Hall of Famer Matt Serra."],
   links=[("/about/","About Israel Joffe"),("/publications/","Publications &amp; press"),("/photos/","Photo gallery"),("/certifications/","Certifications")],
   other=("https://israeljoffe.org/israel-joffe-photo-2020/","The same 2020 photo on israeljoffe.org, with the story of service behind it")),
 "org":dict(dir="israeljoffe-org",base="https://israeljoffe.org",slug="israel-joffe-photo-2020",img="israel-joffe-2020.jpg",tpl="writing/index.html",
   title="Israel Joffe — A 2020 Photo and a Life of Service",
   desc="A 2020 photo of Israel Joffe, former Lawrence-Cedarhurst firefighter during Hurricane Sandy, public servant at the FDA, FDIC and DFC, and Brazilian Jiu-Jitsu black belt.",
   caption="Israel Joffe, 2020. From his own post.",
   body=["This photo was shared on his own account in October 2020, and it lives here as part of the personal record kept on israeljoffe.org.",
     "The thread through his life has been service. He grew up in New York and the Five Towns and answered calls with the Lawrence-Cedarhurst Fire Department during Hurricane Sandy, a commitment rooted in a family story of refugees and Holocaust survivors who rebuilt their lives in America.",
     "That sense of duty carried into public-sector work at the FDA, the FDIC and today the U.S. International Development Finance Corporation, where he is a PMP and PMI-CPMAI certified project leader.",
     "On the mat, he is a 2nd-degree Brazilian Jiu-Jitsu black belt under Matt Serra, and he trained for years with WWE Hall of Famer Johnny Rodz at World of Unpredictable Wrestling in Brooklyn."],
   links=[("/about/","About Israel Joffe"),("/story/","The story"),("/writing/","Writing &amp; essays"),("/photos/","Photo gallery")],
   other=("https://israeljoffe.com/israel-joffe-portrait/","The same 2020 portrait on israeljoffe.com, with his professional background")),
}
BANNED=re.compile(r"trump|hotel|maga|washington|\bdc\b|politic",re.I)
def build(k):
    c=SITES[k]; d=os.path.join(ROOT,c["dir"]); url=f'{c["base"]}/{c["slug"]}/'; iu=f'{c["base"]}/img/{c["img"]}'
    t=open(os.path.join(d,c["tpl"]),encoding="utf-8-sig").read()
    head,rest=t.split("<main",1); _,foot=rest.split("</main>",1)
    T=html.escape(c["title"]); D=html.escape(c["desc"])
    head=re.sub(r"<title>.*?</title>",f"<title>{T}</title>",head)
    head=re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"',lambda m:m.group(1)+D+'"',head)
    head=re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"',lambda m:m.group(1)+T+'"',head)
    head=re.sub(r'(<link rel="canonical" href=")[^"]*"',lambda m:m.group(1)+url+'"',head)
    head=re.sub(r'(<meta property="og:url" content=")[^"]*"',lambda m:m.group(1)+url+'"',head)
    head=head.replace('<meta property="og:type" content="website" />','<meta property="og:type" content="article" />')
    # OG/twitter image -> the photo
    head=re.sub(r'<meta property="og:image(?::[a-z_]+)?" content="[^"]*" />\n','',head)
    og=(f'<meta property="og:image" content="{iu}" />\n<meta property="og:image:secure_url" content="{iu}" />\n<meta property="og:image:type" content="image/jpeg" />\n'
        f'<meta property="og:image:width" content="1358" />\n<meta property="og:image:height" content="1530" />\n<meta property="og:image:alt" content="Israel Joffe" />\n')
    head=head.replace('<meta name="twitter:card"',og+'<meta name="twitter:card"',1)
    head=re.sub(r'(<meta name="twitter:image" content=")[^"]*"',lambda m:m.group(1)+iu+'"',head)
    head=re.sub(r'(<meta name="twitter:image:alt" content=")[^"]*"',lambda m:m.group(1)+'Israel Joffe"',head)
    # replace CollectionPage ld with Article+ImageObject
    img={"@type":"ImageObject","@id":iu+"#image","contentUrl":iu,"url":iu,"name":"Israel Joffe","caption":c["caption"],"description":"Israel Joffe","width":1358,"height":1530,
         "encodingFormat":"image/jpeg","dateCreated":"2020-10-17","datePublished":"2020-10-17","creator":PERSON,"copyrightHolder":PERSON,"author":PERSON,"about":PERSON,
         "creditText":"Israel Joffe","copyrightNotice":"© 2020 Israel Joffe","license":c["base"]+"/contact/","acquireLicensePage":c["base"]+"/contact/","representativeOfPage":True}
    art={"@type":"Article","@id":url+"#article","headline":c["title"],"description":c["desc"],"url":url,"mainEntityOfPage":url,"image":{"@id":iu+"#image"},
         "author":PERSON,"publisher":PERSON,"about":PERSON,"datePublished":"2026-10-14","dateModified":"2026-10-14","inLanguage":"en-US"}
    crumbs={"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":c["base"]+"/"},{"@type":"ListItem","position":2,"name":"About","item":c["base"]+"/about/"},{"@type":"ListItem","position":3,"name":c["title"],"item":url}]}
    ld='<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@graph":[art,img,crumbs]},ensure_ascii=False)+'</script>'
    head=re.sub(r'<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"CollectionPage".*?</script>',lambda m:ld,head,flags=re.S)
    assert ld in head
    head=head.replace('<link rel="stylesheet"',f'<link rel="preload" as="image" href="/img/{c["img"]}" />\n<link rel="stylesheet"',1)
    paras="".join(f"<p>{p}</p>" for p in c["body"])
    lk=" · ".join(f'<a href="{h}">{n}</a>' for h,n in c["links"])
    main=(f'<main class="page ij-page"><div class="ij-hdr-spacer" style="height:96px" aria-hidden="true"></div>'
      f'<article class="page-frame ij-body" style="padding:0 16px;max-width:820px;margin:0 auto"><header class="page-head"><h1 class="section-title page-h">{T}</h1>'
      f'<p class="page-lede">{D}</p></header>'
      f'<figure style="margin:1.5rem 0"><img src="/img/{c["img"]}" alt="Israel Joffe" width="1358" height="1530" fetchpriority="high" style="width:100%;height:auto;display:block;border-radius:6px" />'
      f'<figcaption style="font-size:.9rem;opacity:.75;margin-top:.5rem">{html.escape(c["caption"])}</figcaption></figure>'
      f'<div class="ij-article-body" style="line-height:1.7">{paras}</div>'
      f'<section class="ij-refs"><h2>More</h2><p>{lk}</p><p><a href="{c["other"][0]}">{c["other"][1]}</a></p></section></article>\n</main>')
    out=head+main+foot
    vis=re.sub(r"<[^>]+>"," ",head+main)  # check our own content, footer is pre-existing
    assert not BANNED.search(main+ld+c["img"]+c["slug"]), BANNED.search(main+ld)
    os.makedirs(os.path.join(d,c["slug"]),exist_ok=True)
    open(os.path.join(d,c["slug"],"index.html"),"w").write(out)
    # sitemap
    sp=os.path.join(d,"sitemap.xml"); s=open(sp).read()
    if url not in s:
        e=f'  <url><loc>{url}</loc><lastmod>2026-10-14</lastmod><changefreq>monthly</changefreq><priority>0.9</priority><image:image><image:loc>{iu}</image:loc><image:title>Israel Joffe</image:title><image:caption>{html.escape(c["caption"])}</image:caption></image:image></url>\n'
        s=s.replace("</urlset>",e+"</urlset>"); open(sp,"w").write(s)
    # internal links (not homepage)
    blk=(f'<section class="ij-feature-photo" style="padding:0 16px;max-width:1000px;margin:1.5rem auto"><h2>Israel Joffe — 2020 photo</h2>'
         f'<p><a href="/{c["slug"]}/"><img src="/img/{c["img"]}" alt="Israel Joffe" width="1358" height="1530" loading="lazy" style="max-width:260px;width:100%;height:auto;display:block" /></a></p>'
         f'<p><a href="/{c["slug"]}/">{T}</a></p></section>')
    for p in ["about/index.html","photos/index.html",c["tpl"]]:
        fp=os.path.join(d,p); s=open(fp,encoding="utf-8-sig").read(); bom=open(fp,"rb").read(3)==b"\xef\xbb\xbf"
        if f'href="/{c["slug"]}/"' in s: continue
        if '<section class="ijg-wrap" id="photos-gallery">' in s:
            s=s.replace('<section class="ijg-wrap" id="photos-gallery">',blk+'<section class="ijg-wrap" id="photos-gallery">',1)
        else:
            s=s.replace('</main>',blk+'</main>',1)
        open(fp,"w",encoding="utf-8-sig" if bom else "utf-8").write(s)
        print("linked",p)
    print("built",url)
for k in SITES: build(k)
