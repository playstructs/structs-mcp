/**
 * Calculation Tool Handlers
 * 
 * @module tools/handlers/calculation-handlers
 */

import {
  calculatePower,
  calculateMining,
  calculateCost,
  calculateDamage,
  calculateProofOfWork,
} from '../calculation.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const calculationHandlers = new Map([
  ['structs_calculate_power', createHandler(
    (args) => calculatePower(
      {
        alpha_matter: args?.alpha_matter as number,
        generator_type: args?.generator_type as string,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_mining', createHandler(
    (args) => calculateMining(
      {
        planet_id: args?.planet_id as string | undefined,
        extractor_id: args?.extractor_id as string | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_cost', createHandler(
    (args) => calculateCost(
      {
        struct_type: args?.struct_type as number,
        location_type: args?.location_type as string | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_damage', createHandler(
    (args) => calculateDamage(
      {
        attacker: args?.attacker as any,
        target: args?.target as any,
        defender: args?.defender as any,
        pdc_damage: args?.pdc_damage as number | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_proof_of_work', createHandler(
    (args) => calculateProofOfWork(
      {
        action_type: args?.action_type as string,
        entity_id: args?.entity_id as string,
        difficulty: args?.difficulty as number | undefined,
        max_iterations: args?.max_iterations as number | undefined,
        block_start: args?.block_start as number | undefined,
        player_id: args?.player_id as string,
      },
      aiDocsPath
    )
  )],
]);
