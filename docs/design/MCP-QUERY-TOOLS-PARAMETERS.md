# MCP Query Tools: Parameter Names (for structs.ai documentation)

**Audience**: structs.ai documentation team / agent authors  
**Issue**: Direct entity lookups (`structs_query_player`, `structs_query_planet`, `structs_query_fleet`, etc.) were failing with `"Cannot read properties of undefined (reading 'match')"` when callers used an `id` parameter.

---

## Root cause

- The MCP query tools use **entity-specific** parameter names, not a generic `id`.
- If documentation said to pass `id`, then `player_id` / `planet_id` / `fleet_id` were undefined and the server threw when validating the ID.

---

## Correct parameter names (by tool)

| Tool | Primary parameter | Example value |
|------|-------------------|---------------|
| `structs_query_player` | `player_id` | `"1-11"` |
| `structs_query_planet` | `planet_id` | `"2-1"` |
| `structs_query_guild` | `guild_id` | `"0-1"` |
| `structs_query_fleet` | `fleet_id` | `"9-1"` |
| `structs_query_struct` | `struct_id` | `"5-1"` |
| `structs_query_reactor` | `reactor_id` | `"3-1"` |
| `structs_query_substation` | `substation_id` | `"4-1"` |
| `structs_query_provider` | `provider_id` | `"10-1"` |
| `structs_query_agreement` | `agreement_id` | `"11-1"` |
| `structs_query_allocation` | `allocation_id` | `"6-1"` |

**ID format**: `{type}-{index}` (e.g. `1-11` = player type 1, index 11).

---

## Compatibility (as of fix)

- **`id` is now accepted as an alias** for any of the above. So both of these work:
  - `{ "player_id": "1-11" }` (preferred)
  - `{ "id": "1-11" }` (compatibility)
- If **no** ID is provided (neither the entity-specific param nor `id`), the server returns a clear validation error instead of throwing.

---

## Suggested doc wording for structs.ai

For **structs_query_player** (and similarly for other entity query tools):

- **Preferred**: “Pass the player ID in the `player_id` parameter (e.g. `player_id: "1-11"`).”
- **Optional note**: “You can also pass the entity ID as `id`; both are accepted.”

Example call:

```json
{ "player_id": "1-11" }
```

or

```json
{ "id": "1-11" }
```

---

## Summary for structs.ai team

1. **Primary parameters** are entity-specific: `player_id`, `planet_id`, `fleet_id`, `guild_id`, `struct_id`, `reactor_id`, `substation_id`, `provider_id`, `agreement_id`, `allocation_id`.
2. **Generic `id`** is now supported as an alias; documenting either the specific parameter or `id` is correct.
3. The previous crash was a server bug (missing null check); it is fixed, and a missing/invalid ID now returns a clear error message.
