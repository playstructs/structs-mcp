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
  calculateTradeValue,
  calculateProofOfWork,
  calculateROI,
  queryMarketPrices,
  calculateCostBenefit,
  evaluateEconomicStrategy,
  calculateTokenEconomics,
  optimizeResourceAllocation,
  calculateEconomicMetrics,
  calculateTradeValueEnhanced,
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
        defender: args?.defender as any,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_trade_value', createHandler(
    (args) => calculateTradeValue(
      {
        resource: args?.resource as string,
        amount: args?.amount as number,
        market: args?.market as string | undefined,
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
  ['structs_calculate_roi', createHandler(
    (args) => calculateROI(
      {
        investment_type: args?.investment_type as string,
        initial_investment: args?.initial_investment as number,
        expected_return: args?.expected_return as number | undefined,
        energy_value: args?.energy_value as number | undefined,
        alpha_matter_cost: args?.alpha_matter_cost as number | undefined,
        energy_output: args?.energy_output as number | undefined,
        alpha_matter_input: args?.alpha_matter_input as number | undefined,
        time_period: args?.time_period as number | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_query_market_prices', createHandler(
    (args) => queryMarketPrices(
      {
        resource: args?.resource as string | undefined,
        market: args?.market as string | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_cost_benefit', createHandler(
    (args) => calculateCostBenefit(
      {
        action_type: args?.action_type as string,
        initial_cost: args?.initial_cost as number,
        recurring_cost: args?.recurring_cost as number | undefined,
        expected_benefit: args?.expected_benefit as number,
        benefit_frequency: args?.benefit_frequency as number | undefined,
        time_horizon: args?.time_horizon as number,
        discount_rate: args?.discount_rate as number | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_evaluate_economic_strategy', createHandler(
    (args) => evaluateEconomicStrategy(
      {
        strategies: args?.strategies as Array<{
          name: string;
          type: string;
          initial_cost: number;
          expected_return?: number;
          energy_output?: number;
          alpha_matter_input?: number;
          time_period?: number;
        }>,
        constraints: args?.constraints as {
          max_investment?: number;
          min_roi?: number;
          max_time_period?: number;
        } | undefined,
        goals: args?.goals as string[] | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_token_economics', createHandler(
    (args) => calculateTokenEconomics(
      {
        guild_id: args?.guild_id as string,
        locked_alpha_matter: args?.locked_alpha_matter as number | undefined,
        total_tokens_issued: args?.total_tokens_issued as number | undefined,
        tokens_in_circulation: args?.tokens_in_circulation as number | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_optimize_resource_allocation', createHandler(
    (args) => optimizeResourceAllocation(
      {
        available_resources: args?.available_resources as {
          total_energy?: number;
          alpha_matter?: number;
        },
        operation_requirements: args?.operation_requirements as Array<{
          operation_id: string;
          operation_name: string;
          energy_required: number;
          priority?: number;
        }>,
        goals: args?.goals as string[] | undefined,
      },
      aiDocsPath
    )
  )],
  ['structs_calculate_economic_metrics', createHandler(
    (args) => calculateEconomicMetrics(
      {
        entity_id: args?.entity_id as string,
        entity_type: args?.entity_type as 'player' | 'guild',
        current_resources: args?.current_resources as {
          alpha_matter?: number;
          energy?: number;
        } | undefined,
        previous_resources: args?.previous_resources as {
          alpha_matter?: number;
          energy?: number;
        } | undefined,
        used_resources: args?.used_resources as number | undefined,
        available_resources: args?.available_resources as number | undefined,
        guild_production: args?.guild_production as number | undefined,
        total_market_production: args?.total_market_production as number | undefined,
        time_period: args?.time_period as number | undefined,
      },
      aiDocsPath
    )
  )],
]);
