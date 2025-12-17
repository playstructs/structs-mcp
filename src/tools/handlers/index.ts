/**
 * Tool Handler Registry
 * 
 * Central registry for all tool handlers.
 * 
 * @module tools/handlers
 */

import { queryHandlers } from './query-handlers.js';
import { validationHandlers } from './validation-handlers.js';
import { actionHandlers } from './action-handlers.js';
import { calculationHandlers } from './calculation-handlers.js';
import { workflowHandlers } from './workflow-handlers.js';
import { errorLookupHandlers } from './error-lookup-handlers.js';
import { gameplayHandlers } from './gameplay-handlers.js';

// Combine all handlers into a single map
const allHandlers = new Map([
  ...queryHandlers,
  ...validationHandlers,
  ...actionHandlers,
  ...calculationHandlers,
  ...workflowHandlers,
  ...errorLookupHandlers,
  ...gameplayHandlers,
]);

/**
 * Get handler for a tool by name
 */
export function getToolHandler(name: string) {
  // Special case for proof-of-work status (uses dynamic import)
  if (name === 'structs_query_proof_of_work_status') {
    return async (args: any) => {
      const { getProcessManager } = await import('../../utils/process-manager.js');
      const processManager = getProcessManager();
      const jobId = args?.job_id as string;
      
      if (!jobId) {
        throw new Error('job_id is required');
      }

      const jobStatus = await processManager.getJobStatusWithDifficulty(jobId);
      if (!jobStatus) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                job_id: jobId,
                status: 'not_found',
                message: 'Job not found. It may have been cleaned up or never existed.',
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(jobStatus, null, 2),
          },
        ],
      };
    };
  }

  return allHandlers.get(name) || null;
}

// Re-export for convenience
export {
  queryHandlers,
  validationHandlers,
  actionHandlers,
  calculationHandlers,
  workflowHandlers,
  errorLookupHandlers,
  gameplayHandlers,
};
