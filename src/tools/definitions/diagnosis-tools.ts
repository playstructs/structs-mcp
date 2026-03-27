/**
 * Error Diagnosis Tool Definitions
 *
 * @module tools/definitions/diagnosis-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const diagnosisTools: Tool[] = [
  {
    name: 'structs_diagnose_error',
    description:
      'Diagnose a failed transaction or error. Accepts an error code (number), error message string, or raw TX output. Returns: what happened, why, how to fix it, and the CLI command to fix it. Covers Cosmos SDK errors (out of gas, sequence mismatch) and Structs-specific errors (player halted, insufficient charge, permission denied).',
    inputSchema: {
      type: 'object',
      properties: {
        error_input: {
          type: 'string',
          description: 'Error code (e.g., "6"), error message, or raw TX failure output. The tool will parse and diagnose.',
        },
      },
      required: ['error_input'],
    },
  },
];
