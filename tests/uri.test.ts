/**
 * URI Utilities Tests
 * 
 * Tests for URI parsing and validation functions.
 */

import {
  parseResourceURI,
  uriToFilePath,
  isValidResourceURI,
} from '../src/utils/uri.js';
import { describe, it, expect } from '@jest/globals';

describe('URI Utilities', () => {
  describe('parseResourceURI', () => {
    it('should parse valid schema URI', () => {
      const result = parseResourceURI('structs://schemas/entities/player.json');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('schemas');
      expect(result?.path).toBe('entities/player.json');
    });

    it('should parse valid API URI', () => {
      const result = parseResourceURI('structs://api/queries/player.yaml');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('api');
      expect(result?.path).toBe('queries/player.yaml');
    });

    it('should parse URI with fragment', () => {
      const result = parseResourceURI('structs://schemas/actions.json#/actions/MsgStructBuild');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('schemas');
      expect(result?.path).toBe('actions.json');
      expect(result?.fragment).toBe('/actions/MsgStructBuild');
    });

    it('should parse guide URI', () => {
      const result = parseResourceURI('structs://guides/AGENTS.md');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('guides');
      expect(result?.path).toBe('AGENTS.md');
    });

    it('should reject invalid URI without scheme', () => {
      const result = parseResourceURI('schemas/entities/player.json');
      expect(result).toBeNull();
    });

    it('should reject invalid URI with wrong scheme', () => {
      const result = parseResourceURI('http://schemas/entities/player.json');
      expect(result).toBeNull();
    });

    it('should parse nested paths', () => {
      const result = parseResourceURI('structs://examples/workflows/mine-refine-convert.json');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('examples');
      expect(result?.path).toBe('workflows/mine-refine-convert.json');
    });
  });

  describe('uriToFilePath', () => {
    const aiDocsPath = '../../ai';

    it('should convert schema URI to file path', () => {
      const path = uriToFilePath('structs://schemas/entities/player.json', aiDocsPath);
      expect(path).toBe('../../ai/schemas/entities/player.json');
    });

    it('should convert API URI to file path', () => {
      const path = uriToFilePath('structs://api/queries/player.yaml', aiDocsPath);
      expect(path).toBe('../../ai/api/queries/player.yaml');
    });

    it('should convert guide URI to file path', () => {
      const path = uriToFilePath('structs://guides/AGENTS.md', aiDocsPath);
      expect(path).toBe('../../ai/AGENTS.md');
    });

    it('should convert protocol URI to file path', () => {
      const path = uriToFilePath('structs://protocols/authentication.md', aiDocsPath);
      expect(path).toBe('../../ai/protocols/authentication.md');
    });

    it('should return null for invalid URI', () => {
      const path = uriToFilePath('invalid://uri', aiDocsPath);
      expect(path).toBeNull();
    });

    it('should handle nested paths', () => {
      const path = uriToFilePath('structs://examples/workflows/mine-refine-convert.json', aiDocsPath);
      expect(path).toBe('../../ai/examples/workflows/mine-refine-convert.json');
    });
  });

  describe('isValidResourceURI', () => {
    it('should validate correct URIs', () => {
      expect(isValidResourceURI('structs://schemas/entities/player.json')).toBe(true);
      expect(isValidResourceURI('structs://api/queries/player.yaml')).toBe(true);
      expect(isValidResourceURI('structs://protocols/authentication.md')).toBe(true);
      expect(isValidResourceURI('structs://guides/AGENTS.md')).toBe(true);
    });

    it('should reject invalid URIs', () => {
      expect(isValidResourceURI('http://schemas/entities/player.json')).toBe(false);
      expect(isValidResourceURI('schemas/entities/player.json')).toBe(false);
      expect(isValidResourceURI('invalid://uri')).toBe(false);
      expect(isValidResourceURI('')).toBe(false);
    });

    it('should validate URIs with fragments', () => {
      expect(isValidResourceURI('structs://schemas/actions.json#/actions/MsgStructBuild')).toBe(true);
    });
  });
});

