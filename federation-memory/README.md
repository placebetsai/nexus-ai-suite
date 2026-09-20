# Federation Memory System

A decentralized memory server for the MCP Hive AI agent federation.

## Overview

The Federation Memory System provides persistent storage and retrieval capabilities for the MCP Hive ecosystem. It serves as the central knowledge repository for 8+ specialized AI agents coordinating across multiple web properties.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP HIVE FEDERATION                  │
├─────────────────────────────────────────────────────────┤
│  Agent 1: Memory Keeper    │  Agent 5: Deploy Commander │
│  Agent 2: Web Builder      │  Agent 6: Research Scout   │
│  Agent 3: Code Guardian    │  Agent 7: Orchestrator     │
│  Agent 4: Data Analyst     │  Agent 8: Federation Admin │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │  Federation Memory  │
              │    Server:3002      │
              └─────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │   memory.json       │
              │   (Seed Data)       │
              └─────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/list` | List all memories |
| GET | `/api/memory/retrieve?tag=&text=&from=&to=` | Search memories |
| POST | `/api/memory/save` | Save new memory |
| POST | `/api/memory/import` | Import memories in bulk |
| POST | `/api/memory/export` | Export all memories |
| DELETE | `/api/memory/{id}` | Delete memory by ID |

## Memory Schema

```json
{
  "id": "uuid",
  "content": "Memory content string",
  "tags": ["tag1", "tag2"],
  "timestamp": "ISO 8601",
  "created": "ISO 8601"
}
```

## Seed Data (`memory.json`)

Contains mission-critical information:
- **8 deployed web properties** on Cloudflare Pages
- **9 MCP Hive agent models**
- **Cloudflare credentials** (environment variables)
- **GitHub organization** (mcp-hive)
- **PMI-CPMAI certification** agent

## Quick Start

```bash
# Start the server
node fed-memory.js

# Or using Python
python start.py
```

Server runs on `http://localhost:3002`

Dashboard available at `http://localhost:3002/`

## Files

| File | Purpose |
|------|---------|
| `fed-memory.js` | Node.js server |
| `fed-memory.py` | Python server |
| `start.py` | Server launcher |
| `memory.json` | Seed data (read-only) |
| `data/memories.json` | Runtime data |
| `memory-dashboard.html` | Web UI |

## Deployment

All 8 properties are deployed on Cloudflare Pages with automatic CI/CD from the mcp-hive GitHub organization.
