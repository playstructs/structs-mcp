# Transaction Signing for MCP Server

**Date**: January 2025  
**Status**: 🟢 Design Document  
**Version**: 0.1.0

---

## Overview

This document describes the transaction signing approach for the MCP server's action tools, specifically for `structs_action_submit_transaction` and related tools.

---

## Problem Statement

**Question**: How should the MCP server handle transaction signing?

**Context**:
- Action tools like `structs_action_submit_transaction` need to submit transactions to the blockchain
- Transactions must be signed with a private key
- MCP server cannot store private keys (security risk)
- Using SigningClientManager.js would require cryptographic key management in MCP server
- **Solution**: Use `signer.*` schema and database player creation (Play Tester method)

---

## Options Considered

### Option 1: MCP Server Signs Transactions ❌

**Approach**: MCP server stores private keys and signs transactions

**Pros**:
- Simple for agents (no signing needed)
- Centralized key management

**Cons**:
- 🔴 **Security Risk**: Private keys in MCP server
- 🔴 **Not Scalable**: One key per server instance
- 🔴 **Not Recommended**: Security best practice violation

**Decision**: ❌ **REJECTED** - Security risk too high

---

### Option 2: Use `signer.*` Schema and Database Player Creation ✅ RECOMMENDED

**Approach**: MCP server uses `signer.*` schema functions to create players and submit transactions

**Pros**:
- ✅ **No Key Management**: No cryptographic keys in MCP server
- ✅ **Database-Driven**: Uses PostgreSQL functions for signing
- ✅ **Simple**: Players created via `INSERT INTO structs.player_internal_pending`
- ✅ **Secure**: Signing handled by database system
- ✅ **Proven**: Play Tester has successfully used this method
- ✅ **Scalable**: Database handles all signing logic

**Cons**:
- Requires database connection (but MCP server already needs this for queries)
- Players must be created in database first

**Decision**: ✅ **RECOMMENDED** - Secure, simple, and proven approach

**Reference**: Play Tester documentation on database playtesting method

---

### Option 3: Hybrid - Optional Signing ⚠️ CONSIDER

**Approach**: MCP server can sign if key provided, but agent can also provide signed transaction

**Pros**:
- Flexibility for different use cases
- Can support both server-side and client-side signing

**Cons**:
- More complex implementation
- Still has security concerns if keys stored in server

**Decision**: ⚠️ **CONSIDER FOR FUTURE** - Not for initial implementation

---

## Recommended Approach: Use `signer.*` Schema

### Architecture

```
┌─────────────┐
│ AI Agent    │
│             │
│ 1. Request  │
│    Action   │
│             │
│ 2. Call     │
│    MCP Tool │
│    (player_id)
└──────┬──────┘
       │
       │ Action Request
       ▼
┌─────────────┐
│ MCP Server   │
│             │
│ 1. Validate │
│    Request  │
│             │
│ 2. Call     │
│    signer.tx_*│
│    Function │
│             │
│ 3. Return   │
│    Result   │
└──────┬──────┘
       │
       │ Database Function Call
       ▼
┌─────────────┐
│ PostgreSQL   │
│ (signer.*)  │
│             │
│ 1. Create   │
│    Transaction
│             │
│ 2. Sign     │
│    (Internal)│
│             │
│ 3. Broadcast│
│    to Chain │
└─────────────┘
```

### Player Creation

**Method**: Use `structs.player_internal_pending` table (Play Tester method)

```sql
-- Create a new player for MCP server use
INSERT INTO structs.player_internal_pending(username, guild_id) 
VALUES ('mcp_agent_1', '0-1') 
RETURNING role_id;
```

**What Happens**:
1. INSERT creates entry in `player_internal_pending`
2. Trigger automatically creates role in `signer.role` table
3. Primary address automatically generated
4. Role status: `stub` → `generating` → `ready`
5. Player ID assigned when ready
6. Account created in `signer.account` with status `available`

**Reference**: `ProductManagement/Playtester/working/database-playtesting-method.md`

---

## Tool Specification

### `structs_action_submit_transaction`

**Purpose**: Submit a transaction using `signer.*` schema functions

**Input**:
```json
{
  "action": "explore",  // or "struct_build_initiate", "fleet_move", etc.
  "player_id": "1-18",
  "args": {
    // Action-specific arguments
    // For explore: {}
    // For struct_build_initiate: { struct_type_id, operate_ambit, slot }
    // etc.
  }
}
```

**Output**:
```json
{
  "transaction_id": 123,
  "transaction_hash": "0x...",
  "status": "broadcast",
  "command": "planet-explore",
  "message": "Transaction created and broadcast successfully"
}
```

**Error Handling**:
- Invalid player_id
- Invalid action
- Invalid arguments
- Player not found
- Transaction creation errors

### Available `signer.tx_*` Functions

Based on Play Tester documentation, available functions include:
- `signer.tx_explore(_player_id)` - Explore a planet
- `signer.tx_struct_build_initiate(_player_id, _struct_type_id, _operate_ambit, _slot)` - Start building a struct
- `signer.tx_struct_build_complete(_player_id, _struct_id, _proof, _nonce)` - Complete struct build
- `signer.tx_fleet_move(_player_id, _fleet_id, _destination_planet_id)` - Move fleet
- `signer.tx_player_resume(_player_id)` - Resume/create player
- And 80+ more functions

