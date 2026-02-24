/**
 * Validation Tools
 * 
 * Implements validation tools for entity IDs, schemas, transactions, and actions.
 * 
 * @module tools/validation
 */

import Ajv from 'ajv';
import { getResource } from '../resources/index.js';
import { uriToFilePath } from '../utils/uri.js';
import { config } from '../config.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const ajv = new Ajv({ allErrors: true });

/**
 * Entity ID format: {chain_id}-{index}
 * Examples: "1-11" (player), "2-1" (planet), "5-42" (struct)
 */
const ENTITY_ID_REGEX = /^(\d+)-(\d+)$/;

/**
 * Entity type prefixes (for validation)
 * Based on ai/schemas/formats.json and ai/README.md
 */
const ENTITY_TYPE_PREFIXES: Record<string, number> = {
  guild: 0,
  player: 1,
  planet: 2,
  reactor: 3,
  substation: 4,
  struct: 5,
  allocation: 6,
  infusion: 7,
  address: 8,
  fleet: 9,
  provider: 10,
  agreement: 11,
};

/**
 * Validate entity ID format
 *
 * @param id - Entity ID to validate (e.g., "1-11")
 * @param expectedType - Optional expected entity type
 * @returns Validation result
 */
export function validateEntityId(
  id: string | undefined | null,
  expectedType?: string
): {
  valid: boolean;
  type?: string;
  chainId?: number;
  index?: number;
  format?: string;
  error?: string;
} {
  if (id === undefined || id === null || typeof id !== 'string') {
    return {
      valid: false,
      error: 'Entity ID is required and must be a string (e.g., "1-11" for player, "2-1" for planet). Use the entity-specific parameter: player_id, planet_id, fleet_id, guild_id, struct_id, reactor_id, substation_id, provider_id, agreement_id, or allocation_id.',
    };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Entity ID cannot be empty.',
    };
  }
  const match = trimmed.match(ENTITY_ID_REGEX);
  if (!match) {
    return {
      valid: false,
      error: `Invalid entity ID format. Expected format: {type}-{index} (e.g., 1-11, 2-1). Got: ${id}`,
    };
  }

  const chainId = parseInt(match[1], 10);
  const index = parseInt(match[2], 10);

  const type = Object.keys(ENTITY_TYPE_PREFIXES).find(
    (key) => ENTITY_TYPE_PREFIXES[key] === chainId
  ) || 'unknown';

  if (expectedType && type !== expectedType) {
    return {
      valid: false,
      type,
      chainId,
      index,
      format: trimmed,
      error: `Entity type mismatch. Expected: ${expectedType}, got: ${type}`,
    };
  }

  return {
    valid: true,
    type,
    chainId,
    index,
    format: trimmed,
  };
}

/**
 * Validate data against JSON schema
 * 
 * @param data - Data to validate
 * @param schemaUri - Resource URI for schema (e.g., "structs://schemas/entities/player.json")
 * @param aiDocsPath - Base path to /ai directory
 * @returns Validation result
 */
