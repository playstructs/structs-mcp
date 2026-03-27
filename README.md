# Structs MCP Server

## Overview

The Structs MCP Server is an **intelligence layer** for AI agents playing Structs. Rather than just wrapping APIs, it provides tools that aggregate state, validate before mistakes, generate correct CLI commands, and diagnose failures -- work that would otherwise burn agent context. Updated for **v0.15.0-beta Pyrexnar** (`structstestnet-111`).

It exposes 41 tools across query, action, calculation, validation, workflow, and 4 intelligence tools. On structs.ai this server is referred to as the "user-structs" MCP server in [TOOLS](https://structs.ai/TOOLS); attach this server in Cursor or Claude under any name (e.g. "user-structs" or "structs-mcp") to use the same tools.

## Structs

In the distant future the species of the galaxy are embroiled in a race for Alpha Matter, the rare and dangerous substance that fuels galactic civilization. Players take command of Structs, a race of sentient machines, and must forge alliances, conquer enemies and expand their influence to control Alpha Matter and the fate of the galaxy.

---

## For AI Agents

- **Discovery**: [structs.ai llms.txt](https://structs.ai/llms.txt) — structured index of everything (skills, knowledge, playbooks, awareness).
- **Environment**: [structs.ai TOOLS](https://structs.ai/TOOLS) — servers, account, MCP query parameters, CLI gotchas.
- **Onboarding**: [structs.ai AGENTS](https://structs.ai/AGENTS) — first session, returning session, critical rules.

**Reference node** (when not using a local node): set `CONSENSUS_API_URL=http://reactor.oh.energy:1317` and optionally `CONSENSUS_RPC_URL=tcp://reactor.oh.energy:26657`. Defaults are localhost for local development.

**Critical rules** (CLI fallback and agent behavior):

1. Every `structsd tx structs` command must include `--gas auto --gas-adjustment 1.5`; without it, transactions fail with out-of-gas.
2. Place `--` before entity IDs in CLI (e.g. `structsd tx structs ... -- 4-5 6-10`) so IDs like `3-1` are not parsed as flags.
3. One transaction at a time per account; wait ~6 seconds between submissions from the same account to avoid sequence mismatch.
4. Never block on proof-of-work: initiate early, compute later. Use background PoW; at low difficulty (e.g. D=3) the hash is trivial and CPU is not wasted. See [structs.ai async-operations](https://structs.ai/awareness/async-operations) and [PROOF-OF-WORK.md](docs/guides/PROOF-OF-WORK.md).
5. Refine ore immediately; ore is stealable, Alpha Matter is not.

**Intelligence tools** (start here):

| Tool | What it does |
|------|--------------|
| `structs_player_dashboard` | Full player state in one call: structs, fleets, power, operations |
| `structs_preflight_check` | Check if an action will succeed before spending gas |
| `structs_prepare_command` | Generate exact `structsd` CLI commands, ready to copy-paste |
| `structs_diagnose_error` | Parse failed TX errors into what/why/fix with CLI commands |

**Tool discovery**: Call `structs_query_endpoints` (optionally with `entity_type` or `category`) to get a minimal tool index.

**v0.15.0 changes**: 24-bit permission system (PermAll=16777215), guild rank permissions, rewritten combat engine (per-projectile, min damage 1, counter-attack limits), new actions (guild-create, player-send, permission-guild-rank-set/revoke). See [CHANGELOG](https://raw.githubusercontent.com/playstructs/structs-ai/refs/heads/main/CHANGELOG.md).

---

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js (v18+)
- **MCP SDK**: `@modelcontextprotocol/sdk`

---

## Development Setup

### Prerequisites

- Node.js v18 or higher
- npm
- Docker (optional, for containerized deployment)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Run**:
   ```bash
   npm start
   ```

---

## Project Structure

```
src/
├── server.ts                   # Main MCP server
├── prompts/                    # MCP prompt templates (game loop, combat, first session)
├── resources/                  # Resource handlers & structs:// URI resolution
├── tools/                      # Tool implementations
│   ├── action.ts               # Transaction submission (signer DB)
│   ├── calculation.ts          # Power, mining, damage, trade calculators
│   ├── command.ts              # [NEW] CLI command preparation (intelligence layer)
│   ├── dashboard.ts            # [NEW] Player dashboard (composite state)
│   ├── error-lookup.ts         # Error code lookup & diagnosis
│   ├── preflight.ts            # [NEW] Pre-flight validation (no-gas checks)
│   ├── query.ts                # Query & list tools (consensus API)
│   ├── validation.ts           # Entity ID & schema validation
│   ├── definitions/            # Tool schemas (JSON Schema)
│   └── handlers/               # Tool handler wiring
└── utils/                      # Utilities
    ├── database.ts             # PostgreSQL connection & queries
    ├── proof-of-work.ts        # Proof-of-work calculations
    ├── tool-metadata.ts        # Tool categorization & entity type metadata
    └── uri.ts                  # URI parsing
```

---

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run dev
```

### Test
```bash
npm test
```

### Lint
```bash
npm run lint
```

---

## Configuration

### Environment Variables

Create `.env` file (see `.env.example`):

```env
# MCP Server Configuration
MCP_SERVER_NAME=structs-mcp
MCP_SERVER_VERSION=0.1.0

# Resource Paths
# By default, structs-mcp clones the structs-ai compendium into ./data/structs-ai
# on first run. Set AI_DOCS_PATH to use a different directory.
# AI_DOCS_PATH=../../ai

# Structs compendium repository (optional override)
# Default (if unset): https://github.com/playstructs/structs-ai.git
STRUCTS_MCP_COMPENDIUM_REPO=https://github.com/playstructs/structs-ai.git

# API Endpoints (defaults: localhost; for remote use set CONSENSUS_API_URL to reference node)
# Reference node (no local chain): CONSENSUS_API_URL=http://reactor.oh.energy:1317, CONSENSUS_RPC_URL=tcp://reactor.oh.energy:26657
CONSENSUS_RPC_URL=http://localhost:26657
CONSENSUS_API_URL=http://localhost:1317
WEBAPP_API_URL=http://localhost:8080

# Streaming (NATS)
NATS_URL=nats://localhost:4222
NATS_WEBSOCKET_URL=ws://localhost:1443

# Database (Required for transaction submission and player creation)
DATABASE_URL=postgresql://user:password@host:5432/structs
# Note: For remote connections, SSL is automatically enabled

# Database Access Control (DANGER variable)
# When DANGER=true: Database access enabled (transaction signing, player creation)
# When DANGER=false or unset: Read-only mode via webapp/structsd APIs only
# Default: DANGER=false (safe mode)
DANGER=false

# Proof-of-Work Configuration
# Target difficulty start value for hashing (wait until difficulty is at or below this value)
# Default: 5
TARGET_DIFFICULTY_START=5
```

---

## Docker Deployment

### Quick Start

```bash
# Build image
docker build -t structs-mcp-server .

# Run container
docker run -it \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e CONSENSUS_API_URL=http://localhost:1317 \
  structs-mcp-server
```

### Docker Compose

```bash
docker-compose up -d
```

**See**: `docs/guides/DOCKER.md` for complete Docker documentation.

---

## Documentation

- **Quick Reference**: `docs/guides/QUICK-REFERENCE.md`
- **Proof-of-Work**: `docs/guides/PROOF-OF-WORK.md` — initiate early, compute later, low difficulty (D=3).
- **Database Setup**: `docs/guides/DATABASE-SETUP.md`
- **Cursor Setup**: `docs/guides/CURSOR-SETUP.md`
- **Testing**: `docs/guides/TESTING.md`
- **Architecture**: `docs/design/architecture.md`
- **Tool Specifications**: `docs/design/tool-specifications.md`
- **Resource Scheme**: `docs/design/resource-scheme.md`
- **Integration Guide**: `docs/design/structs-webapp-integration.md`
- **Docker Setup**: `docs/guides/DOCKER.md`

**Backend / signer**: When the MCP server is used with a signer or backend that invokes `structsd`, that backend must use `--gas auto` (and follow other CLI rules above). Transaction submission in this repo goes through the database signer (`signer.tx_*`); gas is configured in that layer.

---

# Learn more

- [Structs](https://playstructs.com)
- [Project Wiki](https://watt.wiki)
- [@PlayStructs Twitter](https://twitter.com/playstructs)


# License

Copyright 2025 [Slow Ninja Inc](https://slow.ninja).

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

