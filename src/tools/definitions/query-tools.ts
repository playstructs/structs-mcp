/**
 * Query Tool Definitions
 * 
 * @module tools/definitions/query-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createQueryTool, createListTool } from './factories.js';

export const queryTools: Tool[] = [
  // List tools
  createListTool('player', 'Get a list of all players. You can request more results using pagination.'),
  createListTool('planet', 'Get a list of all planets. You can request more results using pagination.'),
  createListTool('struct', 'Get a list of all structs. You can request more results using pagination.'),
  createListTool('struct_type', 'Get a list of all struct types. You can request more results using pagination.'),
  createListTool('guild', 'Get a list of all guilds. You can request more results using pagination.'),
  createListTool('provider', 'Get a list of all providers. You can request more results using pagination.'),
  createListTool('agreement', 'Get a list of all agreements. You can request more results using pagination.'),
  createListTool('substation', 'Get a list of all substations. You can request more results using pagination.'),
  createListTool('allocation', 'Get a list of all allocations. You can request more results using pagination.'),

  // Query tools - descriptions will be updated in factory function
  createQueryTool('Player', '1-11'),
  createQueryTool('Planet', '2-1'),
  createQueryTool('Guild', '0-1'),
  createQueryTool('Fleet', '9-1'),
  createQueryTool('Struct', '5-1'),
  createQueryTool('Reactor', '3-1'),
  createQueryTool('Substation', '4-1'),
  createQueryTool('Provider', '10-1'),
  createQueryTool('Agreement', '11-1'),
  createQueryTool('Allocation', '6-1'),

  // Special query tools
  {
    name: "structs_query_endpoints",
    description: "Get a list of available API endpoints you can use. Optionally filter by entity type or category.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          description: "Filter by entity type (player, planet, guild, etc.)",
        },
        category: {
          type: "string",
          description: "Filter by category (queries, transactions, etc.)",
        },
      },
    },
  },
  {
    name: "structs_query_planet_activity",
    description: "Get the activity history for a planet, showing what has happened there over time",
    inputSchema: {
      type: "object",
      properties: {
        planet_id: {
          type: "string",
          description: "Planet ID (e.g., '2-1')",
        },
        limit: {
          type: "number",
          description: "Maximum number of entries to return (default: 100)",
        },
        start_time: {
          type: "string",
          description: "Only show activity after this time (ISO timestamp)",
        },
        end_time: {
          type: "string",
          description: "Only show activity before this time (ISO timestamp)",
        },
      },
      required: ["planet_id"],
    },
  },
  {
    name: "structs_query_work_info",
    description: "Get the work details needed to complete an action (like when it started and what difficulty to use). Usually you don't need this - the proof-of-work tool looks it up automatically.",
    inputSchema: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: "The struct ID if completing a build/mining/refining, or the fleet ID if completing a raid",
        },
        action_type: {
          type: "string",
          description: "Same as the action_type you would use for completing this action (e.g., 'struct_build_complete' for finishing a build)",
          enum: ["struct_build_complete", "planet_raid_complete", "ore_miner_complete", "ore_refinery_complete"],
        },
      },
      required: ["entity_id", "action_type"],
    },
  },
];
