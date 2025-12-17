# Tool API Specifications

**Date**: January 2025 (Updated: January 2025)  
**Status**: 🟢 Draft - Updated with technical specifications  
**Version**: 0.2.0

---

## Overview

This document specifies the MCP tool APIs for the Structs MCP server.

---

## Tool Naming Convention

**Format**: `structs_{category}_{action}` (✅ **DECIDED** - January 2025)

**Rationale**: 
- Universal client compatibility (underscores supported by all MCP clients)
- Avoids risk of client incompatibility (some clients use regex that excludes dots)
- Still maintains clear namespace structure

**Examples**:
- `structs_validate_entity_id`
- `structs_query_player`
- `structs_calculate_power`
- `structs_calculate_proof_of_work`

---

## Validation Tools

### `structs_validate_entity_id`

**Purpose**: Validate entity ID format

**Entity Type Codes** (from `ai/schemas/formats.json`):
- `0` - Guild
- `1` - Player
- `2` - Planet
- `3` - Reactor
- `4` - Substation
- `5` - Struct
- `6` - Allocation
- `7` - Infusion
- `8` - Address
- `9` - Fleet
- `10` - (See formats.json for complete list)

**Format**: `{type}-{index}` where type is object type code and index is 1-based object index

**Input**:
```json
{
  "id": "1-11",
  "expected_type": "player" // optional, can be name or code (1)
}
```

**Output**:
```json
{
  "valid": true,
  "type": "player",
  "type_code": 1,
  "index": 11,
  "format": "1-11"
}
```

