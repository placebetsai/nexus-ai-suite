// Run:  node workers/fashionistas-api/listing-titles.test.mjs
//
// "u cant post your feeds … and they look like shit, the listings arent
// clear". Two of the three things that make a listing look machine-made are
// produced right here in the Worker, and both are pure functions, so both are
// provable without a Cloudflare account:
//
//   sanitizeIdent() — what a vision model is allowed to say about an item.
//     Measured on prod (2026-10-11), the sample jacket came back with
//     condition "Unknown", sizeHint "not visible" and brand "Unknown", and
//     every one of those was stored verbatim. Listing 143 shipped with its
//     size reading "not visible" to buyers.
//
//   cleanTitle() — what the AI title optimizer is allowed to write. The old
//     prompt said only "maximum resale visibility", which is an instruction to
//     stuff, and live listing 148 came back as "Blue Versace Polo Shirt -
//     Good Condition, Tops, Mens Tops, Tops for Men": the same noun three
//     times over for shops that already tokenize the whole title.
//
// The same technique as workers/createstuff-api/versions.test.mjs — pull the
// functions out of the Worker's own source text and run them, so what is
// asserted is the code that deploys rather than a copy of it. Nothing here
// touches the network or a database.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveCategory } from './src/categories.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'src/index.js'), 'utf8');

// Everything from the start of sanitizeIdent's constants to the end of
// cleanTitle, evaluated with the one module-scope value it does not define.
const start = src.indexOf('const CONDITION_GRADES');
const end = src.indexOf('const ALLOWED_ORIGINS');
assert.ok(start > 0 && end > start, 'could not locate sanitizeIdent/cleanTitle in src/index.js');
const { sanitizeIdent, cleanTitle } = new Function(
  'canonCategory',
  `${src.slice(start, end)}; return { sanitizeIdent, cleanTitle };`
)(resolveCategory);

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ───────────────────────── sanitizeIdent ───────────────────────── */

test('the exact junk prod measured is stripped, not stored', () => {
  // Verbatim from POST /api/ai/analyze on 2026-10-11.
  const out = sanitizeIdent({
    type: 'denim jacket', brand: 'Unknown', color: 'Blue',
    condition: 'Unknown', category: 'Outerwear',
    priceMin: '$5-10', priceMax: null, confidence: 72, sizeHint: 'not visible',
  });
  assert.equal(out.condition, undefined, 'condition "Unknown" must not ship');
  assert.equal(out.sizeHint, undefined, 'sizeHint "not visible" must not ship');
  assert.equal(out.brand, undefined, 'brand "Unknown" must not ship');
  assert.equal(out.priceMin, undefined, '"$5-10" is not a number');
  assert.equal(out.color, 'Blue');
  assert.equal(out.type, 'denim jacket');
  // A flat legacy word has to land in a real department, or the item is
  // outside every department a buyer can browse.
  assert.equal(out.category, 'Women/Coats & Jackets');
  assert.equal(out.confidence, 72);
});

test('a good read passes through untouched', () => {
  const good = {
    type: 'denim jacket', brand: "Levi's", color: 'Blue',
    condition: 'Excellent', category: "Women's Clothing/Outerwear",
    priceMin: 40, priceMax: 90, confidence: 94, sizeHint: 'M',
  };
  const out = sanitizeIdent({ ...good });
  assert.deepEqual(out, {
    ...good, category: 'Women/Coats & Jackets',
  });
});

test('condition is only ever one of the four grades the form offers', () => {
  for (const junk of ['Unknown', 'unknown', 'N/A', 'good', 'GOOD', 'like new', 'Fair', 'mint']) {
    const out = sanitizeIdent({ condition: junk, type: 'x' });
    if (['Good', 'Fair', 'Poor', 'Excellent'].includes(junk)) {
      assert.equal(out.condition, junk, junk);
    } else if (junk === 'good' || junk === 'GOOD') {
      assert.equal(out.condition, 'Good', 'grade is matched case-insensitively');
    } else {
      assert.equal(out.condition, undefined, `${junk} must be dropped`);
    }
  }
});

