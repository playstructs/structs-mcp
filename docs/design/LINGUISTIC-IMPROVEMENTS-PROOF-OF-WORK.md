# Linguistic Improvements for Proof-of-Work Interfaces

**Date**: January 2025  
**Status**: 📝 Suggestions (No Changes Made Yet)  
**Focus**: Making proof-of-work interfaces more human-friendly and AI-agent-friendly

---

## Overview

The current proof-of-work interfaces use technical jargon, implementation details, and conditional logic that make them harder for AI agents to understand and use correctly. This document suggests linguistic improvements to make the interfaces more intuitive and natural.

---

## Key Issues Identified

### 1. **Technical Implementation Details in Descriptions**
- Mentions of "database", "view.work", "block_start" expose implementation
- References to internal processes that users don't need to know about

### 2. **Conditional/Complex Parameter Descriptions**
- "Entity ID (struct ID for building/mining/refining, fleet ID for raids)" - requires understanding multiple scenarios
- Parameters that are "optional but will be queried" create confusion about when to provide them

### 3. **Tool Names That Reference Other Tools**
- Status query tool references `structs_calculate_proof_of_work` by name
- Creates coupling and makes it harder to understand standalone

### 4. **Long, Technical Descriptions**
- Tool descriptions are verbose and include implementation details
- Focus on "how it works" rather than "what it does for you"

### 5. **Unclear Action Type Names**
- `struct_build_complete`, `ore_miner_complete` - technical naming
- Could be more descriptive of the actual action

---

## Suggested Improvements

### Tool: `structs_calculate_proof_of_work`

#### Current Description
```
Start proof-of-work calculation in a background process. The process will query view.work from the database to get block_start and difficulty, calculate age automatically from current block height, then calculate proof-of-work and automatically submit the transaction. Returns immediately with a job ID - the calculation runs in a separate process that doesn't block the MCP server.
```

#### Suggested Description
```
Complete an action that requires proof-of-work (like finishing a struct build, completing mining, or finishing a raid). This starts the work in the background and automatically submits the transaction when done. Returns a job ID immediately so you can check status later.
```

**Improvements**:
- ✅ Focuses on **what** it does (completes actions) rather than **how** (database queries)
- ✅ Uses natural language ("finishing a struct build" vs "struct_build_complete")
- ✅ Removes implementation details (database, view.work, block_start)
- ✅ Shorter and more scannable
- ✅ Emphasizes the user benefit (automatic submission)

---

### Parameter: `action_type`

#### Current Description
```
Action type: struct_build_complete, planet_raid_complete, ore_miner_complete, ore_refinery_complete
```

#### Suggested Description
```
What action to complete: "finish_building_struct" (complete a struct build), "finish_mining" (complete ore mining), "finish_refining" (complete ore refining), or "finish_raid" (complete a planet raid)
```

**Alternative (More Natural)**:
```
What you're completing: "finish_building_struct", "finish_mining", "finish_refining", or "finish_raid"
```

**Improvements**:
- ✅ Uses action-oriented language ("finish" vs "complete")
- ✅ Includes parenthetical explanations for clarity
- ✅ More intuitive naming (though this would require code changes)
- ✅ Focuses on user intent rather than technical message names

**Note**: If changing enum values is not feasible, at least improve the description:
```
What action to complete. Options: "struct_build_complete" (finish building a struct), "ore_miner_complete" (finish mining ore), "ore_refinery_complete" (finish refining ore), or "planet_raid_complete" (finish raiding a planet)
```

---

### Parameter: `entity_id`

#### Current Description
```
Entity ID (struct ID for building/mining/refining, fleet ID for raids)
```

#### Suggested Description
```
The ID of what you're completing: struct ID for building/mining/refining, or fleet ID for raids
```

**Better Alternative**:
```
The struct ID (for building, mining, or refining) or fleet ID (for raids) that you're completing
```

**Even Better (Action-Specific)**:
```
The struct ID if completing a build/mining/refining, or the fleet ID if completing a raid
```

**Improvements**:
- ✅ Clearer structure (what it is, then when to use each)
- ✅ Removes redundant "Entity ID" label
- ✅ More conversational tone

---

### Parameter: `difficulty`

#### Current Description
```
Difficulty range value (optional - if not provided, will be queried from view.work database table). Actual difficulty is calculated based on age (current_block_height - block_start).
```

#### Suggested Description
```
Difficulty value (optional). If not provided, it will be looked up automatically. The actual difficulty used depends on how long the operation has been running.
```

**Improvements**:
- ✅ Removes technical terms ("view.work database table", "block_start", "block_height")
- ✅ Uses simpler language ("looked up automatically" vs "queried from database")
- ✅ Explains the concept ("how long the operation has been running" vs technical age calculation)
- ✅ Shorter and clearer

---

### Parameter: `block_start`

