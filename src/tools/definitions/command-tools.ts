/**
 * Command Preparation Tool Definitions
 *
 * @module tools/definitions/command-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const commandTools: Tool[] = [
  {
    name: 'structs_prepare_command',
    description:
      'Generate the exact structsd CLI command for any game action. Returns the command string ready to copy-paste, with prerequisites, warnings, and follow-up steps. Works without signer access -- the agent runs the command themselves. Handles deprecated actions by returning the replacement.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description:
            'Action name (e.g., "struct-build-initiate", "struct-attack", "fleet-move", "permission-grant-on-object"). Use structs_query_endpoints or pass "list" to see all available actions.',
        },
        key_name: {
          type: 'string',
          description: 'Name of the signing key in structsd keyring (e.g., "my-key")',
        },
        player_id: { type: 'string', description: 'Player ID (e.g., "1-11")' },
        struct_id: { type: 'string', description: 'Struct ID (e.g., "5-42")' },
        struct_type_id: { type: 'number', description: 'Struct type (e.g., 14=Ore Extractor, 15=Ore Refinery, 1=Command Ship)' },
        ambit: { type: 'string', description: 'Operating ambit: space, air, land, or water' },
        slot: { type: 'number', description: 'Slot number (0-3)' },
        fleet_id: { type: 'string', description: 'Fleet ID (e.g., "9-1")' },
        destination_planet_id: { type: 'string', description: 'Destination planet ID' },
        attacker_struct_id: { type: 'string', description: 'Attacker struct ID' },
        target_struct_id: { type: 'string', description: 'Target struct ID' },
        reactor_id: { type: 'string', description: 'Reactor ID' },
        guild_id: { type: 'string', description: 'Guild ID' },
        substation_id: { type: 'string', description: 'Substation ID' },
        provider_id: { type: 'string', description: 'Provider ID' },
        agreement_id: { type: 'string', description: 'Agreement ID' },
        allocation_id: { type: 'string', description: 'Allocation ID' },
        object_id: { type: 'string', description: 'Object ID for permission operations' },
        to_player_id: { type: 'string', description: 'Destination player ID (for transfers/sends)' },
        amount: { type: 'string', description: 'Amount (for infuse, defuse, send, mint, etc.)' },
        address: { type: 'string', description: 'Cosmos address (for address-register, permissions)' },
        permission_value: { type: 'string', description: 'Permission bitmask value (for permission operations)' },
        guild_rank: { type: 'string', description: 'Guild rank value (numeric)' },
        entry_rank: { type: 'string', description: 'Guild entry rank (numeric)' },
        difficulty: { type: 'number', description: 'PoW difficulty level (-D flag). 1=gentle/slow, 3=fast/recommended.' },
        proof: { type: 'string', description: 'Proof-of-work proof hash' },
        nonce: { type: 'string', description: 'Proof-of-work nonce' },
        destination: { type: 'string', description: 'Destination location ID (for struct-move)' },
        source_id: { type: 'string', description: 'Source substation/reactor ID (for allocation-create)' },
        power: { type: 'string', description: 'Power allocation amount' },
        capacity: { type: 'string', description: 'Capacity value (for agreements)' },
        duration: { type: 'string', description: 'Duration value (for agreements)' },
        value: { type: 'string', description: 'Generic value (for provider updates)' },
        policy: { type: 'string', description: 'Access policy (for provider-update-access-policy)' },
        blocks: { type: 'string', description: 'Block count (for agreement-duration-increase)' },
      },
      required: ['action'],
    },
  },
];
