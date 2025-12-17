# Cursor Integration Setup

This guide explains how to configure the Structs MCP Server for use with Cursor.

---

## Quick Start

### 1. Start the MCP Server in HTTP Mode

**Using Docker Compose** (Recommended):

```bash
cd implementation
MCP_TRANSPORT=http docker-compose up -d
```

**Using Docker**:

```bash
cd implementation
docker build -t structs-mcp-server .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e MCP_TRANSPORT=http \
  -e MCP_HTTP_PORT=3000 \
  -e MCP_HTTP_HOST=0.0.0.0 \
  -e CONSENSUS_API_URL=http://host.docker.internal:1317 \
  -e WEBAPP_API_URL=http://host.docker.internal:8080 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e NATS_WEBSOCKET_URL=ws://host.docker.internal:1443 \
  structs-mcp-server
```

**With database** (optional):
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e MCP_TRANSPORT=http \
  -e CONSENSUS_API_URL=http://host.docker.internal:1317 \
  -e WEBAPP_API_URL=http://host.docker.internal:8080 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e 'DATABASE_URL=postgresql://user:password@host.docker.internal:5432/structs' \
  structs-mcp-server
```

**Note**: Always quote the `DATABASE_URL` value to prevent shell interpretation of special characters like `?`:
```bash
# For structs-pg container (if running in same Docker network)
-e 'DATABASE_URL=postgres://structs_webapp@structs-pg:5432/structs?serverVersion=17'
```

**Using npm** (Local Development):

```bash
cd implementation
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 npm start
```

---

## 2. Configure Cursor

### Option A: Using Cursor Settings UI

1. Open Cursor Settings
2. Navigate to **Features** → **Model Context Protocol**
3. Click **Add Server**
4. Configure:
   - **Name**: `Structs MCP Server`
   - **URL**: `http://localhost:3000/mcp`
   - **Transport**: `HTTP` or `SSE`

### Option B: Using Cursor Config File

Add to your Cursor configuration file (usually `~/.cursor/mcp.json` or `~/.cursor/config.json`):

**Basic Configuration:**
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

**With Custom Headers (if needed):**
If Cursor doesn't automatically set the correct Accept headers, you can explicitly configure them:

```json
{
  "mcpServers": {
    "structs": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Note**: Cursor's MCP client should automatically handle the Accept headers for Streamable HTTP transport, but if you encounter "Not Acceptable" errors, adding the headers explicitly may help.

---

## 3. Verify Connection

Once configured, Cursor should be able to:
- ✅ List available tools (validation, query, action, calculation)
- ✅ Access resources (schemas, APIs, protocols)
- ✅ Query game state (players, planets, guilds)
- ✅ Create new players
- ✅ Submit transactions (explore, build, move fleet, etc.)
- ✅ Calculate formulas

---

## Environment Variables

### Transport Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_HTTP_PORT` | `3000` | HTTP port for MCP server |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP host binding |

### API Endpoints (Required)

| Variable | Default | Description |
|----------|---------|-------------|
| `CONSENSUS_API_URL` | `http://localhost:1317` | Structs consensus API URL |
| `WEBAPP_API_URL` | `http://localhost:8080` | Structs webapp API URL |
| `NATS_URL` | `nats://localhost:4222` | NATS messaging server URL |
| `NATS_WEBSOCKET_URL` | `ws://localhost:1443` | NATS WebSocket URL |

### Database (Required for Transactions)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (none) | PostgreSQL database connection string (**required** for transaction submission and player creation) |
| `AI_DOCS_PATH` | `../../ai` | Path to AI documentation |

**Note**: The database connection automatically enables SSL/TLS for remote connections. For local connections, you may need to add `?sslmode=disable` to the connection string.

### Docker Notes

When running in Docker, use `host.docker.internal` instead of `localhost`:
- `CONSENSUS_API_URL=http://host.docker.internal:1317`
- `WEBAPP_API_URL=http://host.docker.internal:8080`
- `NATS_URL=nats://host.docker.internal:4222`

---

## Troubleshooting

### Server Not Starting

**Check logs**:
```bash
docker logs structs-mcp-server
# or
npm start  # Check console output
```

**Verify port is available**:
```bash
lsof -i :3000
# or
netstat -an | grep 3000
```

### Cursor Can't Connect

1. **Verify server is running**:
   ```bash
   curl http://localhost:3000/mcp
   ```

2. **Check CORS settings** (if needed):
   - The server includes CORS headers by default
   - For custom hosts, update `allowedHosts` in server code

3. **Check firewall**:
   - Ensure port 3000 is not blocked
   - For Docker, ensure port mapping is correct

### "Not Acceptable" Error (406)

If you see errors like:
- `"Not Acceptable: Client must accept text/event-stream"`
- `"Not Acceptable: Client must accept both application/json and text/event-stream"`

**Solution**: Add explicit headers to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "structs": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Note**: Most MCP clients (including Cursor) should automatically set these headers, but if you encounter this error, adding them explicitly will resolve it.

### Transport Mode

- **stdio**: For command-line MCP clients (default)
- **http**: For HTTP-based clients like Cursor (use `MCP_TRANSPORT=http`)

---

## Advanced Configuration

### Custom Port

```bash
MCP_HTTP_PORT=8080 MCP_TRANSPORT=http npm start
```

### Custom Host

```bash
MCP_HTTP_HOST=127.0.0.1 MCP_TRANSPORT=http npm start
```

### Docker with Custom Port

```bash
docker run -d \
  -p 8080:8080 \
  -e MCP_TRANSPORT=http \
  -e MCP_HTTP_PORT=8080 \
  structs-mcp-server
```

---

## Next Steps

- See [DOCKER.md](DOCKER.md) for Docker setup details
- See [README.md](../../README.md) for general server documentation
- See [integration-testing-guide.md](../working/developer-relations/integration-testing-guide.md) for testing

---

*Last updated: January 2025*

