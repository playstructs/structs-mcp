# Resource URI Scheme Specification

**Date**: December 8, 2025  
**Status**: 🟢 Draft  
**Version**: 0.1.0

---

## Overview

This document specifies the resource URI scheme for accessing Structs AI documentation via MCP.

---

## URI Format

**Scheme**: `structs://{category}/{path}`

**Components**:
- `structs://` - Protocol scheme
- `{category}` - Resource category (schemas, api, protocols, etc.)
- `{path}` - Path to resource file (relative to `/ai` directory)

---

## Categories

### 1. Schemas (`schemas`)

**Purpose**: JSON Schema definitions

**Examples**:
- `structs://schemas/entities/player.json`
- `structs://schemas/entities/planet.json`
- `structs://schemas/actions.json`
- `structs://schemas/responses.json`
- `structs://schemas/errors.json`
- `structs://schemas/formats.json`
- `structs://schemas/validation.json`
- `structs://schemas/minimal/player-essential.json`

**Mapping**: Direct mapping from `ai/schemas/` directory

---

### 2. API Specifications (`api`)

**Purpose**: API endpoint specifications (YAML)

**Examples**:
- `structs://api/queries/player.yaml`
- `structs://api/queries/planet.yaml`
- `structs://api/transactions/submit-transaction.yaml`
- `structs://api/endpoints.yaml` (reference)
- `structs://api/error-codes.yaml`

**Mapping**: Direct mapping from `ai/api/` directory

---

### 3. Protocols (`protocols`)

**Purpose**: Protocol documentation (Markdown)

**Examples**:
- `structs://protocols/query-protocol.md`
- `structs://protocols/action-protocol.md`
- `structs://protocols/gameplay-protocol.md`
- `structs://protocols/authentication.md`
- `structs://protocols/streaming.md`

**Mapping**: Direct mapping from `ai/protocols/` directory

---

### 4. Examples (`examples`)

**Purpose**: Example implementations (JSON)

**Examples**:
- `structs://examples/simple-bot.json`
- `structs://examples/gameplay-mining-bot.json`
- `structs://examples/workflows/mine-refine-convert.json`

**Mapping**: Direct mapping from `ai/examples/` directory

---

### 5. Reference (`reference`)

**Purpose**: Reference indexes (JSON)

**Examples**:
- `structs://reference/endpoint-index.json`
- `structs://reference/entity-index.json`
- `structs://reference/action-index.json`

**Mapping**: Direct mapping from `ai/reference/` directory

---

### 6. Patterns (`patterns`)

**Purpose**: Pattern documentation and decision trees

**Examples**:
- `structs://patterns/rate-limiting.md`
- `structs://patterns/caching.md`
- `structs://patterns/workflow-patterns.md`
- `structs://patterns/security.md`
- `structs://patterns/QUICK_REFERENCE.md`
- `structs://patterns/decision-tree-*.json` - Decision tree JSON files

**Mapping**: Direct mapping from `ai/patterns/` directory

---

### 7. Visuals (`visuals`)

**Purpose**: Visual content (graphs, spatial data, schemas)

**Examples**:
- `structs://visuals/schemas/relationship-graph.json`
- `structs://visuals/graphs/resource-flow.json`
- `structs://visuals/graphs/entity-relationships.json`
- `structs://visuals/spatial/coordinate-system.json`
- `structs://visuals/reference/visual-index.json`

**Mapping**: Direct mapping from `ai/visuals/` directory

---

### 8. Guides (`guides`)

**Purpose**: Core guide documents

**Examples**:
- `structs://guides/AGENTS.md`
- `structs://guides/LOADING_STRATEGY.md`
- `structs://guides/DOCUMENTATION_INDEX.md`
- `structs://guides/IMPLEMENTATION_CHECKLIST.md`
- `structs://guides/BEST_PRACTICES.md`

**Mapping**: Direct mapping from `ai/` root (guide files)

---

### 9. Formulas (`formulas`) - Future

**Purpose**: Formula definitions (future - may be extracted from schemas)

**Examples**:
- `structs://formulas/power-generation`
- `structs://formulas/mining-rate`
- `structs://formulas/combat-damage`

**Mapping**: TBD - may be extracted from `ai/schemas/formulas.json` or `economics/formulas.md`

