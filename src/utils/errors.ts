/**
 * Error Formatting Utilities
 * 
 * Provides structured error formatting matching MCP tool specifications.
 * 
 * @module utils/errors
 */

/**
 * Error categories as defined in tool-specifications.md
 */
export type ErrorCategory = 
  | 'VALIDATION'
  | 'API'
  | 'RESOURCE'
  | 'TOOL'
  | 'RATE_LIMIT';

/**
 * Structured error response format matching tool-specifications.md
 */
export interface StructuredError {
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      reason?: string;
      [key: string]: unknown;
    };
    resource_uri?: string;
    timestamp: string;
  };
}

/**
 * Determine error category from error message or type
 */
export function categorizeError(error: Error | unknown): ErrorCategory {
  if (!(error instanceof Error)) {
    return 'TOOL';
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Check for validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('format') ||
    message.includes('required') ||
    message.includes('schema') ||
    name.includes('validation')
  ) {
    return 'VALIDATION';
  }

  // Check for API errors
  if (
    message.includes('api') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    name.includes('api')
  ) {
    return 'API';
  }

  // Check for resource errors
  if (
    message.includes('not found') ||
    message.includes('missing') ||
    message.includes('resource') ||
    message.includes('access denied') ||
    message.includes('permission')
  ) {
    return 'RESOURCE';
  }

  // Check for rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return 'RATE_LIMIT';
  }

  // Default to tool error
  return 'TOOL';
}

/**
 * Extract field name from error message if possible
 */
export function extractFieldFromError(error: Error | unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const message = error.message;

  // Try to extract field from common patterns
  // e.g., "player_id is required", "Invalid player_id format"
  const fieldPatterns = [
    /(?:field|parameter|property)\s+['"]?(\w+)['"]?/i,
    /['"]?(\w+_id)['"]?/i,
    /(\w+)\s+(?:is|must be|should be)/i,
  ];

  for (const pattern of fieldPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract reason from error message
 */
export function extractReasonFromError(error: Error | unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  // Return the full message as reason, or a cleaned version
  return error.message;
}

/**
 * Create structured error response
 */
export function createStructuredError(
  error: Error | unknown,
  options?: {
    field?: string;
    reason?: string;
    resourceUri?: string;
    errorCode?: string;
  }
): StructuredError {
  const category = categorizeError(error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  const field = options?.field || extractFieldFromError(error);
  const reason = options?.reason || extractReasonFromError(error);

  // Generate error code
  let code: string;
  if (options?.errorCode) {
    code = options.errorCode;
  } else {
    // Generate code from category and message
    const codeSuffix = category === 'VALIDATION' 
      ? 'VALIDATION_ERROR'
      : category === 'API'
      ? 'API_ERROR'
      : category === 'RESOURCE'
      ? 'RESOURCE_ERROR'
      : category === 'RATE_LIMIT'
      ? 'RATE_LIMIT_ERROR'
      : 'TOOL_ERROR';
    code = codeSuffix;
  }

  // Build details object
  const details: Record<string, unknown> = {};
  if (field) {
    details.field = field;
  }
  if (reason) {
    details.reason = reason;
  }

  return {
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 ? { details } : {}),
      ...(options?.resourceUri ? { resource_uri: options.resourceUri } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create validation error with field details
 */
export function createValidationError(
  message: string,
  field?: string,
  reason?: string,
  resourceUri?: string
): StructuredError {
  return createStructuredError(new Error(message), {
    field,
    reason: reason || message,
    resourceUri,
    errorCode: 'VALIDATION_ERROR',
  });
}

/**
 * Create API error
 */
export function createApiError(
  message: string,
  originalErrorCode?: string | number,
  resourceUri?: string
): StructuredError {
  return createStructuredError(new Error(message), {
    reason: message,
    resourceUri,
    errorCode: originalErrorCode ? `API_${originalErrorCode}` : 'API_ERROR',
  });
}

/**
 * Create resource error
 */
export function createResourceError(
  message: string,
  resourceUri?: string,
  suggestedAlternatives?: string[]
): StructuredError {
  const error = createStructuredError(new Error(message), {
    resourceUri,
    errorCode: 'RESOURCE_ERROR',
  });

  if (suggestedAlternatives && suggestedAlternatives.length > 0) {
    error.error.details = {
      ...error.error.details,
      suggested_alternatives: suggestedAlternatives,
    };
  }

  return error;
}

/**
 * Create tool error
 */
export function createToolError(
  message: string,
  details?: Record<string, unknown>
): StructuredError {
  const error = createStructuredError(new Error(message), {
    errorCode: 'TOOL_ERROR',
  });

  if (details) {
    error.error.details = {
      ...error.error.details,
      ...details,
    };
  }

  return error;
}

