/**
 * Workflow Tool Definitions
 * 
 * @module tools/definitions/workflow-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const workflowTools: Tool[] = [
  {
    name: "structs_workflow_execute",
    description: "Run a complete multi-step process automatically. Available workflows: building a struct (start to finish), mining ore, refining ore, or raiding a planet.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_type: {
          type: "string",
          description: "Which workflow to run: 'struct_build' (build a struct from start to finish), 'ore_mining' (mine ore), 'ore_refining' (refine ore), or 'planet_raid' (raid a planet)",
        },
        player_id: {
          type: "string",
          description: "Player ID (e.g., '1-11')",
        },
        parameters: {
          type: "object",
          description: "Parameters for the workflow. For struct_build: {struct_type_id, operate_ambit, slot}. For planet_raid: {fleet_id, destination_planet_id}. See structs_workflow_get_steps for details.",
        },
      },
      required: ["workflow_type", "player_id", "parameters"],
    },
  },
  {
    name: "structs_workflow_monitor",
    description: "Check the progress of a workflow you started. Use the workflow ID you received when you started it.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: {
          type: "string",
          description: "The workflow ID you received when you started the workflow",
        },
      },
      required: ["workflow_id"],
    },
  },
  {
    name: "structs_workflow_get_steps",
    description: "See what steps a workflow includes and what parameters you need to provide.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_type: {
          type: "string",
          description: "Workflow type: 'struct_build', 'ore_mining', 'ore_refining', 'planet_raid'",
        },
      },
      required: ["workflow_type"],
    },
  },
];
