# Fashionistas asset index

Brand direction: editorial fashion resale. Warm neutrals with one accent.

| token | value |
| --- | --- |
| ivory | `#FFFCF7` |
| paper | `#F7F2EA` |
| ink | `#1E1A18` |
| stone | `#DED5CA` |
| taupe | `#8B8179` |
| terracotta (accent) | `#C84B31` |

## Identity

- `fashionistas-wordmark.svg` — primary horizontal lockup: slab `F` monogram, hairline rule, serif wordmark, letterspaced tagline. The wordmark is **outlined paths**, so it renders identically without the font installed.
- `fashionistas-wordmark-animated.svg` — same lockup plus a drawing accent rule and a slow tagline pulse (SMIL). With animation disabled it is a complete static lockup.
- `fashionistas-monogram.svg` — standalone `F` mark, drawn to stay legible at 32 px. Favicons, avatars, tile.
- `fashionistas-monogram-animated.svg` — same mark, thread curl draws on a 3.2 s loop.

## Backgrounds (1600 x 900, full-bleed hero)

- `fashionistas-bg-aurora.svg` — warm mesh gradient (terracotta / honey / taupe on ivory).
- `fashionistas-bg-aurora-animated.svg` — same composition with a slow 24–30 s drift.
- `fashionistas-bg-ribbon.svg` — flowing ribbon bands with a dashed stitch line.
- `fashionistas-bg-grid.svg` — dot field, hairline column rules, soft wash.

## Icons

- `fashionistas-icons.svg` — sprite of 12 icons at 24 px, 1.6 px stroke, `currentColor`:
  `fi-tag`, `fi-camera`, `fi-hanger`, `fi-price`, `fi-truck`, `fi-chart`, `fi-store`,
  `fi-shirt`, `fi-ruler`, `fi-search`, `fi-bookmark`, `fi-sliders`.

```html
<svg class="icon" width="24" height="24"><use href="/assets/fashionistas-icons.svg#fi-tag"/></svg>
```

Symbols may also be inlined directly into a page when external `<use>` is not an option.

## Pre-existing assets (kept)

- `fashionistas-og-card.svg` — 1200 x 630 share card. Most social crawlers only rasterise PNG/JPEG, so convert this SVG to PNG before using it as `og:image`.
- `fashionistas-app-icon-512.svg` — 512 x 512 app icon.
- `listing-placeholder-dress.svg`, `listing-placeholder-jacket.svg`, `listing-placeholder-shirt.svg` — 800 x 1000 garment placeholders.

## Conventions

- Primary shapes use `currentColor`; the root `<svg>` carries a default `color`, so the asset looks right as an `<img>` and can be recoloured in place with `color: …`.
- Accent colour is an explicit hex on `.accent` elements, overridable with CSS.
- Every file is listed in `manifest.json`.
