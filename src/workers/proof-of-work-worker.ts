/**
 * Proof-of-Work Worker Process
 * 
 * This script runs in a separate process to calculate proof-of-work and submit transactions.
 * It's designed to run independently from the main MCP server to avoid blocking.
 * 
 * Usage: node proof-of-work-worker.js <job-data-json>
 * 
 * @module workers/proof-of-work-worker
 */

import { findProofOfWork, calculateDifficulty } from '../utils/proof-of-work.js';
import { submitTransaction } from '../tools/action.js';
import { query } from '../utils/database.js';
import axios from 'axios';
import { config } from '../config.js';

/**
 * Job data structure
 */
interface ProofOfWorkJob {
  job_id: string;
  action_type: string;
  entity_id: string;
  /**
   * Optional target identifier used for some proof-of-work inputs.
   * For raids this is typically the target planet ID (e.g. "2-1"),
   * which is combined with the fleet ID to form "fleetId@planetId"
   * in the hash input string.
   */
  target_id?: string;
  difficulty: number;
  max_iterations?: number;
  block_start: number; // Required - block height when operation started
  player_id: string;
  ai_docs_path?: string;
}

/**
 * Job result structure
 */
interface JobResult {
  job_id: string;
  status: 'completed' | 'failed' | 'in_progress';
  proof_of_work?: {
    hash: string;
    nonce: string;
    iterations: number;
    valid: boolean;
    difficulty_met: boolean;
    computation_time_ms: number;
  };
  transaction?: {
    transaction_hash?: string;
    transaction_id?: number;
    status: string;
    message: string;
  };
  error?: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Get current block height from database
 * 
 * Uses structs.current_block table (primary source).
 * Falls back to consensus API if database query fails.
 * 
 * Note: It's okay for this value to get stale during computations.
 * The reference implementation (TaskWorker.js) allows estimation
 * during processing. Blocks pass approximately every 5 seconds.
 * 
 * @returns Current block height
 */
let cachedBlockHeight: number | null = null;
let cachedBlockHeightTime: number = 0;
let lastKnownBlockHeight: number | null = null;
let lastKnownBlockTime: number = 0;
const BLOCK_HEIGHT_CACHE_MS = 10000; // Cache for 10 seconds
const BLOCK_TIME_MS = 5000; // Blocks pass every ~5 seconds

async function getCurrentBlockHeight(): Promise<number> {
  const now = Date.now();
  
  // Return cached value if still fresh (within 10 seconds)
  if (cachedBlockHeight !== null && (now - cachedBlockHeightTime) < BLOCK_HEIGHT_CACHE_MS) {
    return cachedBlockHeight;
  }

  // Try to query database first
  try {
    // Primary: Query structs.current_block table
    // Table structure: chain (PK), height, updated_at
    // Get the latest height regardless of chain (most recent updated_at)
    const result = await query(
      'SELECT height FROM structs.current_block ORDER BY updated_at DESC LIMIT 1',
      []
    );
    
    if (result.rows.length > 0 && result.rows[0].height !== null && result.rows[0].height !== undefined) {
      const height = Number(result.rows[0].height);
      if (!isNaN(height) && height > 0) {
        cachedBlockHeight = height;
        cachedBlockHeightTime = now;
        lastKnownBlockHeight = height;
        lastKnownBlockTime = now;
        return height;
      }
    }
  } catch (dbError) {
    // Database query failed, try API fallback or estimation
    console.error(`Database query failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
  }

  // Fallback: Try consensus API
  try {
    const consensusRPCUrl = config.consensusApiUrl;
    const response = await axios.get(`${consensusRPCUrl}/structs/blockheight`, {
      timeout: 5000, // Shorter timeout for fallback
    });
    
    // Response format may vary, try different possible fields
    const blockHeight = response.data.blockheight || 
                       response.data.block_height || 
                       response.data.height ||
                       response.data;
    
    let height: number;
    if (typeof blockHeight === 'number') {
      height = blockHeight;
    } else {
      // If it's a string, try to parse it
      const parsed = parseInt(String(blockHeight), 10);
      if (isNaN(parsed)) {
        throw new Error('Could not parse block height from API response');
      }
      height = parsed;
    }
    
    if (height > 0) {
      cachedBlockHeight = height;
      cachedBlockHeightTime = now;
      lastKnownBlockHeight = height;
      lastKnownBlockTime = now;
      return height;
    }
  } catch (apiError) {
    // If we have a last known value, estimate based on time elapsed
    // Blocks pass every ~5 seconds, so estimate: lastKnown + (timeElapsed / 5000)
    if (lastKnownBlockHeight !== null && lastKnownBlockTime > 0) {
      const timeElapsed = now - lastKnownBlockTime;
      const blocksElapsed = Math.floor(timeElapsed / BLOCK_TIME_MS);
      const estimatedHeight = lastKnownBlockHeight + blocksElapsed;
      
      // Use estimated value (it's okay to be a bit stale/estimated)
      console.error(`Using estimated block height: ${estimatedHeight} (last known: ${lastKnownBlockHeight}, ${blocksElapsed} blocks estimated, error: ${apiError instanceof Error ? apiError.message : 'Unknown error'})`);
      return estimatedHeight;
    }
    
    // If we have a cached value, use it even if stale (it's okay to be a bit stale)
    if (cachedBlockHeight !== null) {
      console.error(`Using stale cached block height: ${cachedBlockHeight} (error: ${apiError instanceof Error ? apiError.message : 'Unknown error'})`);
      return cachedBlockHeight;
    }
  }
  
  throw new Error(`Failed to get block height from database (structs.current_block) or API, and no cached/estimated value available`);
}

// Export getCurrentBlockHeight for use in process manager
export { getCurrentBlockHeight };

/**
 * Wait until age reaches target (default: 10)
 * 
 * @param blockStart - Block height when operation started
 * @param targetAge - Target age to wait for (default: 10)
 * @param checkIntervalMs - How often to check block height (default: 5000ms = 5 seconds)
 * @returns Final age when target is reached
 */
async function waitForTargetAge(
  blockStart: number,
  targetAge: number = 10,
  checkIntervalMs: number = 5000
): Promise<number> {
  while (true) {
    const currentBlockHeight = await getCurrentBlockHeight();
    const currentAge = currentBlockHeight - blockStart;
    
    if (currentAge >= targetAge) {
      return currentAge;
    }
    
    // Log waiting status (to stderr so it doesn't interfere with JSON output)
    const waitTime = targetAge - currentAge;
    console.error(JSON.stringify({
      status: 'waiting',
      message: `Waiting for age to reach ${targetAge}. Current age: ${currentAge}, blocks remaining: ${waitTime}`,
      current_age: currentAge,
      target_age: targetAge,
      blocks_remaining: waitTime,
    }));
    
    // Sleep for check interval
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
}

/**
 * Main worker function
 */
async function main() {
  // Get job data from command line arguments
  const jobDataJson = process.argv[2];
  if (!jobDataJson) {
    console.error(JSON.stringify({
      status: 'error',
      error: 'No job data provided',
    }));
    process.exit(1);
  }

  let jobData: ProofOfWorkJob;
  try {
    jobData = JSON.parse(jobDataJson);
  } catch (error) {
    console.error(JSON.stringify({
      status: 'error',
      error: `Invalid job data JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }));
    process.exit(1);
  }

  const result: JobResult = {
    job_id: jobData.job_id,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  };

  try {
    // Step 1: Get current block height and calculate age
    const blockStart = jobData.block_start;
    const targetAge = 10; // Target start time
    const maxIterations = jobData.max_iterations || 1000000;
    
    // Get current block height to calculate age
    let currentBlockHeight = await getCurrentBlockHeight();
    let currentAge = currentBlockHeight - blockStart;
    
    // Calculate expected iterations for current difficulty
    // For difficulty d, probability is (1/16)^d, so expected iterations is 16^d
    // We want to wait if expected iterations > maxIterations * 0.5 (50% chance of success)
    function estimateExpectedIterations(difficulty: number): number {
      return Math.pow(16, difficulty);
    }
    
    // Get target difficulty start value from config
    const targetDifficultyStart = config.targetDifficultyStart;
    
    // Wait until difficulty is feasible
    while (true) {
      const calculatedDifficulty = calculateDifficulty(currentAge, jobData.difficulty);
      const expectedIterations = estimateExpectedIterations(calculatedDifficulty);
      
      // If age is less than target, wait for that first
      if (currentAge < targetAge) {
        console.error(JSON.stringify({
          job_id: jobData.job_id,
          status: 'waiting',
          message: `Age ${currentAge} is below target ${targetAge}. Waiting for blocks to pass...`,
          current_age: currentAge,
          target_age: targetAge,
          block_start: blockStart,
          current_block_height: currentBlockHeight,
          difficulty: calculatedDifficulty,
          expected_iterations: expectedIterations,
        }));
        
        // Wait for target age
        currentAge = await waitForTargetAge(blockStart, targetAge);
        currentBlockHeight = await getCurrentBlockHeight();
        continue; // Re-check difficulty after waiting
      }
      
      // Check if difficulty is above target difficulty start value
      // Wait until difficulty is at or below the target start value
      if (calculatedDifficulty > targetDifficultyStart) {
        console.error(JSON.stringify({
          job_id: jobData.job_id,
          status: 'waiting',
          message: `Difficulty ${calculatedDifficulty} (age ${currentAge}) is above target start value ${targetDifficultyStart}. Waiting for difficulty to decrease...`,
          current_age: currentAge,
          difficulty: calculatedDifficulty,
          target_difficulty_start: targetDifficultyStart,
          expected_iterations: expectedIterations,
          block_start: blockStart,
          current_block_height: currentBlockHeight,
        }));
        
        // Wait 5 seconds (one block) and check again
        await new Promise(resolve => setTimeout(resolve, 5000));
        currentBlockHeight = await getCurrentBlockHeight();
        currentAge = currentBlockHeight - blockStart;
        continue; // Re-check difficulty
      }
      
      // Check if difficulty is feasible with max iterations
      // Use a threshold: if expected iterations > maxIterations * 2, it's likely too hard
      // (This gives us a reasonable chance of success within max iterations)
      if (expectedIterations > maxIterations * 2) {
        // Difficulty is still too high, wait and check again
        console.error(JSON.stringify({
          job_id: jobData.job_id,
          status: 'waiting',
          message: `Difficulty ${calculatedDifficulty} (age ${currentAge}) is too high for ${maxIterations} iterations. Expected iterations: ${expectedIterations.toExponential(2)}. Waiting for difficulty to decrease...`,
          current_age: currentAge,
          difficulty: calculatedDifficulty,
          expected_iterations: expectedIterations,
          max_iterations: maxIterations,
          block_start: blockStart,
          current_block_height: currentBlockHeight,
        }));
        
        // Wait 5 seconds (one block) and check again
        await new Promise(resolve => setTimeout(resolve, 5000));
        currentBlockHeight = await getCurrentBlockHeight();
        currentAge = currentBlockHeight - blockStart;
        continue; // Re-check difficulty
      }
      
      // Difficulty is feasible, break out of waiting loop
      console.error(JSON.stringify({
        job_id: jobData.job_id,
        status: 'ready',
        message: `Starting proof-of-work calculation. Age: ${currentAge}, Difficulty: ${calculatedDifficulty}, Expected iterations: ${expectedIterations.toExponential(2)}`,
        current_age: currentAge,
        difficulty: calculatedDifficulty,
        expected_iterations: expectedIterations,
        block_start: blockStart,
      }));
      break;
    }
    
    // Step 2: Calculate proof-of-work with calculated age
    // Pass getCurrentBlockHeight function so difficulty can be updated as blocks pass
    const startTime = Date.now();
    
    // Recalculate difficulty based on current age
    const calculatedDifficulty = calculateDifficulty(currentAge, jobData.difficulty);
    
    // For raids, the Go implementation expects the proof-of-work input to use
    // a composite identifier of the form "<fleet_id>@<target_planet_id>".
    // Other actions (build/mine/refine) continue to use the raw entity_id.
    const powEntityId =
      jobData.action_type === 'planet_raid_complete' && jobData.target_id
        ? `${jobData.entity_id}@${jobData.target_id}`
        : jobData.entity_id;

    const powResult = await findProofOfWork(
      jobData.action_type,
      powEntityId,
      blockStart,
      currentAge,
      jobData.difficulty,
      jobData.max_iterations || 1000000,
      getCurrentBlockHeight, // Pass function to poll for current block height
      5000 // Check difficulty every 5 seconds (blocks pass every ~5 seconds)
    );

    const computationTime = Date.now() - startTime;

    result.proof_of_work = {
      hash: powResult.hash,
      nonce: powResult.nonce,
      iterations: powResult.iterations,
      valid: powResult.valid,
      difficulty_met: powResult.difficultyMet,
      computation_time_ms: computationTime,
    };

    if (!powResult.valid || !powResult.difficultyMet) {
      result.status = 'failed';
      result.error = `Could not find valid proof-of-work within ${powResult.iterations} iterations. Difficulty: ${powResult.difficulty}, Age: ${powResult.final_age}`;
      result.completed_at = new Date().toISOString();
      console.error(JSON.stringify(result));
      process.exit(1);
    }

    // Step 2: Map action_type to transaction action name
    const actionMap: Record<string, string> = {
      'struct_build_complete': 'struct_build_complete',
      'planet_raid_complete': 'planet_raid_complete',
      'ore_miner_complete': 'ore_miner_complete',
      'ore_refinery_complete': 'ore_refinery_complete',
    };

    const transactionAction = actionMap[jobData.action_type];
    if (!transactionAction) {
      result.status = 'failed';
      result.error = `Unknown action type for transaction: ${jobData.action_type}`;
      result.completed_at = new Date().toISOString();
      console.error(JSON.stringify(result));
      process.exit(1);
    }

    // Step 4: Submit transaction with proof-of-work
    const transactionArgs: Record<string, unknown> = {
      proof: powResult.hash,
      nonce: powResult.nonce,
    };

    // Add entity-specific arguments
    if (jobData.action_type === 'struct_build_complete') {
      transactionArgs.struct_id = jobData.entity_id;
    } else if (jobData.action_type === 'planet_raid_complete') {
      transactionArgs.fleet_id = jobData.entity_id;
    } else if (jobData.action_type === 'ore_miner_complete' || jobData.action_type === 'ore_refinery_complete') {
      transactionArgs.struct_id = jobData.entity_id;
    }

    const txResult = await submitTransaction(
      transactionAction,
      jobData.player_id,
      transactionArgs,
      jobData.ai_docs_path
    );

    result.transaction = {
      transaction_hash: txResult.transaction_hash,
      transaction_id: txResult.transaction_id,
      status: txResult.status,
      message: txResult.message,
    };

    if (txResult.status === 'error') {
      result.status = 'failed';
      result.error = txResult.error || txResult.message;
    } else {
      result.status = 'completed';
    }

    result.completed_at = new Date().toISOString();

    // Output result to stdout (will be captured by parent process)
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.completed_at = new Date().toISOString();
    console.error(JSON.stringify(result));
    process.exit(1);
  }
}

// Run worker if this is executed directly
// Check if this file is being run directly (not imported)
const isMainModule = process.argv[1]?.endsWith('proof-of-work-worker.ts') || 
                     process.argv[1]?.endsWith('proof-of-work-worker.js') ||
                     import.meta.url === `file://${process.argv[1]}`;

if (isMainModule || process.argv.length > 2) {
  main().catch((error) => {
    console.error(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    process.exit(1);
  });
}

export { main as runProofOfWorkWorker };
