/**
 * Validation Tool Definitions
 * 
 * @module tools/definitions/validation-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const validationTools: Tool[] = [
  {
    name: "structs_validate_entity_id",
    description: "Check if an entity ID is in the correct format (e.g., '1-11' for a player, '2-1' for a planet). Optionally verify it matches the expected entity type.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Entity ID to check (format: type-index, like '1-11' for player 11)",
        },
        expected_type: {
          type: "string",
          description: "Optionally verify the ID matches this entity type (player, planet, struct, guild)",
          enum: ["player", "planet", "struct", "guild"],
        },
      },
      required: ["id"],
    },
  },
  {
    name: "structs_validate_schema",
    description: "Check if data matches a schema definition. Use this to verify data structure before submitting transactions.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          description: "Data to validate (any JSON-serializable value)",
        },
        schema_uri: {
          type: "string",
          description: "Schema resource URI (e.g., 'structs://schemas/entities/player.json'). Use structs_query_endpoints to find available schemas.",
        },
      },
      required: ["data", "schema_uri"],
    },
  },
  {
    name: "structs_validate_transaction",
    description: "Check if a transaction is properly formatted before submitting it. This helps catch errors early.",
    inputSchema: {
      type: "object",
      properties: {
        transaction: {
          description: "Transaction object to validate",
        },
      },
      required: ["transaction"],
    },
  },
  {
    name: "structs_validate_action",
    description: "Check if you can perform an action by verifying all requirements are met (like having enough resources, correct permissions, etc.). This helps prevent failed transactions.",
    inputSchema: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          description: "The action you want to perform (e.g., 'struct-build-initiate', 'struct-activate', 'fleet-move')",
        },
        parameters: {
          description: "Action parameters",
        },
        game_state: {
          description: "Optional current game state for requirement checking",
        },
      },
      required: ["action_type", "parameters"],
    },
  },
];
