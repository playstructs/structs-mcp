/**
 * Validation Tool Handlers
 * 
 * @module tools/handlers/validation-handlers
 */

import {
  validateEntityId,
  validateSchema,
  validateTransaction,
  validateAction,
} from '../validation.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const validationHandlers = new Map([
  ['structs_validate_entity_id', createHandler(
    async (args) => validateEntityId(args?.id as string, args?.expected_type as string | undefined)
  )],
  ['structs_validate_schema', createHandler(
    (args) => validateSchema(args?.data, args?.schema_uri as string, aiDocsPath)
  )],
  ['structs_validate_transaction', createHandler(
    (args) => validateTransaction(args?.transaction, aiDocsPath)
  )],
  ['structs_validate_action', createHandler(
    (args) => validateAction(
      args?.action_type as string,
      args?.parameters,
      args?.game_state,
      aiDocsPath
    )
  )],
]);
