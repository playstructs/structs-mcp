/**
 * Calculation Tools
 * 
 * Implements calculation tools for power, mining, costs, damage, and trade values.
 * 
 * @module tools/calculation
 */

import { getResource } from '../resources/index.js';

/**
 * Generator type and conversion rate mapping
 */
const GENERATOR_RATES: Record<string, number> = {
  reactor: 1,
  fieldGenerator: 2,
  continentalPowerPlant: 5,
  worldEngine: 10,
};

/**
 * Calculate power generation from Alpha Matter
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Power generation result
 */
export async function calculatePower(
  args: {
    alpha_matter: number;
    generator_type: string;
  },
  aiDocsPath: string
): Promise<{
  power_generated: number;
  formula: string;
  conversion_rate: number;
  generator_type: string;
  alpha_matter_input: number;
}> {
  const { alpha_matter, generator_type } = args;

  // Validate generator type
  if (!GENERATOR_RATES[generator_type]) {
    throw new Error(
      `Invalid generator type: ${generator_type}. Valid types: ${Object.keys(GENERATOR_RATES).join(', ')}`
    );
  }

  // Validate alpha matter input
  if (alpha_matter < 0) {
    throw new Error('Alpha matter input must be non-negative');
  }

  const conversionRate = GENERATOR_RATES[generator_type];
  const powerGenerated = alpha_matter * conversionRate;

  return {
    power_generated: powerGenerated,
    formula: `${conversionRate}g Alpha Matter = ${conversionRate}kW (${generator_type})`,
    conversion_rate: conversionRate,
    generator_type: generator_type,
    alpha_matter_input: alpha_matter,
  };
}

/**
 * Calculate mining rate for an extractor
 * 
 * Note: This is a placeholder implementation. Actual mining rate depends on:
 * - Planet ore availability
 * - Extractor efficiency
 * - Power availability
 * - Current game state
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Mining rate result
 */
export async function calculateMining(
  args: {
    planet_id?: string;
    extractor_id?: string;
  },
  aiDocsPath: string
): Promise<{
  mining_rate: number;
  formula: string;
  note?: string;
}> {
  // Load mining formula from schemas
  try {
    const formulasResource = await getResource(
      'structs://schemas/formulas.json',
      aiDocsPath
    );
    
    if (formulasResource && typeof formulasResource === 'object' && 'content' in formulasResource) {
      const formulas = JSON.parse(formulasResource.content as string);
      const miningFormula = formulas.formulas?.resource?.['ore-extraction-rate'];
      
      if (miningFormula) {
        return {
          mining_rate: miningFormula.rate || 1.0,
          formula: miningFormula.formula || 'Mining rate depends on extractor efficiency and planet ore availability',
          note: 'Actual mining rate depends on current game state. Query planet and extractor for current values.',
        };
      }
    }
  } catch (error) {
    // Fall back to default if schema not available
  }

  // Default fallback
  return {
    mining_rate: 1.0,
    formula: 'Mining rate = 1.0 grams per cycle (default)',
    note: 'Query planet and extractor state for actual mining rate. This is a default value.',
  };
}

/**
 * Calculate build cost for a struct
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Build cost result
 */
export async function calculateCost(
  args: {
    struct_type: number;
    location_type?: string;
  },
  aiDocsPath: string
): Promise<{
  cost: {
    alpha_matter: number;
    watts: number;
  };
  formula_version: string;
  code_version?: string;
  struct_type: number;
  location_type?: string;
}> {
  const { struct_type, location_type } = args;

  // Load struct definitions to get build costs
  try {
    const structsResource = await getResource(
      'structs://schemas/structs.json',
      aiDocsPath
    );
    
    if (structsResource && typeof structsResource === 'object' && 'content' in structsResource) {
      const structs = JSON.parse(structsResource.content as string);
      const structDef = structs.structs?.[struct_type];
      
      if (structDef) {
        return {
          cost: {
            alpha_matter: structDef.buildCost?.alphaMatter || 0,
            watts: structDef.buildCost?.watts || 0,
          },
          formula_version: '1.0.0',
          struct_type: struct_type,
          location_type: location_type || 'planet',
        };
      }
    }
  } catch (error) {
    // Fall back to default if schema not available
  }

  // Default fallback (placeholder values)
  return {
    cost: {
      alpha_matter: 10,
      watts: 5,
    },
    formula_version: '1.0.0',
    struct_type: struct_type,
    location_type: location_type || 'planet',
    note: 'Query struct schema for actual build costs. These are placeholder values.',
  } as {
    cost: {
      alpha_matter: number;
      watts: number;
    };
    formula_version: string;
    code_version?: string;
    struct_type: number;
    location_type?: string;
  };
}

/**
 * Calculate combat damage
 * 
 * Simplified damage calculation. Actual game uses multi-shot system with success rates.
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Damage calculation result
 */
