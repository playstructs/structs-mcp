# Quick Reference Guide

Quick reference for the Structs MCP Server tools and usage.

---

## Tools Overview

**Total**: 27 tools

### Validation Tools (4)
- `structs_validate_entity_id` - Validate entity ID format
- `structs_validate_schema` - Validate data against JSON schema
- `structs_validate_transaction` - Validate transaction format
- `structs_validate_action` - Validate action requirements

### Query Tools (4)
- `structs_query_player` - Query player state
- `structs_query_planet` - Query planet state
- `structs_query_guild` - Query guild state
- `structs_query_endpoints` - List available API endpoints

### List Tools (4)
- `structs_list_players` - List all players (with pagination)
- `structs_list_planets` - List all planets (with pagination)
- `structs_list_structs` - List all structs (with pagination)
- `structs_list_struct_types` - List all struct types (with pagination)

### Activity Tools (1)
- `structs_query_planet_activity` - Query planet activity log from database

### Action Tools (2)
- `structs_action_create_player` - Create new player account
- `structs_action_submit_transaction` - Submit game transactions

### Error Lookup (1)
- `structs_lookup_error_code` - Look up error code information

### Calculation Tools (6)
- `structs_calculate_power` - Calculate power generation
- `structs_calculate_mining` - Calculate mining rate
- `structs_calculate_cost` - Calculate build cost
- `structs_calculate_damage` - Calculate combat damage
- `structs_calculate_trade_value` - Calculate trade value
- `structs_calculate_proof_of_work` - Compute proof-of-work

---

## Common Use Cases

### Create a Player

```json
{
  "name": "structs_action_create_player",
  "arguments": {
    "username": "myplayer",
    "guild_id": "0-1"
  }
}
```

**Returns**: `{ "role_id": 8, "status": "generating", "player_id": "1-29" }`

### Explore a Planet

```json
{
  "name": "structs_action_submit_transaction",
  "arguments": {
    "action": "explore",
    "player_id": "1-29",
    "args": {}
  }
}
```

**Returns**: `{ "status": "pending", "transaction_id": 123 }`

### Build a Struct

```json
{
  "name": "structs_action_submit_transaction",
  "arguments": {
    "action": "struct_build_initiate",
    "player_id": "1-29",
    "args": {
      "struct_type_id": 14,
      "operate_ambit": "land",
      "slot": 0
    }
  }
}
```

### Query Player

```json
{
  "name": "structs_query_player",
  "arguments": {
    "player_id": "1-29"
  }
}
```

### List Planets

```json
{
  "name": "structs_list_planets",
  "arguments": {
    "pagination_limit": 50
  }
}
```

### List Struct Types

```json
{
  "name": "structs_list_struct_types",
  "arguments": {}
}
```

### List Guilds

```json
{
  "name": "structs_list_guilds",
  "arguments": {
    "pagination_limit": 50
  }
}
```

### List Providers

```json
{
  "name": "structs_list_providers",
  "arguments": {}
}
```

### List Agreements

```json
{
  "name": "structs_list_agreements",
  "arguments": {}
}
```

### List Substations

```json
{
  "name": "structs_list_substations",
  "arguments": {}
}
```

### List Allocations

```json
{
  "name": "structs_list_allocations",
  "arguments": {}
}
```

### Query Planet Activity Log

```json
{
  "name": "structs_query_planet_activity",
  "arguments": {
    "planet_id": "2-1",
    "limit": 50,
    "start_time": "2025-01-01T00:00:00Z",
    "end_time": "2025-01-31T23:59:59Z"
  }
}
```

**Note**: Planet activity log requires `DATABASE_URL` to be set.

---

## Transaction Actions

Supported actions for `structs_action_submit_transaction`:

| Action | Required Args | Description |
|--------|--------------|-------------|
| `explore` | None | Explore and claim a planet |
| `struct_build_initiate` | `struct_type_id`, `operate_ambit`, `slot` | Start building a struct |
| `struct_build_complete` | `struct_id`, `proof`, `nonce` | Complete building a struct |
| `fleet_move` | `fleet_id`, `destination_planet_id` | Move fleet to planet |
| `guild_membership_join` | `guild_id` | Join a guild |
| `guild_membership_leave` | None | Leave current guild |

---

## Environment Variables

### Required for Transactions
- `DATABASE_URL` - PostgreSQL connection string

### Optional
- `MCP_TRANSPORT` - `stdio` (default) or `http`
- `MCP_HTTP_PORT` - HTTP port (default: 3000)
- `MCP_HTTP_HOST` - HTTP host (default: 0.0.0.0)
- `AI_DOCS_PATH` - Path to `/ai` directory (default: `../../ai`)
- `CONSENSUS_API_URL` - Consensus API URL (default: `http://localhost:1317`)
- `WEBAPP_API_URL` - Webapp API URL (default: `http://localhost:8080`)

---

## Quick Start

```bash
# Install
cd implementation
npm install

# Build
npm run build

# Run (stdio)
npm start

# Run (HTTP with database)
DATABASE_URL=postgresql://... MCP_TRANSPORT=http npm start
```

---

## Resources

All `/ai` documentation is available as MCP resources:

- `structs://schemas/...` - JSON schemas
- `structs://api/...` - API specifications
- `structs://guides/...` - Guides and tutorials
- `structs://protocols/...` - Protocol documentation
- `structs://reference/...` - Reference materials

---

*Last Updated: December 2025*
