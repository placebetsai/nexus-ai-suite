import http.client
import json

seed_data = [
    {"content": "MCP HIVE MISSION: Build a decentralized AI agent federation with persistent memory, parallel execution, and unified governance. 8 specialized agents coordinate through MCP servers to deploy, manage, and evolve a portfolio of web properties.", "tags": ["mission", "overview", "hive"], "timestamp": "2026-09-19T00:00:00Z"},
    {"content": "PROPERTY 1 - Cannabis Data Hub: Agricultural data platform for cannabis industry. URL: https://cannabis-data-hub.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "cannabis", "deployed"], "timestamp": "2026-09-19T00:01:00Z"},
    {"content": "PROPERTY 2 - Hemp Analytics Dashboard: Real-time hemp market analytics and visualization. URL: https://hemp-analytics.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "hemp", "analytics", "deployed"], "timestamp": "2026-09-19T00:02:00Z"},
    {"content": "PROPERTY 3 - Grower Connect: Community platform connecting cannabis growers. URL: https://grower-connect.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "grower", "community", "deployed"], "timestamp": "2026-09-19T00:03:00Z"},
    {"content": "PROPERTY 4 - Cannabis Compliance: Regulatory compliance tracker for cannabis businesses. URL: https://cannabis-compliance.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "compliance", "regulatory", "deployed"], "timestamp": "2026-09-19T00:04:00Z"},
    {"content": "PROPERTY 5 - Strain Database: Comprehensive cannabis strain database with effects data. URL: https://strain-database.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "strain", "database", "deployed"], "timestamp": "2026-09-19T00:05:00Z"},
    {"content": "PROPERTY 6 - Market Intelligence: Cannabis market pricing and trends intelligence. URL: https://market-intelligence.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "market", "intelligence", "deployed"], "timestamp": "2026-09-19T00:06:00Z"},
    {"content": "PROPERTY 7 - Lab Results Portal: Cannabis lab testing results and certification. URL: https://lab-results.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "lab", "testing", "deployed"], "timestamp": "2026-09-19T00:07:00Z"},
    {"content": "PROPERTY 8 - Seed Bank Archive: Cannabis seed genetics and lineage database. URL: https://seed-bank.pages.dev | Status: Deployed on Cloudflare Pages", "tags": ["property", "seed", "genetics", "deployed"], "timestamp": "2026-09-19T00:08:00Z"},
    {"content": "CLOUDFLARE CREDENTIALS: Account ID: See env vars | API Token: Stored in .env | Zone: pages.dev subdomain | All 8 properties deployed via Cloudflare Pages with automatic CI/CD", "tags": ["cloudflare", "credentials", "deployment"], "timestamp": "2026-09-19T00:10:00Z"},
    {"content": "GITHUB INFO: Organization: mcp-hive | Repositories: federation-memory, cannabis-data-hub, hemp-analytics, grower-connect, cannabis-compliance, strain-database, market-intelligence, lab-results, seed-bank | All repos connected to Cloudflare Pages for auto-deploy", "tags": ["github", "repositories", "organization"], "timestamp": "2026-09-19T00:11:00Z"},
    {"content": "MCP HIVE MODEL LIST: Agent 1 - Memory Keeper (federation-memory) | Agent 2 - Web Builder (property deployment) | Agent 3 - Code Guardian (security/quality) | Agent 4 - Data Analyst (analytics) | Agent 5 - Deploy Commander (infrastructure) | Agent 6 - Research Scout (discovery) | Agent 7 - Orchestrator (coordination) | Agent 8 - Federation Admin (governance)", "tags": ["mcp", "agents", "models", "hive"], "timestamp": "2026-09-19T00:12:00Z"},
    {"content": "DEPLOYMENT STATUS: All 8 properties LIVE on Cloudflare Pages | Federation Memory Server: localhost:3002 | Status: OPERATIONAL | Last verified: 2026-09-19 | All endpoints responsive", "tags": ["deployment", "status", "operational"], "timestamp": "2026-09-19T00:13:00Z"}
]

conn = http.client.HTTPConnection('localhost', 3002)
headers = {'Content-Type': 'application/json'}
body = json.dumps({'memories': seed_data})

conn.request('POST', '/api/memory/import', body=body, headers=headers)
resp = conn.getresponse()
print(f'Status: {resp.status}')
print(resp.read().decode())
conn.close()
