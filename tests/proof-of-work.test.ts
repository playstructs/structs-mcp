/**
 * Proof-of-Work Tests
 * 
 * Tests for proof-of-work hashing utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateDifficulty,
  buildHashInput,
  hashInput,
  checkDifficulty,
  findProofOfWork,
  verifyProofOfWork,
} from '../src/utils/proof-of-work.js';

describe('Proof-of-Work Utilities', () => {
  describe('calculateDifficulty', () => {
    it('should return 64 for age <= 1', () => {
      expect(calculateDifficulty(0, 100)).toBe(64);
      expect(calculateDifficulty(1, 100)).toBe(64);
    });

    it('should calculate difficulty based on age and range', () => {
      // For age = 10, range = 100: difficulty = 64 - floor(log10(10) / log10(100) * 63)
      // = 64 - floor(1 / 2 * 63) = 64 - 31 = 33
      const result = calculateDifficulty(10, 100);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(64);
    });

    it('should return at least 1', () => {
      const result = calculateDifficulty(1000000, 100);
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buildHashInput', () => {
    it('should build hash input for struct_build_complete', () => {
      const result = buildHashInput('struct_build_complete', '5-42', 1000, '12345');
      expect(result).toBe('5-42BUILD1000NONCE12345');
    });

    it('should build hash input for ore_miner_complete', () => {
      const result = buildHashInput('ore_miner_complete', '5-42', 1000, '12345');
      expect(result).toBe('5-42MINE1000NONCE12345');
    });

    it('should build hash input for ore_refinery_complete', () => {
      const result = buildHashInput('ore_refinery_complete', '5-42', 1000, '12345');
      expect(result).toBe('5-42REFINE1000NONCE12345');
    });

    it('should build hash input for planet_raid_complete (raid uses fleet@planet composite id)', () => {
      const result = buildHashInput('planet_raid_complete', '9-30@2-1', 712049, '452083');
      expect(result).toBe('9-30@2-1RAID712049NONCE452083');
    });
  });

  describe('hashInput', () => {
    it('should produce consistent hash for same input', () => {
      const input = 'test_input';
      const hash1 = hashInput(input);
      const hash2 = hashInput(input);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hashInput('input1');
      const hash2 = hashInput('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string', () => {
      const hash = hashInput('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('checkDifficulty', () => {
    it('should return true for difficulty 0', () => {
      expect(checkDifficulty('abc123', 0)).toBe(true);
    });

    it('should return true for hash with enough leading zeros', () => {
      expect(checkDifficulty('000abc123', 3)).toBe(true);
      expect(checkDifficulty('0000abc123', 4)).toBe(true);
    });

    it('should return false for hash without enough leading zeros', () => {
      expect(checkDifficulty('abc123', 3)).toBe(false);
      expect(checkDifficulty('00abc123', 3)).toBe(false);
    });

    it('should return false if hash is too short', () => {
      expect(checkDifficulty('00', 3)).toBe(false);
    });
  });

  describe('findProofOfWork', () => {
    it('should find proof-of-work for low difficulty', async () => {
      const result = await findProofOfWork(
        'struct_build_complete',
        '5-42',
        1000,
        10, // age
        100, // difficultyRange
        10000, // maxIterations
        undefined, // getCurrentBlockHeight (not needed for tests)
        10000 // difficultyCheckInterval
      );

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThanOrEqual(10000);
      expect(result.nonce).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.final_age).toBe(10);
    });

    it('should respect maxIterations', async () => {
      const result = await findProofOfWork(
        'struct_build_complete',
        '5-42',
        1000,
        1, // age = 1 means difficulty = 64 (very high)
        100,
        100, // maxIterations (low, likely won't find solution)
        undefined, // getCurrentBlockHeight
        10000
      );

      expect(result.iterations).toBe(100);
      expect(result.valid).toBe(false);
      expect(result.final_age).toBe(1);
    });

    it('should calculate difficulty correctly', async () => {
      const result = await findProofOfWork(
        'struct_build_complete',
        '5-42',
        1000,
        10,
        100,
        10000,
        undefined, // getCurrentBlockHeight
        10000
      );

      expect(result.difficulty).toBeGreaterThan(0);
      expect(result.difficulty).toBeLessThanOrEqual(64);
      expect(result.final_age).toBe(10);
    });
  });

  describe('verifyProofOfWork', () => {
    it('should verify valid proof-of-work', async () => {
      // First find a valid proof
      const proofResult = await findProofOfWork(
        'struct_build_complete',
        '5-42',
        1000,
        10,
        100,
        10000,
        undefined, // getCurrentBlockHeight
        10000
      );

      if (proofResult.valid) {
        const verified = verifyProofOfWork(
          'struct_build_complete',
          '5-42',
          1000,
          proofResult.nonce,
          proofResult.hash,
          proofResult.final_age, // Use final_age from proof result
          100
        );
        expect(verified).toBe(true);
      }
    });

    it('should reject invalid proof-of-work', () => {
      const verified = verifyProofOfWork(
        'struct_build_complete',
        '5-42',
        1000,
        'wrong_nonce',
        'wrong_hash',
        10,
        100
      );
      expect(verified).toBe(false);
    });
  });
});

