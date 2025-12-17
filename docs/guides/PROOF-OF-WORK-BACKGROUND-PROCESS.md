# Proof-of-Work Background Process Implementation

**Date**: January 2025  
**Status**: ✅ **IMPLEMENTED**  
**Change**: Proof-of-work calculation now runs in a separate background process

---

## Overview

The proof-of-work calculation has been refactored to run in a **separate forked process** that doesn't block the main MCP server loop. The tool now:

1. **Returns immediately** with a job ID
2. **Waits if difficulty is too high** - If age < 10, waits until age reaches 10 before starting
3. **Runs proof-of-work calculation** in a background process
4. **Automatically submits the transaction** when proof-of-work is complete
5. **Doesn't block** the MCP server from handling other requests

### Smart Waiting System

If the difficulty is too high (age < 10), the worker enters a **"waiting" state**:
- Periodically checks current block height
- Calculates current age = current_block_height - block_start
- Waits until age >= 10 (target start time)
- Then begins proof-of-work calculation
- Status updates are logged during waiting period

---

## Changes Made

### 1. New Worker Process (`src/workers/proof-of-work-worker.ts`)

A standalone worker script that:
- Calculates proof-of-work hash and nonce
- Automatically submits the transaction when complete
- Runs in a completely separate process (forked)
- Outputs results via stdout/stderr

**Key Features**:
- Isolated from main MCP server
- Handles all proof-of-work action types
- Automatically submits transactions
- Reports status via JSON output

### 2. Process Manager (`src/utils/process-manager.ts`)

Manages background processes:
- Tracks job status (queued, running, completed, failed)
- Forks worker processes using `child_process.fork()`
- Handles process output and errors
- Provides job status queries
- Cleans up old jobs

**Key Features**:
- Singleton pattern for global access
- Automatic process management
- Job status tracking
- Error handling and cleanup

### 3. Updated Proof-of-Work Tool (`src/tools/calculation.ts`)

The `calculateProofOfWork` function now:
- Accepts `player_id` parameter (required)
- Starts a background job instead of calculating synchronously
- Returns immediately with job ID
- No longer blocks the MCP server

**Before**:
```typescript
// Blocking - waits for proof-of-work to complete
const result = await calculateProofOfWork({...});
// Returns hash, nonce, etc.
```

**After**:
```typescript
// Non-blocking - returns immediately
const result = await calculateProofOfWork({..., player_id: '1-11'});
// Returns { job_id: 'pow_...', status: 'queued', message: '...' }
```

### 4. New Status Query Tool (`structs_query_proof_of_work_status`)

New MCP tool to check job status:
- Query job status by job ID
- Get proof-of-work results
- Get transaction submission results
- Check if job completed or failed

### 5. Updated Action Tool (`src/tools/action.ts`)

Added support for all proof-of-work action types:
- `planet_raid_complete` - Raid completion transactions
- `ore_miner_complete` - Mining completion transactions
- `ore_refinery_complete` - Refining completion transactions

---

## Usage

### Starting a Proof-of-Work Job

```json
{
  "name": "structs_calculate_proof_of_work",
  "arguments": {
    "action_type": "struct_build_complete",
    "entity_id": "2-1-0",
    "age": 100,
    "difficulty": 14000,
    "player_id": "1-11",
    "block_start": 1000
  }
}
```

**Response** (immediate):
```json
{
  "job_id": "pow_1704067200000_abc123",
  "status": "queued",
  "message": "Proof-of-work job started. Job ID: pow_1704067200000_abc123. The transaction will be submitted automatically when proof-of-work is complete.",
  "note": "Proof-of-work calculation is running in a background process. The transaction will be submitted automatically when proof-of-work is complete. Use structs_query_proof_of_work_status to check job status."
}
```

### Checking Job Status

```json
{
  "name": "structs_query_proof_of_work_status",
  "arguments": {
    "job_id": "pow_1704067200000_abc123"
  }
}
```

**Response** (when waiting):
```json
{
  "job_id": "pow_1704067200000_abc123",
  "status": "waiting",
  "started_at": "2025-01-01T12:00:00.000Z",
  "waiting_info": {
    "current_age": 5,
    "target_age": 10,
    "blocks_remaining": 5
  }
}
```

**Response** (when completed):
```json
{
  "job_id": "pow_1704067200000_abc123",
  "status": "completed",
  "started_at": "2025-01-01T12:00:00.000Z",
  "completed_at": "2025-01-01T12:05:30.000Z",
  "result": {
    "job_id": "pow_1704067200000_abc123",
    "status": "completed",
    "proof_of_work": {
      "hash": "0000000abc123...",
      "nonce": "12345",
      "iterations": 12345,
      "valid": true,
      "difficulty_met": true,
      "computation_time_ms": 330000
    },
    "transaction": {
      "transaction_hash": "0x...",
      "transaction_id": 123,
      "status": "broadcast",
      "message": "Transaction broadcast successfully"
    }
  }
}
```

---

## Technical Details

### Process Forking

The worker process is forked using Node.js `child_process.fork()`:
- **Isolated**: Runs in separate process, doesn't share memory
- **Non-blocking**: Main MCP server continues handling requests
- **TypeScript Support**: Uses `tsx` to run TypeScript directly (development) or compiled JavaScript (production)

### Worker Execution

1. **Job Creation**: Process manager creates job and forks worker
2. **Age Check**: Worker checks if age < 10 (target start time)
3. **Waiting (if needed)**: If age < 10, worker waits and periodically checks block height until age >= 10
4. **Proof-of-Work**: Worker calculates hash/nonce in background (with updated age)
5. **Transaction Submission**: Worker automatically submits transaction
6. **Status Update**: Process manager updates job status (including waiting state)
7. **Cleanup**: Old jobs are cleaned up automatically

### Error Handling

- Worker errors are captured and reported in job status
- Failed jobs include error messages
- Process crashes are handled gracefully
- Transaction submission errors are included in results

---

## Benefits

1. **Non-Blocking**: MCP server can handle other requests while proof-of-work runs
2. **Smart Waiting**: Automatically waits when difficulty is too high (age < 10)
3. **Automatic**: Transactions are submitted automatically when proof-of-work completes
4. **Isolated**: Worker process doesn't affect main server stability
5. **Trackable**: Job status can be queried at any time (including waiting state)
6. **Scalable**: Multiple proof-of-work jobs can run simultaneously

---

## Requirements

### Development
- `tsx` package for running TypeScript workers (or compile to JavaScript)

### Production
- TypeScript compiled to JavaScript, or
- `tsx` installed as dependency

---

## Testing

To test the background process:

1. **Start a proof-of-work job**:
   ```bash
   # Use MCP client to call structs_calculate_proof_of_work
   ```

2. **Check job status**:
   ```bash
   # Use MCP client to call structs_query_proof_of_work_status
   ```

3. **Verify transaction**:
   ```bash
   # Check database or API for submitted transaction
   ```

---

## Future Enhancements

- Job cancellation
- Job priority queue
- Worker pool management
- Progress reporting
- Webhook notifications

---

*Implementation Date: January 2025*
