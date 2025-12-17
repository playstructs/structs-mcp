# References Feature: Executive Summary

**Status**: 🟡 Draft - Pending Team Review  
**Date**: January 2025  
**Priority**: 🟡 Medium-High  
**Effort**: Medium (3 weeks)  
**Impact**: High

---

## The Problem

MCP server responses include entity IDs (like `guildId: "0-1"`, `planetId: "2-1"`) but don't include the full details of those referenced objects. Agents must make multiple follow-up queries to get complete context, leading to:

- 5+ separate queries for what could be 1-2 queries
- Higher rate limit risk
- Slower decision making
- Redundant requests for the same IDs

---

## The Solution

Add an optional `references` section to MCP responses that includes full details of all entity IDs found in the response:

```json
{
  "data": {
    "Player": {
      "id": "1-11",
      "guildId": "0-1",
      "planetId": "2-1"
    }
  },
  "references": {
    "0-1": {
      "reference_type": "guild",
      /* full guild data */
    },
    "2-1": {
      "reference_type": "planet",
      /* full planet data */
    },
    "2-5": {
      "reference_type": "planet",
      /* full planet data */
    }
  }
}
```

**Key Features**:
- ✅ **O(1) Lookup**: Direct access by ID (`references["2-1"]`)
- ✅ **Automatic Deduplication**: Object keys prevent duplicates
- ✅ **Explicit Type**: Each reference includes `reference_type` field
- ✅ **Flat Structure**: Simple one-level structure for easy access
- ✅ **Automatic ID detection**: Scans response payload for entity IDs
- ✅ **Opt-in**: Default disabled for backward compatibility
- ✅ **Depth limiting**: Prevents circular references

---

## Entity Type Mapping

References use a flat structure with entity IDs as keys. Each reference includes a `reference_type` field:

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

---

## Implementation Phases

### Phase 1: Core Infrastructure (1 week)
- Extract entity IDs from responses
- Resolve references via existing query tools
- Add references section to responses
- Basic error handling

### Phase 2: Configuration (3-4 days)
- Opt-in parameter: `include_references: boolean`
- Depth limiting: `reference_depth: number`
- Type filtering: `reference_types: EntityType[]`

### Phase 3: Optimization (1 week)
- Caching resolved references
- Parallel query execution
- Performance tuning

---

## Benefits

- **50-70% reduction** in follow-up API calls
- **Faster context building** (complete info in single response)
- **Lower server load** (fewer total queries)
- **Better rate limit resilience**

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large response size | Opt-in only, max references limit |
| Performance impact | Parallel queries, caching, <200ms target |
| Circular references | Depth limit (default: 1, max: 2) |
| Breaking changes | Default disabled, backward compatible |
| Resolution failures | Graceful degradation, partial references |

---

## Affected Tools

**Primary Candidates** (high impact):
- `structs_query_player` - Returns guildId, planetId, fleetId
- `structs_query_planet` - Returns owner, struct IDs
- `structs_query_guild` - Returns owner, reactor IDs
- `structs_list_*` tools - Multiple entities with references

**Secondary Candidates**:
- Calculation tools returning entity IDs
- Workflow tools returning multiple entities

---

## Open Questions for Team

1. **Default Behavior**: Opt-in (recommended) or opt-out?
2. **Depth Limit**: Default 1, max 2 (recommended)?
3. **Type Filtering**: Allow agents to specify which types to include?
4. **Caching TTL**: How long to cache resolved references?
5. **Error Handling**: Fail entire response or graceful degradation?

---

## Timeline

- **Total**: ~3 weeks
- **Phase 1**: 1 week (core)
- **Phase 2**: 3-4 days (configuration)
- **Phase 3**: 1 week (optimization)
- **Testing & Docs**: 3-4 days

---

## Next Steps

1. ✅ Product plan created
2. ⏳ Team review and feedback
3. ⏳ Design refinement
4. ⏳ Implementation assignment
5. ⏳ Documentation planning

---

**Full Plan**: See `REFERENCES-FEATURE-PLAN.md` for complete details.

---

*Last Updated: January 2025*

