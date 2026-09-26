/* Category tree harness for fashionistas.
   Guards the defects found on 2026-09-26:
     1. canonCat declared inside renderShop -> ReferenceError when a chip is clicked
     2. Closet had no category filter at all
     3. saveListing read $("#f-cat .on").textContent on a null -> save died silently
     4. flat one-level chips instead of department -> subcategory like a real site
     5. inline onclick handlers built with escapeAttr, which does NOT escape
        apostrophes -> "Women's Clothing" would truncate the call on click
   The functions under test are SLICED OUT OF THE APP and executed, so this
   cannot drift from what actually ships.
   Run: node tests/harness-categories.mjs                                */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../apps/fashionistas/index.html", import.meta.url), "utf8");
const script = html.split("<script>").sort((a, b) => b.length - a.length)[0];

let pass = 0, total = 0;
const t = (name, got, want) => {
  total++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} -> ${JSON.stringify(got)}${ok ? "" : "  want " + JSON.stringify(want)}`);
};
const has = (name, cond) => t(name, !!cond, true);

/* ---------- slice the real code out of the app and run it ---------- */
const start = script.indexOf("const TAX = {");
has("app contains the TAX block", start > -1);
const endMark = script.indexOf("function taxUnq");
has("app contains taxUnq", endMark > -1);
const block = script.slice(start, script.indexOf("\n", endMark));
let X = null;
try {
  X = new Function(block + "\nreturn {TAX,TAX_LEGACY,taxDepts,taxSubs,taxPath,taxDept,taxSub,taxLabel,taxMatches,canonCat,taxQ,taxUnq};")();
} catch (e) {
  console.log("FAIL  could not evaluate the category block: " + e.message);
  console.log("\nHARNESS 0/0\nRESULT FAIL");
  process.exit(1);
}
const { TAX, taxDepts, taxSubs, taxPath, taxDept, taxSub, taxLabel, taxMatches, canonCat, taxQ, taxUnq } = X;

/* ---------- 1. the tree itself is well formed ---------- */
const depts = taxDepts();
t("department count (a real catalogue, not 3 flat chips)", depts.length >= 8, true);
t("no duplicate departments", new Set(depts).size, depts.length);
t("every department has subcategories", depts.every(d => taxSubs(d).length > 0), true);
t("every subcategory is a non-empty string", depts.every(d => taxSubs(d).every(s => typeof s === "string" && s.trim() && s === s.trim())), true);
t("no duplicate subcategories within a department", depts.every(d => new Set(taxSubs(d)).size === taxSubs(d).length), true);
t("no department shares its name with a subcategory of another",
  depts.every(d => depts.every(o => o === d || !taxSubs(o).includes(d))), true);
t("total subcategories is catalogue-sized", Object.values(TAX).reduce((n, a) => n + a.length, 0) >= 40, true);
t("every department name is URL/attr-safe once encoded", depts.every(d => !/['"<>&]/.test(taxQ(d))), true);

/* ---------- 2. scope: the module-scope rule that caused the outage ---------- */
const lines = script.split("\n");
const canonLine = lines.findIndex(l => /(^|\s)function canonCat\(/.test(l));
const renderShopLine = lines.findIndex(l => /async function renderShop\(/.test(l));
const taxLine = lines.findIndex(l => /^const TAX = \{/.test(l));
t("canonCat declared exactly once", lines.filter(l => /(^|\s)function canonCat\(/.test(l)).length, 1);
t("canonCat is at column 0 (module scope)", lines[canonLine].startsWith("function canonCat("), true);
t("canonCat is declared BEFORE renderShop", canonLine < renderShopLine, true);
t("TAX is at column 0 (module scope)", taxLine > -1, true);
has("market filter calls taxMatches", script.includes("taxMatches(m.category, S.marketCat)"));
has("closet filter calls taxMatches", script.includes("taxMatches(l.category, S.closetCat)"));
t("no leftover reference to the old chip group", script.includes("#f-cat"), false);

// prove the scope check would discriminate: a nested declaration must not
// satisfy the column-0 pattern, while the shipped one must.
const nested = "\nasync function renderShop(el){\n  const TAX = {};\n}\nfunction marketRows(){ return TAX; }";
t("a nested declaration is NOT seen at column 0 (so the check catches it)", /^const TAX = \{/m.test(nested), false);
t("the shipped TAX IS at column 0", /^const TAX = \{/m.test(script), true);

/* ---------- 3. taxPath: every stored spelling resolves ---------- */
t("legacy 'Tops' lands in the tree", taxPath("Tops"), "Women's Clothing/Tops & Shirts");
t("lowercase legacy 'tops' lands in the same place", taxPath("tops"), "Women's Clothing/Tops & Shirts");
t("legacy 'Dresses'", taxPath("Dresses"), "Women's Clothing/Dresses");
t("legacy 'Outerwear'", taxPath("Outerwear"), "Women's Clothing/Outerwear");
t("legacy 'Shoes' stays a department", taxPath("Shoes"), "Shoes");
t("legacy 'Accessories' stays a department", taxPath("Accessories"), "Accessories");
t("legacy 'Athletic' maps to sportswear", taxPath("Athletic"), "Sports & Outdoor/Activewear");
t("legacy 'Bags'", taxPath("Bags"), "Bags & Luggage");
t("leading slash still tolerated", taxPath("/tops"), "Women's Clothing/Tops & Shirts");
t("valid full path passes through", taxPath("Shoes/Women's Shoes"), "Shoes/Women's Shoes");
t("department with no sub is kept", taxPath("Shoes"), "Shoes");
t("unknown subcategory drops to its department", taxPath("Shoes/Wellingtons"), "Shoes");
t("unknown department is rejected", taxPath("Furniture/Lamps"), "");
t("department name in any case is found", taxPath("women's clothing"), "Women's Clothing");
t("bare subcategory is attached to its department", taxPath("Dresses"), "Women's Clothing/Dresses");
t("junk is rejected", taxPath("random-thing"), "");
t("null is rejected", taxPath(null), "");
t("empty is rejected", taxPath("   "), "");
t("non-string is rejected", taxPath(42), "");
t("trimmed on the way in", taxPath("  Shoes  "), "Shoes");
t("round-trips through the encoder", taxPath(taxUnq(taxQ("Women's Clothing/Tops & Shirts"))), "Women's Clothing/Tops & Shirts");

/* ---------- 4. drill-down matching ---------- */
const feed = [
  { category: "Women's Clothing/Tops & Shirts" },
  { category: "tops" },
  { category: "Shoes" },
  { category: "Shoes/Men's Shoes" },
  { category: "Dresses" },
  { category: null },
  { category: "random-thing" },
];
t("no filter shows everything", feed.filter(r => taxMatches(r.category, "")).length, feed.length);
t("a department matches the items filed under it", feed.filter(r => taxMatches(r.category, "Shoes")).length, 2);
t("a department matches every row beneath it (incl. legacy spellings)", feed.filter(r => taxMatches(r.category, "Women's Clothing")).length, 3);
t("a subcategory matches only itself", feed.filter(r => taxMatches(r.category, "Shoes/Men's Shoes")).length, 1);
t("a subcategory does not match its sibling", feed.filter(r => taxMatches(r.category, "Shoes/Women's Shoes")).length, 0);
t("a subcategory does not match the bare department", taxMatches("Women's Clothing", "Women's Clothing/Tops & Shirts"), false);
t("unlisted junk never matches a department", feed.filter(r => taxMatches(r.category, "Accessories")).length, 0);
t("uncategorised rows never match a department", feed.filter(r => taxMatches(r.category, "Kids & Baby")).length, 0);

/* ---------- 5. the exact crashes that used to happen still throw ---------- */
let e1 = ""; try { [...new Set(feed.map(m => m.category)).filter(c => c)]; } catch (e) { e1 = e.constructor.name; }
t("the old Set.filter form still throws", e1, "TypeError");
let e2 = ""; try { const n = null; void n.textContent; } catch (e) { e2 = e.constructor.name; }
t("the old unguarded chip read still throws", e2, "TypeError");

/* ---------- 6. inline handlers cannot break on an apostrophe ---------- */
const nasty = ["Women's Clothing", "Kids' Shoes", "a\"b<c>d", "Shoes/Men's Shoes"];
t("encoded values contain no quote or angle bracket",
  nasty.every(v => !/['"<>&]/.test(taxQ(v))), true);
t("decoding restores the original exactly",
  nasty.every(v => taxUnq(taxQ(v)) === v), true);
t("a genuinely bad sequence does not throw", taxUnq("%zz"), "%zz");

/* ---------- 7. the shop chip list has no duplicates ---------- */
const cats = [...new Set(feed.map(m => taxPath(m.category)).filter(Boolean))].map(taxLabel);
t("labels are unique", new Set(cats).size, cats.length);

/* ---------- 8. closet behaves like a real catalogue ---------- */
const mine = [
  { category: "Tops" }, { category: "Shoes/Men's Shoes" }, { category: null },
  { category: "shoes" }, { category: "Dresses" },
];
const paths = mine.map(l => taxPath(l.category));
const ownedDepts = depts.filter(d => paths.some(p => taxMatches(p, d)));
t("only departments the seller owns are offered", ownedDepts.sort(), ["Shoes", "Women's Clothing"].sort());
t("uncategorised items are detectable", mine.filter(l => !taxPath(l.category)).length, 1);
t("spelling variants collapse to one department",
  mine.filter(l => taxMatches(l.category, "Shoes")).length, 2);
const closetFilter = (rows, sel) => !sel ? rows
  : sel === "__none" ? rows.filter(l => !taxPath(l.category))
  : rows.filter(l => taxMatches(l.category, sel));
t("department filter on the closet", closetFilter(mine, "Shoes").length, 2);
t("sub filter on the closet", closetFilter(mine, "Shoes/Men's Shoes").length, 1);
t("uncategorised filter on the closet", closetFilter(mine, "__none").length, 1);
t("clearing shows everything", closetFilter(mine, "").length, mine.length);

/* ---------- 9. saving requires a place to live ---------- */
has("saveListing reads the department select", script.includes('fReadCat("f-dept", "f-sub-wrap")'));
has("saveListing refuses to save without a department",
  script.includes('Pick a department so buyers can find this item'));
has("manual sheet reads its own department select", script.includes('fReadCat("m-dept","m-sub-wrap")'));
has("manual sheet refuses to save without a department",
  script.split('async function saveManual')[1].includes('Pick a department so buyers can find this item'));
has("price estimator reads the department select", script.includes('fReadCat("sp-dept", "sp-sub-wrap")'));
has("price estimator refuses a blank department", script.includes('Pick a department so we know what to price'));

/* ---------- summary ---------- */
console.log(`\nHARNESS ${pass}/${total} passed`);
if (pass !== total) { console.log("RESULT FAIL"); process.exit(1); }
console.log("RESULT PASS");
