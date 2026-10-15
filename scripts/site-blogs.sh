#!/usr/bin/env bash
# Daily fresh posts for ihatecollege.com and spanishtvshows.com (user-approved 2026-09-29).
# Each push to main deploys through that repo's own GitHub workflow (their
# Cloudflare tokens exist only as GitHub secrets — see Ihatecollege/CLAUDE.md).
set -uo pipefail
D="/home/billionaremaker/Documents/Default Project"
log(){ echo "[$(date -u +%FT%TZ)] $*"; }
# Fail loudly: any skipped pull, generator failure or push failure makes the
# script exit non-zero so a silent DNS outage can never look like a clean run.
rc=0

ihc="$D/Ihatecollege"
if ihc_pull=$(git -C "$ihc" pull -q --rebase origin main 2>&1); then
  (cd "$ihc" && GITHUB_BRANCH=main node scripts/generate-articles.js) \
    && log "ihatecollege: done" || { log "ihatecollege: FAILED (generator)"; rc=1; }
else
  log "ihatecollege: SKIPPED — git pull failed (network/DNS?): $ihc_pull"
  rc=1
fi

stv="$D/Spanishtvshows.com"
if stv_pull=$(git -C "$stv" pull -q --rebase origin main 2>&1); then
  if (cd "$stv" && node scripts/generate-blog.mjs 2); then
    if git -C "$stv" add content/blog content/blog-articles.js && \
       git -C "$stv" commit -q -m "blog: daily posts from current Spanish-TV news"; then
      if git -C "$stv" push -q origin HEAD:main; then
        log "spanishtvshows: pushed"
      else
        log "spanishtvshows: push FAILED"
        rc=1
      fi
    else
      log "spanishtvshows: nothing new"
    fi
  else
    log "spanishtvshows: FAILED (generator)"
    rc=1
  fi
else
  log "spanishtvshows: SKIPPED — git pull failed (network/DNS?): $stv_pull"
  rc=1
fi

exit $rc
