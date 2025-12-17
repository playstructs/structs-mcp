/**
 * Gameplay Tool Definitions
 * 
 * @module tools/definitions/gameplay-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const gameplayTools: Tool[] = [
  {
    name: "structs_validate_gameplay_requirements",
    description: "Verify you can perform an action before trying it. This checks requirements like having enough resources, correct permissions, and valid targets. Helps prevent failed transactions.",
    inputSchema: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          description: "The action you want to check (e.g., 'struct-activate', 'struct-build-initiate', 'fleet-move', 'struct-attack')",
        },
        parameters: {
          type: "object",
          description: "Action parameters (e.g., struct_id, fleet_id, target_struct_id)",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
      },
      required: ["action_type", "player_id"],
    },
  },
];
