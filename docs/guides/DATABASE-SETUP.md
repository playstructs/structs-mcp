# Database Setup Guide

This guide explains how to configure the database connection for the Structs MCP Server.

---

## Overview

The MCP server uses PostgreSQL with the `signer.*` schema for:
- **Transaction Signing**: All transactions are signed by the database using `signer.tx_*` functions
- **Player Creation**: New players are created via `structs.player_internal_pending` table
- **No Key Management**: Database handles all cryptographic operations internally

**⚠️ Security Note**: Database access is controlled by the `DANGER` environment variable. When `DANGER=false` (default), the server runs in read-only mode and cannot perform transactions or create players.

---

## Prerequisites

- PostgreSQL database with `signer.*` schema installed
- Database user with appropriate permissions
- Network access to the database (if remote)

---

## Configuration

### Environment Variables

#### DATABASE_URL

Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL=postgresql://user:password@host:port/database
```

### Connection String Formats

**Local Connection**:
```bash
DATABASE_URL=postgresql://structs_webapp@localhost:5432/structs
```

**Remote Connection** (SSL automatically enabled):
```bash
DATABASE_URL=postgresql://user:password@remote-host:5432/structs
```

**Docker Network**:
```bash
DATABASE_URL=postgresql://structs_webapp@structs-pg:5432/structs
```

**With SSL Parameters**:
```bash
DATABASE_URL=postgresql://user:password@host:5432/structs?sslmode=require
```

#### DANGER (Database Access Control)

Control whether the server can access the database for write operations:

```bash
# Enable database access (transaction signing, player creation)
DANGER=true

# Disable database access (read-only mode via webapp/structsd APIs)
DANGER=false

# Default: DANGER=false (safe mode)
```

**When `DANGER=true`**:
- ✅ `structs_action_submit_transaction` - Can submit transactions
- ✅ `structs_action_create_player` - Can create players
- ✅ `structs_query_planet_activity` - Can query database activity log

**When `DANGER=false` or unset**:
- ❌ `structs_action_submit_transaction` - Returns error (database access disabled)
- ❌ `structs_action_create_player` - Returns error (database access disabled)
- ❌ `structs_query_planet_activity` - Returns error (database access disabled)
- ✅ All other tools work normally (read-only via webapp/structsd APIs)

**Security**: Always use `DANGER=false` unless you specifically need database write access.

---

## SSL/TLS Configuration

The server automatically enables SSL/TLS for remote database connections. If you need to disable SSL for local connections:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/structs?sslmode=disable
```

---

## Testing the Connection

The server will check the database connection on startup. If the connection fails, you'll see an error message.

To test manually:

```bash
# Start server with DATABASE_URL
DATABASE_URL=postgresql://... npm start

# Check server logs for connection status
```

---

## Available Database Functions

### Transaction Functions

- `signer.tx_explore(_player_id)` - Explore a planet
- `signer.tx_struct_build_initiate(_player_id, _struct_type_id, _operate_ambit, _slot)` - Start building
- `signer.tx_struct_build_complete(_player_id, _struct_id, _proof, _nonce)` - Complete build
- `signer.tx_fleet_move(_player_id, _fleet_id, _destination_planet_id)` - Move fleet
- `signer.tx_guild_membership_join(_player_id, _guild_id)` - Join guild
- `signer.tx_guild_membership_leave(_player_id)` - Leave guild

### Player Creation

- `INSERT INTO structs.player_internal_pending(username, guild_id)` - Create new player

---

## Troubleshooting

### Connection Refused

**Error**: `getaddrinfo ENOTFOUND structs-pg`

**Solution**: 
- Check database hostname/IP
- Verify database is running
- Check network connectivity
- For Docker, ensure containers are on same network

### SSL Required

**Error**: `no pg_hba.conf entry for host "...", no encryption`

**Solution**: 
- The server automatically enables SSL for remote connections
- For local connections, add `?sslmode=disable` if needed
- Ensure database allows SSL connections

### Authentication Failed

**Error**: `password authentication failed`

**Solution**:
- Verify username and password in `DATABASE_URL`
- Check database user permissions
- Ensure user has access to `signer.*` schema

### Schema Not Found

**Error**: `schema "signer" does not exist`

**Solution**:
- Ensure `signer.*` schema is installed in database
- Check database migrations have been run
- Verify user has access to `signer` schema

---

## Security Notes

- **Never commit `DATABASE_URL` to version control**
- Use environment variables or secure secret management
- Database credentials should be kept secure
- SSL/TLS is automatically enabled for remote connections
- Connection pooling limits concurrent connections

---

## Example Setup

### Local Development

```bash
# .env file
DATABASE_URL=postgresql://structs_webapp@localhost:5432/structs?sslmode=disable
MCP_TRANSPORT=http
MCP_HTTP_PORT=3000
```

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://structs_webapp@structs-pg:5432/structs \
  -e MCP_TRANSPORT=http \
  structs-mcp-server
```

### Production

```bash
export DATABASE_URL=postgresql://user:password@db.example.com:5432/structs
MCP_TRANSPORT=http npm start
```

---

*Last Updated: December 2025*