**Errors**:
- Invalid format (must match pattern `^[0-9]+-[0-9]+$`)
- Wrong type (if expected_type provided and doesn't match)

---

### `structs_validate_schema`

**Purpose**: Validate data against JSON schema

**Input**:
```json
{
  "data": { /* data to validate */ },
  "schema_uri": "structs://schemas/entities/player.json"
}
```

**Output**:
```json
{
  "valid": true,
  "errors": []
}
```

**JSON Schema Version**: **Draft 7** (`http://json-schema.org/draft-07/schema#`)

**Note**: All schemas in `/ai/schemas` use JSON Schema Draft 7. The validation tool uses a Draft 7-compatible validator.

**Errors**:
- Schema not found
- Validation errors (array of error objects with JSON Schema Draft 7 format)

---

### `structs_validate_transaction`

**Purpose**: Validate transaction before submission

**Input**:
```json
{
  "transaction": { /* transaction object */ }
}
```

**Output**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

---

### `structs_validate_action`

**Purpose**: Validate action requirements

**Input**:
```json
{
  "action_type": "MsgStructBuild",
  "parameters": { /* action parameters */ },
  "game_state": { /* current game state */ } // optional
}
```

**Output**:
```json
{
  "valid": true,
  "requirements_met": true,
  "missing_requirements": [],
  "errors": []
}
```

---

## Query Tools

### `structs_query_player`

**Purpose**: Query player state

**Input**:
```json
{
  "player_id": "1-11"
}
```

**Output**:
```json
{
  "player": { /* player data */ },
  "timestamp": "2025-12-08T12:00:00Z"
}
```

---

### `structs_query_planet`

**Purpose**: Query planet state

**Input**:
```json
{
  "planet_id": "2-1"
}
```

**Output**:
```json
{
  "planet": { /* planet data */ },
  "timestamp": "2025-12-08T12:00:00Z"
}
```

---

### `structs_query_guild`

**Purpose**: Query guild state

**Input**:
```json
{
  "guild_id": "0-1"
}
```

**Output**:
```json
{
  "guild": { /* guild data */ },
  "timestamp": "2025-12-08T12:00:00Z"
}
```

---

### `structs_query_endpoints`

**Purpose**: List available endpoints

**Input**:
```json
{
  "entity_type": "player", // optional filter
  "category": "queries" // optional filter
}
```

**Output**:
```json
{
  "endpoints": [
    {
      "path": "/structs/player/{id}",
      "method": "GET",
      "description": "Query player by ID"
    }
  ]
}
```

---

## Action Tools

### `structs_action_submit_transaction`

**Purpose**: Submit transaction to network

**Input**:
```json
{
  "transaction": { /* transaction object */ },
  "sign": true // optional, default false
}
```

**Output**:
```json
{
  "transaction_hash": "0x...",
  "status": "broadcast",
  "message": "Transaction broadcast successfully"
}
```

---

### `structs_action_build_struct`

**Purpose**: Build struct action (high-level)

**Input**:
```json
{
  "struct_type": 1,
  "location_type": "planet",
  "location_id": "2-1",
  "player_id": "1-11"
}
```

**Output**:
```json
{
  "transaction_hash": "0x...",
  "status": "initiated",
  "next_step": "complete_build",
  "estimated_completion": "1 cycle"
}
```

**Errors**:
- Insufficient resources
- Invalid location
- Build requirements not met

---

### `structs_action_mine_resources`

**Purpose**: Mine resources action

**Input**:
```json
{
  "planet_id": "2-1",
  "extractor_id": "5-42",
  "player_id": "1-11"
}
```

**Output**:
```json
{
  "transaction_hash": "0x...",
  "status": "initiated",
  "mining_rate": 1.0,
  "estimated_yield": 1.0
}
```

**Errors**:
- Extractor not found
- Insufficient power
- Invalid planet

---

### `structs_action_attack`

**Purpose**: Attack action

**Input**:
```json
{
  "attacker_id": "10-5",
  "target_id": "1-1",
  "weapon_type": "laser", // optional
  "player_id": "1-11"
}
```

**Output**:
```json
{
  "transaction_hash": "0x...",
  "status": "initiated",
  "estimated_damage": 75,
  "target_health_after": 25
}
```

**Errors**:
- Attacker not found
- Target not found
- Insufficient power
- Out of range

---

## Calculation Tools

### `structs_calculate_power`

**Purpose**: Calculate power generation

**Input**:
```json
{
  "alpha_matter": 100,
  "generator_type": "reactor" // or "fieldGenerator", "continentalPowerPlant", "worldEngine"
}
```

**Output**:
```json
{
  "power_generated": 100, // kW
  "formula": "1g Alpha Matter = 1kW (reactor)",
  "conversion_rate": 1 // kW per gram
}
```

**Generator Types** (Verified from code):
- `reactor`: 1 kW per gram (safe, guaranteed)
- `fieldGenerator`: 2 kW per gram (2x efficiency)
- `continentalPowerPlant`: 5 kW per gram (5x efficiency)
- `worldEngine`: 10 kW per gram (10x efficiency)

**Note**: Current code implementation is deterministic (no risk of loss). Design intent mentions risk/reward, but implementation converts Alpha Matter to energy at the specified rate.

---

### `structs_calculate_mining`

**Purpose**: Calculate mining rate

**Input**:
```json
{
  "planet_id": "2-1",
  "extractor_id": "5-42"
}
```

**Output**:
```json
{
  "mining_rate": 1.0, // grams per cycle
  "formula": "..."
}
```

---

### `structs_calculate_cost`

**Purpose**: Calculate build cost

**Input**:
```json
{
  "struct_type": 1,
  "location_type": "planet"
}
```

**Output**:
```json
{
  "cost": {
    "alpha_matter": 10,
    "watts": 5
  },
  "formula_version": "1.0.0",
  "code_version": "v2.1.3"
}
```

---

### `structs_calculate_damage`

**Purpose**: Calculate combat damage

**Input**:
```json
{
  "attacker": {
    "struct_type": 10,
    "weapon_type": "laser",
    "power": 100
  },
  "defender": {
    "struct_type": 1,
    "armor": 50,
    "defense": 25
  }
}
```

**Output**:
```json
{
  "damage": 75,
  "formula": "damage = (weapon_power * weapon_multiplier) - (armor * defense_multiplier)",
  "breakdown": {
    "base_damage": 100,
    "armor_reduction": 25,
    "final_damage": 75
  }
}
```

---

### `structs_calculate_trade_value`

**Purpose**: Calculate trade value

**Input**:
```json
{
  "resource": "alpha_matter",
  "amount": 100,
  "market": "planet_2-1" // optional, uses default market if omitted
}
```

**Output**:
```json
{
  "value": {
    "watts": 100,
    "alpha_matter_equivalent": 100
  },
  "market_rate": 1.0,
  "timestamp": "2025-12-08T12:00:00Z"
}
```

---

### `structs_calculate_proof_of_work`

**Purpose**: Compute proof-of-work hash and nonce for actions requiring proof-of-work

**Actions Requiring Proof-of-Work**:
- `MsgStructBuildComplete` - Struct building completion
- `MsgPlanetRaidComplete` - Planet raid completion
- `MsgStructOreMinerComplete` - Ore mining completion
- `MsgStructOreRefineryComplete` - Ore refining completion

**Input**:
```json
{
  "action_type": "struct_build_complete", // or "planet_raid_complete", "ore_miner_complete", "ore_refinery_complete"
  "entity_id": "5-42", // struct ID for building/mining/refining, fleet ID for raids
  "age": 100, // Current block height - operation start height
  "difficulty": 700, // Difficulty value (varies by action and entity type)
  "max_iterations": 1000000 // optional, default: 1,000,000
}
```

**Output**:
```json
{
  "hash": "computed_proof_of_work_hash",
  "nonce": "nonce_that_produces_valid_hash",
  "iterations": 12345, // Number of iterations needed
  "valid": true, // Whether hash meets difficulty requirement
  "difficulty_met": true,
  "computation_time_ms": 234
}
```

**Difficulty Values**:
- **Struct Building**: Varies by struct type (e.g., 700 for Ore Extractor/Refinery, 2880 for Planetary Defense Cannon)
- **Planet Raids**: Based on `PlanetaryShield` from planet attributes
- **Ore Mining**: 14000 (`OreMiningDifficulty`)
- **Ore Refining**: 28000 (`OreRefiningDifficulty`)

**Algorithm**:
- Uses `TaskManager.js` from `structs-webapp/src/js/` (which implements `HashBuildAndCheckDifficulty` logic)
- Reference `structs-webapp/src/js/index.js` to understand how TaskManager fits into the module structure
- Input format: `{entity_id}_{nonce}_{age}`
- Finds nonce that produces hash meeting difficulty requirement
- Difficulty check: hash value must be within difficulty range
- **Implementation**: Integrate `TaskManager.js` from structs-webapp for hashing functionality

**Errors**:
- Invalid action type
- Entity not found
- Difficulty too high (may timeout)
- Computation timeout (if max_iterations exceeded)

**Example Usage**:
```json
{
  "action_type": "ore_miner_complete",
  "entity_id": "5-42",
  "age": 50,
  "difficulty": 14000
}
```

**Note**: This tool performs computationally intensive proof-of-work computation. For high difficulty values, computation may take significant time.

---

## Decision Tree Tools

### `structs_decision_tree_navigate`

**Purpose**: Navigate decision tree

**Input**:
```json
{
  "tree": "build-requirements",
  "state": {
    "player_id": "1-11",
    "planet_id": "2-1",
    "struct_type": 1
  }
}
```

**Output**:
```json
{
  "current_node": "check_resources",
  "next_nodes": [
    {
      "node": "has_alpha_matter",
      "condition": "alpha_matter >= 10"
    },
    {
      "node": "has_watts",
      "condition": "watts >= 5"
    }
  ],
  "recommendation": "Proceed to check resources"
}
```

---

### `structs_decision_tree_get_next_actions`

**Purpose**: Get recommended actions based on state and goal

**Input**:
```json
{
  "state": {
    "player_id": "1-11",
    "planet_id": "2-1"
  },
  "goal": "build_mining_operation"
}
```

**Output**:
```json
{
  "actions": [
    {
      "action": "MsgStructBuild",
      "priority": 1,
      "reason": "Build extractor to start mining",
      "parameters": {
        "struct_type": 5,
        "location_id": "2-1"
      }
    }
  ]
}
```

---

### `structs_decision_tree_evaluate_strategy`

**Purpose**: Evaluate strategy against current state

**Input**:
```json
{
  "strategy": "expand_mining",
  "state": {
    "player_id": "1-11",
    "planet_id": "2-1",
    "resources": {
      "alpha_matter": 50,
      "watts": 25
    }
  }
}
```

**Output**:
```json
{
  "feasible": true,
  "score": 0.85,
  "requirements_met": true,
  "missing_requirements": [],
  "estimated_time": "2 cycles",
  "estimated_cost": {
    "alpha_matter": 30,
    "watts": 15
  }
}
```

---

### `structs_decision_tree_get_build_requirements`

**Purpose**: Get build requirements for struct

**Input**:
```json
{
  "struct_type": 1,
  "location": {
    "type": "planet",
    "id": "2-1"
  }
}
```

**Output**:
```json
{
  "requirements": {
    "resources": {
      "alpha_matter": 10,
      "watts": 5
    },
    "location": {
      "type": "planet",
      "available": true
    },
    "prerequisites": []
  },
  "estimated_build_time": "1 cycle"
}
```

---

## Workflow Tools

### `structs_workflow_execute`

**Purpose**: Execute predefined workflow

**Input**:
```json
{
  "workflow": "mine-refine-convert",
  "parameters": {
    "player_id": "1-11",
    "planet_id": "2-1"
  }
}
```

**Output**:
```json
{
  "workflow_id": "wf-123",
  "status": "running",
  "steps": [
    { "step": 1, "status": "completed" },
    { "step": 2, "status": "in_progress" }
  ]
}
```

---

### `structs_workflow_monitor`

**Purpose**: Monitor workflow progress

**Input**:
```json
{
  "workflow_id": "wf-123"
}
```

**Output**:
```json
{
  "status": "completed",
  "progress": 100,
  "steps": [ /* step statuses */ ]
}
```

---

## Documentation Tools

### `structs_docs_search`

**Purpose**: Search documentation

**Input**:
```json
{
  "query": "player entity",
  "category": "schemas" // optional
}
```

**Output**:
```json
{
  "results": [
    {
      "uri": "structs://schemas/entities/player.json",
      "title": "Player Entity Schema",
      "snippet": "...",
      "relevance_score": 0.95
    }
  ],
  "total_results": 5
}
```

**Errors**:
- Invalid query format
- Search index not available

---

### `structs_docs_get_index`

**Purpose**: Get documentation index

**Input**:
```json
{
  "category": "schemas" // optional, returns all if omitted
}
```

**Output**:
```json
{
  "version": "1.0.0",
  "resources": [
    {
      "uri": "structs://schemas/entities/player.json",
      "category": "schemas",
      "type": "schema",
      "description": "Player entity schema"
    }
  ]
}
```

---

### `structs_docs_get_related`

**Purpose**: Get related documentation

**Input**:
```json
{
  "resource_uri": "structs://schemas/entities/player.json"
}
```

**Output**:
```json
{
  "related": [
    {
      "uri": "structs://api/queries/player.yaml",
      "relation": "api_spec"
    },
    {
      "uri": "structs://protocols/query-protocol.md",
      "relation": "protocol"
    }
  ]
}
```

---

### `structs_docs_loading_strategy`

**Purpose**: Get recommended loading strategy

**Input**:
```json
{
  "task": "query_player"
}
```

**Output**:
```json
{
  "strategy": "tier_1",
  "resources": [
    "structs://schemas/minimal/player-essential.json",
    "structs://api/queries/player.yaml"
  ],
  "estimated_context_size": 5000
}
```

---

## Subscription Tools

### `structs_subscription_subscribe`

**Purpose**: Subscribe to real-time updates

**Input**:
```json
{
  "entity_type": "player",
  "entity_id": "1-11"
}
```

**Output**:
```json
{
  "subscription_id": "sub_123",
  "entity_type": "player",
  "entity_id": "1-11",
  "status": "active",
  "message": "Subscription created successfully"
}
```

**Errors**:
- Invalid entity type or ID
- Maximum subscriptions reached (100 per agent)
- NATS connection failure

---

### `structs_subscription_unsubscribe`

**Purpose**: Unsubscribe from updates

**Input**:
```json
{
  "subscription_id": "sub_123"
}
```

**Output**:
```json
{
  "subscription_id": "sub_123",
  "status": "unsubscribed",
  "message": "Subscription removed successfully"
}
```

**Errors**:
- Subscription not found
- Already unsubscribed

---

### `structs_subscription_list`

**Purpose**: List active subscriptions

**Input**:
```json
{}
```

**Output**:
```json
{
  "subscriptions": [
    {
      "subscription_id": "sub_123",
      "entity_type": "player",
      "entity_id": "1-11",
      "created_at": "2025-12-08T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

## Error Handling

All tools return errors in consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Entity ID format invalid",
    "details": {
      "field": "player_id",
      "reason": "Expected format: {chain_id}-{index}, got: invalid"
    },
    "resource_uri": "structs://schemas/entities/player.json",
    "timestamp": "2025-12-08T12:00:00Z"
  }
}
```

**Error Categories**:
- **Validation Errors** (`VALIDATION_*`): Schema validation failures, invalid formats
- **API Errors** (`API_*`): Structs API errors (forwarded from backend)
- **Resource Errors** (`RESOURCE_*`): Missing resources, access denied
- **Tool Errors** (`TOOL_*`): Tool execution failures, timeouts
- **Rate Limit Errors** (`RATE_LIMIT_*`): Too many requests

**Error Handling Behavior**:
- Validation errors include field-level details
- API errors include original Structs error codes
- Resource errors include suggested alternatives
- Automatic retry for transient errors (with exponential backoff)
- Rate limit errors include retry-after header

---

## Next Steps

1. ⏳ Finalize tool specifications (pending team review)
2. ⏳ Implement tool handlers
3. ⏳ Test tools
4. ⏳ Document in implementation

---

*Last Updated: December 8, 2025*

