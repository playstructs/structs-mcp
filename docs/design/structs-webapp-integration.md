# Structs-Webapp Integration Guide

**Date**: December 8, 2025  
**Status**: 🟢 Design Document  
**Purpose**: Guide for integrating structs-webapp/src/js/ modules into MCP server

---

## Overview

The MCP server will use JavaScript modules from `structs-webapp/src/js/` as the foundation for API integration, transaction signing, proof-of-work hashing, and streaming functionality.

**Key Reference**: `structs-webapp/src/js/index.js` shows how all the different JS pieces fit together and is the entry point for understanding the module structure.

---

## Module Structure

**Entry Point**: `structs-webapp/src/js/index.js`
- This file shows how all the different JS pieces fit together
- Use this as the reference for understanding module organization
- Shows dependencies and relationships between modules

---

## Key Modules from structs-webapp/src/js/

### 1. TaskManager.js ✅ **IMPLEMENTED**

**Purpose**: Proof-of-work hashing functionality

**Status**: ✅ **IMPLEMENTED** - TaskManager-style hashing implemented in TypeScript

**Implementation**:
- ✅ Core hashing logic implemented in `src/utils/proof-of-work.ts`
- ✅ Matches Go implementation (`x/structs/types/work.go`)
- ✅ All 4 action types supported
- ✅ Age-based difficulty calculation
- ✅ SHA256 hashing
- ✅ 19 tests, all passing

**Use Cases**:
- Struct building completion (`MsgStructBuildComplete`)
- Planet raid completion (`MsgPlanetRaidComplete`)
- Ore mining completion (`MsgStructOreMinerComplete`)
- Ore refining completion (`MsgStructOreRefineryComplete`)

**Integration**:
- ✅ Integrated into `structs_calculate_proof_of_work` tool
- ✅ Handles hash computation and nonce finding
- ✅ Implements difficulty checking

**Note**: While TaskManager.js from structs-webapp could be used, we've implemented the same logic in TypeScript for better integration with the MCP server.

---

### 2. SigningClientManager.js ❌ NOT USED

**Status**: ❌ **NOT USED** - Using `signer.*` schema approach instead

**Reason**: Using SigningClientManager.js would require cryptographic key management in MCP server, which is awkward and insecure.

**Alternative**: ✅ **USING** `signer.*` schema and database player creation (Play Tester method)
- Players created via `INSERT INTO structs.player_internal_pending`
- Transactions submitted via `signer.tx_*` functions
- No key management needed
- Database handles all signing internally

**Current Implementation**:
- `structs_action_submit_transaction` tool uses `signer.tx_*` functions for server-side transaction signing
- `structs_action_create_player` tool uses `structs.player_internal_pending` for player creation
- Database handles all signing internally via PostgreSQL functions
- No agent-side signing required (server-side approach)

**Reference**: 
- `design/transaction-signing.md` - Transaction signing approach
- `design/DESIGN-UPDATE-signer-schema.md` - Design update summary
- `working/developer-relations/transaction-signing-approach.md` - Implementation approach
- `ProductManagement/Playtester/working/database-playtesting-method.md` - Play Tester documentation

---

### 3. GRASS Examples

**Purpose**: Real-time streaming integration

**Use Cases**:
- Subscribing to game state updates
- Receiving real-time events
- NATS/WebSocket integration

**Integration**:
- Use for streaming server implementation
- Provides NATS client examples
- Handles subscription management

**Example Usage**:
```javascript
// Use GRASS examples from structs-webapp/src/js/
// for NATS subscription patterns
// See index.js for how GRASS integration is structured
```

---

### 4. Game State and API Logic

**Purpose**: Game state access and API interactions

**Use Cases**:
- Querying player state
- Querying planet state
- Querying guild state
- API endpoint interactions

**Integration**:
- Use for query tools (`structs_query_player`, `structs_query_planet`, etc.)
- Provides game state access patterns
- Handles API communication

---

## Integration Strategy

### Phase 1: Core Resources
- **No structs-webapp dependency** - Pure resource serving

### Phase 2: Validation Tools
- **No structs-webapp dependency** - Pure validation logic

### Phase 3: API Integration
- **Use `signer.*` schema** for transaction submission (database functions)
- **Integrate game state/API logic** for query tools
- **Set up PostgreSQL connection** for database access

### Phase 4: Advanced Tools
- ✅ **Proof-of-work hashing** - Implemented (TaskManager-style in TypeScript)
- ⏳ **Integrate GRASS examples** for streaming (future enhancement)
- ✅ **Calculation logic** - Implemented (power, mining, cost, damage, trade)

---

## Project Structure

