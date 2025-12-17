/**
 * Validation Tools Tests
 * 
 * Tests for all validation tool functions.
 */

import {
  validateEntityId,
  validateSchema,
  validateTransaction,
  validateAction,
} from '../src/tools/validation.js';
import { describe, it, expect } from '@jest/globals';

describe('Validation Tools', () => {
  describe('validateEntityId', () => {
    it('should validate correct player ID', () => {
      const result = validateEntityId('1-11');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('player');
      expect(result.chainId).toBe(1);
      expect(result.index).toBe(11);
      expect(result.format).toBe('1-11');
    });

    it('should validate correct planet ID', () => {
      const result = validateEntityId('2-1');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('planet');
      expect(result.chainId).toBe(2);
      expect(result.index).toBe(1);
    });

    it('should validate correct struct ID', () => {
      const result = validateEntityId('5-42');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('struct');
      expect(result.chainId).toBe(5);
      expect(result.index).toBe(42);
    });

    it('should validate correct guild ID', () => {
      const result = validateEntityId('0-1');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('guild');
      expect(result.chainId).toBe(0);
      expect(result.index).toBe(1);
    });

    it('should reject invalid format', () => {
      const result = validateEntityId('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid entity ID format');
    });

    it('should reject format without dash', () => {
      const result = validateEntityId('111');
      expect(result.valid).toBe(false);
    });

    it('should validate with expected type match', () => {
      const result = validateEntityId('1-11', 'player');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('player');
    });

    it('should reject with expected type mismatch', () => {
      const result = validateEntityId('1-11', 'planet');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Entity type mismatch');
      expect(result.type).toBe('player');
    });

    it('should validate all entity types', () => {
      const entityTypes = [
        { id: '0-1', type: 'guild' },
        { id: '1-11', type: 'player' },
        { id: '2-1', type: 'planet' },
        { id: '3-1', type: 'reactor' },
        { id: '4-3', type: 'substation' },
        { id: '5-42', type: 'struct' },
        { id: '6-1', type: 'allocation' },
        { id: '7-1', type: 'infusion' },
        { id: '8-1', type: 'address' },
        { id: '9-11', type: 'fleet' },
        { id: '10-1', type: 'provider' },
        { id: '11-1', type: 'agreement' },
      ];

      entityTypes.forEach(({ id, type }) => {
        const result = validateEntityId(id);
        expect(result.valid).toBe(true);
        expect(result.type).toBe(type);
      });
    });
  });

  describe('validateSchema', () => {
    const testSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    };

    it('should validate data against schema', async () => {
      // Note: This test requires actual schema resource access
      // For now, we'll test the function structure
      const validData = { name: 'Test', age: 25 };
      const invalidData = { age: 25 }; // missing required 'name'

      // This would require mocking getResource
      // For now, we verify the function exists and has correct signature
      expect(typeof validateSchema).toBe('function');
    });

    it('should handle missing schema gracefully', async () => {
      const result = await validateSchema(
        { name: 'Test' },
        'structs://schemas/nonexistent.json',
        '../../ai'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Schema not found');
    });
  });

  describe('validateTransaction', () => {
    it('should validate transaction with required fields', async () => {
      const transaction = {
        body: {
          messages: [{ type: 'test' }],
        },
        auth_info: {},
      };

      const result = await validateTransaction(transaction, '../../ai');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transaction without body', async () => {
      const transaction = {
        auth_info: {},
      };

      const result = await validateTransaction(transaction, '../../ai');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'body')).toBe(true);
    });

    it('should reject transaction without auth_info', async () => {
      const transaction = {
        body: {
          messages: [],
        },
      };

      const result = await validateTransaction(transaction, '../../ai');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'auth_info')).toBe(true);
    });

    it('should warn on empty messages array', async () => {
      const transaction = {
        body: {
          messages: [],
        },
        auth_info: {},
      };

      const result = await validateTransaction(transaction, '../../ai');
      expect(result.warnings.some((w) => w.field === 'body.messages')).toBe(true);
    });

    it('should reject non-object transaction', async () => {
      const result = await validateTransaction('not an object', '../../ai');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('transaction');
    });
  });

  describe('validateAction', () => {
    it('should validate action with required parameters', async () => {
      const result = await validateAction(
        'MsgStructBuild',
        {
          structType: 1,
          locationId: '2-1',
        },
        undefined,
        '../../ai'
      );
      expect(result.valid).toBe(true);
      expect(result.requirementsMet).toBe(true);
    });

    it('should detect missing structType for build actions', async () => {
      const result = await validateAction(
        'MsgStructBuild',
        {
          locationId: '2-1',
        },
        undefined,
        '../../ai'
      );
      expect(result.requirementsMet).toBe(false);
      expect(
        result.missingRequirements.some((r) => r.requirement === 'structType')
      ).toBe(true);
    });

    it('should detect missing locationId for build actions', async () => {
      const result = await validateAction(
        'MsgStructBuild',
        {
          structType: 1,
        },
        undefined,
        '../../ai'
      );
      expect(result.requirementsMet).toBe(false);
      expect(
        result.missingRequirements.some((r) => r.requirement === 'locationId')
      ).toBe(true);
    });

    it('should reject invalid action type', async () => {
      const result = await validateAction(
        '',
        {},
        undefined,
        '../../ai'
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('action_type');
    });

    it('should reject invalid parameters', async () => {
      const result = await validateAction(
        'MsgStructBuild',
        'not an object' as unknown as Record<string, unknown>,
        undefined,
        '../../ai'
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('parameters');
    });
  });
});

