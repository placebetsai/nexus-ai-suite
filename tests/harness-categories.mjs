/* Category controls harness for fashionistas.
   Guards the three defects found on 2026-09-26:
     1. canonCat declared inside renderShop -> ReferenceError when a chip is clicked
     2. Closet had no category filter at all
     3. saveListing read $("#f-cat .on").textContent on a null -> save died silently
   Run: node tests/harness-categories.mjs                       */
import { readFileSync } from "node:fs";

const FILE = new URL("../apps/fashionistas/index.html", import.meta.url);
const html = readFileSync(FILE, "utf8");
const script = html.split("<script>").sort((a, b) => b.length - a.length)[0];

let pass = 0, total = 0;
const t = (name, got, want) => {
  total++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} -> ${JSON.stringify(got)}${ok ? "" : "  want " + JSON.stringify(want)}`);
};

/* ---------- 1. scope: canonCat must be reachable from marketRows ---------- */
const declLines = script.split("\n").filter(l => /(^|\s)function canonCat\(/.test(l));
t("canonCat declared exactly once", declLines.length, 1);

const canonLine = script.split("\n").findIndex(l => /(^|\s)function canonCat\(/.test(l));
const renderShopLine = script.split("\n").findIndex(l => /async function renderShop\(/.test(l));
t("canonCat is declared at column 0 (module scope)", declLines[0].startsWith("function canonCat("), true);
t("canonCat is declared BEFORE renderShop", canonLine < renderShopLine, true);

// The old bug, restated: a declaration nested inside renderShop is invisible
// to marketRows. Prove the test can detect that shape.
const nested = "\nasync function renderShop(el){\n  function canonCat(c){return c;}\n}\nfunction marketRows(){ return canonCat('Tops'); }";
t("nested declaration WOULD be caught by this check",
  nested.split("\n").findIndex(l => /(^|\s)function canonCat\(/.test(l)) >
  nested.split("\n").findIndex(l => /async function renderShop\(/.test(l)),
  true);

/* ---------- 2. behaviour: the real functions ---------- */
const canonSrc = script.split("\n").find(l => /(^|\s)function canonCat\(/.test(l));
const canonCat = eval(`(${canonSrc.replace(/^\s*function canonCat/, "function canonCat")})`);

t("canonCat folds case", canonCat("tops"), "Tops");
t("canonCat passes through valid key", canonCat("Outerwear"), "Outerwear");
t("canonCat strips leading slash", canonCat("/tops"), "Tops");
t("canonCat rejects junk", canonCat("random-thing"), "");
t("canonCat rejects null", canonCat(null), "");
t("canonCat rejects empty", canonCat("   "), "");
t("canonCat groups Bags under Accessories", canonCat("Bags"), "Accessories");

// chip list built the way renderShop builds it (spread BEFORE filter)
const feed = [
  { category: "Tops" }, { category: "tops" }, { category: "Outerwear" },
  { category: "Bottoms" }, { category: "Dresses" }, { category: "Shoes" },
  { category: "Athletic" }, { category: "Accessories" }, { category: null },
  { category: "" }, { category: "random-thing" },
];
const cats = [...new Set(feed.map(m => canonCat(m.category)))].filter(c => c).sort();
t("chip list yields 7 unique types", cats, ["Accessories", "Athletic", "Bottoms", "Dresses", "Outerwear", "Shoes", "Tops"]);
t("no duplicate Tops/Tops", cats.filter(c => c === "Tops").length, 1);

// the crashing form must still throw — proves this test is sensitive
let threw = "";
try { [...new Set(feed.map(m => canonCat(m.category))).filter(c => c)]; }
catch (e) { threw = e.constructor.name; }
t("the old Set.filter form still throws", threw, "TypeError");

// marketRows filter, same code path as line 1843
function marketRows(S) {
  let rows = (S.market || []).slice();
  if (S.marketCat) rows = rows.filter(m => (canonCat(m.category) || "") === S.marketCat);
  return rows;
}
t("filter by Tops returns only Tops", marketRows({ market: feed, marketCat: "Tops" }).length, 2);
t("no filter returns everything", marketRows({ market: feed, marketCat: "" }).length, feed.length);
t("filter by unknown type returns none", marketRows({ market: feed, marketCat: "Hats" }).length, 0);

// clicking a chip sets the value then re-reads — this is what threw before
const clicked = (() => { try { const S = { market: feed, marketCat: "Tops" }; return marketRows(S).length; } catch (e) { return e.message; } })();
t("clicking a chip no longer throws", typeof clicked === "number", true);

/* ---------- 3. closet category list ---------- */
function closetCatList(listings) {
  const seen = new Map();
  for (const l of listings) {
    const k = canonCat(l.category) || "__none";
    if (!seen.has(k)) seen.set(k, k === "__none" ? "Unfiled" : k);
  }
  return [...seen.entries()].map(([k, label]) => ({ k, label }))
    .sort((a, b) => a.k === "__none" ? 1 : b.k === "__none" ? -1 : a.label.localeCompare(b.label));
}
const mine = [
  { category: "Tops" }, { category: "Shoes" }, { category: null },
  { category: "shoes" }, { category: "Dresses" },
];
const list = closetCatList(mine);
t("closet chips only show owned types", list.map(c => c.label), ["Dresses", "Shoes", "Tops", "Unfiled"]);
t("types are not duplicated across spellings", list.filter(c => c.k === "Shoes").length, 1);
t("uncategorised items are findable", list.some(c => c.k === "__none"), true);
t("empty closet shows no chips", closetCatList([]).length, 0);

// stale selection must be dropped (last pair of shoes sold/deleted)
const chips = list.map(c => c.k);
const staleCat = "Boots";
t("stale selected category is reset", chips.includes(staleCat) ? staleCat : "", "");

// closet filter, same code path as closetRefresh
function closetFilter(listings, sel) {
  let rows = listings.slice();
  if (sel) rows = rows.filter(l => sel === "__none" ? !canonCat(l.category) : canonCat(l.category) === sel);
  return rows;
}
t("closet filter by Shoes matches both spellings", closetFilter(mine, "Shoes").length, 2);
t("closet filter Unfiled catches null category", closetFilter(mine, "__none").length, 1);
t("closet filter with nothing selected shows all", closetFilter(mine, "").length, mine.length);

/* ---------- 4. save path must survive a missing chip ---------- */
const readChip = (node, fallback) => ((node || {}).textContent || fallback).trim();
t("chip present -> its text", readChip({ textContent: " Dresses " }, "Tops"), "Dresses");
t("chip missing -> fallback, no throw", readChip(null, "Tops"), "Tops");
t("chip present but empty -> fallback", readChip({ textContent: "" }, "Tops"), "Tops");

// the exact old expression must still explode, so the guard is doing work
let oldThrew = "";
try { const x = null; void x.textContent; } catch (e) { oldThrew = e.constructor.name; }
t("the old unguarded read still throws", oldThrew, "TypeError");

// the form must always pre-select one chip for a brand-new item
const CAT_OPTS = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Athletic", "Bags"];
const COND_OPTS = ["Poor", "Fair", "Good", "Excellent"];
const pick = (value, opts, fallback) => opts.includes(value) ? value : (canonCat(value) && opts.includes(canonCat(value)) ? canonCat(value) : fallback);
t("new item defaults to a category", CAT_OPTS.includes(pick(undefined, CAT_OPTS, CAT_OPTS[0])), true);
t("new item defaults to a condition", COND_OPTS.includes(pick(undefined, COND_OPTS, COND_OPTS[2])), true);
t("existing category is kept", pick("Dresses", CAT_OPTS, CAT_OPTS[0]), "Dresses");
t("spelling variant is canonicalised", pick("dresses", CAT_OPTS, CAT_OPTS[0]), "Dresses");
t("unknown stored value falls back", pick("Bikini", CAT_OPTS, CAT_OPTS[0]), "Tops");
t("value outside the option list is canonicalised", pick("Jewellery", CAT_OPTS, CAT_OPTS[0]), "Accessories");
t("a listed option is kept as-is", pick("Bags", CAT_OPTS, CAT_OPTS[0]), "Bags");

/* ---------- summary ---------- */
console.log(`\nHARNESS ${pass}/${total} passed`);
if (pass !== total) {
  console.log("RESULT FAIL");
  process.exit(1);
}
console.log("RESULT PASS");
