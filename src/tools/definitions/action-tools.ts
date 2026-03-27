/**
 * Action Tool Definitions
 * 
 * @module tools/definitions/action-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const actionTools: Tool[] = [
  {
    name: "structs_action_submit_transaction",
    description: "Perform a game action via the signer DB (requires DANGER=true). For generating CLI commands without signer access, use structs_prepare_command instead.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action to perform. Deprecated actions return an error with the replacement. Use structs_prepare_command to see all actions.",
          enum: [
            "explore", "planet-explore",
            "struct_build_initiate", "struct-build-initiate", "struct_build_complete", "struct-build-complete",
            "struct-activate", "struct-deactivate", "struct-attack", "struct-move",
            "struct-defense-set", "struct-defense-clear", "struct-stealth-activate", "struct-stealth-deactivate",
            "struct-generator-infuse",
            "planet_raid_complete", "planet-raid-complete",
            "ore_miner_complete", "struct-ore-miner-complete", "ore_refinery_complete", "struct-ore-refinery-complete",
            "fleet_move", "fleet-move",
            "guild-create", "guild-update-entry-rank",
            "guild_membership_join", "guild-membership-join", "guild-membership-kick",
            "guild-bank-mint", "guild-bank-redeem",
            "player-update-guild-rank", "player-send",
            "reactor-infuse", "reactor-defuse", "reactor-begin-migration", "reactor-cancel-defusion",
            "permission-grant-on-object", "permission-revoke-on-object", "permission-set-on-object",
            "permission-grant-on-address", "permission-revoke-on-address", "permission-set-on-address",
            "permission-guild-rank-set", "permission-guild-rank-revoke",
            "allocation-create", "allocation-update", "allocation-delete", "allocation-transfer",
            "substation-create", "substation-delete",
            "substation-player-connect", "substation-player-disconnect", "substation-player-migrate",
            "substation-allocation-connect", "substation-allocation-disconnect",
            "provider-create", "provider-delete", "provider-withdraw-balance",
            "agreement-open", "agreement-close",
            "address-register", "player-update-primary-address"
          ],
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
              description: "The type of struct to build (e.g., 1 for Command Ship, 14 for Ore Extractor, 15 for Ore Refinery). Use structs_list_struct_types to see available types (for struct_build_initiate)",
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
];
