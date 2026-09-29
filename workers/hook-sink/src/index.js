// hook-sink — TEST HARNESS, see wrangler.toml.
//
// Exists for one reason: prove that CreateStuff's outbound automations really
// leave the worker and really arrive, with the headers and body we claim.
// Reading your own sender's logs would only show "we tried"; this shows what
// the other side actually received.

const DDL = `CREATE TABLE IF NOT EXISTS sink_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  headers TEXT,
  body TEXT,
  at TEXT
)`;

async function ensure(env) {
  await env.DB.prepare(DDL).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/log") {
      await ensure(env);
      const body = await request.text();
      const headers = {};
      for (const [k, v] of request.headers) {
        if (k.startsWith("x-createstuff-") || k === "content-type" || k === "user-agent") {
          headers[k] = v;
        }
      }
      await env.DB.prepare("INSERT INTO sink_log (headers, body, at) VALUES (?,?,?)")
        .bind(JSON.stringify(headers), body.slice(0, 4000), new Date().toISOString()).run();
      // Opportunistic prune (no cron here — the account is at the free plan's
      // 5-trigger ceiling, so a demo table does not get to spend one).
      if (Math.random() < 0.05) {
        await env.DB.prepare(
          "DELETE FROM sink_log WHERE id NOT IN (SELECT id FROM sink_log ORDER BY id DESC LIMIT 500)"
        ).run().catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    if (request.method === "GET" && url.pathname === "/dump") {
      // Without this, anyone could read back deliveries meant for one project.
      if (url.searchParams.get("k") !== env.KEY) {
        return new Response("forbidden", { status: 403, headers: { "content-type": "text/plain" } });
      }
      await ensure(env);
      const r = await env.DB.prepare("SELECT * FROM sink_log ORDER BY id DESC LIMIT 25").all();
      const items = (r.results || []).reverse().map((x) => ({
        id: x.id,
        at: x.at,
        headers: (() => { try { return JSON.parse(x.headers); } catch { return {}; } })(),
        body: (() => { try { return JSON.parse(x.body); } catch { return x.body; } })(),
      }));
      return new Response(JSON.stringify({ count: items.length, items }, null, 2),
        { headers: { "content-type": "application/json" } });
    }

    if (request.method === "DELETE" && url.pathname === "/clear") {
      if (url.searchParams.get("k") !== env.KEY) {
        return new Response("forbidden", { status: 403, headers: { "content-type": "text/plain" } });
      }
      await ensure(env);
      await env.DB.prepare("DELETE FROM sink_log").run();
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    return new Response("hook-sink", { status: 404, headers: { "content-type": "text/plain" } });
  },
};
