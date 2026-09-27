#!/usr/bin/env python3
"""Hourly D1 read-budget check for the Nexus/fashionistas Cloudflare account.
The free plan allows 5,000,000 rows read per day (resets 00:00 UTC) across
MarketPicks, Fashionistas and CreateStuff together; when it runs out every
database read on all three sites fails until midnight UTC.
Warns on the desktop at 60% and prints the top databases."""
import datetime as dt, json, os, subprocess, urllib.request

LIMIT = 5_000_000
token, acct = os.environ["CF_API_TOKEN"], os.environ["CF_ACCOUNT_ID"]
q = {"query": "query($a:String!,$s:Date!){viewer{accounts(filter:{accountTag:$a}){d1AnalyticsAdaptiveGroups(limit:20,filter:{date_geq:$s},orderBy:[sum_rowsRead_DESC]){sum{rowsRead} dimensions{databaseId}}}}}",
     "variables": {"a": acct, "s": dt.datetime.now(dt.timezone.utc).date().isoformat()}}
req = urllib.request.Request("https://api.cloudflare.com/client/v4/graphql", data=json.dumps(q).encode(),
                             headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
groups = json.loads(urllib.request.urlopen(req, timeout=30).read())["data"]["viewer"]["accounts"][0]["d1AnalyticsAdaptiveGroups"]
names = {"bcc97511": "marketpicks-db", "cc9ab7ed": "createstuff-db", "0c1b88be": "fashionistas-db"}
total = sum(g["sum"]["rowsRead"] for g in groups)
detail = ", ".join(f'{names.get(g["dimensions"]["databaseId"][:8], g["dimensions"]["databaseId"][:8])} {g["sum"]["rowsRead"]:,}' for g in groups)
line = f"D1 reads today: {total:,} / {LIMIT:,} ({total / LIMIT:.0%}) — {detail}"
print(line)
os.makedirs(os.path.expanduser("~/.cache/nexus"), exist_ok=True)
open(os.path.expanduser("~/.cache/nexus/d1-budget.txt"), "w").write(dt.datetime.now().isoformat() + " " + line + "\n")
if total >= LIMIT * 0.6:
    subprocess.run(["notify-send", "-u", "critical", "Cloudflare D1 read budget", line], check=False)
