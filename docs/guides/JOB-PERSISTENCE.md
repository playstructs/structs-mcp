# Job Persistence

**Date**: January 2025  
**Status**: ✅ **IMPLEMENTED**  
**Feature**: Proof-of-work jobs are now persisted to disk

---

## Overview

Proof-of-work jobs are now **persisted to disk** so they survive system restarts. Job status, results, and history are saved to a JSON file and automatically loaded on startup.

---

## How It Works

### Storage Location

- **Default Directory**: `./data/jobs/`
- **Jobs File**: `./data/jobs/jobs.json`
- **Configurable**: Set `JOBS_DATA_DIR` environment variable to change location
- **Disable**: Set `PERSIST_JOBS=false` environment variable to disable persistence

### What Gets Saved

- **Job Status**: All job statuses (queued, running, waiting, completed, failed)
- **Job Results**: Proof-of-work results, transaction results, difficulty updates
- **Job History**: All completed and failed jobs
- **Job Metadata**: Start time, completion time, errors, waiting info

### When Jobs Are Saved

1. **On Job Creation**: When a new job is started
2. **On Status Updates**: When job status changes (waiting → running, difficulty updates, etc.)
3. **On Completion**: When job completes or fails
4. **On Cleanup**: When old jobs are cleaned up
5. **Debounced**: Rapid updates are debounced (saved after 1 second of inactivity)

### What Happens on Restart

1. **Completed/Failed Jobs**: Restored from disk (can query their status)
2. **Running Jobs**: Marked as "failed" with error "Job was interrupted by system shutdown"
3. **Job History**: All historical jobs are preserved

---

## Configuration

### Environment Variables

```bash
# Change jobs data directory (default: ./data/jobs)
JOBS_DATA_DIR=/path/to/jobs/data

# Disable job persistence (default: enabled)
PERSIST_JOBS=false
```

### Configuration File

In `src/config.ts`:
```typescript
jobsDataDir: process.env.JOBS_DATA_DIR || './data/jobs',
persistJobs: process.env.PERSIST_JOBS !== 'false', // Default to true
```

---

## File Format

Jobs are stored in JSON format:

```json
{
  "pow_1704067200000_abc123": {
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
}
```

---

## Benefits

1. **Survives Restarts**: Jobs are not lost when the system shuts down
2. **Job History**: Can query status of completed jobs even after restart
3. **Debugging**: Can inspect job history to debug issues
4. **Reliability**: No data loss on unexpected shutdowns

---

## Limitations

1. **Running Jobs**: Running jobs are lost on restart (marked as failed)
   - **Solution**: Jobs should be restarted manually if needed
   - **Future**: Could implement job recovery/restart on startup

2. **Worker Processes**: Worker processes are killed on shutdown
   - **Solution**: Worker processes are forked, so they die with the main process
   - **Future**: Could implement detached processes that survive shutdown

3. **File Size**: Jobs file grows over time
   - **Solution**: `cleanupOldJobs()` removes old jobs (default: 1 hour)
   - **Future**: Could implement automatic cleanup on startup

---

## Usage

### Query Job Status (After Restart)

```json
{
  "name": "structs_query_proof_of_work_status",
  "arguments": {
    "job_id": "pow_1704067200000_abc123"
  }
}
```

**Response** (even after restart):
```json
{
  "job_id": "pow_1704067200000_abc123",
  "status": "completed",
  "started_at": "2025-01-01T12:00:00.000Z",
  "completed_at": "2025-01-01T12:05:30.000Z",
  "result": {
    ...
  }
}
```

---

## File Management

### Automatic Cleanup

Old jobs are automatically cleaned up:
- **Default**: Jobs older than 1 hour are removed
- **Configurable**: Call `cleanupOldJobs(maxAgeMs)` with custom age
- **Persistence**: Cleanup is saved to disk

### Manual Cleanup

To manually clean up old jobs:
```typescript
const processManager = getProcessManager();
processManager.cleanupOldJobs(3600000); // Remove jobs older than 1 hour
```

---

## Troubleshooting

### Jobs Not Persisting

1. **Check Permissions**: Ensure write permissions for `data/jobs/` directory
2. **Check Config**: Verify `PERSIST_JOBS` is not set to `false`
3. **Check Logs**: Look for "Could not save jobs to disk" warnings

### Jobs File Corrupted

1. **Backup**: The file uses atomic writes (temp file + rename) to prevent corruption
2. **Recovery**: If corrupted, delete `jobs.json` and restart (jobs will be lost)
3. **Validation**: JSON parsing errors are caught and logged

### Jobs Not Loading on Startup

1. **Check File**: Verify `data/jobs/jobs.json` exists
2. **Check Format**: Ensure JSON is valid
3. **Check Logs**: Look for "Could not load jobs from disk" warnings

---

*Implementation Date: January 2025*
