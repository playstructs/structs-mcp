# MCP Server Updates - December 2025

**Date**: December 13-14, 2025  
**Status**: ✅ Complete  
**Summary**: Database integration, HTTP transport fixes, and new features

---

## Overview

This document summarizes the significant improvements made to the Structs MCP Server, including database integration, HTTP transport fixes, and new tools.

---

## Major Changes

### 1. Database Integration ✅

**What Changed**:
- Added full PostgreSQL database integration
- Implemented transaction signing via `signer.tx_*` functions
- Added player creation via `structs.player_internal_pending` table

**Why**:
- The design document specified using `signer.*` schema, but it wasn't implemented
- Database-based signing is more secure (no key management)
- Simpler for clients (no pre-signing required)

**Files Added**:
- `src/utils/database.ts` - Database connection and query utilities

**Files Modified**:
- `src/tools/action.ts` - Complete rewrite to use database functions
- `src/server.ts` - Added player creation tool, updated transaction tool
- `package.json` - Added `pg` and `@types/pg` dependencies

**New Tools**:
- `structs_action_create_player` - Create new player accounts
- `structs_action_submit_transaction` - Updated to use `signer.tx_*` functions

**Benefits**:
- ✅ No key management required
- ✅ Database handles all signing internally
- ✅ Simpler API for clients
- ✅ More secure (keys never leave database)

---

### 2. HTTP Transport Fixes ✅

**What Changed**:
- Fixed HTTP transport to use `createMcpExpressApp()` properly
- Added Accept header normalization middleware
- Enabled JSON response mode for better compatibility

**Why**:
- Server was returning "Not Acceptable" errors
- Clients without proper Accept headers couldn't connect
- Better compatibility with various MCP clients

**Files Modified**:
- `src/server.ts` - HTTP transport setup completely rewritten

**Improvements**:
- ✅ Automatic Accept header normalization
- ✅ Works with clients that don't send proper headers
- ✅ JSON responses for better compatibility
- ✅ No special configuration needed in Cursor

---

### 3. SSL/TLS Database Support ✅

**What Changed**:
- Added automatic SSL/TLS support for database connections
- Handles both local and remote connections

**Why**:
- Remote databases require SSL/TLS
- Needed for production deployments

**Files Modified**:
- `src/utils/database.ts` - Added SSL configuration

---

## Tool Updates

### Updated Tools

**`structs_action_submit_transaction`**:
- **Before**: Required pre-signed transactions, submitted via API
- **After**: Uses `signer.tx_*` functions, database signs internally
- **New Parameters**: `action`, `player_id`, `args` (instead of `transaction`, `sign`)

**Supported Actions**:
- `explore` - Explore a planet
- `struct_build_initiate` - Start building a struct
- `struct_build_complete` - Complete building a struct
- `fleet_move` - Move a fleet
- `guild_membership_join` - Join a guild
- `guild_membership_leave` - Leave a guild

### New Tools

**`structs_action_create_player`**:
- Creates new player accounts via database
- Parameters: `username`, `guild_id`
- Returns: `role_id`, `player_id` (when ready), `status`

---

## Configuration Changes

### Required Environment Variables

**`DATABASE_URL`** is now **required** for:
- Transaction submission
- Player creation

**Format**:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**SSL**: Automatically enabled for remote connections

---

## Breaking Changes

### Transaction Submission API

**Old Format**:
```json
{
  "transaction": { /* pre-signed transaction */ },
  "sign": false
}
```

**New Format**:
```json
{
  "action": "explore",
  "player_id": "1-11",
  "args": {}
}
```

**Migration**: Update any code that calls `structs_action_submit_transaction` to use the new format.

---

## Testing

All existing tests still pass. New functionality has been tested:
- ✅ Player creation works
- ✅ Explore transaction works
- ✅ Database connection works
- ✅ HTTP transport works with various clients

---

## Documentation Updates

**New Documents**:
- `CHANGELOG.md` - Detailed change history
- `DATABASE-SETUP.md` - Database configuration guide
- `UPDATES-December2025.md` - This document

**Updated Documents**:
- `README.md` - Updated features, tools, configuration
- `CURSOR-SETUP.md` - Updated with database requirements, troubleshooting
- `../README.md` - Updated tool counts and phase status

---

## Migration Guide

### For Existing Users

1. **Install new dependencies**:
   ```bash
   npm install
   ```

2. **Set DATABASE_URL**:
   ```bash
   export DATABASE_URL=postgresql://user:password@host:port/database
   ```

3. **Rebuild**:
   ```bash
   npm run build
   ```

4. **Restart server**:
   ```bash
   MCP_TRANSPORT=http npm start
   ```

5. **Update client code** (if using transaction submission):
   - Change from old transaction format to new action format
   - See examples in `TESTING.md`

---

## Next Steps

### Recommended
- [ ] Add more `signer.tx_*` function mappings as needed
- [ ] Add transaction status polling tool
- [ ] Add player status checking tool

### Optional
- [ ] Add connection retry logic for database
- [ ] Add database connection health checks
- [ ] Add transaction result polling

---

## References

- **Design Document**: `../design/DESIGN-UPDATE-signer-schema.md`
- **Database Setup**: `DATABASE-SETUP.md`
- **Cursor Setup**: `CURSOR-SETUP.md`
- **Testing**: `TESTING.md`

---

*Last Updated: December 14, 2025*
