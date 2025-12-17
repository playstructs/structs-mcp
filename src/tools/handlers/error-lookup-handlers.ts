/**
 * Error Lookup Tool Handlers
 * 
 * @module tools/handlers/error-lookup-handlers
 */

import { lookupErrorCode } from '../error-lookup.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const errorLookupHandlers = new Map([
  ['structs_lookup_error_code', createHandler(
    (args) => lookupErrorCode(args?.error_code as string | number, aiDocsPath)
  )],
]);