export async function calculateDamage(
  args: {
    attacker: {
      struct_type?: number;
      weapon_type?: string;
      power?: number;
      weapon_shots?: number;
      weapon_damage?: number;
      weapon_success_rate?: { numerator: number; denominator: number };
    };
    defender: {
      struct_type?: number;
      armor?: number;
      defense?: number;
      health?: number;
      damage_reduction?: number;
    };
  },
  aiDocsPath: string
): Promise<{
  damage: number;
  formula: string;
  breakdown: {
    base_damage: number;
    armor_reduction: number;
    final_damage: number;
  };
  target_health_after?: number;
}> {
  const { attacker, defender } = args;

  // Load damage formula from schemas
  let damageFormula: any = null;
  try {
    const formulasResource = await getResource(
      'structs://schemas/formulas.json',
      aiDocsPath
    );
    
    if (formulasResource && typeof formulasResource === 'object' && 'content' in formulasResource) {
      const formulas = JSON.parse(formulasResource.content as string);
      damageFormula = formulas.formulas?.battle?.['damage-calculation'];
    }
  } catch (error) {
    // Fall back to simplified calculation
  }

  // Simplified damage calculation
  // Base damage from weapon power or weapon damage
  const baseDamage = attacker.weapon_damage || attacker.power || 100;
  
  // Apply multi-shot system if weapon_shots and success_rate provided
  let totalDamage = baseDamage;
  if (attacker.weapon_shots && attacker.weapon_success_rate) {
    // Simplified: assume all shots hit (actual game uses probability)
    // For accurate calculation, would need to simulate each shot
    totalDamage = baseDamage * attacker.weapon_shots;
  }

  // Damage reduction from armor/defense
  const armorReduction = defender.damage_reduction || defender.armor || 0;
  const finalDamage = Math.max(0, totalDamage - armorReduction);

  // Calculate target health after damage
  const targetHealthAfter = defender.health !== undefined
    ? Math.max(0, defender.health - finalDamage)
    : undefined;

  return {
    damage: finalDamage,
    formula: damageFormula?.formula || 'damage = (weapon_power * weapon_multiplier) - (armor * defense_multiplier)',
    breakdown: {
      base_damage: totalDamage,
      armor_reduction: armorReduction,
      final_damage: finalDamage,
    },
    target_health_after: targetHealthAfter,
  };
}

/**
 * Calculate trade value
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Trade value result
 */
export async function calculateTradeValue(
  args: {
    resource: string;
    amount: number;
    market?: string;
  },
  aiDocsPath: string
): Promise<{
  value: {
    watts: number;
    alpha_matter_equivalent: number;
  };
  market_rate: number;
  timestamp: string;
  market?: string;
}> {
  const { resource, amount, market } = args;

  // Default market rate (1:1 for alpha_matter)
  // Actual market rates would come from game state
  let marketRate = 1.0;

  // Load market data if available
  try {
    const economicsResource = await getResource(
      'structs://schemas/economics.json',
      aiDocsPath
    );
    
    if (economicsResource && typeof economicsResource === 'object' && 'content' in economicsResource) {
      const economics = JSON.parse(economicsResource.content as string);
      // Market rates would be in economics schema
      // For now, use default
    }
  } catch (error) {
    // Fall back to default
  }

  // Calculate value
  const alphaMatterEquivalent = amount * marketRate;
  const wattsValue = alphaMatterEquivalent; // 1:1 conversion for alpha matter to watts

  return {
    value: {
      watts: wattsValue,
      alpha_matter_equivalent: alphaMatterEquivalent,
    },
    market_rate: marketRate,
    timestamp: new Date().toISOString(),
    market: market,
  };
}

/**
 * Start proof-of-work calculation in a background process
 * 
 * This function starts a long-running background process that:
 * 1. Queries view.work from database to get block_start and difficulty
 * 2. Calculates age automatically: age = current_block_height - block_start
 * 3. Calculates proof-of-work hash and nonce
 * 4. Automatically submits the transaction when complete
 * 
 * The function returns immediately with a job ID, allowing the MCP server
 * to continue processing other requests without blocking.
 * 
 * @param args - Calculation arguments including player_id for transaction submission
 * @param aiDocsPath - Path to /ai directory
 * @returns Job ID and status
 */