---

## Versioning

**Current Approach**: Version information in resource content (not URI)

**Future Consideration**: Version-aware URIs if needed
- `structs://schemas/entities/player.json?version=1.0.0`
- `structs://schemas/entities/player.json@1.0.0`

**Status**: TBD - Start without versioning in URI, add if needed

---

## Fragment Identifiers

**Purpose**: Reference specific parts of resources

**Examples**:
- `structs://schemas/actions.json#/actions/MsgStructBuild`
- `structs://api/queries/player.yaml#/paths/~1structs~1player~1{id}`
- `structs://protocols/action-protocol.md#transaction-flow`

### Fragment Format by Resource Type

#### JSON Resources
**Format**: **JSON Pointer** (RFC 6901)

**Syntax**: `/path/to/property` or `/array/0/property`

**Special Characters**: 
- `/` is encoded as `~1`
- `~` is encoded as `~0`

**Examples**:
- `structs://schemas/actions.json#/actions/MsgStructBuild` - Reference specific action
- `structs://schemas/entities/player.json#/properties/id` - Reference specific property
- `structs://schemas/game-state.json#/definitions/Player` - Reference definition

**Implementation**: Use JSON Pointer library (e.g., `jsonpointer` in Node.js)

#### YAML Resources
**Format**: **JSON Pointer** (same as JSON, since YAML is a superset of JSON)

**Note**: YAML files are parsed to JSON structure, then JSON Pointer is applied

**Examples**:
- `structs://api/queries/player.yaml#/paths/~1structs~1player~1{id}` - Reference specific endpoint path
- `structs://api/queries/player.yaml#/paths/~1structs~1player~1{id}/get` - Reference GET method
- `structs://api/queries/player.yaml#/paths/~1structs~1player~1{id}/get/parameters/0` - Reference first parameter

**Implementation**: 
1. Parse YAML to JSON structure
2. Apply JSON Pointer to JSON structure
3. Return referenced portion

#### Markdown Resources
**Format**: **Anchor Links** (HTML anchor format)

**Syntax**: `#anchor-name` where anchor-name is:
- Lowercase
- Hyphens instead of spaces
- Based on heading text

**Anchor Generation Rules**:
- Convert heading to lowercase
- Replace spaces with hyphens
- Remove special characters (keep alphanumeric and hyphens)
- Multiple consecutive hyphens become single hyphen

**Examples**:
- `structs://protocols/action-protocol.md#transaction-flow` - Reference "Transaction Flow" section
- `structs://protocols/authentication.md#session-based-authentication` - Reference "Session-Based Authentication" section
- `structs://guides/AGENTS.md#error-handling` - Reference "Error Handling" section

**Implementation**: 
1. Parse Markdown to AST
2. Extract headings
3. Generate anchor names from headings
4. Return section content for matching anchor

**Note**: If anchor doesn't exist, return entire document (graceful fallback)

---

## Resource Discovery

**Index Resource**: `structs://reference/documentation-index.json`

**Purpose**: Complete index of all available resources

**Structure**:
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

## Implementation Notes

1. **Path Mapping**: Direct mapping from `/ai` directory structure
2. **File Extensions**: Preserved in URIs for clarity
3. **Case Sensitivity**: URIs are case-sensitive (match file system)
4. **Special Characters**: URL-encoded as needed

---

## Examples

### Accessing a Schema
```
Resource URI: structs://schemas/entities/player.json
Maps to: ai/schemas/entities/player.json
```

### Accessing an API Spec
```
Resource URI: structs://api/queries/player.yaml
Maps to: ai/api/queries/player.yaml
```

### Accessing a Protocol
```
Resource URI: structs://protocols/action-protocol.md
Maps to: ai/protocols/action-protocol.md
```

### Accessing with Fragment
```
Resource URI: structs://schemas/actions.json#/actions/MsgStructBuild
Maps to: ai/schemas/actions.json, fragment: /actions/MsgStructBuild
```

---

## Next Steps

1. ⏳ Finalize URI scheme (pending team review)
2. ⏳ Implement resource mapping
3. ⏳ Test resource access
4. ⏳ Document in implementation

---

*Last Updated: January 2025*

