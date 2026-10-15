#!/usr/bin/env bash
# deploy-safe-static.sh — THE ONLY SANCTIONED WAY TO SHIP the static Pages sites that live in this repo:
#   israeljoffe.com        bash scripts/deploy-safe-static.sh israeljoffe-com [dir=israeljoffe-com]
#   createstuff.ai (mktg)  bash scripts/deploy-safe-static.sh createstuff-marketing [dir=apps/createstuff-marketing]
# Flow: deploy PREVIEW (branch gate-candidate) → smoke preview → `./deploy.sh pages` to production
#       (its bust_assets + VERIFY) → smoke production → rollback command on red.
# Raw `wrangler pages deploy … --branch=main` and bare `./deploy.sh pages <these projects>` are forbidden.
# Knobs: PREVIEW_ONLY=1, ALLOW_KNOWN_FAILS=1 (only pre-existing prod failures), AUTO_ROLLBACK=1.
# Manual smoke: node scripts/smoke/<project>.mjs <url>
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"
PROJECT="${1:?usage: deploy-safe-static.sh israeljoffe-com|createstuff-marketing [dir]}"
case "$PROJECT" in
  israeljoffe-com)       DIR="${2:-israeljoffe-com}";            PROD_URL=https://israeljoffe.com; ACC_VAR=CF ;;
  createstuff-marketing) DIR="${2:-apps/createstuff-marketing}"; PROD_URL=https://createstuff.ai;   ACC_VAR=CS ;;
  *) echo "no smoke gate defined for '$PROJECT'"; exit 2 ;;
esac
SITE="$PROJECT"; SMOKE="$ROOT/scripts/smoke/$PROJECT.mjs"; PREVIEW_BRANCH="${PREVIEW_BRANCH:-gate-candidate}"
say(){ printf '\n\033[1m[deploy-safe %s] %s\033[0m\n' "$SITE" "$*"; }
die(){ printf '\n\033[31m[deploy-safe %s] %s\033[0m\n' "$SITE" "$*" >&2; exit 1; }
[ -d "$DIR" ] || die "source dir $DIR not found"
[ -f "$SMOKE" ] || die "smoke script $SMOKE missing"
[ -r .secrets/cf.env ] || die ".secrets/cf.env missing"
set -a; . ./.secrets/cf.env; set +a
TOK="${ACC_VAR}_API_TOKEN"; ACC="${ACC_VAR}_ACCOUNT_ID"
export CLOUDFLARE_API_TOKEN="${!TOK:-}" CLOUDFLARE_ACCOUNT_ID="${!ACC:-}" WRANGLER_SEND_METRICS=false
[ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || die "no $ACC_VAR credentials in .secrets/cf.env"
if command -v wrangler >/dev/null 2>&1; then WR=(wrangler); else WR=(npx --yes wrangler@4); fi
WORK="$(mktemp -d "${TMPDIR:-/tmp}/deploy-safe.XXXXXX")"; trap 'rm -rf "$WORK"' EXIT

smoke(){ node "$SMOKE" "$1" --json "$2"; }
say "1/4 deploy PREVIEW ($PROJECT, branch $PREVIEW_BRANCH) from $DIR"
rc=0; timeout 300 "${WR[@]}" pages deploy "$DIR" --project-name="$PROJECT" --branch="$PREVIEW_BRANCH" --commit-dirty=true 2>&1 | tee "$WORK/p.log" || rc=${PIPESTATUS[0]}
PURL="$(grep -oE 'https://[a-z0-9]+\.[a-z0-9-]+\.pages\.dev' "$WORK/p.log" | head -1 || true)"
[ -n "$PURL" ] || { [ "$rc" = 0 ] || [ "$rc" = 124 ] || die "preview deploy failed ($rc)"; PURL="https://$PREVIEW_BRANCH.$PROJECT.pages.dev"; }
sleep "${PROPAGATE_S:-10}"
say "2/4 smoke PREVIEW $PURL"
if ! smoke "$PURL" "$WORK/preview.json"; then
  ok=0
  if [ "${ALLOW_KNOWN_FAILS:-0}" = 1 ]; then
    smoke "$PROD_URL" "$WORK/base.json" || true
    node -e '
      const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1])).results,b=JSON.parse(fs.readFileSync(process.argv[2])).results;
      const bad=new Set(b.filter(r=>!r.pass&&!r.warn).map(r=>r.name));const reg=p.filter(r=>!r.pass&&!r.warn&&!bad.has(r.name));
      if(reg.length){for(const r of reg)console.log("REGRESSION ✗ "+r.name+": "+r.detail);process.exit(1)}' "$WORK/preview.json" "$WORK/base.json" && ok=1
  fi
  [ "$ok" = 1 ] || die "GATE FAILED on preview — production NOT touched."
fi
[ "${PREVIEW_ONLY:-0}" = 1 ] && { say "PREVIEW_ONLY=1 — preview green, production untouched"; exit 0; }
PREV="$(curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments?env=production&per_page=1" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write((JSON.parse(s).result||[])[0]?.id||"")}catch{}})' || true)"
say "3/4 PRODUCTION via ./deploy.sh pages $PROJECT $DIR (current prod deployment ${PREV:-unknown})"
DEPLOY_SAFE=1 ./deploy.sh pages "$PROJECT" "$DIR"
sleep "${PROPAGATE_S:-10}"
say "4/4 smoke PRODUCTION $PROD_URL"
if ! smoke "$PROD_URL" "$WORK/prod.json"; then
  echo "PRODUCTION SMOKE FAILED. Roll back with (after: set -a; . .secrets/cf.env; set +a; export CLOUDFLARE_API_TOKEN=\$${ACC_VAR}_API_TOKEN CLOUDFLARE_ACCOUNT_ID=\$${ACC_VAR}_ACCOUNT_ID):"
  [ -n "$PREV" ] && echo "  curl -fsS -X POST -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" https://api.cloudflare.com/client/v4/accounts/\$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments/$PREV/rollback"
  echo "  or Cloudflare dashboard → Pages → $PROJECT → Deployments → ${PREV:-previous production} → Rollback"
  if [ "${AUTO_ROLLBACK:-0}" = 1 ] && [ -n "$PREV" ]; then curl -fsS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments/$PREV/rollback" >/dev/null && echo "AUTO_ROLLBACK done → $PREV"; fi
  exit 1
fi
say "DONE — $PROJECT live and smoke-green."
