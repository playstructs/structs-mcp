/**
 * Gameplay Tool Handlers
 * 
 * @module tools/handlers/gameplay-handlers
 */

import { validateGameplayRequirements } from '../validation-gameplay.js';
import { createHandler } from './wrapper.js';

export const gameplayHandlers = new Map([
  ['structs_validate_gameplay_requirements', createHandler(
    (args) => validateGameplayRequirements(
      args?.action_type as string,
      args?.parameters as Record<string, unknown> || {},
      args?.player_id as string
    )
  )],
]);
