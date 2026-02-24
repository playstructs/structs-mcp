/**
 * Error Code Lookup Tool
 *
 * Implements error code lookup. Supports both legacy JSON (errors.json) and
 * Markdown compendium (errors.md from structs-ai).
 *
 * @module tools/error-lookup
 */

import { getResource } from '../resources/index.js';

/** Shape expected for error code catalog (JSON or parsed from Markdown) */
interface ErrorCatalog {
  errorCodes?: Record<
    string,
    {
      name?: string;
      description?: string;
      category?: string;
      action?: string;
      retryable?: boolean;
      requires?: string[];
    }
  >;
  'structs:retryableErrors'?: { retryable?: string[] };
}

/**
 * Parse Markdown table rows into error code entries.
 * Handles tables like: | Code | Name | Category | Retryable | Action | Recovery |
 */
function parseErrorCodesFromMarkdown(text: string): ErrorCatalog {
  const errorCodes: Record<string, { name?: string; description?: string; category?: string; action?: string; retryable?: boolean; requires?: string[] }> = {};
  const retryableCodes: string[] = [];
  const lines = text.split(/\r?\n/);
  let headerCells: string[] = [];
  let codeIdx = -1,
    nameIdx = -1,
    categoryIdx = -1,
    retryableIdx = -1,
    actionIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    if (cells.length < 2) continue;

    if (headerCells.length === 0 && (cells.includes('code') || cells[0] === 'code')) {
      headerCells = cells;
      codeIdx = cells.findIndex((c) => c === 'code');
      nameIdx = cells.findIndex((c) => c === 'name');
      categoryIdx = cells.findIndex((c) => c === 'category');
      retryableIdx = cells.findIndex((c) => c === 'retryable');
      actionIdx = cells.findIndex((c) => c === 'action');
      if (codeIdx < 0) codeIdx = 0;
      continue;
    }

    if (headerCells.length === 0) continue;
    const code = cells[codeIdx] ?? cells[0];
    if (!code || code === 'code' || code === '---') continue;

    const name = nameIdx >= 0 ? cells[nameIdx] : undefined;
    const category = categoryIdx >= 0 ? cells[categoryIdx] : undefined;
    const retryableStr = retryableIdx >= 0 ? cells[retryableIdx] : undefined;
    const action = actionIdx >= 0 ? cells[actionIdx] : undefined;
    const retryable = retryableStr === 'yes' || retryableStr === 'true';
    if (retryable) retryableCodes.push(code);

    errorCodes[code] = {
      name: name?.toUpperCase().replace(/\s+/g, '_') || code,
      category,
      action,
      retryable: retryable || undefined,
    };
  }

  const result: ErrorCatalog = { errorCodes };
  if (retryableCodes.length > 0) {
    result['structs:retryableErrors'] = { retryable: retryableCodes };
  }
  return result;
}

/**
 * Load error catalog from resource (JSON or Markdown). Resolves to errors.md when using structs-ai.
 */
async function loadErrorCatalog(aiDocsPath: string): Promise<ErrorCatalog | null> {
  const resource = await getResource('structs://schemas/errors.json', aiDocsPath);
  if (!resource) return null;
  const raw = (resource as { text?: string }).text;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ErrorCatalog;
  } catch {
    if (raw.trim().startsWith('#') || raw.includes('|') && raw.includes('Code')) {
      return parseErrorCodesFromMarkdown(raw);
    }
    return null;
  }
}

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
    const errorData = await loadErrorCatalog(aiDocsPath);
    if (!errorData) {
      return {
        code: errorCode,
        error: 'Error codes schema not found (tried structs://schemas/errors.json / errors.md)',
      };
    }

    const codeStr = String(errorCode);

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