```
structs-mcp/
├── src/
│   ├── server.ts              # Main MCP server
│   ├── resources/             # Resource handlers
│   ├── tools/                 # Tool implementations
│   │   ├── validation.ts     # Validation tools (no structs-webapp)
│   │   ├── query.ts          # Query tools (uses game state logic)
│   │   ├── action.ts         # Action tools (uses signer.* schema)
│   │   ├── calculation.ts    # Calculation tools (uses TaskManager)
│   │   └── workflow.ts       # Workflow tools
│   ├── integrations/          # structs-webapp integrations
│   │   ├── task-manager.ts   # TaskManager wrapper
│   │   ├── database-client.ts # PostgreSQL client for signer.* schema
│   │   ├── grass-client.ts   # GRASS/NATS client
│   │   └── game-state.ts     # Game state access
│   └── utils/
├── node_modules/
│   └── structs-webapp/        # structs-webapp dependency
│       └── src/
│           └── js/
│               ├── index.js   # Entry point - shows how modules fit together
│               ├── TaskManager.js
│               ├── SigningClientManager.js
│               └── ...
```

---

## Dependencies

### Package.json

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "structs-webapp": "file:../structs-webapp",
    "ajv": "^8.0.0",
    "yaml": "^2.0.0",
    "axios": "^1.0.0",
    "nats": "^2.0.0",
    "lru-cache": "^7.0.0",
    "chokidar": "^3.0.0"
  }
}
```

### Installation

```bash
# Clone structs-webapp if not already available
git clone https://github.com/playstructs/structs-webapp.git

# Install MCP server dependencies
cd structs-mcp
npm install

# Link structs-webapp (if using local path)
npm link ../structs-webapp
```

---

## Implementation Notes

### TypeScript Compatibility

**Challenge**: structs-webapp/src/js/ modules are JavaScript, MCP server is TypeScript

**Solution**:
1. Create TypeScript wrapper modules in `src/integrations/`
2. Import JavaScript modules with type declarations
3. Add type definitions for structs-webapp modules

**Example**:
```typescript
// src/integrations/task-manager.ts
// Reference structs-webapp/src/js/index.js to understand module structure
import { TaskManager } from 'structs-webapp/src/js/TaskManager.js';

export class MCPTaskManager {
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = new TaskManager();
  }

  async computeProofOfWork(params: {
    actionType: string;
    entityId: string;
    age: number;
    difficulty: number;
  }): Promise<{
    hash: string;
    nonce: string;
    iterations: number;
    valid: boolean;
  }> {
    return await this.taskManager.computeProofOfWork(params);
  }
}
```

---

## Benefits of Using structs-webapp/src/js/

### 1. Production-Tested Code
- Components are actively used by the webapp
- Battle-tested in production environment
- Known to work correctly

### 2. Comprehensive Functionality
- All necessary components in one place
- Consistent API patterns
- Well-integrated modules

### 3. Better Integration
- Aligns with existing Structs infrastructure
- Uses same patterns as webapp
- Easier to maintain and update

### 4. Reduced Duplication
- No need to reimplement hashing logic
- No need to reimplement signing logic
- Reuse existing, tested code

---

## Migration from structs-client-ts

### Previous Plan
- Use `structs-client-ts` with MCP wrapper
- Separate client library

### New Plan
- Use `structs-webapp/src/js/` modules directly
- More comprehensive functionality
- Better integration with existing codebase

### Impact
- ✅ **Positive**: More functionality available
- ✅ **Positive**: Production-tested code
- ⚠️ **Consideration**: Need to handle JavaScript/TypeScript interop
- ⚠️ **Consideration**: Need to understand structs-webapp structure

---

## Next Steps

1. **Review structs-webapp/src/js/index.js** ⚠️ **START HERE**
   - This file shows how all modules fit together
   - Understand module organization and dependencies
   - Identify entry points and relationships

2. **Explore structs-webapp/src/js/ structure**
   - Document all available modules
   - Identify dependencies between modules
   - Map modules to MCP tool needs
   - Understand how TaskManager and GRASS examples connect
   - Note: SigningClientManager.js is NOT USED - using signer.* schema instead

2. **Create TypeScript wrappers**
   - Wrap JavaScript modules (TaskManager.js, GRASS examples)
   - Add type definitions
   - Create MCP-specific interfaces
   - Set up PostgreSQL connection for signer.* schema

3. **Integrate incrementally**
   - Start with TaskManager.js (Phase 4) - Optional enhancement
   - Set up signer.* schema access (Phase 3) - Database functions
   - Add GRASS examples (Phase 4) - Optional enhancement
   - Add game state logic (Phase 3)

4. **Test integration**
   - Verify modules work correctly
   - Test proof-of-work hashing
   - Test transaction signing
   - Test streaming integration

---

## Questions to Resolve

1. **Module Structure**: Review `structs-webapp/src/js/index.js` to understand how modules fit together
2. **Dependencies**: What dependencies do these modules have? (Check index.js)
3. **Configuration**: How are these modules configured? (Check index.js initialization)
4. **Type Definitions**: Do type definitions exist, or do we need to create them?
5. **Versioning**: How do we handle structs-webapp updates?

## Reference File

**`structs-webapp/src/js/index.js`** - **START HERE**
- Shows how all JS pieces fit together
- Entry point for understanding module structure
- Demonstrates module relationships and dependencies
- Use this as the primary reference for integration

---

*Last Updated: December 8, 2025*