export async function validateSchema(
  data: unknown,
  schemaUri: string,
  aiDocsPath: string
): Promise<{
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    data?: unknown;
  }>;
  error?: string;
}> {
  try {
    // Get schema resource
    const schemaResource = await getResource(schemaUri, aiDocsPath);
    if (!schemaResource) {
      return {
        valid: false,
        errors: [],
        error: `Schema not found: ${schemaUri}`,
      };
    }

    const resourceWithText = schemaResource as { text?: string; mimeType?: string };
    if (!resourceWithText.text) {
      return {
        valid: false,
        errors: [],
        error: 'Schema resource has no text content',
      };
    }

    // Compendium is now Markdown-first (structs-ai). If the resource is Markdown, we cannot run JSON Schema validation.
    const isMarkdown =
      resourceWithText.mimeType === 'text/markdown' ||
      resourceWithText.text.trim().startsWith('#') ||
      (resourceWithText.text.includes('|') && resourceWithText.text.includes('---'));
    if (isMarkdown) {
      return {
        valid: false,
        errors: [],
        error: `Schema resource is in Markdown format (structs-ai compendium). JSON Schema validation is not available; use the resource for reference only. URI: ${schemaUri}`,
      };
    }

    let schema: unknown;
    try {
      schema = JSON.parse(resourceWithText.text);
    } catch (error) {
      return {
        valid: false,
        errors: [],
        error: `Invalid JSON schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Compile and validate
    const validate = ajv.compile(schema as any);
    const valid = validate(data);

    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map((err) => ({
          path: err.instancePath || err.schemaPath || '',
          message: err.message || 'Validation error',
          data: err.data,
        })),
      };
    }

    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [],
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate transaction format
 * 
 * @param transaction - Transaction object to validate
 * @param aiDocsPath - Base path to /ai directory
 * @returns Validation result
 */
export async function validateTransaction(
  transaction: unknown,
  aiDocsPath: string
): Promise<{
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  error?: string;
}> {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  try {
    // Basic structure validation
    if (!transaction || typeof transaction !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'transaction', message: 'Transaction must be an object' }],
        warnings: [],
      };
    }

    const tx = transaction as Record<string, unknown>;

    // Check for required fields (basic Cosmos SDK transaction structure)
    if (!tx.body) {
      errors.push({ field: 'body', message: 'Transaction body is required' });
    }

    if (!tx.auth_info) {
      errors.push({ field: 'auth_info', message: 'Transaction auth_info is required' });
    }

    // Validate messages if present
    if (tx.body && typeof tx.body === 'object') {
      const body = tx.body as Record<string, unknown>;
      if (body.messages) {
        if (!Array.isArray(body.messages)) {
          errors.push({ field: 'body.messages', message: 'Messages must be an array' });
        } else if (body.messages.length === 0) {
          warnings.push({ field: 'body.messages', message: 'Transaction has no messages' });
        }
      }
    }

    // Try to validate against transaction schema if available
    try {
      const schemaResult = await validateSchema(
        transaction,
        'structs://schemas/actions.json',
        aiDocsPath
      );

      if (!schemaResult.valid && schemaResult.errors) {
        schemaResult.errors.forEach((err) => {
          errors.push({
            field: err.path,
            message: err.message,
          });
        });
      }
    } catch (schemaError) {
      // Schema validation is optional, just log warning
      warnings.push({
        field: 'schema',
        message: `Could not validate against schema: ${schemaError instanceof Error ? schemaError.message : 'Unknown error'}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ field: 'transaction', message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      warnings: [],
    };
  }
}

/**
 * Validate action requirements
 * 
 * @param actionType - Action type (e.g., "MsgStructBuild")
 * @param parameters - Action parameters
 * @param gameState - Optional current game state
 * @param aiDocsPath - Base path to /ai directory
 * @returns Validation result
 */
export async function validateAction(
  actionType: string,
  parameters: Record<string, unknown>,
  gameState?: Record<string, unknown>,
  aiDocsPath?: string
): Promise<{
  valid: boolean;
  requirementsMet: boolean;
  missingRequirements: Array<{
    requirement: string;
    reason: string;
  }>;
  errors: Array<{
    field: string;
    message: string;
  }>;
  error?: string;
}> {
  const errors: Array<{ field: string; message: string }> = [];
  const missingRequirements: Array<{ requirement: string; reason: string }> = [];

  try {
    // Validate action type format
    if (!actionType || typeof actionType !== 'string') {
      return {
        valid: false,
        requirementsMet: false,
        missingRequirements: [],
        errors: [{ field: 'action_type', message: 'Action type is required and must be a string' }],
      };
    }

    // Validate parameters
    if (!parameters || typeof parameters !== 'object') {
      return {
        valid: false,
        requirementsMet: false,
        missingRequirements: [],
        errors: [{ field: 'parameters', message: 'Parameters must be an object' }],
      };
    }

    // Try to load action schema if available
    if (aiDocsPath) {
      try {
        const schemaResult = await validateSchema(
          { actionType, ...parameters },
          'structs://schemas/actions.json',
          aiDocsPath
        );

        if (!schemaResult.valid && schemaResult.errors) {
          schemaResult.errors.forEach((err) => {
            errors.push({
              field: err.path,
              message: err.message,
            });
          });
        }
      } catch (schemaError) {
        // Schema validation is optional
        errors.push({
          field: 'schema',
          message: `Could not validate against action schema: ${schemaError instanceof Error ? schemaError.message : 'Unknown error'}`,
        });
      }
    }

    // Basic requirement checks (can be expanded)
    // For now, just check that required fields are present based on action type
    if (actionType.includes('Build') || actionType.includes('Struct')) {
      if (!parameters.structType && !parameters.struct_type) {
        missingRequirements.push({
          requirement: 'structType',
          reason: 'Struct type is required for build actions',
        });
      }
      if (!parameters.locationId && !parameters.location_id) {
        missingRequirements.push({
          requirement: 'locationId',
          reason: 'Location ID is required for build actions',
        });
      }
    }

    return {
      valid: errors.length === 0,
      requirementsMet: missingRequirements.length === 0,
      missingRequirements,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      requirementsMet: false,
      missingRequirements: [],
      errors: [{ field: 'action', message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
    };
  }
}

