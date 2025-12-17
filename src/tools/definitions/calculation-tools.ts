/**
 * Calculation Tool Definitions
 * 
 * @module tools/definitions/calculation-tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const calculationTools: Tool[] = [
  {
    name: "structs_calculate_power",
    description: "Calculate how much power (energy) you'll get from a given amount of Alpha Matter. The amount depends on the generator type you're using.",
    inputSchema: {
      type: "object",
      properties: {
        alpha_matter: {
          type: "number",
          description: "Alpha Matter input (grams)",
        },
        generator_type: {
          type: "string",
          description: "What type of generator: 'reactor' (1 kW per gram), 'fieldGenerator' (2 kW per gram), 'continentalPowerPlant' (5 kW per gram), or 'worldEngine' (10 kW per gram)",
        },
      },
      required: ["alpha_matter", "generator_type"],
    },
  },
  {
    name: "structs_calculate_mining",
    description: "Calculate how fast an ore extractor will mine ore. The rate depends on the planet and extractor type.",
    inputSchema: {
      type: "object",
      properties: {
        planet_id: {
          type: "string",
          description: "Planet ID (optional). If provided, calculates the rate for this specific planet.",
        },
        extractor_id: {
          type: "string",
          description: "Extractor ID (optional). If provided, calculates the rate for this specific extractor.",
        },
      },
    },
  },
  {
    name: "structs_calculate_cost",
    description: "Calculate how much it costs to build a struct, including Alpha Matter and energy requirements.",
    inputSchema: {
      type: "object",
      properties: {
        struct_type: {
          type: "number",
          description: "Struct type ID",
        },
        location_type: {
          type: "string",
          description: "Where you're building (e.g., 'planet'). Some structs cost different amounts depending on location.",
        },
      },
      required: ["struct_type"],
    },
  },
  {
    name: "structs_calculate_damage",
    description: "Calculate how much damage an attacker will deal to a defender in combat. Takes into account weapon power, armor, and defense.",
    inputSchema: {
      type: "object",
      properties: {
        attacker: {
          description: "Attacker information (struct_type, weapon_type, power, etc.)",
        },
        defender: {
          description: "Defender information (struct_type, armor, defense, health, etc.)",
        },
      },
      required: ["attacker", "defender"],
    },
  },
  {
    name: "structs_calculate_trade_value",
    description: "Calculate the trade value of resources (how much they're worth in watts and Alpha Matter). Optionally specify a market for market-specific rates.",
    inputSchema: {
      type: "object",
      properties: {
        resource: {
          type: "string",
          description: "Resource type (e.g., 'alpha_matter')",
        },
        amount: {
          type: "number",
          description: "Resource amount",
        },
        market: {
          type: "string",
          description: "Market identifier (optional). If provided, uses market-specific rates.",
        },
      },
      required: ["resource", "amount"],
    },
  },
  {
    name: "structs_calculate_proof_of_work",
    description: "Complete an action that requires proof-of-work (like finishing a struct build, completing mining, or finishing a raid). This starts the work in the background and automatically submits the transaction when done. Returns a job ID immediately so you can check status later.",
    inputSchema: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          description: "What action to complete: 'struct_build_complete' (finish building a struct), 'ore_miner_complete' (finish mining ore), 'ore_refinery_complete' (finish refining ore), or 'planet_raid_complete' (finish raiding a planet)",
        },
        entity_id: {
          type: "string",
          description: "The struct ID if completing a build/mining/refining, or the fleet ID if completing a raid",
        },
        difficulty: {
          type: "number",
          description: "Difficulty value (optional). If not provided, it will be looked up automatically. The actual difficulty used depends on how long the operation has been running.",
        },
        max_iterations: {
          type: "number",
          description: "Maximum number of attempts to find a valid proof (optional, default: 1,000,000). Higher values may take longer but are more likely to succeed.",
        },
        block_start: {
          type: "number",
          description: "When the operation started (optional). If not provided, it will be looked up automatically.",
        },
        player_id: {
          type: "string",
          description: "Your player ID (e.g., '1-11'). Required so the transaction can be submitted automatically.",
        },
      },
      required: ["action_type", "entity_id", "player_id"],
    },
  },
  {
    name: "structs_query_proof_of_work_status",
    description: "Check the status of a proof-of-work job. Use the job ID returned when you started the job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "The job ID you received when you started the proof-of-work job",
        },
      },
      required: ["job_id"],
    },
  },
  {
    name: "structs_calculate_token_economics",
    description: "Calculate guild token economics (collateral ratio, token value, inflation risk)",
    inputSchema: {
      type: "object",
      properties: {
        guild_id: {
          type: "string",
          description: "Guild ID (e.g., '0-1')",
        },
        locked_alpha_matter: {
          type: "number",
          description: "Locked Alpha Matter amount (optional)",
        },
        total_tokens_issued: {
          type: "number",
          description: "Total tokens issued (optional)",
        },
        tokens_in_circulation: {
          type: "number",
          description: "Tokens in circulation (optional)",
        },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "structs_optimize_resource_allocation",
    description: "Optimize resource allocation across operations",
    inputSchema: {
      type: "object",
      properties: {
        available_resources: {
          type: "object",
          description: "Available resources",
          properties: {
            total_energy: {
              type: "number",
              description: "Total energy available",
            },
            alpha_matter: {
              type: "number",
              description: "Alpha Matter available",
            },
          },
        },
        operation_requirements: {
          type: "array",
          description: "Operation requirements",
          items: {
            type: "object",
            properties: {
              operation_id: {
                type: "string",
                description: "Operation ID",
              },
              operation_name: {
                type: "string",
                description: "Operation name",
              },
              energy_required: {
                type: "number",
                description: "Energy required",
              },
              priority: {
                type: "number",
                description: "Priority (higher = more important)",
              },
            },
            required: ["operation_id", "operation_name", "energy_required"],
          },
        },
        goals: {
          type: "array",
          description: "Optimization goals (e.g., ['maximize_efficiency', 'minimize_waste'])",
          items: {
            type: "string",
          },
        },
      },
      required: ["available_resources", "operation_requirements"],
    },
  },
  {
    name: "structs_calculate_economic_metrics",
    description: "Calculate economic performance metrics (growth rate, utilization, market share)",
    inputSchema: {
      type: "object",
      properties: {
        entity_id: {
          type: "string",
          description: "Entity ID (player ID or guild ID)",
        },
        entity_type: {
          type: "string",
          description: "Entity type: 'player' or 'guild'",
          enum: ["player", "guild"],
        },
        current_resources: {
          type: "object",
          description: "Current resources",
          properties: {
            alpha_matter: {
              type: "number",
            },
            energy: {
              type: "number",
            },
          },
        },
        previous_resources: {
          type: "object",
          description: "Previous resources (for growth calculation)",
          properties: {
            alpha_matter: {
              type: "number",
            },
            energy: {
              type: "number",
            },
          },
        },
        used_resources: {
          type: "number",
          description: "Used resources (for utilization calculation)",
        },
        available_resources: {
          type: "number",
          description: "Available resources (for utilization calculation)",
        },
        guild_production: {
          type: "number",
          description: "Guild production (for market share calculation)",
        },
        total_market_production: {
          type: "number",
          description: "Total market production (for market share calculation)",
        },
        time_period: {
          type: "number",
          description: "Time period for metrics (in blocks or time units)",
        },
      },
      required: ["entity_id", "entity_type"],
    },
  },
];
