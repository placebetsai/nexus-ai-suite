/**
 * site-cron-trigger — the cross-site cron fan-out.
 *
 * Every 15 minutes this worker fires the placebets.ai / marketpicks.ai cron
 * endpoints that *no other scheduler owns*, plus federation-watch — a sibling
 * Worker that cannot have its own cron trigger, because the free plan caps an
 * account at 5 and all 5 are in use.
 *
 * It previously fired all 17 endpoints on both sites. Thirteen of those were
 * already being fired every 15 minutes by another worker with its own cron
 * trigger, so the same job ran twice per cycle:
 *
 *   placebets-scheduler  owns  ingest-games, ingest-espn-sports,
 *                          refresh-espn-odds, market-data, freshness,
 *                          housekeeping, federation-health, grade-outcomes
 *   marketpicks-ai-api   owns  news, ipo, econ, earnings, freshness
 *                          (+ quotes, scrape-crypto-multi,
 *                           scrape-stocks-tradingview,
 *                           scrape-etf-tradingview, grading)
 *
 * That was 13 endpoints x 96 runs/day of duplicate work — duplicate upstream
 * fetches, duplicate D1 reads against the free 5M/day budget, and duplicate
 * self-generated HTTP traffic against two sites whose normal traffic is a
 * handful of visitors. See audit/CLOUDFLARE-FREE-TIER-AUDIT.md §5.3.
 *
 * Ownership after the dedupe (2026-09-29): 17 endpoints -> 4 site jobs + 1
 * sibling-Worker tick. Every endpoint below is fired by exactly one worker.
 */
const ENDPOINTS = [
  // PlaceBets — the two placebets jobs placebets-scheduler does not run.
  "https://placebets.ai/api/cron/ingest-top-stories",
  "https://placebets.ai/api/cron/daily-digest",
  // MarketPicks — the two marketpicks jobs marketpicks-ai-api does not run.
  // (marketpicks-ai-api runs its *own* worker-local housekeeping function on
  //  the hour; this HTTP route is the one that re-reads the rendered pages.)
  "https://marketpicks.ai/api/cron/housekeeping",
  "https://marketpicks.ai/api/cron/daily-digest",
  // Site monitor (alerts to the owner's phone). It can't have its own cron:
  // the free plan's 5 cron triggers per account are all in use.
  "https://federation-watch.fashionistas1979.workers.dev/tick",
];

// Sibling Workers on this same workers.dev subdomain must be reached through a
// service binding (see wrangler.toml). Over the public network Cloudflare
// rejects the fetch with `error code: 1042` — measured 2026-09-29: the same
// URL returns 200 from a laptop, 404/1042 from this Worker, while the four
// custom-domain endpoints above all return 200 from the same invocation.
const SERVICE_BINDINGS = {
  "federation-watch.fashionistas1979.workers.dev": "FEDERATION_WATCH",
};

// ── IndexNow ───────────────────────────────────────────────────────────────
// Search engines are told about marketpicks' URLs once a day. This used to run
// ONLY from `npm run ship` on the owner's laptop (scripts/indexnow-ping.mjs),
// so any stretch without a deploy was a stretch of search engines being told
// nothing — a silent SEO regression with no alarm attached to it.
//
// The key below is NOT a secret and must not be treated like the credentials
// pulled out of the public repos this week. IndexNow's design is that the key
// is PUBLISHED: it is served as https://marketpicks.ai/<key>.txt and the API
// fetches that URL to prove the submitter controls the domain. It has been
// live at that path since commit a562c33. Removing it from here would break
// verification, and "rotating" it would do nothing but invalidate the file.
// This keeps the worker's no-secrets invariant (see wrangler.toml).
const INDEXNOW = {
  host: "marketpicks.ai",
  key: "f096cd903fa35672ba1a716d8871bb6e",
};

// Once a day, in the 03:00-03:15 UTC window. This worker has no durable
// storage, so the gate is "the single tick that falls inside that window"
// rather than a stored timestamp — deterministic and storage-free. A missed
// tick means a missed day, which is the right failure direction for a ping.
// IndexNow also throttles (429) well below a per-tick cadence anyway.
function indexNowDue() {
  const now = new Date();
  return now.getUTCHours() === 3 && now.getUTCMinutes() < 15;
}

async function pingIndexNow() {
  const sitemap = await fetch(`https://${INDEXNOW.host}/sitemap.xml`, {
    headers: { "user-agent": "marketpicks-indexnow/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!sitemap.ok) throw new Error(`sitemap HTTP ${sitemap.status}`);
  const xml = await sitemap.text();
  const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))];
  if (!urls.length) throw new Error("sitemap contained no <loc> entries");

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: INDEXNOW.host,
      key: INDEXNOW.key,
      keyLocation: `https://${INDEXNOW.host}/${INDEXNOW.key}.txt`,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(60000),
  });
  // 200 = received, 202 = received and pending validation. Anything else is a
  // real failure worth surfacing rather than swallowing.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`indexnow HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }
  return { urls: urls.length, status: res.status };
}

async function runAll(env) {
  const results = await Promise.allSettled(
    ENDPOINTS.map(async (url) => {
      // marketpicks' digest renders five buckets of signals and takes ~25 s;
      // the old 20 s cap aborted it on every single run, so this worker's own
      // report said "timeout" for an endpoint that was working.
      const signal = AbortSignal.timeout(60000);
      const bindingName = SERVICE_BINDINGS[new URL(url).hostname];
      const binding = bindingName ? env?.[bindingName] : null;
      const res = binding
        ? await binding.fetch(url, { signal })
        : await fetch(url, { signal });
      const text = await res.text();
      return {
        url: url.replace("https://", ""),
        status: res.status,
        via: bindingName || "https",
        body: text.slice(0, 200),
      };
    })
  );
  const rows = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { url: ENDPOINTS[i].replace("https://", ""), error: r.reason?.message || String(r.reason) }
  );

  // IndexNow rides along so the manual / handler reports it too. It is skipped
  // on ~95 of every 96 ticks, and a skip is reported AS a skip — "not due" and
  // "failed" must never look the same, or a working worker reads as a broken
  // one and a broken one reads as a quiet one.
  try {
    rows.push(
      indexNowDue()
        ? { url: `indexnow ${INDEXNOW.host}`, ...(await pingIndexNow()) }
        : { url: `indexnow ${INDEXNOW.host}`, skipped: "not due (daily at 03:00 UTC)" }
    );
  } catch (e) {
    rows.push({ url: `indexnow ${INDEXNOW.host}`, error: e?.message || String(e) });
  }

  return rows;
}

export default {
  // Manual trigger — handy for a one-off run and for E2E proofs.
  async fetch(request, env) {
    const results = await runAll(env);
    return new Response(
      JSON.stringify({ ok: true, endpoints: ENDPOINTS.length, triggered: new Date().toISOString(), results }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAll(env));
  },
};
