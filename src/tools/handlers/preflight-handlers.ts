/**
 * Pre-flight Handlers
 *
 * @module tools/handlers/preflight-handlers
 */

import { createHandler } from './wrapper.js';
import { preflightCheck } from '../preflight.js';

export const preflightHandlers = new Map([
  ['structs_preflight_check', createHandler(
    async (args) => {
      const action = args?.action as string;
      const playerId = (args?.player_id ?? args?.id) as string;
      if (!action) throw new Error('action is required');
      if (!playerId) throw new Error('player_id is required');
      return preflightCheck(action, playerId, (args ?? {}) as Record<string, unknown>);
    }
  )],
]);