export async function calculateProofOfWork(
  args: {
    action_type: string;
    entity_id: string;
    difficulty?: number; // Optional: if not provided, will be queried from view.work
    max_iterations?: number;
    block_start?: number; // Optional: if not provided, will be queried from view.work
    player_id: string; // Required: player ID for transaction submission
  },
  aiDocsPath: string
): Promise<{
  job_id: string;
  status: 'queued';
  message: string;
  note?: string;
}> {
  const { 
    action_type, 
    entity_id, 
    difficulty: difficultyRange, 
    max_iterations = 1000000,
    block_start: providedBlockStart,
    player_id
  } = args;

  // Validate action type
  const validActionTypes = [
    'struct_build_complete',
    'planet_raid_complete',
    'ore_miner_complete',
    'ore_refinery_complete',
  ];
  
  if (!validActionTypes.includes(action_type)) {
    throw new Error(
      `Invalid action type: ${action_type}. Valid types: ${validActionTypes.join(', ')}`
    );
  }

  if (!player_id) {
    throw new Error('player_id is required for automatic transaction submission');
  }

  // Query work info from database to get block_start and difficulty
  const { queryWorkInfo } = await import('./query.js');
  const workInfo = await queryWorkInfo(entity_id, action_type);

  // Use provided values or query from database
  const blockStart = providedBlockStart ?? workInfo.block_start;
  const finalDifficultyRange = difficultyRange ?? workInfo.difficulty;

  if (!blockStart) {
    throw new Error(
      `block_start is required. Either provide it as a parameter or ensure view.work has a record for entity ${entity_id} with action type ${action_type}. Error: ${workInfo.error || 'No block_start found'}`
    );
  }

  if (!finalDifficultyRange || finalDifficultyRange < 1) {
    throw new Error(
      `difficulty is required and must be at least 1. Either provide it as a parameter or ensure view.work has a record for entity ${entity_id} with action type ${action_type}. Error: ${workInfo.error || 'No difficulty found'}`
    );
  }

  // For raids, the proof-of-work input uses a composite identifier of the form:
  //   "<fleet_id>@<target_planet_id>RAID<block_start>NONCE<nonce>"
  // The view.work table stores object_id (fleet ID) and target_id (planet ID)
  // separately. We pass target_id through to the worker so it can construct the
  // correct composite identifier for hashing. For non-raid actions this is
  // undefined and ignored.
  const targetIdForRaid =
    action_type === 'planet_raid_complete' ? workInfo.target_id : undefined;

  // Import process manager
  const { getProcessManager } = await import('../utils/process-manager.js');
  const processManager = getProcessManager();

  // Start background job
  // Note: age is not passed - it will be calculated automatically in the worker
  const jobResult = await processManager.startProofOfWorkJob({
    action_type,
    entity_id,
    // For raids the worker will build "<fleet_id>@<target_id>" for the
    // proof-of-work input string if target_id is provided.
    target_id: targetIdForRaid,
    difficulty: finalDifficultyRange,
    max_iterations,
    block_start: blockStart,
    player_id,
    ai_docs_path: aiDocsPath,
  });

  return {
    job_id: jobResult.job_id,
    status: 'queued',
    message: jobResult.message,
    note: 'Proof-of-work calculation is running in a background process. Age is calculated automatically from block_start and current block height. The transaction will be submitted automatically when proof-of-work is complete. Use structs_query_proof_of_work_status to check job status.',
  };
}

/**
 * Calculate return on investment (ROI) for economic decisions
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns ROI calculation result
 */
export async function calculateROI(
  args: {
    investment_type: string;
    initial_investment: number;
    expected_return?: number;
    energy_value?: number;
    alpha_matter_cost?: number;
    energy_output?: number;
    alpha_matter_input?: number;
    time_period?: number; // in blocks or time units
  },
  aiDocsPath: string
): Promise<{
  roi_percentage: number;
  efficiency?: number;
  payback_period?: number;
  break_even_point?: number;
  investment_type: string;
  initial_investment: number;
  expected_return?: number;
  formulas_used: string[];
}> {
  const {
    investment_type,
    initial_investment,
    expected_return,
    energy_value,
    alpha_matter_cost,
    energy_output,
    alpha_matter_input,
    time_period,
  } = args;

  const formulasUsed: string[] = [];
  let roiPercentage = 0;
  let efficiency: number | undefined;
  let paybackPeriod: number | undefined;
  let breakEvenPoint: number | undefined;

  // Calculate ROI based on investment type
  if (investment_type === 'energy_production' && energy_value && alpha_matter_cost) {
    // ROI = ((Energy Value - Alpha Matter Cost) / Alpha Matter Cost) × 100%
    roiPercentage = ((energy_value - alpha_matter_cost) / alpha_matter_cost) * 100;
    formulasUsed.push('ROI = ((Energy Value - Alpha Matter Cost) / Alpha Matter Cost) × 100%');
  } else if (expected_return && initial_investment > 0) {
    // Generic ROI calculation
    roiPercentage = ((expected_return - initial_investment) / initial_investment) * 100;
    formulasUsed.push('ROI = ((Expected Return - Initial Investment) / Initial Investment) × 100%');
  }

  // Calculate efficiency if energy output and alpha matter input provided
  if (energy_output && alpha_matter_input && alpha_matter_input > 0) {
    efficiency = (energy_output / alpha_matter_input) * 100;
    formulasUsed.push('Efficiency = (Energy Output / Alpha Matter Input) × 100%');
  }

  // Calculate payback period if expected return and time period provided
  if (expected_return && time_period && time_period > 0) {
    const annualReturn = (expected_return / time_period) * (time_period > 0 ? 1 : 1);
    if (annualReturn > 0) {
      paybackPeriod = initial_investment / annualReturn;
      formulasUsed.push('Payback Period = Initial Investment / Annual Return');
    }
  } else if (energy_value && time_period && time_period > 0) {
    const annualEnergyValue = (energy_value / time_period) * (time_period > 0 ? 1 : 1);
    if (annualEnergyValue > 0) {
      paybackPeriod = initial_investment / annualEnergyValue;
      formulasUsed.push('Payback Period = Initial Investment / Annual Energy Value');
    }
  }

  // Calculate break-even point
  if (energy_value && alpha_matter_cost) {
    const profitPerUnit = energy_value - alpha_matter_cost;
    if (profitPerUnit > 0 && initial_investment > 0) {
      breakEvenPoint = initial_investment / profitPerUnit;
      formulasUsed.push('Break-Even Point = Initial Investment / (Energy Value - Alpha Matter Cost)');
    }
  }

  return {
    roi_percentage: Math.round(roiPercentage * 100) / 100,
    efficiency: efficiency !== undefined ? Math.round(efficiency * 100) / 100 : undefined,
    payback_period: paybackPeriod !== undefined ? Math.round(paybackPeriod * 100) / 100 : undefined,
    break_even_point: breakEvenPoint !== undefined ? Math.round(breakEvenPoint * 100) / 100 : undefined,
    investment_type,
    initial_investment,
    expected_return,
    formulas_used: formulasUsed,
  };
}

