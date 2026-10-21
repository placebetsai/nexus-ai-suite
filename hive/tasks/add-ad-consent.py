#!/usr/bin/env python3
"""
add-ad-consent.py — give a STATIC site a real ad-consent flow.

WHY (measured 2026-10-21): the federation audit found several sites loading
the AdSense script with no consent marker anywhere, while the marketpicks.ai
flagship and ihatecollege.com now ship the same policy. In the EEA/UK/CH,
personalized ads require a Google-certified CMP (that lives in the AdSense
account — operator-side); the fallback a publisher can ship TODAY is LIMITED
ads: the script carries Google's `npa=1` flag until the visitor opts in.

This is NOT a certified CMP — it is an in-house consent flow with the
non-personalized fallback. What it guarantees: no personalized ad script is
loaded before the visitor opts in.

It does two things to the given HTML file:
  1. replaces the AdSense <script src> with an inline injector that appends
     npa=1 unless localStorage holds mp-ad-consent === "all" (ONE loader copy
     only — two copies re-initialise adsbygoogle.js and break slot rendering)
  2. inserts a self-contained consent banner before </body> (markup + script),
     plus a "Privacy choices" link next to an existing Privacy link if found

Usage:  add-ad-consent.py <path/to/index.html> [--privacy-suffix /privacy/]
"""
import re
import sys

CONSENT_KEY = "mp-ad-consent"

BANNER = """
<!-- Ad consent (added 2026-10-21): no personalized ad script is loaded before
     the visitor opts in. The loader below carries Google's npa=1 flag (limited
     ads) until localStorage holds mp-ad-consent = "all". Not a certified CMP —
     an in-house consent flow with the non-personalized fallback. -->
<div id="mp-ad-consent" role="dialog" aria-live="polite" aria-label="Ad and analytics choices"
     style="display:none;position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(5,5,5,.96);border-top:1px solid #2a2a2a;color:#cbd5e1;padding:14px 18px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:1000px;margin:0 auto;display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between">
    <p style="margin:0;flex:1 1 420px">
      <strong style="color:#fff">Ads, and nothing else.</strong> We use Google AdSense to fund
      the research. With <em>limited ads</em> you get non-personalized ads; with personalized
      ads, Google may use your activity to choose them. No data is sold, and everything here
      works either way. <a href="{PRIVACY}" style="color:#38bdf8">Privacy policy</a>
    </p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button type="button" id="mp-ad-limited" style="padding:10px 16px;background:transparent;color:#cbd5e1;border:1px solid #2a2a2a;border-radius:8px;font-weight:800;cursor:pointer">Limited ads</button>
      <button type="button" id="mp-ad-all" style="padding:10px 16px;background:#ff2020;color:#fff;border:0;border-radius:8px;font-weight:900;cursor:pointer">Accept ads</button>
      <button type="button" id="mp-ad-close" style="display:none;background:none;border:0;color:#64748b;cursor:pointer">Close</button>
    </div>
  </div>
</div>
<script>
(function () {
  var KEY = "mp-ad-consent";
  var banner = document.getElementById("mp-ad-consent");
  if (!banner) return;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function show() {
    var c = stored();
    banner.style.display = "block";
    document.getElementById("mp-ad-close").style.display = c ? "inline-block" : "none";
  }
  function decide(value) {
    // Read the PREVIOUS choice BEFORE writing: reading it after the write
    // made the reload condition always false (browser-verified bug on
    // marketpicks.ai, 2026-10-21 — the script kept npa=1 after accepting).
    var previous = stored();
    try { localStorage.setItem(KEY, value); } catch (e) {}
    banner.style.display = "none";
    if (value === "all" && previous !== "all") window.location.reload();
  }
  document.getElementById("mp-ad-limited").addEventListener("click", function () { decide("limited"); });
  document.getElementById("mp-ad-all").addEventListener("click", function () { decide("all"); });
  document.getElementById("mp-ad-close").addEventListener("click", function () { banner.style.display = "none"; });
  if (!stored()) show();
  // "Privacy choices" links (footer) re-open the banner.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches("[data-mp-ad-choices]")) { e.preventDefault(); show(); }
  });
})();
</script>
"""

INJECTOR = """
<!-- AdSense loader with the consent gate (2026-10-21): the SAME single copy
     that used to be a hardcoded <script src> now carries Google's npa=1
     (non-personalized) flag until the visitor opts in. -->
<script>
(function () {
  try {
    var c = localStorage.getItem("mp-ad-consent");
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7215975042937417" + (c === "all" ? "" : "&npa=1");
    document.head.appendChild(s);
  } catch (e) {}
})();
</script>
"""


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    privacy = "/privacy"
    for a in sys.argv[1:]:
        if a.startswith("--privacy-suffix"):
            privacy = a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1]
    path = args[0]
    html = open(path, encoding="utf-8").read()

    if "mp-ad-consent" in html:
        print(f"{path}: already has the consent flow — left alone")
        return 0

    # 1. the ad script -> inline consent-aware injector
    html, n = re.subn(
        r'<script[^>]*src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=ca-pub-7215975042937417"[^>]*>\s*</script>',
        INJECTOR.strip(),
        html,
        count=1,
    )
    if n == 0:
        print(f"{path}: NO AdSense script tag found — nothing to gate (is this site ad-serving?)")
        return 1

    # 2. the banner before </body>
    html = html.replace("</body>", BANNER.replace("{PRIVACY}", privacy).strip() + "\n</body>", 1)

    # 3. a "Privacy choices" link next to an existing privacy link, if any
    privacy_link = re.search(r'<a href="([^"]*privacy[^"]*)"[^>]*>([^<]*)</a>', html, re.I)
    if privacy_link:
        href, label = privacy_link.group(1), privacy_link.group(2)
        repl = (
            f'{privacy_link.group(0)} '
            f'<a href="{href}" data-mp-ad-choices style="color:inherit">Privacy choices</a>'
        )
        html = html[: privacy_link.start()] + repl + html[privacy_link.end() :]
        print(f"{path}: added a 'Privacy choices' link next to '{label}'")

    open(path, "w", encoding="utf-8").write(html)
    print(f"{path}: ad script gated with npa=1 + consent banner added")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
