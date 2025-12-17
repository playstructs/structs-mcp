/**
 * Workflow Tool Handlers
 * 
 * @module tools/handlers/workflow-handlers
 */

import { executeWorkflow, monitorWorkflow, getWorkflowSteps } from '../workflow.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const workflowHandlers = new Map([
  ['structs_workflow_execute', createHandler(
    (args) => executeWorkflow(
      {
        workflow_type: args?.workflow_type as string,
        player_id: args?.player_id as string,
        parameters: args?.parameters as Record<string, unknown>,
      },
      aiDocsPath
    )
  )],
  ['structs_workflow_monitor', createHandler(
    (args) => monitorWorkflow(args?.workflow_id as string)
  )],
  ['structs_workflow_get_steps', createHandler(
    (args) => getWorkflowSteps(args?.workflow_type as string)
  )],
]);
