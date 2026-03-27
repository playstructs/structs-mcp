/**
 * Dashboard Handlers
 *
 * @module tools/handlers/dashboard-handlers
 */

import { createHandler } from './wrapper.js';
import { getPlayerDashboard } from '../dashboard.js';

export const dashboardHandlers = new Map([
  ['structs_player_dashboard', createHandler(
    async (args) => {
      const playerId = (args?.player_id ?? args?.id) as string;
      if (!playerId) {
        throw new Error('player_id is required');
      }
      return getPlayerDashboard(playerId);
    }
  )],
]);