/**
 * Query market prices for resources
 * 
 * @param args - Query arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Market price data
 */
export async function queryMarketPrices(
  args: {
    resource?: string;
    market?: string;
  },
  aiDocsPath: string
): Promise<{
  prices: Array<{
    resource: string;
    buy_price?: number;
    sell_price?: number;
    market?: string;
    timestamp: string;
  }>;
  timestamp: string;
  error?: string;
  note?: string;
}> {
  // Note: Market API endpoint needs to be determined
  // For now, return a placeholder response indicating API needs to be configured
  return {
    prices: [],
    timestamp: new Date().toISOString(),
    note: 'Market price API endpoint not yet configured. This tool requires market API access to be determined.',
    error: 'Market API endpoint not configured',
  };
}

/**
 * Calculate cost-benefit analysis for actions
 * 
 * @param args - Analysis arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Cost-benefit analysis result
 */
export async function calculateCostBenefit(
  args: {
    action_type: string;
    initial_cost: number;
    recurring_cost?: number;
    expected_benefit: number;
    benefit_frequency?: number; // per time period
    time_horizon: number; // in blocks or time units
    discount_rate?: number; // for NPV calculation (default: 0.1 = 10%)
  },
  aiDocsPath: string
): Promise<{
  npv: number;
  payback_period: number;
  break_even_point: number;
  opportunity_cost?: number;
  total_cost: number;
  total_benefit: number;
  net_benefit: number;
  action_type: string;
  formulas_used: string[];
}> {
  const {
    action_type,
    initial_cost,
    recurring_cost = 0,
    expected_benefit,
    benefit_frequency = 1,
    time_horizon,
    discount_rate = 0.1,
  } = args;

  const formulasUsed: string[] = [];

  // Calculate total cost
  const totalCost = initial_cost + (recurring_cost * time_horizon);
  formulasUsed.push('Total Cost = Initial Cost + (Recurring Cost × Time Horizon)');

  // Calculate total benefit
  const totalBenefit = expected_benefit * benefit_frequency * time_horizon;
  formulasUsed.push('Total Benefit = Expected Benefit × Benefit Frequency × Time Horizon');

  // Calculate net benefit
  const netBenefit = totalBenefit - totalCost;

  // Calculate NPV: NPV = Σ(Benefit / (1 + Discount Rate)^t) - Initial Investment
  let npv = -initial_cost;
  for (let t = 1; t <= time_horizon; t++) {
    const periodBenefit = expected_benefit * benefit_frequency;
    const discountedBenefit = periodBenefit / Math.pow(1 + discount_rate, t);
    npv += discountedBenefit;
    if (recurring_cost > 0) {
      const discountedCost = recurring_cost / Math.pow(1 + discount_rate, t);
      npv -= discountedCost;
    }
  }
  formulasUsed.push('NPV = Σ(Benefit / (1 + Discount Rate)^t) - Initial Investment');

  // Calculate payback period
  const periodBenefit = expected_benefit * benefit_frequency;
  const netPeriodBenefit = periodBenefit - recurring_cost;
  const paybackPeriod = netPeriodBenefit > 0 ? initial_cost / netPeriodBenefit : Infinity;
  formulasUsed.push('Payback Period = Initial Cost / Net Period Benefit');

  // Calculate break-even point
  const breakEvenPoint = netPeriodBenefit > 0 ? initial_cost / netPeriodBenefit : Infinity;
  formulasUsed.push('Break-Even Point = Initial Cost / Net Period Benefit');

  // Opportunity cost (simplified - would need alternative action data)
  const opportunityCost = netBenefit > 0 ? 0 : Math.abs(netBenefit);

  return {
    npv: Math.round(npv * 100) / 100,
    payback_period: paybackPeriod !== Infinity ? Math.round(paybackPeriod * 100) / 100 : Infinity,
    break_even_point: breakEvenPoint !== Infinity ? Math.round(breakEvenPoint * 100) / 100 : Infinity,
    opportunity_cost: opportunityCost > 0 ? Math.round(opportunityCost * 100) / 100 : undefined,
    total_cost: Math.round(totalCost * 100) / 100,
    total_benefit: Math.round(totalBenefit * 100) / 100,
    net_benefit: Math.round(netBenefit * 100) / 100,
    action_type,
    formulas_used: formulasUsed,
  };
}

