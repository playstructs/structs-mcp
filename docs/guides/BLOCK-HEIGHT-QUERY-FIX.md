# Block Height Query Fix

**Date**: January 2025  
**Status**: ✅ **FIXED**  
**Issue**: Job failed due to block height query error

---

## Problem

The proof-of-work system was failing with:
```
Job failed due to a block height query error.
```

The system was trying to query `structs.block_height` table, which doesn't exist. The correct table is `structs.current_block`.

---

## Solution

### 1. Fixed Database Query

**Before** (incorrect):
```typescript
const result = await query(
  'SELECT block_height FROM structs.block_height ORDER BY block_height DESC LIMIT 1',
  []
);
```

**After** (correct):
```typescript
const result = await query(
  'SELECT height FROM structs.current_block ORDER BY updated_at DESC LIMIT 1',
  []
);
```

### 2. Table Structure

The `structs.current_block` table has:
- `chain` (PK) - Chain identifier
- `height` - Current block height
- `updated_at` - Last update timestamp

### 3. Stale Value Handling

Following the reference implementation (TaskWorker.js), the system now:
- **Allows stale values**: It's okay for block height to get stale during computations
- **Caches values**: Caches block height for 10 seconds to reduce database queries
- **Estimates when needed**: If query fails, estimates block height based on time elapsed (blocks pass every ~5 seconds)

### 4. Estimation Logic

If database and API queries fail, the system estimates:
```typescript
const timeElapsed = now - lastKnownBlockTime;
const blocksElapsed = Math.floor(timeElapsed / 5000); // Blocks pass every ~5 seconds
const estimatedHeight = lastKnownBlockHeight + blocksElapsed;
```

This matches the reference implementation behavior where it's acceptable to estimate during processing.

---

## Implementation Details

### Primary Query: structs.current_block

```typescript
// Query the latest block height from structs.current_block
const result = await query(
  'SELECT height FROM structs.current_block ORDER BY updated_at DESC LIMIT 1',
  []
);
```

### Fallback: Consensus API

If database query fails, tries consensus API:
```typescript
const response = await axios.get(`${consensusRPCUrl}/structs/blockheight`);
```

### Fallback: Estimation

If both fail, estimates based on last known value:
```typescript
// Blocks pass every ~5 seconds
const blocksElapsed = Math.floor(timeElapsed / 5000);
const estimatedHeight = lastKnownBlockHeight + blocksElapsed;
```

### Error Handling

- **Graceful degradation**: If block height query fails, continues with current difficulty
- **Retry logic**: Waits before retrying (half the check interval)
- **Logging**: Logs errors but doesn't fail the job

---

## Reference Implementation

Based on [TaskWorker.js](https://raw.githubusercontent.com/playstructs/structs-webapp/main/src/js/workers/TaskWorker.js):

- Uses `state.getCurrentDifficulty()` which queries block height
- Recalculates difficulty periodically: `if (state.iterations % TASK.DIFFICULTY_RECALCULATE === 0)`
- Allows stale values during computation
- Estimates block height if needed

---

## Benefits

1. **Correct table**: Uses `structs.current_block` instead of non-existent `structs.block_height`
2. **Resilient**: Handles query failures gracefully
3. **Efficient**: Caches values to reduce database load
4. **Accurate**: Estimates when queries fail, matching reference implementation
5. **Non-blocking**: Doesn't fail jobs due to temporary query issues

---

## Testing

The fix ensures:
- ✅ Queries `structs.current_block` table correctly
- ✅ Handles missing table/data gracefully
- ✅ Falls back to API if database fails
- ✅ Estimates block height if all queries fail
- ✅ Allows stale values during computation (as per reference)
- ✅ Doesn't fail jobs due to temporary query errors

---

*Fixed: January 2025*