#### Current Description
```
Block height when operation started (optional - if not provided, will be queried from view.work database table)
```

#### Suggested Description
```
When the operation started (optional). If not provided, it will be looked up automatically.
```

**Improvements**:
- ✅ Uses natural time concept ("when" vs "block height")
- ✅ Removes implementation details
- ✅ Simpler and clearer

---

### Parameter: `player_id`

#### Current Description
```
Player ID (e.g., '1-11') - Required for automatic transaction submission
```

#### Suggested Description
```
Your player ID (e.g., '1-11'). Required so the transaction can be submitted automatically.
```

**Improvements**:
- ✅ More personal ("your" vs generic)
- ✅ Clearer reason ("so the transaction can be submitted" vs technical "for automatic transaction submission")

---

### Parameter: `max_iterations`

#### Current Description
```
Maximum iterations (optional, default: 1,000,000)
```

#### Suggested Description
```
Maximum number of attempts to find a valid proof (optional, default: 1,000,000). Higher values may take longer but are more likely to succeed.
```

**Improvements**:
- ✅ Explains what "iterations" means in plain terms ("attempts to find a valid proof")
- ✅ Adds helpful context about trade-offs
- ✅ More user-friendly

---

### Tool: `structs_query_proof_of_work_status`

#### Current Description
```
Query the status of a proof-of-work job started by structs_calculate_proof_of_work
```

#### Suggested Description
```
Check the status of a proof-of-work job. Use the job ID returned when you started the job.
```

**Improvements**:
- ✅ Doesn't reference another tool by name
- ✅ Standalone and self-explanatory
- ✅ Clearer action verb ("check" vs "query")
- ✅ Explains when to use it (with job ID)

---

### Parameter: `job_id` (for status query)

#### Current Description
```
Job ID returned by structs_calculate_proof_of_work
```

#### Suggested Description
```
The job ID you received when you started the proof-of-work job
```

**Improvements**:
- ✅ Doesn't reference tool name
- ✅ More conversational ("you received" vs "returned by")
- ✅ Clearer context

---

### Tool: `structs_query_work_info`

#### Current Description
```
Query work information from database (for proof-of-work calculations)
```

#### Suggested Description
```
Get the work details needed to complete an action (like when it started and what difficulty to use). Usually you don't need this - the proof-of-work tool looks it up automatically.
```

**Improvements**:
- ✅ Explains what "work information" means
- ✅ Removes database mention
- ✅ Adds helpful guidance about when you might need it (rarely)
- ✅ References the automatic behavior

---

### Parameter: `action_type` (for work info)

#### Current Description
```
Action type: struct_build_complete, planet_raid_complete, ore_miner_complete, ore_refinery_complete
```

#### Suggested Description
```
Same as the action_type you would use for completing this action (e.g., "struct_build_complete" for finishing a build)
```

**Improvements**:
- ✅ References the related action rather than listing all options
- ✅ Provides an example
- ✅ More contextual

---

## Additional Suggestions

### 1. **Response Messages**

#### Current
```
"Proof-of-work job started. Job ID: pow_1704067200000_abc123. The transaction will be submitted automatically when proof-of-work is complete."
```

#### Suggested
```
"Started working on completing your action. Job ID: pow_1704067200000_abc123. I'll submit the transaction automatically when it's ready."
```

**Improvements**:
- ✅ More personal and conversational
- ✅ Clearer about what's happening
- ✅ Uses "I'll" to make it feel more like an assistant

---

### 2. **Status Values**

Consider renaming status values to be more intuitive:
- `queued` → `waiting` or `pending`
- `completed` → `done` or `finished`
- `failed` → `error` or `could_not_complete`

---

### 3. **Error Messages**

Make error messages more helpful:
- Instead of: "Invalid action type: struct_build"
- Use: "Unknown action type 'struct_build'. Valid options are: finish_building_struct, finish_mining, finish_refining, finish_raid"

---

## Summary of Principles

1. **Focus on User Intent**: Describe what the user wants to accomplish, not how the system works
2. **Remove Implementation Details**: Don't mention databases, tables, internal processes
3. **Use Natural Language**: "finish building" vs "struct_build_complete"
4. **Provide Context**: Explain when/why to use optional parameters
5. **Standalone Descriptions**: Don't reference other tools by name
6. **Conversational Tone**: Use "you" and "your" to make it feel more personal
7. **Simplify Technical Terms**: "looked up automatically" vs "queried from database"
8. **Add Helpful Guidance**: Explain trade-offs and when things are optional

---

## Implementation Notes

- These are **linguistic improvements only** - no code changes required for most
- Some improvements (like renaming action types) would require code changes
- Can be implemented incrementally
- Test with AI agents to see if prompts trigger correct tool usage more often

---

*Document Status: Suggestions Only - No Changes Made*

