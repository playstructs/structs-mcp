/**
 * Action Tool Definitions
 * 
 * @module tools/definitions/action-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const actionTools: Tool[] = [
  {
    name: "structs_action_submit_transaction",
    description: "Perform an action in the game (like exploring, building a struct, moving a fleet, or joining a guild). The transaction will be signed and submitted automatically.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "What action to perform: 'explore' (explore a planet), 'struct_build_initiate' (start building a struct), 'struct_build_complete' (finish building a struct), 'fleet_move' (move a fleet), 'guild_membership_join' (join a guild), 'guild_membership_leave' (leave a guild), 'reactor-infuse' (infuse reactor with Alpha Matter, also handles validation delegation), 'reactor-defuse' (defuse reactor, also handles validation undelegation), 'reactor-begin-migration' (begin redelegation process), or 'reactor-cancel-defusion' (cancel undelegation process)",
          enum: ["explore", "struct_build_initiate", "struct_build_complete", "fleet_move", "guild_membership_join", "guild_membership_leave", "reactor-infuse", "reactor-defuse", "reactor-begin-migration", "reactor-cancel-defusion"],
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
        args: {
          type: "object",
          description: "Arguments specific to the action you're performing. For example, when building a struct: {struct_type_id: 14, operate_ambit: 'land', slot: 0}",
          properties: {
            struct_type_id: {
              type: "number",
              description: "The type of struct to build (e.g., 14 for Command Ship). Use structs_list_struct_types to see available types (for struct_build_initiate)",
            },
            operate_ambit: {
              type: "string",
              description: "Where the struct will operate: 'space', 'air', 'land', or 'water' (for struct_build_initiate)",
              enum: ["space", "air", "land", "water"],
            },
            slot: {
              type: "number",
              description: "Which slot to build in (0-3). Each planet has 4 slots per ambit (for struct_build_initiate)",
            },
            struct_id: {
              type: "string",
              description: "Struct ID (for struct_build_complete)",
            },
            proof: {
              type: "string",
              description: "Proof-of-work hash (for struct_build_complete)",
            },
            nonce: {
              type: "number",
              description: "Proof-of-work nonce (for struct_build_complete)",
            },
            fleet_id: {
              type: "string",
              description: "Fleet ID (for fleet_move)",
            },
            destination_planet_id: {
              type: "string",
              description: "Destination planet ID (for fleet_move)",
            },
            guild_id: {
              type: "string",
              description: "Guild ID (for guild_membership_join)",
            },
            reactor_id: {
              type: "string",
              description: "Reactor ID (e.g., '3-1') - Required for reactor-infuse, reactor-defuse, reactor-begin-migration, reactor-cancel-defusion",
            },
            amount: {
              type: "string",
              description: "Amount in ualpha (micrograms of Alpha Matter, e.g., '1000000' for 1 gram) - Required for reactor-infuse and reactor-defuse",
            },
          },
          additionalProperties: true,
        },
      },
      required: ["action", "player_id"],
    },
  },
  {
    name: "structs_action_create_player",
    description: "Create a new player account. You'll need to choose a username and optionally join a guild.",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Player username",
        },
        guild_id: {
          type: "string",
          description: "Guild ID to join (e.g., '0-1'), or '0-0' if you don't want to join a guild",
        },
      },
      required: ["username", "guild_id"],
    },
  },
  {
    name: "structs_action_build_struct",
    description: "Build a struct from start to finish. This handles the entire process: starting the build, waiting for it to be ready, calculating proof-of-work, and completing it automatically.",
    inputSchema: {
      type: "object",
      properties: {
        struct_type_id: {
          type: "number",
          description: "The type of struct to build (e.g., 14 for Command Ship). Use structs_list_struct_types to see available types",
        },
        operate_ambit: {
          type: "string",
          description: "Where the struct will operate: 'space', 'air', 'land', or 'water'",
        },
        slot: {
          type: "number",
          description: "Which slot to build in (0-3). Each planet has 4 slots per ambit",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
      },
      required: ["struct_type_id", "operate_ambit", "slot", "player_id"],
    },
  },
  {
    name: "structs_action_activate_struct",
    description: "Activate a struct (turn it on). This checks that you have enough energy and charge before activating.",
    inputSchema: {
      type: "object",
      properties: {
        struct_id: {
          type: "string",
          description: "Struct ID (e.g., '5-1')",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
      },
      required: ["struct_id", "player_id"],
    },
  },
  {
    name: "structs_action_attack",
    description: "Attack another struct. This checks that the target is valid and in range before attacking.",
    inputSchema: {
      type: "object",
      properties: {
        attacker_struct_id: {
          type: "string",
          description: "Attacker struct ID (e.g., '5-1')",
        },
        target_struct_id: {
          type: "string",
          description: "Target struct ID (e.g., '5-2')",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
      },
      required: ["attacker_struct_id", "target_struct_id", "player_id"],
    },
  },
  {
    name: "structs_action_move_fleet",
    description: "Move a fleet to a different planet. This checks that your fleet has a command ship before moving.",
    inputSchema: {
      type: "object",
      properties: {
        fleet_id: {
          type: "string",
          description: "Fleet ID (e.g., '3-1')",
        },
        destination_planet_id: {
          type: "string",
          description: "Destination planet ID (e.g., '2-1')",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
      },
      required: ["fleet_id", "destination_planet_id", "player_id"],
    },
  },
];
