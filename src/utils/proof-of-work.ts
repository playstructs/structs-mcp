/**
 * Proof-of-Work Hashing Utilities
 * 
 * Implements HashBuildAndCheckDifficulty logic similar to TaskManager.js
 * Based on Go implementation: x/structs/types/work.go
 * 
 * @module utils/proof-of-work
 */

import { createHash } from 'crypto';

/**
 * Action type to prefix mapping
 */
const ACTION_PREFIXES: Record<string, string> = {
  struct_build_complete: 'BUILD',
  planet_raid_complete: 'RAID',
  ore_miner_complete: 'MINE',
  ore_refinery_complete: 'REFINE',
};

/**
 * Calculate difficulty based on age and difficulty range
 * 
 * Formula from Go code: work.go:49-62 (CalculateDifficulty)
 * 
 * @param age - Current block height - operation start height
 * @param difficultyRange - Base difficulty range
 * @returns Calculated difficulty (1-64)
 */
export function calculateDifficulty(age: number, difficultyRange: number): number {
  // If age <= 1, return maximum difficulty (64)
  if (age <= 1) {
    return 64;
  }

  // Calculate difficulty: 64 - floor(log10(age) / log10(difficultyRange) * 63)
  const difficulty = 64 - Math.floor((Math.log10(age) / Math.log10(difficultyRange)) * 63);

  // Ensure difficulty is at least 1
  if (difficulty < 1) {
    return 1;
  }

  return difficulty;
}

/**
 * Build hash input string based on action type
 * 
 * Format varies by action type:
 * - struct_build_complete: structId + "BUILD" + blockStartBuild + "NONCE" + nonce
 * - ore_miner_complete: structId + "MINE" + blockStartMining + "NONCE" + nonce
 * - etc.
 * 
 * @param actionType - Action type
 * @param entityId - Entity ID (struct ID, fleet ID, etc.)
 * @param blockStart - Block height when operation started
 * @param nonce - Proof-of-work nonce
 * @returns Hash input string
 */
export function buildHashInput(
  actionType: string,
  entityId: string,
  blockStart: number,
  nonce: string
): string {
  const prefix = ACTION_PREFIXES[actionType] || 'TASK';
  return `${entityId}${prefix}${blockStart}NONCE${nonce}`;
}

/**
 * Hash input string using SHA256
 * 
 * @param input - Input string to hash
 * @returns Hexadecimal hash string
 */
