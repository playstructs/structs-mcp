/**
 * Error Lookup Tool Handlers
 * 
 * @module tools/handlers/error-lookup-handlers
 */

import { diagnoseError } from '../error-lookup.js';
import { createHandler } from './wrapper.js';

export const errorLookupHandlers = new Map([
  ['structs_diagnose_error', createHandler(
    async (args) => {
      const errorInput = args?.error_input as string;
      if (!errorInput) throw new Error('error_input is required');
      return diagnoseError(errorInput);
    }
  )],
]);
