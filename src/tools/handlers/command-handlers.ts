/**
 * Command Preparation Handlers
 *
 * @module tools/handlers/command-handlers
 */

import { createHandler } from './wrapper.js';
import { prepareCommand, listAvailableActions } from '../command.js';

export const commandHandlers = new Map([
  ['structs_prepare_command', createHandler(
    async (args) => {
      const action = args?.action as string;
      if (!action) {
        throw new Error('action is required');
      }

      if (action === 'list') {
        return listAvailableActions();
      }

      return prepareCommand(action, (args ?? {}) as Record<string, unknown>);
    }
  )],
]);
