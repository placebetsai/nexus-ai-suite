#!/usr/bin/env bash
# ---------------------------------------------------------------
# Nexus Federation — local-first deploy tool
# Stores & deploys everything from THIS machine via wrangler + Cloudflare.
# NO GitHub. Credentials live in .secrets/cf.env (gitignored, chmod 600).
#
# Usage:
#   ./deploy.sh pages   <project-name> [dir]        # deploy a Pages project
#   ./deploy.sh worker  <worker-name> [dir]         # deploy a Worker
#   ./deploy.sh env                                # show which accounts are wired
#   ./deploy.sh list                                # show federation registry
#
# Examples:
#   ./deploy.sh pages fashionistas-ai .
#   ./deploy.sh worker fashionistas-api ./worker
# ---------------------------------------------------------------
#
# Flags (given BEFORE the action):
#   --dry-run   never execute wrangler; print the exact command + account that
#               would be used, then run the same post-deploy verification used
#               after a real deploy. Exit status follows the verification.
#
# A deploy only exits 0 when BOTH are true:
#   1. wrangler's own exit status was 0 (printed as ">> wrangler exit code: N"),
#   2. the independent curl check below saw the expected content/route.
# wrangler hangs after a successful deploy on this machine, so the 180s cap
# (exit 124) is treated as INDETERMINATE and the verification decides.
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

# Prefer the globally installed wrangler. `npx wrangler` re-downloads the whole
# toolchain every run and has twice failed on this machine (corrupt npx cache,
# then a missing @cloudflare/workerd-linux-64 optional dependency).
if command -v wrangler >/dev/null 2>&1; then WR=(wrangler); else WR=(npx --yes wrangler); fi
# wrangler finishes the deploy in ~8s but then hangs forever posting analytics,
# which made every deploy look like a timeout. Disable them and hard-cap runtime.
export WRANGLER_SEND_METRICS=false
# WRANGLER_LOG=error was removed on purpose. Measured with wrangler 4.138.0:
#   WRANGLER_LOG=error wrangler pages project list -> exit 0, 216 bytes (deprecation lines only)
#   unset WRANGLER_LOG  wrangler pages project list -> exit 0, 27592 bytes (the real list)
# Error-level logging hides wrangler's own deploy output, which is how a run can
# print nothing after ">> Deploying ..." and still look finished.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/deploy.sh.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

fail(){ echo "FAILED: $*" >&2; exit 1; }

run_wrangler(){
  local rc=0
  # set -o pipefail is already on (see "set -euo pipefail" above), but the status
  # is read from PIPESTATUS[0] directly: that is the real wrangler/timeout status,
  # so a failing tee can never mask it and a succeeding tee can never fake it.
  if timeout 180 "${WR[@]}" "$@" 2>&1 | tee -a "$WORK/wrangler.log"; then
    rc=0
  else
    rc=${PIPESTATUS[0]}
  fi
  printf '%s' "$rc" >"$WORK/last_rc"
  echo ">> wrangler exit code: $rc"
  return "$rc"
}

# The exit code wrangler actually returned, read back even when run_wrangler ran
# inside a subshell (the worker branch cds first). "n/a" when wrangler did not run.
observed_rc(){ [[ -f "$WORK/last_rc" ]] && cat "$WORK/last_rc" || printf 'n/a'; }

# run_wrangler + policy. Prints the observed exit code for every deploy.
deploy_gate(){
  local rc=0
  if (( DRY_RUN )); then
    echo ">> DRY RUN: would execute: timeout 180 ${WR[*]} $*"
    echo ">> DRY RUN: CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-unset} CLOUDFLARE_API_TOKEN set=$([[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && echo YES || echo NO)"
    echo ">> wrangler exit code: n/a (dry run - wrangler not executed)"
    return 0
  fi
  run_wrangler "$@" || rc=$?
  if (( rc == 124 )); then
    echo ">> wrangler timed out (exit 124) after 180s: INDETERMINATE - wrangler hangs after a successful deploy on this machine, so this is neither success nor failure. Verification decides."
    return 0
  fi
  if (( rc != 0 )); then
    echo "FAILED: wrangler exited with code $rc - deploy did not complete" >&2
    exit "$rc"
  fi
  return 0
}

fetch(){ # $1=url $2=outfile -> prints the HTTP code (000 when curl fails)
  local code
  code=$(curl -sS --compressed -L --max-time 30 -o "$2" -w '%{http_code}' "$1") || code=000
  printf '%s' "$code"
}