export function hashInput(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Check if hash meets difficulty requirement
 * 
 * Checks if hash has 'difficulty' leading zeros (in hexadecimal)
 * Based on Go code: work.go - checks hash[position-1] != "0" for position 1 to difficulty
 * 
 * @param hash - Hexadecimal hash string
 * @param difficulty - Required difficulty (number of leading zero characters)
 * @returns True if hash meets difficulty requirement
 */
export function checkDifficulty(hash: string, difficulty: number): boolean {
  if (difficulty <= 0) {
    return true;
  }

  // The Go code checks if hash[position-1] != "0" for position 1 to difficulty
  // This means it checks the first 'difficulty' characters of the hash string
  // If all are '0', the difficulty is met
  
  // Check if we have enough characters
  if (hash.length < difficulty) {
    return false;
  }

  // Check if the first 'difficulty' characters are all '0'
  for (let i = 0; i < difficulty; i++) {
    if (hash[i] !== '0') {
      return false;
    }
  }

  return true;
}

/**
 * Find proof-of-work nonce that meets difficulty requirement
 * 
 * This function periodically polls for current block height to update difficulty,
 * since difficulty decreases as blocks pass (age increases).
 * 
 * @param actionType - Action type
 * @param entityId - Entity ID
 * @param blockStart - Block height when operation started
 * @param initialAge - Initial age (current block - blockStart) - used as starting point
 * @param difficultyRange - Base difficulty range
 * @param maxIterations - Maximum iterations to try
 * @param getCurrentBlockHeight - Function to get current block height (for polling)
 * @param difficultyCheckInterval - How often to check for difficulty updates (iterations, default: 10000)
 * @returns Object with hash, nonce, iterations, and validity
 */
export async function findProofOfWork(
  actionType: string,
  entityId: string,
  blockStart: number,
  initialAge: number,
  difficultyRange: number,
  maxIterations: number = 1000000,
  getCurrentBlockHeight?: () => Promise<number>,
  difficultyCheckIntervalMs: number = 5000 // Check every 5 seconds (blocks pass every ~5 seconds)
): Promise<{
  hash: string;
  nonce: string;
  iterations: number;
  valid: boolean;
  difficulty: number;
  difficultyMet: boolean;
  final_age: number;
}> {
  // Start with initial difficulty
  let currentAge = initialAge;
  let difficulty = calculateDifficulty(currentAge, difficultyRange);
  let lastDifficultyCheckTime = 0; // Start at 0 so we check immediately

  // Try nonces starting from 0
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Periodically check if difficulty has decreased (age increased)
    // Check based on TIME, not iterations, since blocks pass every ~5 seconds
    const now = Date.now();
    if (getCurrentBlockHeight && (now - lastDifficultyCheckTime) >= difficultyCheckIntervalMs) {
      try {
        const currentBlockHeight = await getCurrentBlockHeight();
        const newAge = currentBlockHeight - blockStart;
        
        // If age has increased, recalculate difficulty (it will be lower)
        if (newAge > currentAge) {
          const oldDifficulty = difficulty;
          const oldAge = currentAge;
          currentAge = newAge;
          const newDifficulty = calculateDifficulty(currentAge, difficultyRange);
          
          // If difficulty decreased, update it (lower difficulty = easier to find)
          if (newDifficulty < difficulty) {
            difficulty = newDifficulty;
            // Log difficulty update to stderr (will be captured by process manager)
            console.error(JSON.stringify({
              status: 'difficulty_update',
              message: `Difficulty updated: ${oldDifficulty} -> ${difficulty} (age: ${oldAge} -> ${currentAge})`,
              old_difficulty: oldDifficulty,
              new_difficulty: difficulty,
              old_age: oldAge,
              current_age: currentAge,
              iteration: iteration,
              block_height: currentBlockHeight,
            }));
          } else if (newAge > currentAge) {
            // Age increased but difficulty didn't decrease (shouldn't happen, but log it)
            console.error(JSON.stringify({
              status: 'age_update',
              message: `Age updated: ${oldAge} -> ${currentAge} (difficulty unchanged: ${difficulty})`,
              old_age: oldAge,
              current_age: currentAge,
              difficulty: difficulty,
              iteration: iteration,
            }));
          }
        }
        
        lastDifficultyCheckTime = now;
      } catch (error) {
        // If we can't get block height, log error but continue with current difficulty
        // It's okay for block height to be stale during computation (reference implementation allows this)
        // We'll try again on the next check interval
        console.error(JSON.stringify({
          status: 'error',
          message: `Could not get current block height (will retry): ${error instanceof Error ? error.message : 'Unknown error'}`,
          iteration: iteration,
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          note: 'Continuing with current difficulty - block height may be stale, which is acceptable during computation',
        }));
        // Still update time so we don't spam errors (wait a bit longer before retry)
        lastDifficultyCheckTime = now + (difficultyCheckIntervalMs / 2); // Retry in half the interval
      }
    }

    const nonce = iteration.toString();
    const input = buildHashInput(actionType, entityId, blockStart, nonce);
    const hash = hashInput(input);
    const meetsDifficulty = checkDifficulty(hash, difficulty);

    if (meetsDifficulty) {
      return {
        hash,
        nonce,
        iterations: iteration + 1,
        valid: true,
        difficulty,
        difficultyMet: true,
        final_age: currentAge,
      };
    }
  }

  // If we've exhausted iterations, return the last attempt
  const lastNonce = (maxIterations - 1).toString();
  const lastInput = buildHashInput(actionType, entityId, blockStart, lastNonce);
  const lastHash = hashInput(lastInput);

  return {
    hash: lastHash,
    nonce: lastNonce,
    iterations: maxIterations,
    valid: false,
    difficulty,
    difficultyMet: false,
    final_age: currentAge,
  };
}

/**
 * Verify proof-of-work hash
 * 
 * @param actionType - Action type
 * @param entityId - Entity ID
 * @param blockStart - Block height when operation started
 * @param nonce - Nonce to verify
 * @param proof - Expected hash (proof)
 * @param age - Current age
 * @param difficultyRange - Base difficulty range
 * @returns True if proof is valid
 */
export function verifyProofOfWork(
  actionType: string,
  entityId: string,
  blockStart: number,
  nonce: string,
  proof: string,
  age: number,
  difficultyRange: number
): boolean {
  // Build hash input
  const input = buildHashInput(actionType, entityId, blockStart, nonce);
  const hash = hashInput(input);

  // Check if hash matches proof
  if (hash !== proof) {
    return false;
  }

  // Calculate difficulty and check if hash meets it
  const difficulty = calculateDifficulty(age, difficultyRange);
  return checkDifficulty(hash, difficulty);
}

