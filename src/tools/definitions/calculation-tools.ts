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
    description: "Estimate combat damage using the v0.15.0 per-projectile engine. Models evasion, blocking, hit rate, damage reduction (min 1), counter-attacks, recoil, and PDC. Returns per-shot breakdown. This is a probabilistic estimate -- actual combat uses on-chain RNG. See https://structs.ai/knowledge/mechanics/combat",
    inputSchema: {
      type: "object",
      properties: {
        attacker: {
          type: "object",
          description: "Attacker struct info: weapon_shots, weapon_damage, weapon_success_rate ({numerator, denominator}), weapon_blockable, weapon_control ('guided'|'unguided'), weapon_recoil_damage, health",
        },
        target: {
          type: "object",
          description: "Target struct info: health (default 3, Command Ship 6), damage_reduction, defense_type ('signal_jamming'|'defensive_maneuver'|'armour'|'stealth'|'indirect_combat'|'none'), evasion_rate ({numerator, denominator})",
        },
        defender: {
          type: "object",
          description: "Optional defending struct: counter_attack_damage, blocking_success_rate ({numerator, denominator}), same_ambit_as_target (bool), same_ambit_as_attacker (bool)",
        },
        pdc_damage: {
          type: "number",
          description: "Planetary Defense Cannon damage (total from all PDCs on the planet). Applied after all targets resolved.",
        },
      },
      required: ["attacker", "target"],
    },
  },
  {
    name: "structs_calculate_proof_of_work",
    description: "Initiate or complete a proof-of-work action (struct build complete, ore miner/refinery complete, planet raid complete). Initiate early and compute later: start the job as soon as you know you need it; the actual hash runs in the background. Computing at low difficulty (e.g. D=3) minimizes CPU; difficulty is derived from operation age. Returns a job ID immediately; use structs_query_proof_of_work_status to check status. Transaction is submitted automatically when done.",
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
    description: "Check the status of a proof-of-work job. Use the job ID from structs_calculate_proof_of_work. Prefer initiating PoW early and polling status before computing so difficulty stays low (e.g. D=3).",
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
];
