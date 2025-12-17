/**
 * Error Code Lookup Tool
 * 
 * Implements error code lookup functionality.
 * 
 * @module tools/error-lookup
 */

import { getResource } from '../resources/index.js';

/**
 * Look up error code information
 * 
 * @param errorCode - Error code to look up (can be number or string)
 * @param aiDocsPath - Base path to /ai directory
 * @returns Error code information
 */
export async function lookupErrorCode(
  errorCode: string | number,
  aiDocsPath: string
): Promise<{
  code: string | number;
  name?: string;
  description?: string;
  category?: string;
  action?: string;
  retryable?: boolean;
  requires?: string[];
  error?: string;
}> {
  try {
    // Load error codes schema
    const errorSchema = await getResource('structs://schemas/errors.json', aiDocsPath);
    if (!errorSchema) {
      return {
        code: errorCode,
        error: 'Error codes schema not found',
      };
    }

    const resourceWithText = errorSchema as { text?: string };
    if (!resourceWithText.text) {
      return {
        code: errorCode,
        error: 'Error codes schema has no content',
      };
    }

    const errorData = JSON.parse(resourceWithText.text);
    const codeStr = String(errorCode);

    // Look up error code
    if (errorData.errorCodes && errorData.errorCodes[codeStr]) {
      const errorInfo = errorData.errorCodes[codeStr];
      return {
        code: errorCode,
        name: errorInfo.name,
        description: errorInfo.description,
        category: errorInfo.category,
        action: errorInfo.action,
        retryable: errorInfo.retryable,
        requires: errorInfo.requires,
      };
    }

    // Check if it's a retryable error
    if (errorData['structs:retryableErrors']?.retryable?.includes(codeStr)) {
      return {
        code: errorCode,
        name: 'UNKNOWN_ERROR',
        description: `Error code ${errorCode} is retryable`,
        category: 'error',
        action: 'retry with backoff',
        retryable: true,
      };
    }

    return {
      code: errorCode,
      name: 'UNKNOWN_ERROR',
      description: `Error code ${errorCode} not found in error codes catalog`,
      category: 'unknown',
      action: 'check error code documentation',
    };
  } catch (error) {
    return {
      code: errorCode,
      error: `Error looking up error code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

