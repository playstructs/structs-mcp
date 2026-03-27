/**
 * Pre-flight Tool Definitions
 *
 * @module tools/definitions/preflight-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const preflightTools: Tool[] = [
  {
    name: 'structs_preflight_check',
    description:
      'Check if an action will succeed before spending gas. Queries chain state to verify the player is online, entities exist, parameters are valid, and permissions are likely sufficient. Returns blockers (reasons it will fail) and warnings. No keys or signer needed.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to check (e.g., "struct-build-initiate", "struct-attack", "fleet-move", "reactor-infuse")',
        },
        player_id: {
          type: 'string',
          description: 'Player ID performing the action (e.g., "1-11")',
        },
        struct_id: { type: 'string', description: 'Struct ID (if applicable)' },
        struct_type_id: { type: 'number', description: 'Struct type ID (for builds)' },
        ambit: { type: 'string', description: 'Operating ambit (for builds)' },
        slot: { type: 'number', description: 'Slot number (for builds)' },
        fleet_id: { type: 'string', description: 'Fleet ID (if applicable)' },
        destination_planet_id: { type: 'string', description: 'Destination planet (for fleet-move)' },
        attacker_struct_id: { type: 'string', description: 'Attacker struct ID (for attacks)' },
        target_struct_id: { type: 'string', description: 'Target struct ID (for attacks)' },
        reactor_id: { type: 'string', description: 'Reactor ID' },
        amount: { type: 'string', description: 'Amount (for infuse/defuse/send)' },
        object_id: { type: 'string', description: 'Object ID (for permission operations)' },
        permission_value: { type: 'string', description: 'Permission bitmask (for permission operations)' },
        to_player_id: { type: 'string', description: 'Target player (for sends)' },
      },
      required: ['action', 'player_id'],
    },
  },
];
