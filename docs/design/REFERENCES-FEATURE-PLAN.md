# References Feature: Product Plan

**Status**: 🟡 Draft - Updated Based on Review  
**Date**: January 2025  
**Last Updated**: January 2025 (Post-Review)  
**Review**: See `REFERENCES-FEATURE-REVIEW.md` for detailed review comments  
**Priority**: 🟡 Medium-High  
**Effort**: Medium-High (increased due to review requirements)  
**Impact**: High

---

## Executive Summary

Add an optional `references` section to MCP server responses that includes full details of all entity IDs referenced in the response payload. This eliminates the need for agents to make multiple follow-up queries when the same entity ID appears multiple times, improving efficiency and reducing API calls.

---

## Problem Statement

### Current State

When MCP server tools return responses, they often include entity IDs that reference other objects in the game system. For example:

```json
{
  "Player": {
    "id": "1-11",
    "guildId": "0-1",
    "planetId": "2-1",
    "fleetId": "9-11",
    "substationId": "4-3"
  }
}
```

**Issues**:
1. **Multiple Queries Required**: Agents must make separate queries for each referenced ID to get full context
2. **Redundant Requests**: The same ID may appear multiple times in different responses, requiring duplicate queries
3. **Inefficient Context Building**: Agents spend multiple round-trips building complete context
4. **Rate Limiting Impact**: More queries = higher risk of hitting rate limits
5. **Slower Decision Making**: Additional latency from multiple API calls

### Example Scenario

An agent queries a player and gets:
- `guildId: "0-1"` → needs to query guild separately
- `planetId: "2-1"` → needs to query planet separately  
- `fleetId: "9-11"` → needs to query fleet separately

If the agent then queries the planet, it might get:
- `owner: "1-11"` → same player ID again (already queried)
- Struct IDs in slots → needs to query each struct separately

**Result**: 5+ separate queries for what could be 1-2 queries with references.

---

## Proposed Solution

### Response Structure

Add an optional `references` section to all MCP tool responses. **Important**: References are added at the same level as existing response fields to maintain backward compatibility:

```json
{
  // Normal response payload (unchanged structure)
  "Player": {
    "id": "1-11",
    "guildId": "0-1",
    "planetId": "2-1",
    "fleetId": "9-11"
  },
  "timestamp": "...",
  // New optional section (only when include_references=true)
  "references": {
    "0-1": {
      "reference_type": "guild",
      "id": "0-1",
      "index": "1",
      "owner": "1-11",
      "primaryReactorId": "3-1",
      "entrySubstationId": "4-1"
      // ... full guild data
    },
    "2-1": {
      "reference_type": "planet",
      "id": "2-1",
      "owner": "1-11",
      "maxOre": "5",
      // ... full planet data
    },
    "2-5": {
      "reference_type": "planet",
      "id": "2-5",
      "owner": "1-11",
      "maxOre": "5",
      // ... full planet data
    },
    "9-11": {
      "reference_type": "fleet",
      "id": "9-11",
      "owner": "1-11",
      // ... full fleet data
    }
  }
}
```

**Note**: References use a flat structure with entity IDs as keys for O(1) lookup performance and automatic deduplication. Each reference includes a `reference_type` field for explicit type identification.

### Structure Design: Type-Grouped vs Flat

We considered two approaches for organizing references:

#### Option A: Type-Grouped (Current Design)
```json
{
  "references": {
    "guilds": { "0-1": {...} },
    "planets": { "2-1": {...}, "2-5": {...} }
  }
}
```

#### Option B: Flat with Type Attribute
```json
{
  "references": {
    "0-1": { "reference_type": "guild", ... },
    "2-1": { "reference_type": "planet", ... },
    "2-5": { "reference_type": "planet", ... }
  }
}
```

**Comparison**:

| Use Case | Type-Grouped | Flat |
|----------|--------------|------|
| **Lookup by ID (knowing type)** | `references.planets["2-1"]` (old) | `references["2-1"]` ✅ |
| **Lookup by ID (unknown type)** | Need to check all types | `references["2-1"]` |
| **Get all of a type** | `references.planets` | `Object.values(references).filter(r => r.reference_type === "planet")` |
| **Check if type exists** | `"planets" in references` | Need to scan all |
| **Type filtering** | Natural (access by key) | Requires filtering |
| **Structure clarity** | Organized by type | Mixed types |
| **Type redundancy** | Type implicit in key | Type explicit but redundant (in ID prefix) |
| **Iterate all references** | `Object.values(references.planets)` per type | `Object.values(references)` |

