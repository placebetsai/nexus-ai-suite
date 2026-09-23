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
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS="$ROOT/.secrets/cf.env"

[ -f "$SECRETS" ] || { echo "FATAL: $SECRETS missing"; exit 1; }
# shellcheck disable=SC1090
set -a; source "$SECRETS"; set +a

ACTION="${1:-}"

case "$ACTION" in
  env)
    echo "FASHIONISTAS account (7eb89b01…): CF_API_TOKEN set = $([ -n "${CF_API_TOKEN:-}" ] && echo YES || echo NO)"
    echo "CREATESTUFF account  (2765cb27…): CS_API_TOKEN set = $([ -n "${CS_API_TOKEN:-}" ] && echo YES || echo NO)"
    ;;
  list)
    echo "Federation registry: see FEDERATION.md in repo root."
    ;;
  pages)
    PROJ="${2:?usage: ./deploy.sh pages <project-name> [dir]}"
    DIR="${3:-.}"
    echo ">> Deploying Pages project '$PROJ' from '$DIR'"
    if [[ "$PROJ" == createstuff* || "$PROJ" == app-createstuff* ]]; then
      CLOUDFLARE_API_TOKEN="$CS_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CS_ACCOUNT_ID" \
        npx wrangler pages deploy "$DIR" --project-name="$PROJ" --branch main
    else
      CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
        npx wrangler pages deploy "$DIR" --project-name="$PROJ" --branch main
    fi
    ;;
  worker)
    NAME="${2:?usage: ./deploy.sh worker <worker-name> [dir]}"
    DIR="${3:-.}"
    echo ">> Deploying Worker '$NAME' from '$DIR'"
    if [[ "$NAME" == forge* || "$NAME" == createstuff-api || "$NAME" == placebetsai-* || "$NAME" == placebets-cron* || "$NAME" == joffe-* ]]; then
      CLOUDFLARE_API_TOKEN="$CS_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CS_ACCOUNT_ID" \
        npx wrangler deploy "$DIR"
    else
      CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
        npx wrangler deploy "$DIR"
    fi
    ;;
  *)
    echo "Unknown action: $ACTION"
    sed -n '1,16p' "$0"
    exit 1
    ;;
esac