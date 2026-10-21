#!/usr/bin/env bash
# federation-audit.sh — read-only health/money-readiness sweep of the federation.
# GET/HEAD only. No deploys, no secrets, no state changes.
# Output: one line per site + a summary. Every field is an observed value.
set -u
SITES="marketpicks.ai placebets.ai ihatecollege.com createstuff.ai fashionistas.com hiddencameras.tv scooter.exchange diamonds.forsale israeljoffe.com spanishtvshows.com wuwonline.com mondaynightwrestling.com"
code() { curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$1" 2>/dev/null || echo "ERR"; }
loc_count() { curl -sS --max-time 20 "$1" 2>/dev/null | grep -o '<loc>' | wc -l | tr -d ' '; }
deep_link() { curl -sS --max-time 20 "$1" 2>/dev/null | grep -oE 'href="/[A-Za-z0-9._/-]+"' | head -1 | sed 's/href="//;s/"$//'; }

printf "%-28s %-6s %-5s %-5s %-5s %-8s %-4s %-6s %-4s\n" SITE HOME TITLE ROBOTS SITEMAP DEEP ADS.CMP CMP FONT12
for s in $SITES; do
  h=$(code "https://$s/")
  title=$(curl -sS --max-time 20 "https://$s/" 2>/dev/null | grep -oE '<title>[^<]{0,40}' | head -1 | sed 's/<title>//' | tr -d '\n' | cut -c1-14)
  [ -z "$title" ] && title="-"
  rb=$(code "https://$s/robots.txt")
  sm=$(code "https://$s/sitemap.xml")
  deep=$(deep_link "https://$s/")
  if [ -n "$deep" ]; then dc=$(code "https://$s$deep"); else dc="-"; fi
  ad=$(code "https://$s/ads.txt")
  html=$(curl -sS --max-time 20 "https://$s/" 2>/dev/null | head -c 200000)
  if echo "$html" | grep -qiE 'fundingchoices|googlefc|cmp|consent'; then cmp="yes"; else cmp="no"; fi
  if echo "$html" | grep -qiE 'font-size:[[:space:]]*(9|10|11)px'; then f12="LOW"; else f12="ok"; fi
  printf "%-28s %-6s %-5s %-5s %-5s %-8s %-4s %-6s %-4s\n" "$s" "$h" "$title" "$rb" "$sm" "$dc" "$ad" "$cmp" "$f12"
done
echo "--- done: $(date -u +%FT%TZ)"
