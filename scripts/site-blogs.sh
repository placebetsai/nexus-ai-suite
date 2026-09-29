#!/usr/bin/env bash
# Daily fresh posts for ihatecollege.com and spanishtvshows.com (user-approved 2026-09-29).
# Each push to main deploys through that repo's own GitHub workflow (their
# Cloudflare tokens exist only as GitHub secrets — see Ihatecollege/CLAUDE.md).
set -uo pipefail
D="/home/billionaremaker/Documents/Default Project"
log(){ echo "[$(date -u +%FT%TZ)] $*"; }

ihc="$D/Ihatecollege"
if git -C "$ihc" pull -q --rebase origin main; then
  (cd "$ihc" && GITHUB_BRANCH=main node scripts/generate-articles.js) && log "ihatecollege: done" || log "ihatecollege: FAILED"
fi

stv="$D/Spanishtvshows.com"
if git -C "$stv" pull -q --rebase origin main; then
  if (cd "$stv" && node scripts/generate-blog.mjs 2); then
    cd "$stv" && git add content/blog content/blog-articles.js && \
      git commit -q -m "blog: daily posts from current Spanish-TV news" && git push -q origin HEAD:main && log "spanishtvshows: pushed" || log "spanishtvshows: nothing new"
  else log "spanishtvshows: FAILED"; fi
fi