**Analysis of Primary Use Cases**:

1. **Most Common: "I see ID `2-1` in response, get me its details"**
   - Type-Grouped: Agent parses ID prefix (`2-` = planet) → `references.planets["2-1"]` (requires type knowledge)
   - Flat: Direct → `references["2-1"]` ✅ **Simpler - no type knowledge needed**

2. **Common: "Get all planets referenced"**
   - Type-Grouped: `references.planets` ✅ **Direct**
   - Flat: `Object.values(references).filter(r => r.reference_type === "planet")`

3. **Common: "Check if any structs are referenced"**
   - Type-Grouped: `"structs" in references && Object.keys(references.structs).length > 0` ✅ **Clear**
   - Flat: `Object.values(references).some(r => r.reference_type === "struct")`

**Final Decision**: **Flat structure (Option B) is the chosen design**

**Rationale**:
- ✅ **Primary use case is simpler**: Direct ID lookup (`references["2-1"]`) without needing type knowledge
- ✅ **Type is explicit**: `reference_type` field makes data self-describing
- ✅ **Less nesting**: One level instead of two
- ✅ **Type can be derived**: ID prefix (`2-1` → type `2` = planet) if needed, but `reference_type` is more explicit
- ✅ **Common operations are straightforward**: 
  - Lookup: `references["2-1"]`
  - Get type: `references["2-1"].reference_type`
  - Filter by type: `Object.values(references).filter(r => r.reference_type === "planet")`

### Why Object-Based References?

Using entity IDs as object keys provides several advantages over arrays:

1. **O(1) Lookup Performance**: Direct access by ID (`references["2-1"]`) instead of O(n) array search
2. **Automatic Deduplication**: Object keys are unique, preventing duplicate entries automatically
3. **Intuitive Access**: The ID is the natural identifier, so using it as a key is more intuitive
4. **Client-Side Efficiency**: Easier to work with in JavaScript/TypeScript:
   ```typescript
   // Flat structure (preferred)
   const entity = references["2-1"];
   const type = entity.reference_type; // "planet"
   const hasEntity = "2-1" in references;
   
   // Get all of a type
   const planets = Object.values(references)
     .filter(r => r.reference_type === "planet");
   
   // vs Array-based (less efficient)
   const planet = references.planets.find(p => p.id === "2-1");
   const hasPlanet = references.planets.some(p => p.id === "2-1");
   ```
5. **Empty State Clarity**: Empty object `{}` clearly indicates "no references" vs empty array `[]`
6. **Explicit Type**: `reference_type` field makes the data self-describing

**Trade-offs**:
- Iteration requires `Object.values()` instead of direct iteration, but this is a minor cost
- JSON object key ordering is not guaranteed (though most parsers preserve insertion order)

### Key Features

1. **Deduplication**: Each unique entity ID appears only once in `references` (enforced by object keys)
2. **O(1) Lookup**: Direct access by ID (`references["2-1"]`) without needing to know the type
3. **Explicit Type Information**: Each reference includes `reference_type` field for self-describing data
4. **Flat Structure**: Simple one-level structure for easy access and iteration
5. **Automatic ID Detection**: Parse response payload to extract all entity IDs using type prefix
6. **Optional**: Feature can be enabled/disabled per tool or globally
7. **Backward Compatible**: Existing responses remain unchanged if feature disabled

---

## Entity Type Mapping

Based on the object type enum. Each reference includes a `reference_type` field with the type name:

| Type Code | Type Name | reference_type Value | Example ID |
|-----------|-----------|----------------------|------------|
| 0 | Guild | `"guild"` | `0-1` |
| 1 | Player | `"player"` | `1-11` |
| 2 | Planet | `"planet"` | `2-1` |
| 3 | Reactor | `"reactor"` | `3-1` |
| 4 | Substation | `"substation"` | `4-3` |
| 5 | Struct | `"struct"` | `5-42` |
| 6 | Allocation | `"allocation"` | `6-1` |
| 7 | Infusion | `"infusion"` | `7-1` |
| 8 | Address | `"address"` | `8-1` |
| 9 | Fleet | `"fleet"` | `9-11` |
| 10 | Provider | `"provider"` | `10-1` |
| 11 | Agreement | `"agreement"` | `11-1` |

