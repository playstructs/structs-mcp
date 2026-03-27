/**
 * Action Tool Handlers
 * 
 * @module tools/handlers/action-handlers
 */

import { submitTransaction, createPlayer } from '../action.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const actionHandlers = new Map([
  ['structs_action_submit_transaction', createHandler(
    (args) => submitTransaction(
      args?.action as string,
      args?.player_id as string,
      args?.args as Record<string, unknown> | undefined,
      aiDocsPath
    )
  )],
  ['structs_action_create_player', createHandler(
    (args) => createPlayer(
      args?.username as string,
      args?.guild_id as string
    )
  )],
]);