**Reference**: `ProductManagement/Playtester/working/database-playtesting-method.md`

---

## Transaction Validation

The MCP server should validate transactions before submission:

### Validation Steps

1. **Format Validation**:
   - Check transaction structure
   - Validate Cosmos SDK message format
   - Verify required fields present

2. **Signature Validation**:
   - Verify signatures are present
   - Validate signature format
   - Check signature matches signer

3. **Business Logic Validation** (Optional):
   - Check sufficient funds
   - Validate action requirements
   - Verify game state constraints

---

## Agent Implementation Guide

### For Agents Using MCP Server

**Step 1**: Ensure Player Exists in Database
```sql
-- MCP server creates player on first use (or agent can request player creation)
INSERT INTO structs.player_internal_pending(username, guild_id) 
VALUES ('agent_player_1', '0-1') 
RETURNING role_id;
```

**Step 2**: Use MCP Tool with Player ID
```typescript
// Agent calls MCP tool with action and player_id
// MCP server handles transaction creation and signing via signer.* functions
const result = await mcp.callTool('structs_action_submit_transaction', {
  action: 'explore',
  player_id: '1-18',
  args: {}
});

// For building a struct
const buildResult = await mcp.callTool('structs_action_submit_transaction', {
  action: 'struct_build_initiate',
  player_id: '1-18',
  args: {
    struct_type_id: 14,  // Ore Extractor
    operate_ambit: 'land',
    slot: 0
  }
});
```

**Step 3**: Check Transaction Status
```typescript
// MCP server returns transaction info
// Agent can query transaction status if needed
const txStatus = await mcp.callTool('structs_query_transaction', {
  transaction_id: result.transaction_id
});
```

---

## Alternative: Server-Side Signing (Future)

If server-side signing is needed in the future, consider:

### Secure Key Management

1. **Key Storage**:
   - Use secure key management service (e.g., HashiCorp Vault)
   - Never store keys in plain text
   - Use environment variables or secure config

2. **Key Rotation**:
   - Support key rotation
   - Multiple keys for different purposes

3. **Access Control**:
   - Limit which agents can use server-side signing
   - Audit logging for all signed transactions

### Implementation (Future)

```json
{
  "transaction": { /* unsigned transaction */ },
  "sign": true,
  "signer_config": "default"  // or specific key identifier
}
```

**Note**: This requires secure key management infrastructure

---

## Security Considerations

### Best Practices

1. ✅ **Never Store Private Keys in MCP Server**
   - Private keys should remain with agent
   - MCP server only validates and submits

2. ✅ **Validate All Transactions**
   - Check format, signatures, business logic
   - Prevent invalid transactions from being submitted

3. ✅ **Error Handling**
   - Don't expose sensitive information in errors
   - Log transactions for audit (without private keys)

4. ✅ **Rate Limiting**
   - Prevent transaction spam
   - Limit transaction submission rate

---

## Error Codes

### Transaction Validation Errors

- `INVALID_TRANSACTION_FORMAT` - Transaction structure invalid
- `INVALID_SIGNATURE` - Signature validation failed
- `INSUFFICIENT_FUNDS` - Not enough funds for transaction
- `VALIDATION_ERROR` - Business logic validation failed
- `SUBMISSION_ERROR` - API submission failed

---

## Testing

### Test Cases

1. **Valid Signed Transaction**:
   - Should submit successfully
   - Should return transaction hash

2. **Invalid Signature**:
   - Should return validation error
   - Should not submit to blockchain

3. **Invalid Format**:
   - Should return format error
   - Should not submit to blockchain

4. **Insufficient Funds**:
   - Should return funds error
   - Should not submit to blockchain

---

## Implementation Notes

### Phase 3 Implementation

**Priority**: 🟡 **HIGH** - Required for action tools

**Tasks**:
1. Set up PostgreSQL database connection (structs-pg container)
2. Implement player creation via `structs.player_internal_pending`
3. Implement `signer.tx_*` function calls for actions
4. Map action names to `signer.tx_*` functions
5. Implement transaction status checking
6. Implement error handling
7. Add test cases
8. Document for agents

**Dependencies**:
- Database connection (PostgreSQL client)
- Access to structs-pg container
- Validation tools (Phase 2)

**Database Schema**:
- `signer.role` - Player roles
- `signer.account` - Player accounts
- `signer.tx` - Transaction queue
- `structs.player_internal_pending` - Player creation

**Reference**: 
- `ProductManagement/Playtester/working/database-playtesting-method.md`
- `ProductManagement/Playtester/working/creating-new-player-accounts.md`

---

## Related Documents

- `design/tool-specifications.md` - Tool API specifications
- `design/architecture.md` - System architecture
- `technical/api-reference.md` - API endpoint details
- `technical/client-libraries.md` - Client library usage

---

## Questions

1. **Key Management**: Should we support server-side signing in future?
2. **Validation**: How strict should transaction validation be?
3. **Error Messages**: How much detail should error messages include?
4. **Rate Limiting**: What rate limits should we enforce?

---

*Last Updated: January 2025 - Updated to use signer.* schema (Play Tester method)*


