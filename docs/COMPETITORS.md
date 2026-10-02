# fashionistas.ai vs the field

Checked **2026-10-02** against each competitor's own live site and App Store
listing. Prices are the vendor's own public prices on that date. Anything I could
not read from a page is marked `unread` rather than guessed.

## Sources actually read

| competitor | what I fetched | status |
|---|---|---|
| DLOOK | `https://dlook.app` (170,479 B), iTunes lookup id `6745005234` | 200 |
| Whering | `https://www.whering.ai` (246,352 B), iTunes `1519461680` | 200 |
| Crosslist | `https://www.crosslist.com` (1,467,270 B) + `/pricing` | 200 |
| Vendoo | `https://vendoo.co` (139,428 B) + `/pricing` | 200 |
| List Perfectly | `https://listperfectly.com` (118,715 B) + `/pricing` | 200 |
| FLYP | `https://www.goflyp.com` + `/pricing` | 200 |
| Nifty | `https://nifty.com` | 200 (Japanese portal page; **pricing unread**, JS-rendered) |
| VeeLook | `https://www.veelook.com` | 200 (114 B — JS shell, no text) |
| Dresly | `https://www.dresly.com` | **403** |
| Acloset / Indyx | not fetched — see the note below | — |

### Corrections to the brief, from what the pages actually say

- **FLYP is not a $9/mo crosslisting extension.** `goflyp.com` sells a
  *reselling training + supplier network* system: "$97, billed annually" on its
  pricing page, markets itself as "REMOTE RESELLING PLATFORM", and mentions only
  Poshmark and eBay. There is no Chrome-extension crosslister at that price. The
  brief's "$9/mo" figure is not supported by the vendor's own page.
- **Vendoo starts at $14.99/mo**, not $14.99 for "from" — its pricing page lists
  $14.99 / $29.99 / $59.99 per month. It now brands itself "Crosslist with
  Vendoo Today!" and advertises **Sale detection and Auto Delist**.
- **Crosslist's marketing site never mentions Vinted.** `grep -c Vinted` over
  1.4 MB of homepage HTML returns **0**, while Poshmark appears 28×, eBay 32×,
  Facebook 41×. Crosslist's claim is "11+ marketplaces"; Vinted is not one of the
  named ones.
- **Dresly returned 403** to every request from this machine, so its feature set
  here is taken from the brief and is marked unverified.
- **Nifty and VeeLook are JS shells** — no server-rendered text to check, so
  their prices and feature lists are marked unread.

## Must-beat targets, restated from what I measured

| target | the claim I must beat | measured reality |
|---|---|---|
| Crosslist | 8+ marketplaces incl. Vinted, one universal form, import existing listings | Homepage names no Vinted; does advertise one universal form, AI background remover, AI pricing, import existing listings, delist & relist, autodelisting, sales analytics, iOS+Android apps |
| Vendoo | delisting that does **not** need the user's computer running | Vendoo sells "Sale detection and Auto Delist" and a mobile app, so it claims server-side delist; its historic weakness was that automation needed the user's PC. Beating it means delisting eBay/Etsy by API with a **queued** task for the rest, and showing it in the status board. |
| DLOOK | color analysis, full-outfit try-on, multiple previews + retry | dlook.app states all three: "Virtual Try On Any Outfit You Want", "Outfit Changer", "Color Analysis", "Manage Your Closet", bulk upload with AI category/color/style tagging, OOTD tracking. Free on iOS/Android, 10M+ installs claimed on Whering. |
| Whering/Indyx | cost-per-wear + wardrobe stats feeding "clear your closet" | Whering brands itself "The Social Wardrobe", 10M+ users, 67K App Store ratings. Stats-driven closet guidance is table stakes here. |

## Feature matrix

✓ = shipped and proven with a curl from the live URL · ✗ = not there · `n/a` = not a competitor feature

