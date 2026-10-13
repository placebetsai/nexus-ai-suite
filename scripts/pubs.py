import re,json,html as H,sys,os
sys.path.insert(0,'wuwonline-com'); import ijlinks_data as D
items=json.load(open('_g/items.json'))
A=[x for g in D.HUB.values() for x in g]
def t(x): s=x[1]; s=re.sub(r'^Israel Joffe\s*[:—-]\s*','',s).strip(); return f'Israel Joffe — {s}' if s and s.lower()!='israel joffe' else x[1]
press=[x for x in D.HUB.get('Press & Interviews',[]) if 'mondaynightwrestling' not in x[0]]
mnw=[x for x in D.HUB.get('Press & Interviews',[]) if 'mondaynightwrestling' in x[0]]
art=D.HUB.get('Articles',[])
PAGES={
 'israeljoffe-com':dict(dom='israeljoffe.com',path='publications',name='Israel Joffe — Publications & Press',
   intro='Professional writing and press coverage by and about Israel Joffe, PMP and PMI-CPMAI certified senior project manager: project and AI management, public service, and his years in media and IT at Fox 5 News, ABC News and Fox News.',
   groups=[('Press coverage',press),('Articles on israeljoffe.com',[x for x in art if 'israeljoffe.com/' in x[0]]),('Medium',[x for x in art if 'medium.com' in x[0]])],photos=[1,2,4,5]),
 'israeljoffe-org':dict(dom='israeljoffe.org',path='writing',name='Israel Joffe — Writing & Essays',
   intro='Essays and personal writing by Israel Joffe: public service, his time as a Lawrence-Cedarhurst firefighter during Hurricane Sandy, family history, and commentary published on Substack.',
   groups=[('Substack essays',D.HUB.get('Substack',[])),('Journal on israeljoffe.org',[x for x in art if 'israeljoffe.org/' in x[0]])],photos=[4,6,7,8]),
 'wuwonline-com':dict(dom='wuwonline.com',path='israel-joffe-articles',name='Israel Joffe — Wrestling & Media Articles',
   intro="Israel Joffe's wrestling and media writing: Monday Night Wrestling features, WUW archive entries from Gleason's Gym with WWE Hall of Famer Johnny Rodz, and his video work.",
   groups=[('Monday Night Wrestling',mnw),('WUW archive entries',[x for x in art if 'wuwonline.com/' in x[0]]),('Video',D.HUB.get('Video',[])[:8])],photos=[0,9,10,11]),
}
X={'israeljoffe-com':'https://israeljoffe.com/publications/','israeljoffe-org':'https://israeljoffe.org/writing/','wuwonline-com':'https://wuwonline.com/israel-joffe-articles/'}
for root,c in PAGES.items():
  can=f"https://{c['dom']}/{c['path']}/"
  tpl={'israeljoffe-com':'israeljoffe-com/about/index.html','israeljoffe-org':'israeljoffe-org/about/index.html','wuwonline-com':'wuwonline-com/israel-joffe-links/index.html'}[root]
  s=open(tpl,encoding='utf-8',errors='surrogateescape').read()
  s=re.sub(r'<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"(ImageGallery|ProfilePage)".*?</script>','',s,flags=re.S)
  s=re.sub(r'<style>\.ijg-wrap\{.*?</style>','',s,flags=re.S)
  s=re.sub(r'<title>.*?</title>',f"<title>{H.escape(c['name'])}</title>",s,1,flags=re.S)
  s=re.sub(r'(<link rel="canonical" href=")[^"]*',r'\g<1>'+can,s); s=re.sub(r'(<meta property="og:url" content=")[^"]*',r'\g<1>'+can,s)
  s=re.sub(r'(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*',lambda m:m.group(1)+H.escape(c['name']),s)
  s=re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*',lambda m:m.group(1)+H.escape(c['intro'][:300]),s)
  links=[];secs=''
  for h,g in c['groups']:
    if not g: continue
    lis=''.join(f'<li><a href="{H.escape(u)}" target="_blank" rel="noopener">{H.escape(t([u,tt]))}</a></li>' for u,tt in g); links+=g
    secs+=f'<section class="ij-refs"><h2>{H.escape(h)}</h2><ul class="ij-link-list">{lis}</ul></section>'
  ph=''.join(f'<figure><picture><source srcset="/img/g/{items[i]["slug"]}.webp" type="image/webp"><img src="/img/g/{items[i]["slug"]}.jpg" alt="{H.escape(items[i]["alt"])}" width="{items[i]["w"]}" height="{items[i]["h"]}" loading="{"eager" if k<2 else "lazy"}" decoding="async"></picture><figcaption>{H.escape(items[i]["alt"])}</figcaption></figure>' for k,i in enumerate(c['photos']))
  cross=' · '.join(f'<a href="{u}">{n}</a>' for r,u in X.items() if r!=root for n in [{'israeljoffe-com':'Israel Joffe publications (israeljoffe.com)','israeljoffe-org':'Israel Joffe writing (israeljoffe.org)','wuwonline-com':'Israel Joffe wrestling & media articles (WUW)'}[r]])
  cross+=' · <a href="https://wuwonline.com/israel-joffe-links/">Israel Joffe — official sites, articles &amp; profiles</a>'
  main=f'''<main class="page ij-page"><div class="page-frame ij-body" style="padding:0 16px;max-width:1000px;margin:0 auto"><header class="page-head"><h1 class="section-title page-h">{H.escape(c['name'])}</h1><p class="page-lede">{H.escape(c['intro'])}</p></header>
<section class="ijg-wrap"><div class="ijg">{ph}</div></section>{secs}<section class="ij-refs"><h2>More from Israel Joffe</h2><p>{cross}</p></section></div></main>'''
  if root!='wuwonline-com': main=main.replace('<main class="page ij-page">','<main class="page ij-page">'+'<div class=\"ij-hdr-spacer\" style=\"height:96px\" aria-hidden=\"true\"></div>',1)
  s=re.sub(r'<main[^>]*>.*?</main>',lambda m:main,s,1,flags=re.S)
  ld=[{"@context":"https://schema.org","@type":"CollectionPage","@id":can,"url":can,"name":c['name'],"description":c['intro'],"about":{"@id":"https://israeljoffe.com/#person"},
       "mainEntity":{"@type":"ItemList","numberOfItems":len(links),"itemListElement":[{"@type":"ListItem","position":k+1,"item":{"@type":"Article","headline":t([u,tt])[:110],"url":u,"author":{"@id":"https://israeljoffe.com/#person"}}} for k,(u,tt) in enumerate(links)]}}]
  css='<style>.ijg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:1.5rem 0}.ijg figure{margin:0}.ijg img{width:100%;height:auto;display:block;border-radius:6px}.ijg figcaption{font-size:.78rem;opacity:.8;margin-top:4px}.ij-link-list a{font-weight:600;text-decoration:underline;text-underline-offset:3px}</style>'
  s=s.replace('</head>',''.join('<script type="application/ld+json">'+json.dumps(b,ensure_ascii=False,separators=(",",":"))+'</script>' for b in ld)+css+'</head>',1)
  os.makedirs(f"{root}/{c['path']}",exist_ok=True); open(f"{root}/{c['path']}/index.html",'w',encoding='utf-8',errors='surrogateescape').write(s)
  sm=open(f'{root}/sitemap.xml').read()
  if can+'<' not in sm:
    im=''.join(f'<image:image><image:loc>https://{c["dom"]}/img/g/{items[i]["slug"]}.jpg</image:loc><image:caption>{H.escape(items[i]["alt"])}</image:caption></image:image>' for i in c['photos'])
    sm=sm.replace('</urlset>',f'  <url><loc>{can}</loc><priority>0.8</priority>{im}</url>\n</urlset>'); open(f'{root}/sitemap.xml','w').write(sm)
  print(can,len(links),'links')
