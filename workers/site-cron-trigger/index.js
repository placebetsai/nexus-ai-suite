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
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { url: ENDPOINTS[i].replace("https://", ""), error: r.reason?.message || String(r.reason) }
  );
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
