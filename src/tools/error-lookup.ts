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

export interface ErrorDiagnosis {
  error_code?: number;
  error_name: string;
  what_happened: string;
  why: string;
  fix: string;
  fix_command?: string;
  related_docs?: string;
}

const KNOWN_ERRORS: Record<string, ErrorDiagnosis> = {
  '2': {
    error_code: 2,
    error_name: 'INSUFFICIENT_FUNDS',
    what_happened: 'Transaction failed because the account lacks sufficient tokens.',
    why: 'The player does not have enough ualpha or energy to cover the gas fee or the action cost.',
    fix: 'Check balances with `structsd query structs player [player-id]`. If energy capacity is the issue, infuse reactor or adjust power allocations.',
    fix_command: 'structsd query structs player [player-id]',
    related_docs: 'https://structs.ai/knowledge/mechanics/power',
  },
  '5': {
    error_code: 5,
    error_name: 'SIGNATURE_VERIFICATION_FAILED',
    what_happened: 'Transaction signature could not be verified.',
    why: 'Wrong key, wrong account sequence, or the key does not match the registered address.',
    fix: 'Verify the signing key matches the player address. Check account sequence with `structsd query auth account [address]`. If sequence is stale, wait a few blocks.',
  },
  '6': {
    error_code: 6,
    error_name: 'PLAYER_HALTED',
    what_happened: 'The player is halted (offline) and cannot perform actions.',
    why: 'Load exceeds capacity. When power load > capacity, the player goes offline and all actions are blocked.',
    fix: 'Deactivate structs to reduce load, or increase power allocation. Check with `structsd query structs player [player-id]` and compare capacityTotal vs loadTotal.',
    fix_command: 'structsd query structs player [player-id]',
    related_docs: 'https://structs.ai/knowledge/mechanics/power',
  },
  '7': {
    error_code: 7,
    error_name: 'INSUFFICIENT_CHARGE',
    what_happened: 'The struct does not have enough charge to perform this action.',
    why: 'Actions like struct-activate require charge. ActivateCharge is 1 for all struct types. Charge accumulates over blocks.',
    fix: 'Wait for the struct to accumulate charge. Query current charge with `structsd query structs struct [struct-id]`.',
    fix_command: 'structsd query structs struct [struct-id]',
    related_docs: 'https://structs.ai/knowledge/mechanics/building',
  },
  '8': {
    error_code: 8,
    error_name: 'INVALID_LOCATION',
    what_happened: 'The target location is invalid or inaccessible.',
    why: 'The struct/fleet cannot be placed at the specified location. The slot may be occupied or the ambit invalid.',
    fix: 'Verify the location is valid and unoccupied. Check planet layout for available slots.',
  },
  '9': {
    error_code: 9,
    error_name: 'INVALID_TARGET',
    what_happened: 'The target entity is invalid or cannot be targeted for this action.',
    why: 'The target struct may not exist, be out of range, or be protected by stealth (cross-ambit only).',
    fix: 'Verify target exists with `structsd query structs struct [target-id]`. Check ambit targeting rules at https://structs.ai/knowledge/mechanics/combat.',
    related_docs: 'https://structs.ai/knowledge/mechanics/combat',
  },
  '11': {
    error_code: 11,
    error_name: 'OUT_OF_GAS',
    what_happened: 'Transaction ran out of gas during execution.',
    why: 'The gas limit was too low. This usually means --gas auto was not used.',
    fix: 'Always use --gas auto --gas-adjustment 1.5 with every transaction. Use structs_prepare_command to generate correct commands.',
  },
  '32': {
    error_code: 32,
    error_name: 'ACCOUNT_SEQUENCE_MISMATCH',
    what_happened: 'Transaction sequence number does not match the on-chain account sequence.',
    why: 'Two transactions were submitted too quickly with the same key. The second one still has the old sequence number.',
    fix: 'Wait ~6 seconds between transactions from the same key. Never run two concurrent *-compute commands with the same key.',
  },
};

function parseErrorInput(input: string): { code?: string; message?: string } {
  const trimmed = input.trim();

  const codeMatch = trimmed.match(/(?:code|error)\s*[:=]?\s*(\d+)/i);
  if (codeMatch) {
    return { code: codeMatch[1], message: trimmed };
  }

  if (/^\d+$/.test(trimmed)) {
    return { code: trimmed };
  }

  const sdkCodeMatch = trimmed.match(/codespace:\s*\w+\s+code:\s*(\d+)/);
  if (sdkCodeMatch) {
    return { code: sdkCodeMatch[1], message: trimmed };
  }

  return { message: trimmed };
}

function diagnoseFreeText(message: string): ErrorDiagnosis {
  const lower = message.toLowerCase();

  if (lower.includes('insufficient funds') || lower.includes('insufficient fee')) {
    return KNOWN_ERRORS['2']!;
  }
  if (lower.includes('out of gas')) {
    return KNOWN_ERRORS['11']!;
  }
  if (lower.includes('sequence mismatch') || lower.includes('account sequence')) {
    return KNOWN_ERRORS['32']!;
  }
  if (lower.includes('signature') && (lower.includes('invalid') || lower.includes('verification'))) {
    return KNOWN_ERRORS['5']!;
  }
  if (lower.includes('halted') || lower.includes('player offline')) {
    return KNOWN_ERRORS['6']!;
  }
  if (lower.includes('permission') || lower.includes('unauthorized')) {
    return {
      error_name: 'PERMISSION_DENIED',
      what_happened: 'The action was rejected because the player lacks the required permissions.',
      why: 'The 24-bit permission system controls all state-changing actions. The player may lack the specific permission flag on the target object.',
      fix: 'Check permissions with the consensus API. Required flags vary by action -- see https://structs.ai/knowledge/mechanics/permissions for the handler permission reference.',
      related_docs: 'https://structs.ai/knowledge/mechanics/permissions',
    };
  }
  if (lower.includes('not found') || lower.includes('does not exist')) {
    return {
      error_name: 'ENTITY_NOT_FOUND',
      what_happened: 'The referenced entity was not found on-chain.',
      why: 'The entity ID may be wrong, or the entity may not have been created yet.',
      fix: 'Verify the entity ID format (type-index, e.g., 1-11 for player, 5-42 for struct). Query the entity to confirm it exists.',
    };
  }

  return {
    error_name: 'UNKNOWN_ERROR',
    what_happened: `Error message: ${message}`,
    why: 'Could not automatically determine the cause from the error text.',
    fix: 'Check the error message against Structs error codes at https://structs.ai/api/error-codes. Use structs_preflight_check before retrying the action.',
    related_docs: 'https://structs.ai/api/error-codes',
  };
}

/**
 * Diagnose an error from a failed transaction.
 * Accepts error codes, error messages, or raw TX output.
 */
export function diagnoseError(errorInput: string | number): ErrorDiagnosis {
  const input = String(errorInput);
  const parsed = parseErrorInput(input);

  if (parsed.code && KNOWN_ERRORS[parsed.code]) {
    return KNOWN_ERRORS[parsed.code]!;
  }

  if (parsed.message) {
    return diagnoseFreeText(parsed.message);
  }

  return {
    error_code: parsed.code ? Number(parsed.code) : undefined,
    error_name: 'UNKNOWN_ERROR',
    what_happened: `Error code ${parsed.code} is not in the built-in diagnosis database.`,
    why: 'This may be a Structs-specific error not yet cataloged.',
    fix: 'Look up the error code at https://structs.ai/api/error-codes. Use structs_preflight_check to validate the action before retrying.',
    related_docs: 'https://structs.ai/api/error-codes',
  };
}