/**
 * Evaluate and compare economic strategies
 * 
 * @param args - Strategy evaluation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Strategy comparison result
 */
export async function evaluateEconomicStrategy(
  args: {
    strategies: Array<{
      name: string;
      type: string; // 'reactor' | 'generator' | 'expansion' | 'trading' | 'conversion'
      initial_cost: number;
      expected_return?: number;
      energy_output?: number;
      alpha_matter_input?: number;
      time_period?: number;
    }>;
    constraints?: {
      max_investment?: number;
      min_roi?: number;
      max_time_period?: number;
    };
    goals?: string[]; // e.g., ['maximize_roi', 'minimize_payback']
  },
  aiDocsPath: string
): Promise<{
  comparisons: Array<{
    strategy_name: string;
    strategy_type: string;
    roi_percentage: number;
    efficiency?: number;
    payback_period?: number;
    initial_cost: number;
    expected_return?: number;
    score?: number;
  }>;
  recommendations: Array<{
    strategy_name: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  best_strategy?: string;
  timestamp: string;
}> {
  const { strategies, constraints, goals } = args;

  const comparisons = strategies.map((strategy) => {
    // Calculate ROI for each strategy
    let roiPercentage = 0;
    let efficiency: number | undefined;
    let paybackPeriod: number | undefined;

    if (strategy.expected_return && strategy.initial_cost > 0) {
      roiPercentage = ((strategy.expected_return - strategy.initial_cost) / strategy.initial_cost) * 100;
    } else if (strategy.energy_output && strategy.alpha_matter_input && strategy.alpha_matter_input > 0) {
      // Estimate ROI from efficiency
      efficiency = (strategy.energy_output / strategy.alpha_matter_input) * 100;
      // Rough ROI estimate based on efficiency
      roiPercentage = efficiency - 100; // Simplified: efficiency above 100% = positive ROI
    }

    if (strategy.energy_output && strategy.alpha_matter_input && strategy.alpha_matter_input > 0) {
      efficiency = (strategy.energy_output / strategy.alpha_matter_input) * 100;
    }

    if (strategy.expected_return && strategy.time_period && strategy.time_period > 0) {
      const annualReturn = strategy.expected_return / strategy.time_period;
      if (annualReturn > 0) {
        paybackPeriod = strategy.initial_cost / annualReturn;
      }
    }

    // Calculate score based on goals
    let score = roiPercentage;
    if (goals?.includes('minimize_payback') && paybackPeriod !== undefined) {
      score = score - (paybackPeriod * 10); // Lower payback = higher score
    }
    if (goals?.includes('maximize_efficiency') && efficiency !== undefined) {
      score = score + (efficiency / 10); // Higher efficiency = higher score
    }

    return {
      strategy_name: strategy.name,
      strategy_type: strategy.type,
      roi_percentage: Math.round(roiPercentage * 100) / 100,
      efficiency: efficiency !== undefined ? Math.round(efficiency * 100) / 100 : undefined,
      payback_period: paybackPeriod !== undefined ? Math.round(paybackPeriod * 100) / 100 : undefined,
      initial_cost: strategy.initial_cost,
      expected_return: strategy.expected_return,
      score: Math.round(score * 100) / 100,
    };
  });

  // Filter by constraints
  let filteredComparisons = comparisons;
  if (constraints) {
    if (constraints.max_investment) {
      filteredComparisons = filteredComparisons.filter((c) => c.initial_cost <= constraints.max_investment!);
    }
    if (constraints.min_roi) {
      filteredComparisons = filteredComparisons.filter((c) => c.roi_percentage >= constraints.min_roi!);
    }
    if (constraints.max_time_period) {
      filteredComparisons = filteredComparisons.filter((c) => 
        c.payback_period === undefined || c.payback_period <= constraints.max_time_period!
      );
    }
  }

  // Sort by score (or ROI if no score)
  filteredComparisons.sort((a, b) => {
    const scoreA = a.score ?? a.roi_percentage;
    const scoreB = b.score ?? b.roi_percentage;
    return scoreB - scoreA;
  });

  // Generate recommendations
  const recommendations: Array<{
    strategy_name: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  if (filteredComparisons.length > 0) {
    const best = filteredComparisons[0];
    recommendations.push({
      strategy_name: best.strategy_name,
      reason: `Highest ROI: ${best.roi_percentage}%`,
      priority: 'high',
    });

    if (best.efficiency !== undefined) {
      recommendations.push({
        strategy_name: best.strategy_name,
        reason: `High efficiency: ${best.efficiency}%`,
        priority: best.efficiency > 200 ? 'high' : 'medium',
      });
    }

    if (best.payback_period !== undefined && best.payback_period < 10) {
      recommendations.push({
        strategy_name: best.strategy_name,
        reason: `Quick payback: ${best.payback_period} periods`,
        priority: 'high',
      });
    }
  }

  return {
    comparisons: filteredComparisons,
    recommendations,
    best_strategy: filteredComparisons.length > 0 ? filteredComparisons[0].strategy_name : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate guild token economics
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Token economics calculation result
 */
export async function calculateTokenEconomics(
  args: {
    guild_id: string;
    locked_alpha_matter?: number;
    total_tokens_issued?: number;
    tokens_in_circulation?: number;
  },
  aiDocsPath: string
): Promise<{
  collateral_ratio: number;
  token_value: number;
  inflation_risk: number;
  recommendations: string[];
  guild_id: string;
  formulas_used: string[];
}> {
  const { guild_id, locked_alpha_matter = 0, total_tokens_issued = 0, tokens_in_circulation = 0 } = args;

  const formulasUsed: string[] = [];
  const recommendations: string[] = [];

  // Calculate collateral ratio
  let collateralRatio = 0;
  if (total_tokens_issued > 0) {
    collateralRatio = (locked_alpha_matter / total_tokens_issued) * 100;
    formulasUsed.push('Collateral Ratio = (Locked Alpha Matter / Total Tokens Issued) × 100%');
  } else {
    recommendations.push('No tokens issued yet. Collateral ratio cannot be calculated.');
  }

  // Calculate token value
  let tokenValue = 0;
  if (tokens_in_circulation > 0) {
    tokenValue = locked_alpha_matter / tokens_in_circulation;
    formulasUsed.push('Token Value = Locked Alpha Matter / Tokens in Circulation');
  } else {
    recommendations.push('No tokens in circulation. Token value cannot be calculated.');
  }

  // Calculate inflation risk
  let inflationRisk = 0;
  if (locked_alpha_matter > 0) {
    inflationRisk = (total_tokens_issued / locked_alpha_matter) - 1;
    formulasUsed.push('Inflation Risk = (Tokens Issued / Collateral) - 1');
  } else {
    recommendations.push('No collateral locked. Inflation risk cannot be calculated.');
  }

  // Generate recommendations
  if (collateralRatio < 100) {
    recommendations.push(`Collateral ratio is ${collateralRatio.toFixed(2)}% - consider increasing collateral backing`);
  } else if (collateralRatio >= 100) {
    recommendations.push(`Collateral ratio is healthy at ${collateralRatio.toFixed(2)}%`);
  }

  if (inflationRisk > 0) {
    recommendations.push(`Inflation risk detected: ${(inflationRisk * 100).toFixed(2)}% - tokens issued exceed collateral`);
  } else if (inflationRisk <= 0) {
    recommendations.push(`Inflation risk is low: ${(inflationRisk * 100).toFixed(2)}%`);
  }

  return {
    collateral_ratio: Math.round(collateralRatio * 100) / 100,
    token_value: Math.round(tokenValue * 100) / 100,
    inflation_risk: Math.round(inflationRisk * 10000) / 10000, // More precision for small values
    recommendations,
    guild_id,
    formulas_used: formulasUsed,
  };
}

/**
 * Optimize resource allocation across operations
 * 
 * @param args - Optimization arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Optimization result
 */
export async function optimizeResourceAllocation(
  args: {
    available_resources: {
      total_energy?: number;
      alpha_matter?: number;
    };
    operation_requirements: Array<{
      operation_id: string;
      operation_name: string;
      energy_required: number;
      priority?: number;
    }>;
    goals?: string[]; // e.g., ['maximize_efficiency', 'minimize_waste']
  },
  aiDocsPath: string
): Promise<{
  optimal_allocation: Array<{
    operation_id: string;
    operation_name: string;
    allocated_energy: number;
    priority: number;
  }>;
  total_energy: number;
  allocated_energy: number;
  excess_energy: number;
  efficiency: number;
  recommendations: string[];
  formulas_used: string[];
}> {
  const { available_resources, operation_requirements, goals = [] } = args;

  const formulasUsed: string[] = [];
  const recommendations: string[] = [];

  // Calculate total energy
  const totalEnergy = available_resources.total_energy || 0;
  formulasUsed.push('Total Energy = Σ(Production Sources)');

  // Calculate total required energy
  const totalRequired = operation_requirements.reduce((sum, op) => sum + op.energy_required, 0);

  // Sort operations by priority (higher priority first)
  const sortedOperations = [...operation_requirements].sort((a, b) => {
    const priorityA = a.priority || 0;
    const priorityB = b.priority || 0;
    return priorityB - priorityA;
  });

  // Allocate energy to operations
  let remainingEnergy = totalEnergy;
  const optimalAllocation = sortedOperations.map((op) => {
    const allocated = Math.min(op.energy_required, remainingEnergy);
    remainingEnergy -= allocated;
    return {
      operation_id: op.operation_id,
      operation_name: op.operation_name,
      allocated_energy: allocated,
      priority: op.priority || 0,
    };
  });

  // Calculate metrics
  const allocatedEnergy = optimalAllocation.reduce((sum, op) => sum + op.allocated_energy, 0);
  const excessEnergy = totalEnergy - allocatedEnergy;
  const efficiency = totalEnergy > 0 ? (allocatedEnergy / totalEnergy) * 100 : 0;

  formulasUsed.push('Allocated Energy = Σ(Operation Requirements)');
  formulasUsed.push('Excess Energy = Total Energy - Allocated Energy');
  formulasUsed.push('Efficiency = (Utilized Energy / Produced Energy) × 100%');

  // Generate recommendations
  if (excessEnergy > 0) {
    recommendations.push(`Excess energy available: ${excessEnergy.toFixed(2)} - consider adding more operations`);
  } else if (excessEnergy < 0) {
    recommendations.push(`Energy deficit: ${Math.abs(excessEnergy).toFixed(2)} - increase production or reduce requirements`);
  }

  if (efficiency < 80) {
    recommendations.push(`Efficiency is ${efficiency.toFixed(2)}% - consider optimizing operations`);
  } else {
    recommendations.push(`Efficiency is good at ${efficiency.toFixed(2)}%`);
  }

  if (goals.includes('maximize_efficiency')) {
    recommendations.push('Optimized for maximum efficiency');
  }

  if (goals.includes('minimize_waste') && excessEnergy > 0) {
    recommendations.push(`Excess energy of ${excessEnergy.toFixed(2)} could be allocated to additional operations`);
  }

  return {
    optimal_allocation: optimalAllocation,
    total_energy: Math.round(totalEnergy * 100) / 100,
    allocated_energy: Math.round(allocatedEnergy * 100) / 100,
    excess_energy: Math.round(excessEnergy * 100) / 100,
    efficiency: Math.round(efficiency * 100) / 100,
    recommendations,
    formulas_used: formulasUsed,
  };
}

/**
 * Calculate economic performance metrics
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Economic metrics result
 */
export async function calculateEconomicMetrics(
  args: {
    entity_id: string;
    entity_type: 'player' | 'guild';
    current_resources?: {
      alpha_matter?: number;
      energy?: number;
    };
    previous_resources?: {
      alpha_matter?: number;
      energy?: number;
    };
    used_resources?: number;
    available_resources?: number;
    guild_production?: number;
    total_market_production?: number;
    time_period?: number; // in blocks or time units
  },
  aiDocsPath: string
): Promise<{
  growth_rate?: number;
  utilization_rate?: number;
  production_efficiency?: number;
  market_share?: number;
  entity_id: string;
  entity_type: string;
  metrics: Array<{
    metric_name: string;
    value: number;
    unit?: string;
  }>;
  trends: string[];
  recommendations: string[];
  formulas_used: string[];
}> {
  const {
    entity_id,
    entity_type,
    current_resources = {},
    previous_resources = {},
    used_resources,
    available_resources,
    guild_production,
    total_market_production,
    time_period,
  } = args;

  const formulasUsed: string[] = [];
  const recommendations: string[] = [];
  const trends: string[] = [];
  const metrics: Array<{ metric_name: string; value: number; unit?: string }> = [];

  // Calculate growth rate
  let growthRate: number | undefined;
  const currentTotal = (current_resources.alpha_matter || 0) + (current_resources.energy || 0);
  const previousTotal = (previous_resources.alpha_matter || 0) + (previous_resources.energy || 0);

  if (previousTotal > 0) {
    growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
    formulasUsed.push('Growth Rate = ((Current Resources - Previous Resources) / Previous Resources) × 100%');
    metrics.push({
      metric_name: 'Economic Growth Rate',
      value: Math.round(growthRate * 100) / 100,
      unit: '%',
    });

    if (growthRate > 0) {
      trends.push(`Positive growth: ${growthRate.toFixed(2)}% increase`);
      recommendations.push('Maintain current strategy to continue growth');
    } else if (growthRate < 0) {
      trends.push(`Negative growth: ${Math.abs(growthRate).toFixed(2)}% decrease`);
      recommendations.push('Review strategy to reverse negative growth');
    } else {
      trends.push('Stable resources - no growth or decline');
    }
  }

  // Calculate utilization rate
  let utilizationRate: number | undefined;
  if (available_resources !== undefined && available_resources > 0 && used_resources !== undefined) {
    utilizationRate = (used_resources / available_resources) * 100;
    formulasUsed.push('Utilization Rate = (Used Resources / Available Resources) × 100%');
    metrics.push({
      metric_name: 'Resource Utilization Rate',
      value: Math.round(utilizationRate * 100) / 100,
      unit: '%',
    });

    if (utilizationRate < 50) {
      recommendations.push(`Low utilization (${utilizationRate.toFixed(2)}%) - consider increasing operations`);
    } else if (utilizationRate > 90) {
      recommendations.push(`High utilization (${utilizationRate.toFixed(2)}%) - consider increasing capacity`);
    } else {
      recommendations.push(`Good utilization rate: ${utilizationRate.toFixed(2)}%`);
    }
  }

  // Calculate production efficiency (simplified)
  let productionEfficiency: number | undefined;
  if (current_resources.energy !== undefined && current_resources.alpha_matter !== undefined && current_resources.alpha_matter > 0) {
    productionEfficiency = (current_resources.energy / current_resources.alpha_matter) * 100;
    formulasUsed.push('Production Efficiency = (Energy Output / Alpha Matter Input) × 100%');
    metrics.push({
      metric_name: 'Production Efficiency',
      value: Math.round(productionEfficiency * 100) / 100,
      unit: '%',
    });
  }

  // Calculate market share (for guilds)
  let marketShare: number | undefined;
  if (entity_type === 'guild' && guild_production !== undefined && total_market_production !== undefined && total_market_production > 0) {
    marketShare = (guild_production / total_market_production) * 100;
    formulasUsed.push('Market Share = (Guild Production / Total Market Production) × 100%');
    metrics.push({
      metric_name: 'Market Share',
      value: Math.round(marketShare * 100) / 100,
      unit: '%',
    });

    if (marketShare < 5) {
      recommendations.push(`Low market share (${marketShare.toFixed(2)}%) - consider expanding production`);
    } else if (marketShare > 20) {
      recommendations.push(`High market share (${marketShare.toFixed(2)}%) - strong market position`);
    }
  }

  return {
    growth_rate: growthRate !== undefined ? Math.round(growthRate * 100) / 100 : undefined,
    utilization_rate: utilizationRate !== undefined ? Math.round(utilizationRate * 100) / 100 : undefined,
    production_efficiency: productionEfficiency !== undefined ? Math.round(productionEfficiency * 100) / 100 : undefined,
    market_share: marketShare !== undefined ? Math.round(marketShare * 100) / 100 : undefined,
    entity_id,
    entity_type,
    metrics,
    trends,
    recommendations,
    formulas_used: formulasUsed,
  };
}

/**
 * Enhanced trade value calculation with market price integration
 * 
 * @param args - Calculation arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Enhanced trade value result
 */
export async function calculateTradeValueEnhanced(
  args: {
    resource: string;
    amount: number;
    market?: string;
    compare_markets?: boolean;
  },
  aiDocsPath: string
): Promise<{
  value: {
    watts: number;
    alpha_matter_equivalent: number;
  };
  market_rate: number;
  timestamp: string;
  market?: string;
  market_prices?: Array<{
    market: string;
    buy_price?: number;
    sell_price?: number;
  }>;
  trading_opportunities?: Array<{
    opportunity_type: string;
    description: string;
    potential_profit?: number;
  }>;
  arbitrage_opportunities?: Array<{
    buy_market: string;
    sell_market: string;
    profit_margin: number;
  }>;
  note?: string;
}> {
  const { resource, amount, market, compare_markets } = args;

  // Use base trade value calculation
  const baseResult = await calculateTradeValue(
    { resource, amount, market },
    aiDocsPath
  );

  // Note: Market price integration requires market API access
  // For now, return enhanced structure with placeholders
  return {
    ...baseResult,
    market_prices: compare_markets ? [] : undefined,
    trading_opportunities: compare_markets ? [] : undefined,
    arbitrage_opportunities: compare_markets ? [] : undefined,
    note: 'Market price integration requires market API access. Enhanced features will be available when market API is configured.',
  };
}

