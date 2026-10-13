import os,re,json,hashlib,html as H,shutil
from PIL import Image,ImageOps
SITES={'israeljoffe-com':'israeljoffe.com','israeljoffe-org':'israeljoffe.org','wuwonline-com':'wuwonline.com'}
SKIP=re.compile(r'^(og-|favicon|logo|apple-touch|icon|hero)',re.I)
# 1 context map: image filename -> (title,date,site)
ctx={}
for root,dom in SITES.items():
  for dp,_,fs in os.walk(root):
    m=re.search(r'/(20\d\d)/(\d\d)/(\d\d)/',dp+'/')
    if 'index.html' not in fs or not m: continue
    s=open(os.path.join(dp,'index.html'),encoding='utf-8',errors='ignore').read()
    t=re.search(r'<h1[^>]*>(.*?)</h1>',s,re.S); t=H.unescape(re.sub(r'<[^>]+>','',t.group(1))).strip() if t else ''
    for f in re.findall(r'/img/([^"\'\s?#)]+)',s): ctx.setdefault(f,(t,f'{m.group(1)}-{m.group(2)}',dom))
import collections
alts=collections.defaultdict(set); ptitle={}
for root in SITES:
  for dp,_,fs in os.walk(root):
    if 'index.html' not in fs or '/img' in dp: continue
    s_=open(os.path.join(dp,'index.html'),encoding='utf-8',errors='ignore').read()
    s_=re.sub(r'<section class="ijg-wrap".*?</section>','',s_,flags=re.S)
    tt=re.search(r'<title>(.*?)</title>',s_,re.S); tt=H.unescape(tt.group(1)).strip() if tt else ''
    tt=re.sub(r'\s*[-–—·|]\s*(Israel Joffe|WUW)\s*$','',tt).strip()
    for tag in re.findall(r'<img\b[^>]*>',s_):
      m_=re.search(r'src="[^"]*/img/([^"?]+)"',tag); a_=re.search(r'alt="([^"]*)"',tag)
      if not m_: continue
      if a_: alts[m_.group(1)].add(H.unescape(a_.group(1)).strip())
      if re.search(r'/20\d\d/\d\d/',dp) and tt and tt.lower()!='israel joffe': ptitle.setdefault(m_.group(1),tt)
def best(f):
  c=[a for a in alts.get(f,()) if len(a)>14 and a.lower()!='israel joffe' and not a.lower().startswith('israel joffe, photo')]
  if c: a=max(c,key=len); return a if 'israel joffe' in a.lower() else 'Israel Joffe — '+a
  if f in ptitle: t=ptitle[f]; return t if 'israel joffe' in t.lower() else 'Israel Joffe — '+t
# 2 catalog
cat=[];seen=set()
srcs=[('israeljoffe-com',f) for f in sorted(os.listdir('israeljoffe-com/img'))]+[('israeljoffe-org',f) for f in sorted(os.listdir('israeljoffe-org/img'))]+[('wuwonline-com',f) for f in sorted(os.listdir('wuwonline-com/img')) if re.match(r'^(ij-|israel)',f,re.I)]
for root,f in srcs:
  p=f'{root}/img/{f}'
  if not os.path.isfile(p) or SKIP.match(f) or not f.lower().endswith(('.jpg','.jpeg','.png','.webp')): continue
  try: im=Image.open(p); im=ImageOps.exif_transpose(im)
  except Exception: continue
  if min(im.size)<300: continue
  h=hashlib.md5(open(p,'rb').read()).hexdigest()
  if h in seen: continue
  seen.add(h); cat.append((root,f,p,im))
print('unique photos',len(cat))
# 3 variants into shared dir, then copy to each site img/g/
os.makedirs('_g',exist_ok=True); items=[]; slugs=set()
for i,(root,f,p,im) in enumerate(cat):
  b=re.sub(r'^israel-joffe-','',os.path.splitext(f)[0].lower()); b=re.sub(r'[^a-z0-9]+','-',b).strip('-')[:50]
  slug=f'israel-joffe-{b}'
  while slug in slugs: slug+='-x'
  slugs.add(slug)
  im=im.convert('RGB'); im.thumbnail((900,900)); w,h=im.size
  if not os.path.exists(f'_g/{slug}.jpg'):
    im.save(f'_g/{slug}.jpg','JPEG',quality=78,optimize=True,progressive=True); im.save(f'_g/{slug}.webp','WEBP',quality=74)
  c=ctx.get(f); bb=best(f)
  if bb: alt=bb[:140]
  elif c and c[0]:
    t=c[0] if 'israel joffe' in c[0].lower() else f'Israel Joffe — {c[0]}'
    alt=f'{t} ({c[1]})' if c[1] else t
  else:
    m=re.search(r'(20[012]\d)[-_]?([01]\d)',f); alt=f'Israel Joffe, photo from {m.group(1)}-{m.group(2)}' if m else f'Israel Joffe, photo {i+1}'
  items.append(dict(slug=slug,w=w,h=h,alt=alt))
# uniqueness of alt
cnt={}
for it in items:
  cnt[it['alt']]=cnt.get(it['alt'],0)+1
  if cnt[it['alt']]>1: it['alt']+=f' — photo {cnt[it["alt"]]}'
json.dump(items,open('_g/items.json','w'),ensure_ascii=False)
for root in SITES:
  d=f'{root}/img/g'; os.makedirs(d,exist_ok=True)
  for x in os.listdir('_g'):
    if x!='items.json': shutil.copy2(f'_g/{x}',d)
