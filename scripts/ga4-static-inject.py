#!/usr/bin/env python3
"""Insert (or update) the consent-friendly GA4 loader in every static HTML page.

    python3 scripts/ga4-static-inject.py <site_dir> [G-XXXXXXXXXX]

- Idempotent: pages that already carry id="ga4-loader" only get the ID updated.
- With no ID (or ""), the snippet is a no-op: no network request, no cookie.
- Only touches files that have a </head>. Prints how many files changed.
- Loader: skips GPC/DNT visitors, analytics_storage denied by default in
  EEA/UK/CH, no Google signals / ad personalisation, gtag.js fetched only
  after window load + idle (no LCP/INP cost), never touches AdSense consent.
"""
import pathlib, re, sys

SNIPPET = '<!-- GA4 (ga4-static v1): paste the Measurement ID (G-XXXXXXXXXX) between the quotes. Empty = no-op: nothing loads, no cookie. -->\n<script id="ga4-loader">(function(id){if(!/^G-[A-Z0-9]{4,}$/.test(id))return;function r(){(function(i){var w=window,n=navigator;if(!/^G-[A-Z0-9]{4,}$/.test(i)||n.globalPrivacyControl||n.doNotTrack===\'1\'||w.doNotTrack===\'1\')return;w.dataLayer=w.dataLayer||[];function g(){w.dataLayer.push(arguments)}w.gtag=w.gtag||g;g(\'consent\',\'default\',{analytics_storage:\'denied\',region:[\'AT\',\'BE\',\'BG\',\'HR\',\'CY\',\'CZ\',\'DK\',\'EE\',\'FI\',\'FR\',\'DE\',\'GR\',\'HU\',\'IS\',\'IE\',\'IT\',\'LV\',\'LI\',\'LT\',\'LU\',\'MT\',\'NL\',\'NO\',\'PL\',\'PT\',\'RO\',\'SK\',\'SI\',\'ES\',\'SE\',\'GB\',\'CH\'],wait_for_update:500});g(\'js\',new Date());g(\'config\',i,{allow_google_signals:false,allow_ad_personalization_signals:false});var s=document.createElement(\'script\');s.async=true;s.src=\'https://www.googletagmanager.com/gtag/js?id=\'+i;document.head.appendChild(s)})(id)}function q(){(window.requestIdleCallback||setTimeout)(r)}document.readyState==="complete"?q():addEventListener("load",q)})("")</script>\n'

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = pathlib.Path(sys.argv[1])
    gid = sys.argv[2].strip() if len(sys.argv) > 2 else ""
    if gid and not re.fullmatch(r"G-[A-Z0-9]{4,}", gid):
        sys.exit(f"not a GA4 measurement id: {gid!r}")
    snippet = SNIPPET.replace('})("")</script>', '})(%s)</script>' % ('"' + gid + '"'))
    changed = 0
    for f in root.rglob("*.html"):
        s = f.read_text(encoding="utf-8", errors="surrogateescape")
        if 'id="ga4-loader"' in s:
            n = re.sub(r'\}\)\("(G-[A-Z0-9]*)?"\)</script>', '})("' + gid + '")</script>', s, count=1)
        elif "</head>" in s:
            n = s.replace("</head>", snippet + "</head>", 1)
        else:
            continue
        if n != s:
            f.write_text(n, encoding="utf-8", errors="surrogateescape")
            changed += 1
    print(f"{changed} file(s) updated under {root} (id={gid or 'empty: no-op'})")

if __name__ == "__main__":
    main()
