# Design Update: Use signer.* Schema for Transaction Signing

**Date**: January 2025  
**Status**: ✅ Complete  
**Type**: Architecture Decision Update

---

## Summary

Updated the MCP server design to use the `signer.*` schema and database player creation instead of SigningClientManager.js for transaction signing. This approach avoids cryptographic key management in the MCP server and uses the proven Play Tester method.

---

## Key Change

### Previous Approach
- Use `SigningClientManager.js` from structs-webapp/src/js/
- Require cryptographic key management in MCP server
- Agent or server would need to manage private keys

### New Approach
- Use `signer.*` schema PostgreSQL functions
- Create players via `structs.player_internal_pending` table
- Submit transactions via `signer.tx_*` functions
- Database handles all signing internally
- No key management needed in MCP server

---

## Why This Change?

### Problem with SigningClientManager.js
- **Key Management**: Would require storing/managing cryptographic keys in MCP server
- **Security Risk**: Keys in server are a security concern
- **Complexity**: Key management adds unnecessary complexity
- **Awkward**: Not ideal for MCP server architecture

### Benefits of signer.* Schema
- ✅ **No Key Management**: Database handles all signing
- ✅ **Simple**: Use SQL functions, no cryptographic code needed
- ✅ **Proven**: Play Tester has successfully used this method
- ✅ **Secure**: Keys never leave database system
- ✅ **Scalable**: Database manages all player accounts

---

## Implementation Details

### Player Creation

**Method**: `INSERT INTO structs.player_internal_pending`

```sql
INSERT INTO structs.player_internal_pending(username, guild_id) 
VALUES ('mcp_agent_1', '0-1') 
RETURNING role_id;
```

**Process**:
1. INSERT creates entry in `player_internal_pending`
2. Trigger automatically creates role in `signer.role` table
3. Primary address automatically generated
4. Role status: `stub` → `generating` → `ready`
5. Player ID assigned when ready
6. Account created in `signer.account` with status `available`

### Transaction Submission

**Method**: `signer.tx_*` functions

**Examples**:
- `signer.tx_explore(_player_id)` - Explore a planet
- `signer.tx_struct_build_initiate(_player_id, _struct_type_id, _operate_ambit, _slot)` - Start building
- `signer.tx_struct_build_complete(_player_id, _struct_id, _proof, _nonce)` - Complete build
- `signer.tx_fleet_move(_player_id, _fleet_id, _destination_planet_id)` - Move fleet
- 80+ more functions available

**Process**:
1. MCP server calls `signer.tx_*` function with player_id and args
2. Function creates transaction in `signer.tx` table
3. Database signs transaction internally
4. Transaction status: `pending` → `broadcast`
5. Returns transaction hash and status

---

## Updated Documents

### Design Documents
- ✅ `design/transaction-signing.md` - Completely rewritten to use signer.* schema
- ✅ `design/architecture.md` - Updated integration approach
- ✅ `design/structs-webapp-integration.md` - Removed SigningClientManager.js dependency

### Key Changes
1. **Transaction Signing**: Now uses PostgreSQL functions instead of JavaScript signing
2. **Player Creation**: Uses database table instead of blockchain credentials
3. **Dependencies**: Added PostgreSQL client (`pg`) instead of SigningClientManager.js
4. **Architecture**: Database-driven instead of client-library-driven

---

## Database Schema

### Key Tables

**`signer.role`**:
- Player roles linked to player_id and guild_id
- Status: `generating`, `ready`, `active`
- Created automatically when player created

**`signer.account`**:
- Player accounts with addresses
- Status: `pending`, `available`, `active`
- Linked to roles via `role_id`

**`signer.tx`**:
- Transaction queue
- Contains: command, args, status, output
- Status: `pending` → `broadcast`
- Returns transaction hash

**`structs.player_internal_pending`**:
- Player creation table
- Triggers role creation
- Used for Discord functionality

---

## Tool Specification Update

### `structs_action_submit_transaction`

**Previous** (SigningClientManager.js):
```json
{
  "transaction": { /* signed transaction */ },
  "validate": true
}
```

**New** (signer.* schema):
```json
{
  "action": "explore",
  "player_id": "1-18",
  "args": {}
}
```

**Benefits**:
- Simpler input (no transaction structure needed)
- No signing required from agent
- Database handles everything

---

## Implementation Impact

### Phase 3: API Integration
- **Removed**: SigningClientManager.js integration
- **Added**: PostgreSQL database connection
- **Added**: Player creation via `structs.player_internal_pending`
- **Added**: Transaction submission via `signer.tx_*` functions

### Dependencies
- **Removed**: SigningClientManager.js dependency
- **Added**: `pg` (PostgreSQL client) package
- **Added**: Database connection configuration

### Code Changes
- **Removed**: Transaction signing code
- **Added**: Database client setup
- **Added**: SQL function calls
- **Added**: Player creation logic

---

## References

### Play Tester Documentation
- `ProductManagement/Playtester/working/database-playtesting-method.md` - Database playtesting method
- `ProductManagement/Playtester/working/creating-new-player-accounts.md` - Player creation guide
- `ProductManagement/Playtester/working/database-playtesting-session-2.md` - Player creation example

### Key Findings
- ✅ Player creation via `structs.player_internal_pending` works
- ✅ `signer.tx_*` functions create and sign transactions
- ✅ No blockchain credentials needed
- ✅ Database handles all signing internally

---

## Next Steps

1. **Update Implementation**:
   - Set up PostgreSQL connection
   - Implement player creation
   - Implement `signer.tx_*` function calls
   - Update action tool implementation

2. **Testing**:
   - Test player creation
   - Test transaction submission
   - Verify transaction signing works
   - Test error handling

3. **Documentation**:
   - Update agent documentation
   - Document player creation process
   - Document available actions

---

## Benefits Summary

1. ✅ **No Key Management**: Database handles all signing
2. ✅ **Simpler**: SQL functions instead of cryptographic code
3. ✅ **Proven**: Play Tester has successfully used this method
4. ✅ **Secure**: Keys never leave database system
5. ✅ **Scalable**: Database manages all player accounts
6. ✅ **Maintainable**: Less code, fewer dependencies

---

*Last Updated: January 2025*