**Note**: `struct_types` use regular integer IDs (not entity-id format) and should be excluded from references.

**Important**: Verify all entity type mappings match `ai/schemas/formats.json`. Tool definition examples should use correct type codes:
- Fleet: `'9-1'` (type 9), not `'3-1'`
- Reactor: `'3-1'` (type 3), not `'4-1'`
- Substation: `'4-1'` (type 4), not `'6-1'`

---

## ID Detection Strategy

### Pattern Recognition

Entity IDs follow the pattern: `{type_code}-{index}`

**Detection Rules**:
1. Scan response payload recursively for all string values
2. Match pattern: `^[0-9]+-[0-9]+$`
3. **Validate type code is 0-11** (valid entity types) - **Critical**: Prevents false positives
4. **Exclude known non-entity fields** (see blacklist below)
5. **Exclude self-references** (entity's own `id` field)
6. Extract type code (left side) to determine entity type
7. Collect unique IDs per type
8. Query each unique ID to get full entity data

**False Positive Prevention**:
- **Type Code Validation**: After pattern match, verify type code is 0-11
- **Field Name Blacklist**: Exclude fields that should never be treated as entity IDs:
  ```typescript
  const NON_ENTITY_FIELDS = new Set([
    'version', 'schema_version', 'api_version',
    'coordinates', 'position', 'range',
    'timestamp', 'created_at', 'updated_at',
    // Add more as discovered
  ]);
  ```
- **Context-Aware Detection**: Use field name hints more aggressively
- **Logging**: Log potential false positives for review

**Self-Reference Exclusion**:
- When extracting IDs from an entity response, exclude the entity's own `id` field
- Example: When querying player `1-11`, exclude `"1-11"` from references even if it appears in the response
- Implementation: Pass the queried entity's ID to extraction function for exclusion

### Field Name Hints

Some fields explicitly indicate entity IDs:
- `*Id` / `*_id` (e.g., `guildId`, `planet_id`)
- `owner` (often a player ID)
- `creator` (often a player ID or address)
- `primaryAddress` (blockchain address, not entity ID)
- Array fields containing IDs (e.g., `space`, `air`, `land`, `water` slots)

**Note**: Field names are hints only - pattern matching is the primary detection method.

---

## Implementation Approach

### Phase 1: Core Infrastructure (High Priority)

**Goal**: Basic references extraction and inclusion

**Tasks**:
1. Create `utils/references.ts` module:
   - `extractEntityIds(data: any, excludeId?: string): Map<EntityType, Set<string>>` - Extract all entity IDs from response
     - Exclude self-references (entity's own ID)
     - Exclude known non-entity fields (blacklist)
     - Validate type codes are 0-11
   - `resolveReferences(ids: Map<EntityType, Set<string>>, options: ReferenceOptions): Promise<References>` - Query and resolve references
     - Implement rate limiting/throttling (max 5 parallel queries)
     - Add error handling with error indicators
     - Implement depth limiting
     - Add caching (critical for performance)
   - `addReferencesToResponse(response: any, references: References): any` - Merge references into response
     - Add `references` at same level as existing fields (no wrapper)

2. Create `types/references.ts`:
   - Define `References` interface
   - Define `ReferencedEntity` interface with error handling fields
   - Define `EntityType` type (string literal union)
   - Define type mapping constants
   - Define `ReferenceOptions` interface

3. Update tool handlers:
   - Add reference extraction when `include_references` is enabled
   - Add references section to response (at same level, no wrapper)
   - Handle list tools with special limits (max 5 per entity, max 50 total)

4. Add configuration:
   - `max_references: number` (default: 50)
   - `max_references_per_entity: number` (default: 5 for list tools)
   - `max_parallel_queries: number` (default: 5)
   - `reference_query_timeout: number` (default: 2000ms)

**Estimated Effort**: 8-12 hours (increased due to error handling, rate limiting, caching)

---

### Phase 2: Configuration & Control (Medium Priority)

**Goal**: Allow fine-grained control over references

**Tasks**:
1. Add configuration options:
   - Global enable/disable flag
   - Per-tool enable/disable
   - Maximum references per response (prevent bloat)
   - Depth limit (prevent circular references)

2. Add tool parameters:
   - `include_references: boolean` (default: false for backward compatibility)
   - `reference_depth: number` (default: 1, max: 2)

**Example**:
```typescript
// Tool call
{
  "name": "structs_query_player",
  "arguments": {
    "player_id": "1-11",
    "include_references": true,
    "reference_depth": 1
  }
}
```

**Estimated Effort**: 2-3 hours

---

### Phase 3: Optimization (Low Priority)

**Goal**: Performance and efficiency improvements

**Tasks**:
1. **Batch Queries**: Batch multiple ID queries when possible (if API supports it)
2. **Advanced Caching**: Enhance caching with TTL, invalidation strategies
3. **Monitoring**: Track reference query metrics (success/failure rates, performance)
4. **Performance Tuning**: Optimize extraction and resolution algorithms

**Note**: Basic caching moved to Phase 1 (critical for performance)

**Estimated Effort**: 3-4 hours

---

## API Design

### Response Schema

```typescript
// MCP Response Format
// The response is serialized as JSON in the MCP content array:
// {
//   content: [
//     {
//       type: "text",
//       text: JSON.stringify(result, null, 2)
//     }
//   ]
// }
// Where `result` includes both the normal response fields AND references (when enabled)

interface ToolResponse {
  // Existing response structure (unchanged - no wrapper)
  // Example: { player: {...}, timestamp: "..." }
  // When include_references=true, adds:
  references?: References;
}

interface References {
  [entityId: string]: ReferencedEntity;  // Key: entity ID (e.g., "0-1", "2-1", "9-11")
}

interface ReferencedEntity {
  reference_type: EntityType;  // Explicit type: "guild", "player", "planet", etc.
  id: string;                   // Entity ID (same as object key)
  status?: "success" | "failed"; // Optional: indicates if reference resolution succeeded
  error?: string;                // Optional: error message if status is "failed"
  referenced_from?: string;      // Optional: field name where ID was found (e.g., "guildId")
  referenced_in?: string;         // Optional: entity that referenced it (e.g., "1-11")
  // ... full entity data from query endpoint (if status is "success")
}

type EntityType = 
  | "guild"
  | "player"
  | "planet"
  | "reactor"
  | "substation"
  | "struct"
  | "allocation"
  | "infusion"
  | "address"
  | "fleet"
  | "provider"
  | "agreement";

// Usage examples:
// Direct lookup: references["2-1"]
// Get type: references["2-1"].reference_type
// Check existence: "2-1" in references
// Get all of a type: Object.values(references).filter(r => r.reference_type === "planet")
// Iterate all: Object.values(references)
```

### Tool Parameter Schema

```typescript
interface ReferenceOptions {
  include_references?: boolean | "primary" | "all";  // Default: false
  // false: No references
  // true or "all": All references (up to limits)
  // "primary": Only primary references (owner, direct relationships) - for list tools
  reference_depth?: number;      // Default: 1, Max: 2
  reference_types?: EntityType[]; // Optional: only include specific types
  max_references?: number;        // Optional: max total references (default: 50)
  max_references_per_entity?: number; // Optional: max references per entity in lists (default: 5)
}
```

### Depth Limiting Semantics

**Depth 0** (default when disabled): No references included

**Depth 1**: Include direct references only
- Example: Query player `1-11` with `reference_depth: 1`
- Includes: Direct references (guild `0-1`, planet `2-1`, fleet `9-11`)
- Does NOT include: References from those entities (e.g., guild's owner, reactor, etc.)

**Depth 2**: Include references of references (one level deeper)
- Example: Query player `1-11` with `reference_depth: 2`
- Includes: Direct references (guild `0-1`, planet `2-1`, fleet `9-11`)
- Also includes: References from guild `0-1` (owner `1-11`, reactor `3-1`, substation `4-1`)
- Does NOT include: References from those second-level references

**Circular Reference Handling**:
- At depth=2, if Player A → Planet B → Owner Player A, include Player A once (deduplication)
- Don't recurse further into already-resolved references
- Maintain a `Set<string>` of resolved IDs to prevent infinite loops

---

## Critical Considerations

### List Tools Response Size Management

**Problem**: List tools return arrays of entities. With references, this could create massive responses.

**Example Scenario**:
- `structs_list_planets` returns 100 planets
- Each planet has `owner` (player ID) and 4 structs per slot × 4 ambits = 16 structs
- Without limits: 100 planets × (1 player + 16 structs) = 1,700 references

**Solution**:
1. **Per-Entity Reference Limit**: Limit references per entity in the list (default: 5)
   - Only include "primary" references: owner, direct relationships
   - Exclude secondary references (structs in slots, etc.)
2. **Global Reference Limit**: Hard limit on total references (default: 50)
   - Apply across all entities in the list
   - Stop adding references when limit reached
3. **Reference Deduplication**: Critical - same ID appears in multiple entities should only be included once
   - Maintain global `Set<string>` of resolved IDs during extraction
4. **List-Specific Behavior**:
   - Query tools: Include all references (up to limit)
   - List tools: Use `include_references: "primary"` by default, or limit to 5 per entity
5. **Pagination Consideration**: References scoped to current page, not all pages

### Error Handling

**Strategy**: Graceful degradation with error indicators

**Behavior**:
- If a reference query fails (404, timeout, etc.), include the reference with error indicator
- Main response should succeed even if some references fail
- Failed references are included in `references` object with error status

**Error Indicator Format**:
```json
{
  "references": {
    "0-1": {
      "reference_type": "guild",
      "id": "0-1",
      "status": "failed",
      "error": "Entity not found"
    },
    "2-1": {
      "reference_type": "planet",
      "id": "2-1",
      "status": "success",
      // ... full planet data
    }
  }
}
```

**Timeout Handling**:
- Set reasonable timeout per reference query (default: 2 seconds)
- On timeout, mark as failed with error message
- Continue processing other references

**Configuration Option**: Allow choosing between error indicators vs. omitting failed references (default: error indicators)

### Rate Limiting Strategy

**Problem**: Parallel queries for references could hit API rate limits.

**Solution**:
1. **Request Throttling**:
   - Implement request queuing/throttling
   - Limit parallel queries (default: 5 concurrent)
   - Queue additional queries until slots available
2. **Configuration**:
   - `max_parallel_queries: number` (default: 5)
   - `reference_query_timeout: number` (default: 2000ms)
3. **Exponential Backoff**: For rate limit errors, implement exponential backoff
4. **Caching**: Critical for reducing API load (see Phase 1 adjustments)
5. **Monitoring**: Track reference query success/failure rates

**Implementation**:
```typescript
// Pseudo-code
const referenceQueue = new Queue(maxConcurrent: 5);
for (const id of entityIds) {
  referenceQueue.add(() => queryEntity(id));
}
const results = await referenceQueue.processAll();
```

---

## Affected Tools

### Primary Candidates (High Impact)

These tools return responses with many entity ID references:

1. **Query Tools**:
   - `structs_query_player` - Returns guildId, planetId, fleetId, substationId
   - `structs_query_planet` - Returns owner, struct IDs in slots
   - `structs_query_guild` - Returns owner, primaryReactorId, entrySubstationId
   - `structs_query_struct` - Returns owner, planetId, reactorId, etc.
   - `structs_query_fleet` - Returns owner, destinationPlanetId, etc.

2. **List Tools**:
   - `structs_list_players` - Each player has multiple references
   - `structs_list_planets` - Each planet has owner and struct references
   - `structs_list_structs` - Each struct has owner, planet, reactor references

3. **Workflow Tools**:
   - `structs_workflow_execute` - Returns multiple entities
   - `structs_workflow_monitor` - Returns status with entity references

### Secondary Candidates (Medium Impact)

- Calculation tools that return entity IDs in results
- Action tools that return created/updated entity IDs

---

## Benefits

### For Agents

1. **Reduced API Calls**: 50-70% reduction in follow-up queries
2. **Faster Context Building**: Complete context in single response
3. **Better Decision Making**: More complete information available immediately
4. **Rate Limit Resilience**: Fewer requests = lower rate limit risk

### For System

1. **Lower Server Load**: Fewer total queries
2. **Better Caching**: References can be cached and reused
3. **Improved UX**: Faster agent responses

### Metrics to Track

- Average queries per agent action (before/after)
- Response time improvements
- Rate limit hit frequency
- Cache hit rates

---

## Risks & Considerations

### 1. Response Size

**Risk**: References could significantly increase response size

**Mitigation**:
- Make feature opt-in (default: disabled)
- Add `max_references` limit
- Consider pagination for large reference sets
- Compress large responses

**Example**: A planet with 16 structs (4 slots × 4 ambits) could add 16 struct objects to references.

### 2. Performance Impact

**Risk**: Resolving references adds latency

**Mitigation**:
- Parallel queries for references (Promise.all)
- Caching resolved references
- Lazy loading (only resolve on demand)
- Timeout for reference resolution

**Target**: < 200ms additional latency for typical responses

### 3. Circular References

**Risk**: Player → Planet → Owner (Player) → Planet → ...

**Mitigation**:
- Depth limit (default: 1, max: 2)
- Track resolved IDs to prevent duplicates
- Skip already-resolved references

### 4. Backward Compatibility

**Risk**: Breaking changes for existing agents

**Mitigation**:
- Feature disabled by default
- Existing responses unchanged when disabled
- Opt-in via tool parameter
- Version the feature

### 5. Error Handling

**Risk**: Reference resolution failures

**Mitigation**:
- Graceful degradation (include available references, skip failed ones)
- Log errors but don't fail entire response
- Return partial references with error indicators

---

## Testing Strategy

### Unit Tests

1. **ID Extraction**:
   - Test pattern matching
   - Test nested object traversal
   - Test array handling
   - Test edge cases (empty strings, null values)

2. **Reference Resolution**:
   - Test single reference
   - Test multiple references of same type
   - Test multiple references of different types
   - Test circular reference prevention
   - Test depth limiting

3. **Response Merging**:
   - Test reference section addition
   - Test backward compatibility (no references)
   - Test response structure validation

### Integration Tests

1. **End-to-End**:
   - Query player with references enabled
   - Verify all referenced entities included
   - Verify no duplicate references
   - Verify response structure

2. **Performance**:
   - Measure latency impact
   - Measure response size increase
   - Test with large reference sets

3. **Error Scenarios**:
   - Invalid entity IDs
   - Missing entities (404)
   - Network timeouts
   - Partial failures

---

## Migration Plan

### Phase 1: Implementation (Week 1)
- Implement core infrastructure
- Add to 2-3 high-impact tools as opt-in
- Internal testing

### Phase 2: Beta Testing (Week 2)
- Enable for select tools
- Gather agent feedback
- Monitor performance metrics
- Adjust configuration

### Phase 3: Rollout (Week 3)
- Enable for all query/list tools
- Update documentation
- Add examples
- Monitor production usage

### Phase 4: Optimization (Week 4+)
- Add caching
- Performance tuning
- Advanced features (depth, filtering)

---

## Documentation Updates

### Required Updates

1. **Tool Specifications** (`design/tool-specifications.md`):
   - Document `include_references` parameter
   - Document response structure with references
   - Add examples

2. **API Documentation**:
   - Update response schemas
   - Add reference examples
   - Document configuration options

3. **Examples** (`ai/examples/`):
   - Add examples with references enabled
   - Show before/after comparisons
   - Demonstrate use cases

4. **Best Practices** (`ai/BEST_PRACTICES.md`):
   - When to use references
   - Performance considerations
   - Caching strategies

---

## Open Questions

1. **Default Behavior**: Should references be enabled by default, or opt-in only?
   - **Recommendation**: Opt-in (default: false) for backward compatibility

2. **Depth Limit**: What's the maximum practical depth?
   - **Recommendation**: Default 1, max 2 (prevents exponential growth)

3. **Reference Types**: Should agents be able to filter which types to include?
   - **Recommendation**: Yes, via `reference_types` parameter

4. **Caching Strategy**: How long should resolved references be cached?
   - **Recommendation**: TTL-based (e.g., 30 seconds) or until next block

5. **Error Handling**: Should failed reference resolutions fail the entire response?
   - **Recommendation**: No, graceful degradation with partial references

6. **Response Format**: Should references be at root level or nested in a wrapper?
   - **Decision**: Root level for easy access, add `references` at same level as existing fields (no wrapper) ✅

---

## Success Criteria

### Must Have (MVP)

- ✅ References extracted from response payloads (with self-reference exclusion, false positive prevention)
- ✅ References resolved and included in responses
- ✅ Opt-in configuration (default: disabled)
- ✅ Backward compatible (existing responses unchanged - no wrapper)
- ✅ Basic error handling (graceful degradation with error indicators)
- ✅ Rate limiting/throttling (max 5 parallel queries)
- ✅ Basic caching (critical for performance)
- ✅ Reference limits (max 50 total, max 5 per entity in lists)
- ✅ Depth limiting (depth 1 and 2)

### Should Have (v1.0)

- ✅ Type filtering (`reference_types` parameter)
- ✅ List tool special handling (primary references only)
- ✅ Comprehensive testing
- ✅ Documentation (including MCP format integration)
- ✅ Monitoring/metrics

### Nice to Have (v1.1+)

- ✅ Advanced caching (TTL, invalidation strategies)
- ✅ Batch query optimization
- ✅ Response compression
- ✅ Reference metadata (referenced_from, referenced_in)

---

## Dependencies

### Internal

- Existing query tools (for resolving references)
- Entity type mapping (from `ai/schemas/formats.json`)
- Response structure definitions

### External

- None (uses existing MCP server infrastructure)

---

## Timeline Estimate

- **Phase 1 (Core)**: 1.5-2 weeks (increased due to error handling, rate limiting, caching)
- **Phase 2 (Configuration)**: 3-4 days
- **Phase 3 (Optimization)**: 1 week
- **Testing & Documentation**: 3-4 days

**Total**: ~3.5-4 weeks for full implementation

**Note**: Phase 1 timeline increased to accommodate critical features moved from Phase 3 (caching) and new requirements (error handling, rate limiting).

---

## Next Steps

1. **Team Review**: Gather feedback from Technical Editor, Developer Relations, API Docs Specialist
2. **Prioritization**: Confirm priority and timeline
3. **Design Refinement**: Address open questions
4. **Implementation Assignment**: Assign to Developer Relations
5. **Documentation Planning**: Coordinate with API Docs Specialist

---

## Appendix

### Example: Before and After

#### Before (Current)

```json
// Query: structs_query_player("1-11")
{
  "Player": {
    "id": "1-11",
    "guildId": "0-1",
    "planetId": "2-1",
    "fleetId": "9-11"
  }
}

// Agent must make 3 additional queries:
// - structs_query_guild("0-1")
// - structs_query_planet("2-1")
// - structs_query_fleet("9-11")
```

#### After (With References)

```json
// Query: structs_query_player("1-11", { include_references: true })
{
  "Player": {
    "id": "1-11",
    "guildId": "0-1",
    "planetId": "2-1",
    "fleetId": "9-11"
  },
  "timestamp": "...",
  "references": {
    "0-1": {
      "reference_type": "guild",
      "id": "0-1",
      "owner": "1-11",
      "primaryReactorId": "3-1"
    },
    "2-1": {
      "reference_type": "planet",
      "id": "2-1",
      "owner": "1-11",
      "maxOre": "5"
    },
    "9-11": {
      "reference_type": "fleet",
      "id": "9-11",
      "owner": "1-11"
    }
  }
}

// Agent has all context in single response!
// Direct lookup: references["2-1"]
// Get type: references["2-1"].reference_type
// Get all planets: Object.values(references).filter(r => r.reference_type === "planet")
```

---

---

## Changes Based on Review

This plan has been updated based on comprehensive review feedback (see `REFERENCES-FEATURE-REVIEW.md`). Key changes:

### Critical Fixes Applied ✅

1. **Response Structure**: Removed `data` wrapper - references added at same level as existing fields for backward compatibility
2. **MCP Format**: Documented how references fit into MCP's content array structure
3. **Entity Type Mapping**: Added note to verify mappings match `formats.json` and fix tool definition examples
4. **Self-Reference Exclusion**: Added logic to exclude entity's own ID from references
5. **False Positive Prevention**: Added type code validation, field name blacklist, and context-aware detection
6. **List Tool Handling**: Added limits (max 50 total, max 5 per entity) and special behavior for list tools
7. **Depth Limiting**: Clarified semantics with detailed examples for depth 1 and 2
8. **Error Handling**: Defined error indicator format with graceful degradation strategy
9. **Rate Limiting**: Added throttling strategy (max 5 parallel queries) with configuration options
10. **Caching**: Moved from Phase 3 to Phase 1 (critical for performance)

### Phase Adjustments

- **Phase 1**: Expanded to include error handling, rate limiting, caching, and reference limits (8-12 hours, 1.5-2 weeks)
- **Phase 2**: Added type filtering and list tool special handling
- **Phase 3**: Focused on advanced optimization (batch queries, monitoring, performance tuning)

### Timeline Update

- Original: ~3 weeks
- Updated: ~3.5-4 weeks (due to expanded Phase 1 requirements)

---

*Last Updated: January 2025 (Post-Review)*  
*Document Status: Draft - Updated Based on Review*