| # | feature | DLOOK | Whering | Crosslist | Vendoo | List Perfectly | FLYP | Nifty | **fashionistas.ai today** |
|---|---|---|---|---|---|---|---|---|---|
| **TRY-ON / WARDROBE** |
| 1 | Virtual try-on of a garment on your photo | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 2 | Full-outfit (top+bottom+outerwear) try-on | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 3 | Multiple previews per request | ✓ (claimed) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 4 | Retry a try-on | ✓ (claimed) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 5 | AI colour analysis from selfie | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 6 | Colour clash detection on closet items | ✓ (implied) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 7 | Digital closet, bulk upload | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | partial (listings only) |
| 8 | AI tags by category/colour/style | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 9 | Saved, editable looks ("My Looks") | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 10 | OOTD tracking / wear logging | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 11 | Cost-per-wear | ✗ | ✓ (claimed) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 12 | Wardrobe stats | ✗ | ✓ | ✓ (analytics) | ✓ | ✗ | ✗ | ✓ | ✗ |
| 13 | Outfit planner by day | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 14 | Share link + OG image for a look | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 15 | On-body "model photo" for a listing | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **CROSSLISTING** |
| 16 | One universal listing form | ✗ | ✗ | ✓ | ✓ | ✓ (per-shop) | ✗ | ✗ | partial |
| 17 | 8+ marketplaces | ✗ | ✗ | ✓ (11+, **no Vinted**) | ✓ | ✓ | 2 named | unread | ✗ |
| 18 | Vinted specifically | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 19 | One-click publish | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| 20 | AI title per shop, length-fitted | ✗ | ✗ | ✓ | ✗ | ✓ (custom titles) | ✗ | ✓ | ✗ |
| 21 | AI description per shop | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 22 | Category mapped per shop taxonomy | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 23 | Per-shop fee-adjusted pricing | ✗ | ✗ | ✗ | ✓ (fee calc) | ✗ | ✗ | ✗ | ✓ (fees/estimate) |
| 24 | Net take-home shown | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ (fees/estimate) |
| 25 | Photo background removal | ✗ | ✗ | ✓ | ✓ (PhotoRoom) | ✗ | ✗ | ✗ | ✗ |
| 26 | Photos resized to shop specs | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 27 | Import existing eBay listings | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 28 | Import existing Poshmark/Mercari | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 29 | Chrome extension autofill, stop before Submit | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ (MV3, mocked-DOM tested) |
| 30 | Sold → auto-delist, **no computer needed** | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| 31 | Per-item status board | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 32 | Mobile guided flow (no extension) | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **GUIDANCE** |
| 33 | Onboarding: which shops to join | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 34 | "connected ✓" per shop | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 35 | Per-shop walkthrough with screenshots | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 36 | Photo coach (light/background/angle) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 37 | Pricing coach (when to drop, how much) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 38 | Shipping guide + weight→cost | ✗ | ✗ | ✗ | ✓ (calc) | ✗ | ✗ | ✗ | ✗ |
| 39 | First-run closet sort SELL/DONATE/KEEP | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **MONEY / APP** |
| 40 | Free tier | ✓ free app | ✓ free app | trial | trial | paid | $97/yr | unread | ✓ (unlimited) |
| 41 | Paid tier | n/a | n/a | $29.99/mo | $14.99/mo | $29/mo | $97/yr | unread | ✗ |
| 42 | Customer portal (self-cancel) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 43 | iOS app | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | unread | ✗ |
| 44 | Android app | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | unread | ✗ |
| 45 | Virtual try-on bundled with crosslisting | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Rows 2+ competitors have that I do not — REQUIRED additions

These become build requirements because at least two of the field have them and
fashionistas.ai does not:

| row | required by | becomes |
|---|---|---|
| 2 full-outfit try-on | DLOOK + brief's VeeLook | Phase 3 §3 |
| 3 multiple previews | DLOOK + Dresly | Phase 3 §2 |
| 4 retry | DLOOK + Dresly | Phase 3 §2 |
| 5 colour analysis | DLOOK + brief | Phase 3 §4 |
| 6 clash detection | DLOOK + brief | Phase 3 §4 |
| 9 saved editable looks | DLOOK + Whering | Phase 3 §6 |
| 10 wear logging / OOTD | DLOOK + Whering | Phase 1 §3 |
| 11 cost-per-wear | Whering + brief | Phase 1 §3 |
| 12 wardrobe stats | Whering + Crosslist + Vendoo + Nifty | Phase 1 §3 |
| 13 outfit planner by day | DLOOK + Whering | Phase 4 |
| 14 share link + OG | Whering + brief | Phase 3 §6 |
| 18 Vinted | brief's must-beat (Crosslist lacks it) | Phase 2 §2 |
| 25 background removal | Crosslist + Vendoo | Phase 1 §2 |
| 26 per-shop photo resize | brief only (1 competitor at most) | Phase 2 §1 |
| 27 import eBay listings | Crosslist + Vendoo + List Perfectly | Phase 1 §5 |
| 28 import Poshmark/Mercari | Crosslist + Vendoo + List Perfectly | Phase 1 §5 |
| 30 server-side auto-delist | Crosslist + Vendoo + Nifty | Phase 2 §3 |
| 31 per-item status board | Crosslist + Vendoo | Phase 2 §4 |
| 32 mobile guided flow | Vendoo + brief | Phase 2 §2 |
| 33 onboarding which shops | Crosslist + Vendoo | Phase 2 §3 |
| 34 connected ✓ per shop | DLOOK + Crosslist + Vendoo | Phase 2 §3 |
| 35 per-shop walkthrough | brief (Vendoo has Help Center) | Phase 2 §3 |
| 38 shipping guide + weight→cost | Vendoo + brief | Phase 2 §3 |
| 39 closet sort SELL/DONATE/KEEP | brief only | Phase 1 §4 |
| 42 customer portal | brief + Stripe standard | Phase 5 |

Rows with a single source (20 AI title, 21 AI description, 22 category map, 36
photo coach, 37 pricing coach) are still built — the brief asks for them — but
they are not competitive differentiators.

## The one thing nobody has

Row 45. DLOOK does try-on and nothing else. Crosslist, Vendoo, List Perfectly and
Nifty do crosslisting and nothing else. FLYP does neither (training + supply).
**No competitor in this set sells closet clearing, crosslisting to eight shops,
and virtual try-on as one product.** That is the wedge, and every phase below has
to land for it to be true.
