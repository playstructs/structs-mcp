# Automatic Age Calculation for Proof-of-Work

**Date**: January 2025  
**Status**: ✅ **IMPLEMENTED**  
**Change**: Age is now calculated automatically from block_start and current block height

---

## Overview

The proof-of-work system now **automatically calculates age** from `block_start` and current block height. Users no longer need to provide `age` as a parameter - it's calculated dynamically.

---

## Changes Made

### 1. Removed `age` Parameter

**Before**:
```json
{
  "action_type": "struct_build_complete",
  "entity_id": "5-28",
  "age": 100,  // ❌ User had to calculate this
  "difficulty": 220,
  "block_start": 679575,
  "player_id": "1-11"
}
```

**After**:
```json
{
  "action_type": "struct_build_complete",
  "entity_id": "5-28",
  "difficulty": 220,  // Optional - queried from view.work if not provided
  "block_start": 679575,  // Optional - queried from view.work if not provided
  "player_id": "1-11"
}
```

### 2. Automatic Block Start and Difficulty Query

The system now:
1. **Queries `view.work`** from database to get `block_start` and `difficulty`
2. **Falls back** to struct_attribute queries if `view.work` doesn't have the record:
   - **Struct builds**: Queries `struct_attribute` for `blockStartBuild` + `struct_type.build_difficulty`
   - **Mining**: Queries `struct_attribute` for `blockStartMining` + `struct_type.ore_mining_difficulty`
   - **Refining**: Queries `struct_attribute` for `blockStartRefining` + `struct_type.ore_mining_difficulty`
3. **Calculates age automatically**: `age = current_block_height - block_start`
4. **Updates age dynamically**: As blocks pass, age increases and difficulty decreases

### 3. Updated Tool Schema

**Removed**:
- `age` parameter (no longer required)

**Made Optional**:
- `block_start` (queried from database if not provided)
- `difficulty` (queried from database if not provided)

**Required**:
- `action_type`
- `entity_id`
- `player_id`

---

## How It Works

### Step 1: Query Work Info

```typescript
// Query view.work for block_start and difficulty
const workInfo = await queryWorkInfo(entity_id, action_type);

// Use provided values or database values
const blockStart = providedBlockStart ?? workInfo.block_start;
const difficulty = providedDifficulty ?? workInfo.difficulty;
```

### Step 2: Calculate Age Automatically

```typescript
// In worker process:
const currentBlockHeight = await getCurrentBlockHeight();
const currentAge = currentBlockHeight - blockStart;
```

### Step 3: Update Age Dynamically

During proof-of-work calculation:
- Every 5 seconds, polls current block height
- Recalculates age: `age = current_block_height - block_start`
- Recalculates difficulty (decreases as age increases)
- Updates difficulty if it decreased

---

## Database Queries

### Primary: view.work

```sql
SELECT block_start, difficulty, block_time
FROM view.work
WHERE entity_id = $1 AND work_type = $2
ORDER BY block_start DESC
LIMIT 1
```

### Fallback: struct_attribute (for struct builds)

```sql
SELECT 
  sa.val as block_start_build,
  st.build_difficulty as difficulty
FROM structs.struct s
JOIN structs.struct_attribute sa ON sa.object_id = s.id 
  AND sa.attribute_type = 'blockStartBuild'
JOIN structs.struct_type st ON st.id = s.type
WHERE s.id = $1
```

### Fallback: struct_attribute (for mining/refining)

```sql
SELECT 
  sa.val as block_start,
  st.ore_mining_difficulty as difficulty
FROM structs.struct s
JOIN structs.struct_attribute sa ON sa.object_id = s.id 
  AND sa.attribute_type = $2  -- 'blockStartMining' or 'blockStartRefining'
JOIN structs.struct_type st ON st.id = s.type
WHERE s.id = $1
```

---

## Benefits

1. **Simpler API**: Users don't need to calculate age manually
2. **Always Accurate**: Age is calculated from current block height
3. **Dynamic Updates**: Age updates automatically as blocks pass
4. **Database Integration**: Uses view.work as primary source, falls back to struct tables
5. **Flexible**: Can still provide block_start and difficulty if needed

---

## Error Handling

If `block_start` or `difficulty` cannot be found:
- **Error**: Clear error message indicating what's missing
- **Fallbacks**: Tries multiple query methods
- **User Override**: Can still provide values manually if database query fails

---

## Usage Example

### Before (Manual Age Calculation)

```json
{
  "name": "structs_calculate_proof_of_work",
  "arguments": {
    "action_type": "struct_build_complete",
    "entity_id": "5-28",
    "age": 100,  // ❌ Had to calculate: current_block - block_start
    "difficulty": 220,
    "block_start": 679575,
    "player_id": "1-11"
  }
}
```

### After (Automatic Age Calculation)

```json
{
  "name": "structs_calculate_proof_of_work",
  "arguments": {
    "action_type": "struct_build_complete",
    "entity_id": "5-28",
    "player_id": "1-11"
    // ✅ block_start and difficulty queried from database
    // ✅ age calculated automatically: current_block - block_start
  }
}
```

---

## Technical Details

### Age Calculation Formula

```
age = current_block_height - block_start
```

### Difficulty Calculation (Based on Age)

```
if (age <= 1) {
  difficulty = 64;  // Maximum difficulty
} else {
  difficulty = 64 - floor(log10(age) / log10(difficultyRange) * 63);
}
```

### Dynamic Updates

- **Polling Interval**: Every 5 seconds (matches block time)
- **Update Logic**: If age increases, recalculate difficulty
- **Difficulty Decreases**: As age increases, difficulty decreases (easier to find)

---

## Migration Notes

### For Existing Code

If you were manually calculating age:
```typescript
// OLD (manual)
const age = currentBlockHeight - blockStart;
await calculateProofOfWork({..., age, block_start: blockStart});

// NEW (automatic)
await calculateProofOfWork({..., block_start: blockStart});  // age calculated automatically
// OR
await calculateProofOfWork({...});  // block_start queried from database
```

### Backward Compatibility

- `block_start` parameter is still accepted (optional)
- `difficulty` parameter is still accepted (optional)
- If not provided, both are queried from database

---

*Implementation Date: January 2025*