test('junk in every free-text field is dropped', () => {
  for (const junk of ['unknown', 'n/a', 'N/A', 'not visible', 'none', 'null', 'unclear', 'no brand', 'Generic']) {
    const out = sanitizeIdent({ brand: junk, sizeHint: junk, color: junk, type: 'jacket' });
    assert.equal(out.brand, undefined, `brand ${junk}`);
    assert.equal(out.sizeHint, undefined, `sizeHint ${junk}`);
    assert.equal(out.color, undefined, `color ${junk}`);
  }
});

test('an unrecognised category is dropped rather than invented', () => {
  // Not a place in the table -> no department. Filing it somewhere nearby
  // would put a buyer in the wrong aisle, which is worse than "All".
  assert.equal(sanitizeIdent({ category: 'nonsense', type: 'x' }).category, undefined);
  assert.equal(sanitizeIdent({ category: '', type: 'x' }).category, undefined);
  assert.equal(sanitizeIdent({ category: null, type: 'x' }).category, undefined);
  // …and the old flat words still land somewhere real.
  for (const flat of ['Tops', 'Shoes', 'Dresses', 'outerwear']) {
    assert.ok(sanitizeIdent({ category: flat, type: 'x' }).category, flat);
  }
});

test('a non-object from a broken model pass is not crashed on', () => {
  for (const bad of [null, undefined, 'text', 42, []]) {
    assert.equal(sanitizeIdent(bad), bad);
  }
});

test('confidence is clamped, and a missing one is null rather than NaN', () => {
  assert.equal(sanitizeIdent({ confidence: 250, type: 'x' }).confidence, 100);
  assert.equal(sanitizeIdent({ confidence: -5, type: 'x' }).confidence, 0);
  assert.equal(sanitizeIdent({ confidence: 'lots', type: 'x' }).confidence, null);
  assert.equal(sanitizeIdent({ type: 'x' }).confidence, null);
});

test('price bounds that are not numbers are dropped', () => {
  for (const v of [0, -1, 1e9, 'free', null, undefined, NaN]) {
    assert.equal(sanitizeIdent({ priceMin: v, priceMax: v, type: 'x' }).priceMin, undefined, String(v));
    assert.equal(sanitizeIdent({ priceMin: v, priceMax: v, type: 'x' }).priceMax, undefined, String(v));
  }
});

test('type always has a value — the listing has to say what it is', () => {
  assert.equal(sanitizeIdent({ type: '' }).type, 'Clothing item');
  assert.equal(sanitizeIdent({}).type, 'Clothing item');
  assert.equal(sanitizeIdent({ type: '  x  ' }).type, 'x');
  assert.equal(sanitizeIdent({ type: 'y'.repeat(500) }).type.length, 80);
});

/* ───────────────────────── cleanTitle ───────────────────────── */

test('the title that actually shipped on listing 148 comes back clean', () => {
  const junk = 'Blue Versace Polo Shirt - Good Condition, Tops, Mens Tops, Tops for Men';
  const out = cleanTitle(junk, 'Blue Versace Polo Shirt', 'Versace');
  assert.equal(out, 'Blue Versace Polo Shirt');
  assert.ok(out.length <= 70);
  assert.ok(out.includes('Versace'), 'brand must survive');
  assert.doesNotMatch(out, /Condition/, 'a grade is not a title');
  assert.doesNotMatch(out, /\bTops\b.*\bTops\b/, 'no repeated noun');
});

test('a repeat cuts the title there — it marks where the stuffing starts', () => {
  assert.equal(
    cleanTitle("Vintage Levi's 501 Jeans - Blue Denim - Blue - Mens Jeans - Jeans", "Vintage Levi's 501 Jeans", "Levi's"),
    "Vintage Levi's 501 Jeans Blue Denim"
  );
  assert.equal(cleanTitle('Floral Dress | Dress | Summer Dress | Womens Dress', 'Floral Summer Dress', ''), 'Floral Summer Dress');
});

test('filler words are dropped, they carry no search weight', () => {
  const out = cleanTitle('Nike Air Max 90 mens sneakers shoes white size 10 running shoes', 'Nike Air Max 90', 'Nike');
  assert.equal(out, 'Nike Air Max 90 Mens Sneakers Shoes White Size 10 Running');
  assert.doesNotMatch(out, /\bfor\b|\bwith\b|\bthe\b/);
});

