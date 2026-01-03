/**
 * Handler Wrapper
 * 
 * Provides consistent error handling and response formatting for tool handlers.
 * 
 * @module tools/handlers/wrapper
 */

import {
  extractEntityIds,
  resolveReferences,
  addReferencesToResponse,
} from '../../utils/references.js';
import type { ReferenceOptions } from '../../types/references.js';
import { createStructuredError } from '../../utils/errors.js';

/**
 * Create a standardized handler with error handling and optional references support
 */
export function createHandler<T>(
  handlerFn: (args: any) => Promise<T>,
  options?: {
    isListTool?: boolean; // True for list tools (use primary references only by default)
    extractExcludeId?: (args: any) => string | undefined; // Function to extract entity ID to exclude (self-reference)
  }
): (args: any) => Promise<{
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}> {
  return async (args: any) => {
    try {
      const result = await handlerFn(args);
      
      // Check if references should be included
      const includeReferences = args?.include_references;
      if (!includeReferences || includeReferences === false) {
        // No references requested, return as-is
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Extract reference options
      let includeRefs: boolean | "primary" | "all" | undefined;
      if (includeReferences === true) {
        includeRefs = 'all';
      } else if (includeReferences === false) {
        includeRefs = false;
      } else {
        includeRefs = includeReferences as "primary" | "all" | undefined;
      }

      // For list tools, default to 'primary' if not explicitly set
      if (options?.isListTool && includeRefs === undefined) {
        includeRefs = 'primary';
      }

      const referenceOptions: ReferenceOptions = {
        include_references: includeRefs,
        reference_depth: args?.reference_depth,
        reference_types: args?.reference_types,
        max_references: args?.max_references,
        max_references_per_entity: args?.max_references_per_entity,
        max_parallel_queries: args?.max_parallel_queries,
        reference_query_timeout: args?.reference_query_timeout,
      };

      // Extract entity ID to exclude (self-reference)
      const excludeId = options?.extractExcludeId ? options.extractExcludeId(args) : undefined;

      // Extract entity IDs from result
      const entityIdsByType = extractEntityIds(
        result,
        excludeId,
        referenceOptions
      );

      // Resolve references
      const references = await resolveReferences(entityIdsByType, referenceOptions);

      // Add references to response
      const resultWithReferences = addReferencesToResponse(
        result as Record<string, unknown>,
        references
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultWithReferences, null, 2),
          },
        ],
      };
    } catch (error) {
      // Create structured error response matching tool-specifications.md
      const structuredError = createStructuredError(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(structuredError, null, 2),
          },
        ],
        isError: true,
      };
    }
  };
}