# Read-only check: the deployed bytes must equal the local source bytes.
verify_pages(){
  local proj="$1" dir="$2"
  local url="https://${proj}.pages.dev"
  local local_file="" local_sha="" local_bytes=0
  local attempt code bytes sha body="$WORK/live.html" ok=0 reason=""

  if [[ -f "$dir/index.html" ]]; then local_file="$dir/index.html"
  elif [[ -f "$dir/index.htm" ]]; then local_file="$dir/index.htm"
  fi
  if [[ -n "$local_file" ]]; then
    local_sha=$(sha256sum "$local_file" | cut -d' ' -f1)
    local_bytes=$(wc -c <"$local_file")
    echo ">> VERIFY local: $local_file -> $local_bytes bytes sha256=$local_sha"
  else
    echo ">> VERIFY local: no index.html or index.htm in '$dir' - sha256 comparison unavailable; verification will fail closed"
  fi

  for attempt in 1 2 3; do
    rm -f "$body"
    code=$(fetch "$url/" "$body")
    bytes=0
    if [[ -f "$body" ]]; then bytes=$(wc -c <"$body"); fi
    sha=""
    if [[ "$bytes" -gt 0 ]]; then sha=$(sha256sum "$body" | cut -d' ' -f1); fi
    echo ">> VERIFY attempt $attempt: GET $url/ -> HTTP $code, $bytes bytes sha256=$sha"
    if [[ "$code" == 200 && "$bytes" -gt 0 ]]; then
      if [[ -z "$local_sha" ]]; then
        reason="HTTP 200, $bytes bytes at $url/ (no local index.html or index.htm to compare)"
      elif [[ "$sha" == "$local_sha" ]]; then
        ok=1; reason="HTTP 200, $bytes bytes at $url/, sha256 matches $local_file ($local_bytes bytes)"
        break
      else
        reason="HTTP 200 but CONTENT MISMATCH: local $local_file sha256=$local_sha ($local_bytes bytes) vs live sha256=$sha ($bytes bytes)"
      fi
    else
      reason="GET $url/ -> HTTP $code, $bytes bytes"
    fi
    if (( attempt < 3 )); then sleep 2; fi
  done

  if (( ok == 0 )); then
    fail "pages verification for '$proj' could not confirm anything shipped: $reason"
  fi
  echo ">> VERIFY pass: $reason"
}