test('a model that returns nothing, or a stub, keeps the seller\'s title', () => {
  for (const junk of ['', '   ', undefined, null, 'Dress', 'nice']) {
    assert.equal(cleanTitle(junk, 'Vintage Floral Silk Wrap Dress Midi', ''), 'Vintage Floral Silk Wrap Dress Midi', JSON.stringify(junk));
  }
  assert.equal(cleanTitle('Silk Wrap Dress', 'Silk Wrap Dress', ''), 'Silk Wrap Dress');
});

test('a brandless title is still repaired — the floor is 3 words, not "longer"', () => {
  // The first version of the floor was "not shorter than the original", which
  // rejected every real improvement: de-stuffing shortens a title by
  // construction, so the live test answered with the junk verbatim.
  const out = cleanTitle('versace blue polo shirt m', 'Blue Versace Polo Shirt', 'Versace');
  assert.equal(out, 'Versace Blue Polo Shirt M');
});

test('the brand is restored in its own spelling, and never lost', () => {
  // Lowercase-styled brands are written that way on purpose.
  assert.match(cleanTitle('hummel classic bee goose jacket', 'hummel jacket', 'hummel'), /^hummel /);
  // And if the model drops it, it is prepended rather than the rewrite being
  // thrown away — the earlier version returned the seller's junk for this.
  const dropped = cleanTitle('Blue Polo Shirt Size M', 'Blue Versace Polo Shirt', 'Versace');
  assert.match(dropped, /Versace/);
  assert.doesNotMatch(dropped, /Condition|Tops.*Tops/);
});

test('title case, without touching a brand that styles itself', () => {
  assert.match(cleanTitle('wool coat', 'Vintage Wool Coat', ''), /^Vintage /);
  // already-cased and camelCased words are left exactly as written
  const mixed = cleanTitle('hummel Classic Bee Goose jacket adidas T-shirt', 'hummel jacket', 'hummel');
  assert.match(mixed, /Classic/);
  assert.match(mixed, /hummel/, 'the brand keeps its own casing');
});

test('everything fits the tightest shop that posts, at a word edge', () => {
  const long = 'Ralph Lauren Purple Label Cashmere Half Zip Sweater Mens Large Navy Blue New With Tags';
  const out = cleanTitle(long, 'x', 'Ralph Lauren');
  assert.ok(out.length <= 70, `too long: ${out.length}`);
  assert.doesNotMatch(out, /\s$/, 'cut must not leave a trailing space');
  assert.match(out, /Ralph Lauren/);
  assert.equal(out, 'Ralph Lauren Purple Label Cashmere Half Zip Sweater Mens Large Navy',
    'cut lands on a whole word, not mid-word');
  // The cap is a hard rule, so a phrase past 70 characters is what gets cut —
  // asserted separately from phrase survival, which only holds when it fits.
  const short = cleanTitle('Levi\'s 501 Jeans New With Tags', 'levis 501', "Levi's");
  assert.match(short, /New With Tags/);
});

test('"New With Tags" is never shredded into "New Tags" by the filler pass', () => {
  // The difference is worth money: "New Tags" says the garment is tagged,
  // "New With Tags" says it has never been worn.
  const nwt = cleanTitle('Nike Air Force 1 New With Tags White', 'nike af1', 'Nike');
  assert.match(nwt, /New With Tags/);
  assert.doesNotMatch(nwt, /New Tags/);
});

test('NWT abbreviations expand, so a shopper searching "new with tags" finds them', () => {
  assert.match(cleanTitle('Jordan 4 Retro NWT Bred Mens 10', 'jordan 4', 'Jordan'), /New With Tags/);
});

test('a genuine downgrade is refused', () => {
  // "New" is a brand half the time (New Balance) so it is not a cut point,
  // and a two-word answer cannot beat a five-word title the seller wrote.
  const out = cleanTitle('Coat', 'Vintage Wool Coat Mens Medium Navy', '');
  assert.equal(out, 'Vintage Wool Coat Mens Medium Navy');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}`);
    console.log(`     ${e.message.split('\n').join('\n     ')}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
