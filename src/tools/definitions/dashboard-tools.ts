/**
 * Dashboard Tool Definitions
 *
 * @module tools/definitions/dashboard-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const dashboardTools: Tool[] = [
  {
    name: 'structs_player_dashboard',
    description:
      'Get a complete overview of a player in one call: player state, power, all structs, fleets, allocations, and in-progress operations. Replaces 5-10 individual query calls. Use this first to understand the player\'s situation before planning actions.',
    inputSchema: {
      type: 'object',
      properties: {
        player_id: {
          type: 'string',
          description: 'Player ID in type-index format (e.g., "1-11")',
        },
      },
      required: ['player_id'],
    },
  },
];