# Read-only check: the worker must answer on its workers.dev route.
verify_worker(){
  local name="$1" dir="$2" fallback_sub="$3" token="$4" account="$5"
  local api="$WORK/subdomain.json" api_code sub="" path="/"
  local attempt code bytes body="$WORK/health.out" ok=0 reason="" url_base

  api_code=$(curl -sS --max-time 20 -o "$api" -w '%{http_code}' \
    -H "Authorization: Bearer $token" \
    "https://api.cloudflare.com/client/v4/accounts/$account/workers/subdomain") || api_code=000
  sub=""
  if [[ -f "$api" ]]; then
    sub=$(sed -n 's/.*"subdomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$api")
    sub="${sub%%$'\n'*}"
  fi
  if [[ -n "$sub" ]]; then
    echo ">> VERIFY subdomain: '$sub' (Cloudflare API HTTP $api_code)"
  else
    sub="$fallback_sub"
    echo ">> VERIFY subdomain: '$sub' (fallback - Cloudflare API returned HTTP $api_code)"
  fi

  if grep -qs '/api/health' "$dir"/src/* "$dir"/*.js "$dir"/*.mjs 2>/dev/null; then
    path="/api/health"
    echo ">> VERIFY probe path: /api/health (found in local source under '$dir')"
  else
    echo ">> VERIFY probe path: / (no /api/health in local source under '$dir')"
  fi

  url_base="https://${name}.${sub}.workers.dev"
  for attempt in 1 2 3; do
    rm -f "$body"
    code=$(fetch "${url_base}${path}" "$body")
    bytes=0
    if [[ -f "$body" ]]; then bytes=$(wc -c <"$body"); fi
    echo ">> VERIFY attempt $attempt: GET ${url_base}${path} -> HTTP $code, $bytes bytes"
    if [[ "$bytes" -gt 0 ]]; then
      echo ">> VERIFY body: $(head -c 200 "$body")"
    fi
    if [[ "$path" != "/" ]]; then
      if [[ "$code" =~ ^2[0-9][0-9]$ && "$bytes" -gt 0 ]]; then
        ok=1; reason="HTTP $code, $bytes bytes at ${url_base}${path}"
        break
      fi
      reason="expected 2xx with a non-empty body at ${url_base}${path}, saw HTTP $code, $bytes bytes"
    else
      if [[ "$code" =~ ^2[0-9][0-9]$ && "$bytes" -gt 0 ]] && ! grep -q "There is nothing here yet" "$body" 2>/dev/null; then
        ok=1; reason="HTTP $code, $bytes bytes at ${url_base}/"
        break
      fi
      reason="expected 2xx with a non-empty body at ${url_base}/, saw HTTP $code, $bytes bytes (unreachable, 1xx/3xx/4xx, 5xx, or the empty workers.dev placeholder page)"
    fi
    if (( attempt < 3 )); then sleep 2; fi
  done

  if (( ok == 0 )); then
    fail "worker verification for '$name' could not confirm anything shipped: $reason"
  fi
  echo ">> VERIFY pass: $reason"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS="$ROOT/.secrets/cf.env"

[ -f "$SECRETS" ] || fail "secrets file missing: $SECRETS"
# shellcheck disable=SC1090
set -a; source "$SECRETS"; set +a
for _v in CF_API_TOKEN CF_ACCOUNT_ID CS_API_TOKEN CS_ACCOUNT_ID; do
  [[ -n "${!_v:-}" ]] || fail "secrets: $_v is empty or unset in $SECRETS"
done

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

ACTION="${1:-}"

# Cloudflare's custom domains (createstuff.ai, app.createstuff.ai) override the
# _headers cache policy with `max-age=14400`, while index.html is served with
# `max-age=0`. With a STATIC ?v= query that meant every deploy left custom-domain
# visitors on up to four hours of old app.js/styles.css behind brand-new HTML —
# a half-updated app. Re-point the query at a hash of the file's own bytes so the
# URL changes exactly when the bytes change, which makes the stale window
# impossible regardless of what any cache header says.
bust_assets(){
  local dir="$1" asset hash
  [[ -f "$dir/index.html" ]] || return 0
  for asset in app.js styles.css; do
    [[ -f "$dir/$asset" ]] || continue
    hash=$(sha256sum "$dir/$asset" | cut -c1-12)
    if grep -q "${asset//./\\.}?v=" "$dir/index.html"; then
      sed -i -E "s|(${asset//./\\.})\?v=[^\"']*|\1?v=${hash}|g" "$dir/index.html"
      echo ">> cache-bust: $asset -> ?v=${hash}"
    fi
  done
}

case "$ACTION" in
  env)
    echo "FASHIONISTAS account (7eb89b01…): CF_API_TOKEN set = $([ -n "${CF_API_TOKEN:-}" ] && echo YES || echo NO)"
    echo "CREATESTUFF account  (2765cb27…): CS_API_TOKEN set = $([ -n "${CS_API_TOKEN:-}" ] && echo YES || echo NO)"
    ;;
  list)
    echo "Federation registry: see FEDERATION.md in repo root."
    ;;
  pages)
    PROJ="${2:-}"
    [[ -n "$PROJ" ]] || fail "usage: ./deploy.sh pages <project-name> [dir]"
    DIR="${3:-.}"
    [[ -d "$DIR" ]] || fail "pages source directory not found: $DIR (nothing was sent to wrangler)"
    bust_assets "$DIR"
    echo ">> Deploying Pages project '$PROJ' from '$DIR'"
    if [[ "$PROJ" == createstuff* || "$PROJ" == app-createstuff* ]]; then
      CLOUDFLARE_API_TOKEN="$CS_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CS_ACCOUNT_ID" \
        deploy_gate pages deploy "$DIR" --project-name="$PROJ" --branch main
      verify_pages "$PROJ" "$DIR"
    else
      CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
        deploy_gate pages deploy "$DIR" --project-name="$PROJ" --branch main
      verify_pages "$PROJ" "$DIR"
    fi
    if (( DRY_RUN )); then
      echo ">> DRY RUN VERIFY OK: pages project '$PROJ', live content verified at https://${PROJ}.pages.dev/ (wrangler exit code n/a)"
    else
      echo ">> DEPLOY OK: pages project '$PROJ', wrangler exit code $(observed_rc), verified at https://${PROJ}.pages.dev/"
    fi
    ;;
  worker)
    NAME="${2:-}"
    [[ -n "$NAME" ]] || fail "usage: ./deploy.sh worker <worker-name> [dir]"
    DIR="${3:-.}"
    [[ -d "$DIR" ]] || fail "worker source directory not found: $DIR (nothing was sent to wrangler)"
    echo ">> Deploying Worker '$NAME' from '$DIR'"
    # wrangler reads the worker name from wrangler.toml inside DIR. Passing the
    # directory as a positional arg makes wrangler treat it as the script name
    # ("You need to provide the name of your worker"), so cd into it first.
    # createstuff-api must NOT be in this list: createstuff-db D1 lives on the
    # CF account (7eb89b01…), and the CS token has no Workers permission at all
    # (auth error 10000). It deploys through the else-branch below.
    if [[ "$NAME" == forge* || "$NAME" == placebetsai-* || "$NAME" == placebets-cron* || "$NAME" == joffe-* ]]; then
      ( cd "$DIR" && CLOUDFLARE_API_TOKEN="$CS_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CS_ACCOUNT_ID" \
        deploy_gate deploy )
      verify_worker "$NAME" "$DIR" "placebetsai" "$CS_API_TOKEN" "$CS_ACCOUNT_ID"
    else
      ( cd "$DIR" && CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
        deploy_gate deploy )
      verify_worker "$NAME" "$DIR" "fashionistas1979" "$CF_API_TOKEN" "$CF_ACCOUNT_ID"
    fi
    if (( DRY_RUN )); then
      echo ">> DRY RUN VERIFY OK: worker '$NAME', live route verified at https://${NAME}.<subdomain>.workers.dev (wrangler exit code n/a)"
    else
      echo ">> DEPLOY OK: worker '$NAME', wrangler exit code $(observed_rc), verified at https://${NAME}.<subdomain>.workers.dev"
    fi
    ;;
  *)
    echo "FAILED: unknown action: ${ACTION:-<none>}"
    sed -n '1,16p' "$0"
    exit 1
    ;;
esac
