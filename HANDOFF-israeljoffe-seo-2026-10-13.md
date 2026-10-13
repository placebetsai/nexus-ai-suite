# Handoff — "Israel Joffe" SEO, 2026-10-13

Goal (Iz): his own sites and photos dominate the results for "Israel Joffe" on web and Google Images, and push the Yeung docket page down. Only legitimate SEO: no spam links, no fake reviews. Audit: `/workspace/audits/israeljoffe-seo-2026-10-13.md` (box). Deploys are wrangler only, never GitHub. Do not change the wuwonline.com homepage.

## Live pages (production, all 200 as of 15:10 ET)
- israeljoffe.com: new bio (PMP, PMI-CPMAI, DFC Senior Project Portfolio Manager, Five Towns, Lawrence-Cedarhurst FD during Sandy, FDIC/FDA, Fox 5/ABC/Fox News, 2nd-degree black belt under Matt Serra), About gallery, **/publications/** "Israel Joffe — Publications & Press".
- israeljoffe.org: distinct-angle bio (service, the mat, Johnny Rodz, the family's refugee and Holocaust-survivor story), gallery, **/writing/** "Israel Joffe — Writing & Essays".
- wuwonline.com: **/israel-joffe-links/** hub (149 links: sites, profiles, 87 articles, 18 Substack posts, 13 press pieces, 15 YouTube videos; plus gallery), **/israel-joffe/** bio + gallery, **/israel-joffe-articles/** "Israel Joffe — Wrestling & Media Articles". Homepage unchanged.
- All three sites: photos renamed/alt-tagged "Israel Joffe …", image sitemaps (~440 images), a shared Person `@id` https://israeljoffe.com/#person with sameAs, cross-links. Bing/IndexNow notified.

## Deploy and rollback IDs (Cloudflare Pages, production)
| Site | Current | Rollback to |
|---|---|---|
| israeljoffe-com | `f4850f9b` (2735593) | `24265f1b` (119c218) |
| israeljoffe-org | `86df5bff` (2735593) | `2fdc5f04` (119c218) |
| wuwonline-com | `fe432704` (4c5efbe, latest of several same-commit deploys today: f792b831, 9f872543, 5e9ab160, d94ce346, f10a1195, 6669cd9c) | pre-today `239a1a4d` (8a975d5); last good today `f792b831` |

## Scripts
- `scripts/gallery.py` (this repo): scans the three site trees (israeljoffe-com, israeljoffe-org, wuwonline-com), maps each image to its post title and date, writes alt text "Israel Joffe — …", builds the galleries and the image-sitemap entries. It skips og-/favicon/logo/icon/hero files. `scripts/ij-gallery.py` is the earlier variant.
- `scripts/pubs.py` (this repo): builds the publications page on each site from `ijlinks_data.HUB` (com /publications, org /writing, wuwonline /israel-joffe-articles). Run it from the parent folder that holds the site trees.
- `~/Documents/Default Project/wuwonline-com/ijlinks_data.py`: the link data (`HUB` groups: Sites, Profiles, Articles, Substack, Press & Interviews, YouTube). Edit links here. A copy is in ~/seo-preview/wuwonline-com.
- `~/Documents/Default Project/wuwonline-com/build.py`: the WUW site builder. It regenerates every page, BUILD_STAMP and AdSense slots. It must leave the homepage byte-identical. Diff `index.html` against production before every deploy. The links hub and bio pages are generated here.

## USER-ONLY (Iz)
1. **Search Console:** the browser's Google account (purple "P") has no properties. Sign in with the account that owns israeljoffe.com, israeljoffe.org, wuwonline.com and mondaynightwrestling.com, then submit each sitemap.xml and request indexing for the home, /about, /israel-joffe/ and /israel-joffe-links/ pages.
2. **Google Knowledge Panel:** search "Israel Joffe" while signed in, choose "Claim this knowledge panel", and verify through Search Console, YouTube or X.
3. **Substack pinned post:** the draft is at `/workspace/audits/israeljoffe-substack-pinned-post-draft.md` (box). Paste it into israeljoffe.substack.com and pin it.
4. **mondaynightwrestling.com** runs on Substack, not our code. Its Israel Joffe page has to be created in the Substack dashboard (About/page + links to israeljoffe.com).
5. **Captions for the 176 generic photos:** they only have a generic "Israel Joffe" alt. Give a one-line context (event, place, year) per photo, or per folder, and we'll rebuild.
6. **DocumentCloud links:** DocumentCloud blocks automated checks, so send the document URLs to add them to the hub.
7. Optional: remove the personal YouTube clips (baby Kurt, Roxy) from the hub; just say so. If the docket page exposes private data, use Google's "Results about you" form.
