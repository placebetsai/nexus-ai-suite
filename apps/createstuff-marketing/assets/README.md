# CreateStuff asset index

Brand direction: developer build workspace. Technical, confident, dark-first.

| token | value |
| --- | --- |
| ink | `#0B0B12` |
| surface | `#121119` |
| ivory | `#F4F2EE` |
| violet | `#7559D9` |
| azure | `#4CC2FF` |
| line | `#393442` |
| muted | `#8F899D` |

Gradient accent: `#7559D9` → `#4CC2FF`.

## Identity

- `createstuff-wordmark.svg` — primary horizontal lockup: open `C` monogram with a gradient
  cursor block, hairline rule, geometric sans wordmark, mono tagline. The wordmark is
  **outlined paths**, so it renders identically without the font installed.
- `createstuff-wordmark-animated.svg` — same lockup plus a blinking cursor, a drawing gradient
  rule and a slow tagline pulse (SMIL). With animation disabled it is a complete static lockup.
- `createstuff-monogram.svg` — standalone `C` + cursor mark, drawn to stay legible at 32 px.
- `createstuff-monogram-animated.svg` — same mark, cursor blinks on a 1.6 s loop.

## Backgrounds (1600 x 900, full-bleed hero)

- `createstuff-bg-mesh.svg` — dark mesh: violet and azure glows over a fine dot field.
- `createstuff-bg-mesh-animated.svg` — same composition with a slow 22–30 s drift.
- `createstuff-bg-dots.svg` — dot matrix, hairline grid, centre glow, trace fragments.
- `createstuff-bg-ribbon.svg` — flowing gradient data ribbons with glowing nodes.

## Icons

- `createstuff-icons.svg` — sprite of 12 icons at 24 px, 1.6 px stroke, `currentColor`:
  `cs-database`, `cs-key`, `cs-globe`, `cs-terminal`, `cs-layers`, `cs-branch`, `cs-box`,
  `cs-code`, `cs-link`, `cs-preview`, `cs-cpu`, `cs-sliders`.

```html
<svg class="icon" width="24" height="24"><use href="/assets/createstuff-icons.svg#cs-terminal"/></svg>
```

Symbols may also be inlined directly into a page when external `<use>` is not an option.

## Pre-existing assets (kept)

- `createstuff-og-card.svg` — 1200 x 630 share card. Most social crawlers only rasterise
  PNG/JPEG, so convert this SVG to PNG before using it as `og:image`.
- `createstuff-app-icon-512.svg` — 512 x 512 app icon.
- `build-workspace-illustration.svg` — 1200 x 800 prompt, source and preview workflow.
- `responsive-preview-illustration.svg` — 1200 x 800 desktop and phone viewport illustration.

## Conventions

- Primary shapes use `currentColor`; the root `<svg>` carries a default `color`, so the asset
  looks right as an `<img>` and can be recoloured in place with `color: …`.
- Gradient accents are explicit `url(#cs-accent)` fills, overridable with CSS.
- Every file is listed in `manifest.json`.
