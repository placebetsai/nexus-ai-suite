# Handoff — Israel Joffe 2020 photo articles, 2026-10-14

Goal (Iz): his own sites get Google Images credit for the Facebook-post screenshot (1358x1530, same bytes as mondaynightwrestling.com/p/israel-joffe). HARD RULE: no Trump/hotel/MAGA/Washington/DC/politics anywhere. Label = "Israel Joffe" only. Homepages untouched (md5 verified unchanged).

- https://israeljoffe.com/israel-joffe-portrait/ (professional angle), image /img/israel-joffe-portrait-2020.jpg
- https://israeljoffe.org/israel-joffe-photo-2020/ (service/personal angle), image /img/israel-joffe-2020.jpg
- Each: title, meta desc, canonical, og:type article + og/twitter image = photo, Article + ImageObject (creator/copyrightHolder/author = https://israeljoffe.com/#person, dateCreated 2020-10-17) + BreadcrumbList, visible full-width image, neutral caption, cross-link to the other site.
- Linked from /about/, /photos/, and /publications/ (.com) or /writing/ (.org), as an `ij-feature-photo` block placed above the gallery. Sitemap entries with image:image added.
- Builder: `scripts/ij-photo-article.py` (idempotent). NOTE: if pubs.py/gallery.py regenerate these pages, re-run it afterwards.
- Deploys (wrangler, CF_* token): israeljoffe-com `2306ed80`, israeljoffe-org `7017a33d`. Rollback: com `f4850f9b`, org `86df5bff`. Pre-change copies: ~/agent-tools/bak-ij-{com,org}-20261014.
- IndexNow + Bing: 200 for both hosts.
- USER-ONLY: in Search Console, request indexing for both URLs, submit the sitemaps again. Optional: on Substack/mondaynightwrestling, link the photo to these pages and add alt text "Israel Joffe".
