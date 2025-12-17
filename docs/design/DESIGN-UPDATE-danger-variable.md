# Design Update: DANGER Environment Variable

**Date**: December 2025  
**Status**: ✅ **DECIDED**  
**Purpose**: Document the addition of `DANGER` environment variable for database access control

---

## Overview

The MCP server now includes a `DANGER` environment variable that controls database access for write operations. This allows running the server in a safe read-only mode without database write access.

---

## Rationale

### Problem
- Database access is required for transaction signing and player creation
- Not all use cases need write access (e.g., read-only agents, testing, documentation)
- Accidental transaction submission or player creation could be problematic
- Need a way to safely run the server without database write access

### Solution
- Add `DANGER` environment variable to control database access
- Default to safe mode (`DANGER=false`)
- When enabled, allow database write operations
- When disabled, only allow read-only operations via webapp/structsd APIs

---

## Implementation Details

### Environment Variable

**Name**: `DANGER`  
**Type**: Boolean (string: "true" or "false")  
**Default**: `false` (safe mode)  
**Required**: No

### Behavior

#### When `DANGER=true` (Database Access Enabled)
- ✅ `structs_action_submit_transaction` - Can submit transactions via `signer.tx_*` functions
- ✅ `structs_action_create_player` - Can create players via `structs.player_internal_pending`
- ✅ `structs_query_planet_activity` - Can query database activity log
- ✅ All other tools work normally

#### When `DANGER=false` or unset (Read-Only Mode)
- ❌ `structs_action_submit_transaction` - Returns error: "Database access disabled. Set DANGER=true to enable transaction submission."
- ❌ `structs_action_create_player` - Returns error: "Database access disabled. Set DANGER=true to enable player creation."
- ❌ `structs_query_planet_activity` - Returns error: "Database access disabled. Set DANGER=true to enable database queries."
- ✅ All other tools work normally (read-only via webapp/structsd APIs)

### Affected Tools

1. **`structs_action_submit_transaction`**
   - Requires `DANGER=true`
   - Uses `signer.tx_*` functions for transaction signing
   - Error when disabled: Clear message explaining requirement

2. **`structs_action_create_player`**
   - Requires `DANGER=true`
   - Uses `structs.player_internal_pending` table
   - Error when disabled: Clear message explaining requirement

3. **`structs_query_planet_activity`**
   - Requires `DANGER=true`
   - Queries database for activity history
   - Error when disabled: Clear message explaining requirement

### Error Messages

When database access is disabled, tools return clear error messages:

```json
{
  "status": "error",
  "message": "Database access disabled. Set DANGER=true to enable transaction submission.",
  "error": "DANGER_DISABLED",
  "details": {
    "tool": "structs_action_submit_transaction",
    "required": "DANGER=true"
  }
}
```

---

## Configuration Examples

### Safe Mode (Read-Only)
```bash
# .env file
CONSENSUS_API_URL=http://localhost:1317
WEBAPP_API_URL=http://localhost:8080
# DANGER not set or explicitly false
DANGER=false
```

**Result**: Server runs in read-only mode, can query game state but cannot submit transactions or create players.

### Full Access Mode
```bash
# .env file
CONSENSUS_API_URL=http://localhost:1317
WEBAPP_API_URL=http://localhost:8080
DATABASE_URL=postgresql://user:password@host:5432/structs
DANGER=true
```

**Result**: Server has full access, can submit transactions and create players.

---

## Security Considerations

### Default Behavior
- **Default**: `DANGER=false` (safe mode)
- **Rationale**: Fail-safe default prevents accidental write operations
- **Impact**: Users must explicitly enable database access

### Use Cases

**Safe Mode (`DANGER=false`)**:
- Read-only agents (documentation, analysis)
- Testing without database access
- Development environments
- Public-facing instances

**Full Access Mode (`DANGER=true`)**:
- Agents that need to play the game
- Transaction submission testing
- Player creation workflows
- Production game-playing instances

### Best Practices

1. **Always use safe mode by default**
   - Only enable `DANGER=true` when needed
   - Document why database access is required

2. **Environment-specific configuration**
   - Development: `DANGER=false` (safe)
   - Testing: `DANGER=true` (if needed)
   - Production: `DANGER=true` (if needed, with proper security)

3. **Clear error messages**
   - Tools return helpful error messages when disabled
   - Error messages explain how to enable access

---

## Implementation Requirements

### Code Changes

1. **Configuration**
   - Read `DANGER` environment variable
   - Default to `false` if not set
   - Validate value (must be "true" or "false")

2. **Tool Handlers**
   - Check `DANGER` before database operations
   - Return clear error if disabled
   - Log attempts to use disabled features

3. **Error Handling**
   - Consistent error format
   - Clear error messages
   - Helpful suggestions

### Files to Update

- `src/config.ts` - Add DANGER configuration
- `src/tools/action.ts` - Check DANGER before database operations
- `src/tools/query.ts` - Check DANGER for `structs_query_planet_activity`
- `src/utils/database.ts` - Add DANGER check helper function
- Documentation files - Update with DANGER variable

---

## Impact on Design Documents

- ✅ `design/architecture.md` - Updated Security & Authentication section
- ✅ `design/decisions-log.md` - Added Decision 7
- ✅ `implementation/README.md` - Added DANGER to environment variables
- ✅ `implementation/DATABASE-SETUP.md` - Added DANGER documentation
- ✅ `DESIGN-REVIEW-AND-NEXT-STEPS.md` - Added to security enhancements

---

## Testing

### Test Cases

1. **Safe Mode (DANGER=false)**
   - ✅ Read-only tools work
   - ✅ Query tools work (via webapp/structsd APIs)
   - ❌ `structs_action_submit_transaction` returns error
   - ❌ `structs_action_create_player` returns error
   - ❌ `structs_query_planet_activity` returns error

2. **Full Access Mode (DANGER=true)**
   - ✅ All tools work
   - ✅ Transaction submission works
   - ✅ Player creation works
   - ✅ Database queries work

3. **Default Behavior**
   - ✅ Defaults to safe mode when not set
   - ✅ Explicit `DANGER=false` works
   - ✅ Explicit `DANGER=true` works

---

## Benefits

1. **Safety**
   - Default safe mode prevents accidental writes
   - Clear error messages guide users
   - Explicit opt-in for write operations

2. **Flexibility**
   - Can run in read-only mode when database not needed
   - Can enable write access when required
   - Environment-specific configuration

3. **Security**
   - Reduces attack surface in read-only mode
   - Prevents accidental transaction submission
   - Better separation of concerns

4. **Developer Experience**
   - Clear error messages
   - Easy to understand and configure
   - Good defaults

---

## Related Documents

- `design/architecture.md` - Security & Authentication section
- `design/transaction-signing.md` - Transaction signing approach
- `implementation/DATABASE-SETUP.md` - Database setup guide
- `implementation/README.md` - Environment variables

---

*Last Updated: December 2025*