CSS='<style>.ijg-wrap{padding:0 16px;max-width:1200px;margin:0 auto}.ijg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:1.5rem 0}.ijg figure{margin:0}.ijg img{width:100%;height:auto;aspect-ratio:auto;display:block;border-radius:6px;background:#ddd}.ijg figcaption{font-size:.78rem;line-height:1.3;margin-top:4px;opacity:.8}@media(min-width:900px){.ijg{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}</style>'
def gallery(dom,n,title,page):
  sel=items[:n]; figs=[]
  for k,it in enumerate(sel):
    lz='eager' if k<4 else 'lazy'; a=H.escape(it['alt'])
    figs.append(f'<figure><picture><source srcset="/img/g/{it["slug"]}.webp" type="image/webp"><img src="/img/g/{it["slug"]}.jpg" alt="{a}" width="{it["w"]}" height="{it["h"]}" loading="{lz}" decoding="async"></picture><figcaption>{a}</figcaption></figure>')
  ld={"@context":"https://schema.org","@type":"ImageGallery","name":title,"url":page,"about":{"@id":"https://israeljoffe.com/#person"},
      "associatedMedia":[{"@type":"ImageObject","contentUrl":f"https://{dom}/img/g/{it['slug']}.jpg","name":it['alt'],"caption":it['alt'],"width":it['w'],"height":it['h'],"about":{"@id":"https://israeljoffe.com/#person"}} for it in sel]}
  html=f'<section class="ijg-wrap" id="photos-gallery"><h2>{H.escape(title)}</h2><p class="ijg-count">{len(sel)} photographs of Israel Joffe</p><div class="ijg">{"".join(figs)}</div></section>'
  return html,'<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False,separators=(",",":"))+'</script>'+CSS,sel
def inject(path,dom,n,title,page):
  s=open(path,encoding='utf-8',errors='surrogateescape').read()
  s=re.sub(r'<section class="ijg-wrap".*?</section>','',s,flags=re.S); s=re.sub(r'<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"ImageGallery".*?</script><style>\.ijg\{.*?</style>','',s,flags=re.S)
  g,head,sel=gallery(dom,n,title,page)
  i=s.rfind('</main>'); s=s[:i]+g+s[i:]; s=s.replace('</head>',head+'</head>',1)
  open(path,'w',encoding='utf-8',errors='surrogateescape').write(s); return len(sel)
def make_photos(root,dom):
  s=open(f'{root}/about/index.html',encoding='utf-8',errors='surrogateescape').read()
  can=f'https://{dom}/photos/'; T='Israel Joffe — Photos'
  s=re.sub(r'<title>.*?</title>',f'<title>{T}</title>',s,1,flags=re.S)
  s=re.sub(r'(<link rel="canonical" href=")[^"]*',r'\g<1>'+can,s); s=re.sub(r'(<meta property="og:url" content=")[^"]*',r'\g<1>'+can,s)
  s=re.sub(r'(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*',lambda m:m.group(1)+T,s)
  D='Photographs of Israel Joffe: public service, firefighting, Brazilian Jiu-Jitsu, WUW wrestling, travel and family.'
  s=re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*',lambda m:m.group(1)+D,s)
  s=re.sub(r'(<main[^>]*>).*?(</main>)',lambda m:m.group(1)+f'<header class="page-head"><h1 class="section-title">Israel Joffe — Photos</h1><p>{D}</p><p><a href="/about/">About Israel Joffe</a></p></header>'+m.group(2),s,1,flags=re.S)
  os.makedirs(f'{root}/photos',exist_ok=True); open(f'{root}/photos/index.html','w',encoding='utf-8',errors='surrogateescape').write(s)
  return inject(f'{root}/photos/index.html',dom,len(items),'Israel Joffe — photo gallery',can)
res={}
for root,dom in [('israeljoffe-com','israeljoffe.com'),('israeljoffe-org','israeljoffe.org')]:
  res[f'{dom}/about/']=inject(f'{root}/about/index.html',dom,120,'Israel Joffe — photographs',f'https://{dom}/about/')
  res[f'{dom}/photos/']=make_photos(root,dom)
  with open(f'{root}/about/index.html') as f: pass
for pg in ['israel-joffe','israel-joffe-links']:
  res[f'wuwonline.com/{pg}/']=inject(f'wuwonline-com/{pg}/index.html','wuwonline.com',120,'Israel Joffe — photographs',f'https://wuwonline.com/{pg}/')
# sitemaps
for root,dom in SITES.items():
  sm=open(f'{root}/sitemap.xml').read()
  sm=re.sub(r'<image:image><image:loc>https://[^<]*/img/g/[^<]*</image:loc>(?:<image:caption>[^<]*</image:caption>)?</image:image>','',sm)
  if root!='wuwonline-com' and f'https://{dom}/photos/<' not in sm:
    sm=sm.replace('</urlset>',f'  <url><loc>https://{dom}/photos/</loc><priority>0.8</priority></url>\n</urlset>')
  for pg,n in [(k.split('/',1)[1],v) for k,v in res.items() if k.startswith(dom)]:
    loc=f'https://{dom}/{pg}'; m=re.search(r'(<url>\s*<loc>'+re.escape(loc)+r'</loc>.*?)(</url>)',sm,re.S)
    if not m: continue
    ins=''.join(f'<image:image><image:loc>https://{dom}/img/g/{it["slug"]}.jpg</image:loc><image:caption>{H.escape(it["alt"])}</image:caption></image:image>' for it in items[:n] if f'/img/g/{it["slug"]}.jpg<' not in m.group(1))
    sm=sm[:m.start(2)]+ins+sm[m.start(2):]
  open(f'{root}/sitemap.xml','w').write(sm)
print(json.dumps(res,indent=1))
