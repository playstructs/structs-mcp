# Testing the MCP Server

This guide explains how to test the Structs MCP Server.

## Prerequisites

**For transaction and player creation tests**, you need:
- `DATABASE_URL` environment variable set
- Database with `signer.*` schema installed
- See `DATABASE-SETUP.md` for configuration

**For basic tests** (queries, validation, calculations), database is optional.

## Quick Test Script

Use the included test script:

```bash
cd implementation
node test-mcp-server.js
```

This will test:
1. Server initialization (GET request)
2. List tools (`tools/list`)
3. List resources (`resources/list`)
4. Call a tool (`tools/call` with `structs_query_player`)

## Manual Testing with curl

### 1. Test Server Health

```bash
curl http://localhost:3000/mcp
```

### 2. List Available Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### 3. List Resources

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/list",
    "params": {}
  }'
```

### 4. Call a Tool (Query Player)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "structs_query_player",
      "arguments": {
        "player_id": "1-11"
      }
    }
  }'
```

### 5. Create a Player (Requires DATABASE_URL)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "structs_action_create_player",
      "arguments": {
        "username": "testplayer",
        "guild_id": "0-1"
      }
    }
  }'
```

### 6. Submit Explore Transaction (Requires DATABASE_URL)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "structs_action_submit_transaction",
      "arguments": {
        "action": "explore",
        "player_id": "1-11",
        "args": {}
      }
    }
  }'
```

### 7. List Planets

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "structs_list_planets",
      "arguments": {
        "pagination_limit": 10
      }
    }
  }'
```

### 8. List Struct Types

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "structs_list_struct_types",
      "arguments": {}
    }
  }'
```

### 9. List Guilds

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "structs_list_guilds",
      "arguments": {}
    }
  }'
```

### 10. List Providers

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "structs_list_providers",
      "arguments": {}
    }
  }'
```

### 11. List Agreements

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/call",
    "params": {
      "name": "structs_list_agreements",
      "arguments": {}
    }
  }'
```

### 12. List Substations

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 12,
    "method": "tools/call",
    "params": {
      "name": "structs_list_substations",
      "arguments": {}
    }
  }'
```

### 13. List Allocations

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 13,
    "method": "tools/call",
    "params": {
      "name": "structs_list_allocations",
      "arguments": {}
    }
  }'
```

### 14. Query Planet Activity Log (Requires DATABASE_URL)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 14,
    "method": "tools/call",
    "params": {
      "name": "structs_query_planet_activity",
      "arguments": {
        "planet_id": "2-1",
        "limit": 50
      }
    }
  }'
```

### 5. List Players

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "structs_list_players",
      "arguments": {}
    }
  }'
```

## Testing with MCP Client

### Using Cursor

1. Configure the MCP server in Cursor settings:
   ```json
   {
     "mcpServers": {
       "structs": {
         "url": "http://localhost:3000/mcp",
         "transport": "http"
       }
     }
   }
   ```

2. Restart Cursor

3. Check the MCP server status in Cursor's MCP panel

4. Try using tools:
   - "List all players using the structs MCP tool"
   - "Query player 1-11"
   - "Show me available resources"

### Using Claude Desktop

Configure in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "structs-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/structs-docs/ProductManagement/Projects/structs-mcp/implementation/dist/server.js"
      ],
      "env": {
        "AI_DOCS_PATH": "/absolute/path/to/structs-docs/ai",
        "CONSENSUS_API_URL": "http://localhost:1317",
        "WEBAPP_API_URL": "http://localhost:8080",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## Expected Results

### tools/list Response

Should return a list of all available tools including:
- `structs_list_players` - List all players
- `structs_list_planets` - List all planets
- `structs_list_structs` - List all structs
- `structs_list_struct_types` - List all struct types
- `structs_list_guilds` - List all guilds
- `structs_list_providers` - List all providers
- `structs_list_agreements` - List all agreements
- `structs_list_substations` - List all substations
- `structs_list_allocations` - List all allocations
- `structs_query_player` - Query player state
- `structs_query_planet` - Query planet state
- `structs_query_guild` - Query guild state
- `structs_query_planet_activity` - Query planet activity log (requires DATABASE_URL)
- `structs_validate_entity_id` - Validate entity IDs
- `structs_validate_schema` - Validate against schemas
- `structs_action_create_player` - Create new players (requires DATABASE_URL)
- `structs_action_submit_transaction` - Submit transactions (requires DATABASE_URL)
- `structs_calculate_power` - Calculate power generation
- ... and more (27 tools total)

### resources/list Response

Should return a list of all available resources from the `/ai` directory, organized by category:
- `structs://schemas/...`
- `structs://api/...`
- `structs://guides/...`
- etc.

### tools/call Response

Should return the result of the tool execution. For example, `structs_query_player` with `player_id: "1-11"` should return player data from the consensus API.

## Troubleshooting

### "Server not initialized" Error

- Ensure the server is running: `MCP_TRANSPORT=http npm start`
- Check that port 3000 is not in use: `lsof -i :3000`
- Verify the server logs for errors

### Connection Refused

- Check if the server is running
- Verify the port number matches your configuration
- Check firewall settings

### Tools Not Loading in Cursor

- Restart Cursor after configuration changes
- Check Cursor's MCP server logs
- Verify the server URL is correct
- Ensure the server is running in HTTP mode (`MCP_TRANSPORT=http`)

## Unit Tests

Run the full test suite:

```bash
npm test
```

This runs all 68 unit tests covering:
- URI parsing and validation
- Resource server functionality
- Validation tools
- Proof-of-work calculations

