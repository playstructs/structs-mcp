# Difficulty Waiting Fix

**Date**: January 2025  
**Status**: ✅ **FIXED**  
**Issue**: Job failed when difficulty was too high instead of waiting

---

## Problem

The proof-of-work system was failing jobs immediately when difficulty was too high for the max iterations, even though the system should wait for difficulty to decrease as blocks pass.

**Error Message**:
```
Job failed: actual age is 107 (difficulty 20), too high for 1M iterations. 
The tool auto-calculates age, so the provided age was ignored.
```

**Root Cause**: The worker only waited if `age < 10`, but didn't check if the difficulty was feasible for the max iterations. Even with `age >= 10`, difficulty 20 requires approximately `16^20 ≈ 1.2e24` iterations, which is far more than 1M iterations.

---

## Solution

### 1. Added Feasibility Check

The worker now checks if the difficulty is feasible before starting computation:

```typescript
// Calculate expected iterations for current difficulty
// For difficulty d, probability is (1/16)^d, so expected iterations is 16^d
function estimateExpectedIterations(difficulty: number): number {
  return Math.pow(16, difficulty);
}

// Wait until difficulty is feasible
while (true) {
  const calculatedDifficulty = calculateDifficulty(currentAge, jobData.difficulty);
  const expectedIterations = estimateExpectedIterations(calculatedDifficulty);
  
  // If expected iterations > maxIterations * 2, wait for difficulty to decrease
  if (expectedIterations > maxIterations * 2) {
    // Wait and check again
    await new Promise(resolve => setTimeout(resolve, 5000));
    currentBlockHeight = await getCurrentBlockHeight();
    currentAge = currentBlockHeight - blockStart;
    continue;
  }
  
  // Difficulty is feasible, start computation
  break;
}
```

### 2. Waiting Logic

The system now waits in two scenarios:

1. **Age < 10**: Wait until age reaches 10 (original behavior)
2. **Difficulty too high**: Wait until difficulty decreases to a feasible level (new behavior)

### 3. Periodic Checking

While waiting, the system:
- Checks block height every 5 seconds (one block)
- Recalculates age and difficulty
- Logs waiting status to stderr (captured by process manager)
- Continues until difficulty is feasible

---

## Implementation Details

### Expected Iterations Calculation

For a hash with difficulty `d` (requiring `d` leading zeros in hexadecimal):
- Probability of success per attempt: `(1/16)^d`
- Expected number of iterations: `16^d`

**Examples**:
- Difficulty 1: `16^1 = 16` iterations (very easy)
- Difficulty 10: `16^10 = 1,099,511,627,776` iterations (~1.1 trillion)
- Difficulty 20: `16^20 ≈ 1.2e24` iterations (extremely high)

### Feasibility Threshold

The system uses `maxIterations * 2` as the threshold:
- If `expectedIterations > maxIterations * 2`, wait for difficulty to decrease
- This gives a reasonable chance of success within max iterations

**Rationale**: Using `2x` provides a buffer - if expected iterations is close to max iterations, there's still a reasonable chance of success.

### Waiting Messages

The system logs waiting status to stderr:

```json
{
  "status": "waiting",
  "message": "Difficulty 20 (age 107) is too high for 1000000 iterations. Expected iterations: 1.21e+24. Waiting for difficulty to decrease...",
  "current_age": 107,
  "difficulty": 20,
  "expected_iterations": 1.2089258196146292e+24,
  "max_iterations": 1000000,
  "block_start": 679575,
  "current_block_height": 679682
}
```

---

## Behavior

### Before Fix

1. Job starts
2. Checks if `age < 10` → waits if true
3. If `age >= 10`, immediately starts computation
4. If difficulty is too high, computation fails after max iterations
5. Job marked as failed

### After Fix

1. Job starts
2. Checks if `age < 10` → waits if true
3. Checks if difficulty is feasible → waits if not
4. Periodically rechecks (every 5 seconds)
5. Starts computation only when difficulty is feasible
6. Job succeeds (or fails only if computation actually fails)

---

## Example Scenarios

### Scenario 1: Age < 10

**Initial State**: `age = 5`, `difficulty = 64`

**Behavior**:
1. Wait until `age >= 10`
2. Recheck difficulty
3. If still too high, continue waiting
4. Start when feasible

### Scenario 2: Age >= 10, Difficulty Too High

**Initial State**: `age = 107`, `difficulty = 20`, `maxIterations = 1M`

**Behavior**:
1. Skip age < 10 check (age is 107)
2. Calculate expected iterations: `16^20 ≈ 1.2e24`
3. Compare: `1.2e24 > 1M * 2` → **wait**
4. Every 5 seconds:
   - Check block height
   - Recalculate age and difficulty
   - If difficulty still too high, continue waiting
5. When difficulty decreases (e.g., to 15), expected iterations becomes `16^15 ≈ 1.1e18` (still high, but closer)
6. Continue waiting until feasible (e.g., difficulty 10: `16^10 ≈ 1.1e12`)

### Scenario 3: Feasible Difficulty

**Initial State**: `age = 200`, `difficulty = 8`, `maxIterations = 1M`

**Behavior**:
1. Calculate expected iterations: `16^8 = 4,294,967,296` (~4.3 billion)
2. Compare: `4.3e9 > 1M * 2` → **wait**
3. As blocks pass, age increases, difficulty decreases
4. When difficulty reaches 6: `16^6 = 16,777,216` (~16.7M)
5. Still too high, continue waiting
6. When difficulty reaches 5: `16^5 = 1,048,576` (~1M)
7. `1M < 1M * 2` → **start computation**

---

## Benefits

1. **No Premature Failures**: Jobs don't fail immediately when difficulty is too high
2. **Automatic Waiting**: System automatically waits for feasible difficulty
3. **Dynamic Updates**: Difficulty updates as blocks pass
4. **Better Success Rate**: Jobs only start when they have a reasonable chance of success
5. **User-Friendly**: Users don't need to manually wait and retry

---

## Testing

The fix ensures:
- ✅ Jobs wait when `age < 10`
- ✅ Jobs wait when difficulty is too high (even if `age >= 10`)
- ✅ System periodically checks and updates difficulty
- ✅ Jobs start only when difficulty is feasible
- ✅ Waiting status is properly logged and tracked

---

*Fixed: January 2025*
