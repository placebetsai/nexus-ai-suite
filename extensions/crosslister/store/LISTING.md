# Chrome Web Store submission — Fashionistas Crosslister

Upload: `apps/fashionistas/fashionistas-crosslister.zip` (built by `node extensions/crosslister/build.mjs`).

**Name:** Fashionistas Crosslister
**Category:** Shopping
**Language:** English

**Short description (≤132):**
Fill your Fashionistas listing into Depop, eBay, Poshmark, Mercari, Vinted and Grailed in one click. You press Post.

**Description:**
Sell the same piece on six shops without retyping it.

1. In Fashionistas, open an item, tick the shops you sell on and press "Fill it for me".
2. Each shop's sell page opens with your photo, title, description and price already typed in — written the way that shop likes it (eBay titles kept to 80 characters, and so on).
3. Check it, pick the shop's category and condition, and press that shop's own Post button.

• Works with Depop, eBay, Poshmark, Mercari, Vinted and Grailed.
• Never posts for you and never asks for your shop passwords.
• If you are logged out, log in and the listing fills itself in when the sell form opens.
• Anything it can't place (like a size picker) gets a one-tap Copy button.
• Stores nothing but the listing you queued, and only until you've posted it.

**Single purpose:** Fill a seller's own Fashionistas listing into the sell form of the resale shops they choose.

**Permission justifications:**
- storage, unlimitedStorage: keep the queued listing and its photo until the shop's sell form loads.
- tabs: open each chosen shop's sell page in a new tab.
- Host access to fashionistas.ai: receive the fill request from the user's Fashionistas page.
- Host access to depop.com, ebay.com, poshmark.com, mercari.com, vinted.com, grailed.com: find and fill the sell form; acts only when a listing is queued for that shop.
- Host access to fashionistas-api.fashionistas1979.workers.dev: download the listing photo to attach it.

**Remote code:** No. All code ships in the package.
**Data use:** Collects no user data. Nothing is sold or transferred.
**Privacy policy URL:** https://fashionistas.ai/crosslister-privacy

**Images:** icons/icon128.png · store/screenshot-1-fill-button.png · store/screenshot-2-filled-form.png (1280×800) · store/promo-440x280.png
