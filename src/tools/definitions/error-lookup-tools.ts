/**
 * Error Lookup Tool Definitions
 * 
 * @module tools/definitions/error-lookup-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const errorLookupTools: Tool[] = [
  {
    name: "structs_lookup_error_code",
    description: "Get information about an error code. Use this when you encounter an error to understand what went wrong and how to fix it.",
    inputSchema: {
      type: "object",
      properties: {
        error_code: {
          description: "Error code to look up (number or string)",
        },
      },
      required: ["error_code"],
    },
  },
];
