/**
 * Tool Definitions Registry
 * 
 * Central registry for all tool definitions with caching.
 * 
 * @module tools/definitions
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validationTools } from './validation-tools.js';
import { queryTools } from './query-tools.js';
import { actionTools } from './action-tools.js';
import { calculationTools } from './calculation-tools.js';
import { workflowTools } from './workflow-tools.js';
import { gameplayTools } from './gameplay-tools.js';
import { commandTools } from './command-tools.js';
import { dashboardTools } from './dashboard-tools.js';
import { preflightTools } from './preflight-tools.js';
import { diagnosisTools } from './diagnosis-tools.js';

// Cache for tool definitions
let cachedToolDefinitions: Tool[] | null = null;

/**
 * Get all tool definitions (cached)
 */
export function getAllToolDefinitions(): Tool[] {
  if (!cachedToolDefinitions) {
    cachedToolDefinitions = [
      ...validationTools,
      ...queryTools,
      ...actionTools,
      ...calculationTools,
      ...workflowTools,
      ...gameplayTools,
      ...commandTools,
      ...dashboardTools,
      ...preflightTools,
      ...diagnosisTools,
    ];
  }
  return cachedToolDefinitions;
}

/**
 * Clear the tool definitions cache (useful for testing)
 */
export function clearToolDefinitionsCache(): void {
  cachedToolDefinitions = null;
}

// Re-export for convenience
export { validationTools, queryTools, actionTools, calculationTools, workflowTools, gameplayTools, commandTools, dashboardTools, preflightTools, diagnosisTools };
