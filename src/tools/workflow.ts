/**
 * Workflow Tools
 * 
 * Implements workflow execution tools for multi-step gameplay operations.
 * 
 * @module tools/workflow
 */

import { submitTransaction } from './action.js';
import { queryStruct, queryFleet } from './query.js';
import { calculateProofOfWork } from './calculation.js';

/**
 * Workflow step status
 */
export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  step_id: string;
  name: string;
  action_type: string;
  status: WorkflowStepStatus;
  result?: unknown;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  workflow_type: string;
  steps: Array<{
    step_id: string;
    name: string;
    action_type: string;
    parameters: Record<string, unknown>;
    wait_for?: {
      entity_id: string;
      check_interval?: number; // seconds
      timeout?: number; // seconds
    };
  }>;
  estimated_time?: number; // blocks or seconds
}

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  workflow_id: string;
  workflow_type: string;
  player_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  steps: WorkflowStep[];
  started_at: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
}

/**
 * Predefined workflow definitions
 */
const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  struct_build: {
    workflow_type: 'struct_build',
    steps: [
      {
        step_id: 'initiate',
        name: 'Initiate struct build',
        action_type: 'struct_build_initiate',
        parameters: {},
      },
      {
        step_id: 'wait',
        name: 'Wait for struct to be created',
        action_type: 'wait',
        parameters: {},
        wait_for: {
          entity_id: '', // Will be extracted from initiate step result
          check_interval: 5,
          timeout: 300,
        },
      },
      {
        step_id: 'proof_of_work',
        name: 'Calculate proof-of-work',
        action_type: 'proof_of_work',
        parameters: {},
      },
      {
        step_id: 'complete',
        name: 'Complete struct build',
        action_type: 'struct_build_complete',
        parameters: {},
      },
    ],
    estimated_time: 100, // blocks
  },
  ore_mining: {
    workflow_type: 'ore_mining',
    steps: [
      {
        step_id: 'build',
        name: 'Build ore miner struct',
        action_type: 'struct_build',
        parameters: {},
      },
      {
        step_id: 'activate',
        name: 'Activate ore miner',
        action_type: 'struct_activate',
        parameters: {},
      },
      {
        step_id: 'wait',
        name: 'Wait for mining cycle',
        action_type: 'wait',
        parameters: {},
        wait_for: {
          entity_id: '', // Will be set from struct_id parameter
          check_interval: 10,
          timeout: 600,
        },
      },
      {
        step_id: 'proof_of_work',
        name: 'Calculate proof-of-work',
        action_type: 'proof_of_work',
        parameters: {},
      },
      {
        step_id: 'complete',
        name: 'Complete mining',
        action_type: 'ore_miner_complete',
        parameters: {},
      },
    ],
    estimated_time: 200, // blocks
  },
  ore_refining: {
    workflow_type: 'ore_refining',
    steps: [
      {
        step_id: 'build',
        name: 'Build ore refinery struct',
        action_type: 'struct_build',
        parameters: {},
      },
      {
        step_id: 'activate',
        name: 'Activate ore refinery',
        action_type: 'struct_activate',
        parameters: {},
      },
      {
        step_id: 'wait',
        name: 'Wait for refining cycle',
        action_type: 'wait',
        parameters: {},
        wait_for: {
          entity_id: '', // Will be set from struct_id parameter
          check_interval: 10,
          timeout: 600,
        },
      },
      {
        step_id: 'proof_of_work',
        name: 'Calculate proof-of-work',
        action_type: 'proof_of_work',
        parameters: {},
      },
      {
        step_id: 'complete',
        name: 'Complete refining',
        action_type: 'ore_refinery_complete',
        parameters: {},
      },
    ],
    estimated_time: 200, // blocks
  },
  planet_raid: {
    workflow_type: 'planet_raid',
    steps: [
      {
        step_id: 'move',
        name: 'Move fleet to planet',
        action_type: 'fleet_move',
        parameters: {},
      },
      {
        step_id: 'wait',
        name: 'Wait for raid to complete',
        action_type: 'wait',
        parameters: {},
        wait_for: {
          entity_id: '', // Will be set from fleet_id parameter
          check_interval: 10,
          timeout: 600,
        },
      },
      {
        step_id: 'proof_of_work',
        name: 'Calculate proof-of-work',
        action_type: 'proof_of_work',
        parameters: {},
      },
      {
        step_id: 'complete',
        name: 'Complete raid',
        action_type: 'planet_raid_complete',
        parameters: {},
      },
    ],
    estimated_time: 150, // blocks
  },
};

/**
 * Execute a workflow
 * 
 * @param args - Workflow execution arguments
 * @param aiDocsPath - Path to /ai directory
 * @returns Workflow execution result
 */
export async function executeWorkflow(
  args: {
    workflow_type: string;
    player_id: string;
    parameters: Record<string, unknown>;
  },
  aiDocsPath: string
): Promise<{
  workflow_id: string;
  status: 'queued';
  message: string;
  workflow_type: string;
  estimated_time?: number;
}> {
  const { workflow_type, player_id, parameters } = args;

  // Get workflow definition
  const workflowDef = WORKFLOW_DEFINITIONS[workflow_type];
  if (!workflowDef) {
    throw new Error(
      `Unknown workflow type: ${workflow_type}. Valid types: ${Object.keys(WORKFLOW_DEFINITIONS).join(', ')}`
    );
  }

  // Generate workflow ID
  const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create workflow execution state
  const execution: WorkflowExecution = {
    workflow_id: workflowId,
    workflow_type,
    player_id,
    status: 'queued',
    steps: workflowDef.steps.map((step) => ({
      step_id: step.step_id,
      name: step.name,
      action_type: step.action_type,
      status: 'pending',
    })),
    started_at: new Date().toISOString(),
  };

  // Store workflow execution in memory
  workflowStorage.set(workflowId, execution);
  
  // Start workflow execution in background
  // Note: This is a simplified implementation - a full implementation would
  // execute steps sequentially with proper state checking and waiting
  processWorkflow(execution, parameters, aiDocsPath).catch((error) => {
    console.error(`Workflow ${workflowId} failed:`, error);
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : 'Unknown error';
  });

  return {
    workflow_id: workflowId,
    status: 'queued',
    message: `Workflow ${workflow_type} queued for execution`,
    workflow_type,
    estimated_time: workflowDef.estimated_time,
  };
}

/**
 * Process workflow steps (background execution)
 */
async function processWorkflow(
  execution: WorkflowExecution,
  parameters: Record<string, unknown>,
  aiDocsPath: string
): Promise<void> {
  execution.status = 'running';

  const workflowDef = WORKFLOW_DEFINITIONS[execution.workflow_type];
  if (!workflowDef) {
    execution.status = 'failed';
    execution.error = 'Workflow definition not found';
    return;
  }

  try {
    for (const stepDef of workflowDef.steps) {
      execution.current_step = stepDef.step_id;
      const step = execution.steps.find((s) => s.step_id === stepDef.step_id);
      if (!step) continue;

      step.status = 'in_progress';
      step.started_at = new Date().toISOString();

      try {
        // Execute step based on action type
        if (stepDef.action_type === 'wait') {
          // Wait step - poll entity state
          if (stepDef.wait_for) {
            // Get entity ID from previous step result or parameters
            let entityId: string | undefined = stepDef.wait_for.entity_id;
            if (!entityId) {
              // For struct_build workflow, extract struct_id from initiate step result
              if (execution.workflow_type === 'struct_build') {
                const initiateStep = execution.steps.find(s => s.step_id === 'initiate');
                if (initiateStep?.result) {
                  const result = initiateStep.result as any;
                  // Try to extract struct_id from result
                  entityId = result.struct_id || result.structId || result.id;
                  // If not in result, query for the struct by checking player's structs
                  if (!entityId) {
                    entityId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
                  }
                } else {
                  // Initiate step hasn't completed yet, try to find struct
                  entityId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
                }
              } else {
                entityId = (parameters.entity_id as string) || (parameters.struct_id as string) || (parameters.fleet_id as string);
              }
            }
            if (!entityId) {
              throw new Error('Entity ID not found for wait step');
            }
            await waitForEntityState(
              entityId,
              stepDef.wait_for.check_interval || 5,
              stepDef.wait_for.timeout || 300,
              step
            );
          }
        } else if (stepDef.action_type === 'proof_of_work') {
          // Proof-of-work step - start background calculation
          let entityId: string | undefined;
          
          // For struct_build workflow, extract struct_id from initiate step result
          if (execution.workflow_type === 'struct_build') {
            const initiateStep = execution.steps.find(s => s.step_id === 'initiate');
            if (initiateStep?.result) {
              const result = initiateStep.result as any;
              entityId = result.struct_id || result.structId || result.id;
              // If not in result, query for the struct
              if (!entityId) {
                entityId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
              }
            } else {
              // Initiate step hasn't completed yet, try to find struct
              entityId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
            }
          } else {
            entityId = (parameters.entity_id as string) || (parameters.struct_id as string) || (parameters.fleet_id as string);
          }
          
          if (!entityId) {
            throw new Error('Entity ID required for proof-of-work step');
          }

          const actionType = execution.workflow_type === 'planet_raid' 
            ? 'planet_raid_complete'
            : execution.workflow_type === 'ore_mining'
            ? 'ore_miner_complete'
            : execution.workflow_type === 'ore_refining'
            ? 'ore_refinery_complete'
            : 'struct_build_complete';

          const powResult = await calculateProofOfWork(
            {
              action_type: actionType,
              entity_id: entityId,
              player_id: execution.player_id,
            },
            aiDocsPath
          );

          step.result = powResult;
          // Store struct_id in step result for use in complete step
          if (execution.workflow_type === 'struct_build') {
            (step.result as any).struct_id = entityId;
          }
        } else if (stepDef.action_type === 'struct_build') {
          // Nested struct build workflow
          const buildResult = await executeWorkflow(
            {
              workflow_type: 'struct_build',
              player_id: execution.player_id,
              parameters: { ...parameters, ...stepDef.parameters },
            },
            aiDocsPath
          );
          step.result = buildResult;
        } else if (stepDef.action_type === 'struct_build_complete') {
          // Complete step - needs struct_id and proof-of-work result
          let structId: string | undefined;
          let proof: string | undefined;
          let nonce: number | undefined;
          
          // Get struct_id from previous steps
          if (execution.workflow_type === 'struct_build') {
            const initiateStep = execution.steps.find(s => s.step_id === 'initiate');
            if (initiateStep?.result) {
              const result = initiateStep.result as any;
              structId = result.struct_id || result.structId || result.id;
            }
            // If not found, try to find it
            if (!structId) {
              const foundStructId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
              if (foundStructId) {
                structId = foundStructId;
              }
            }
            
            // Get proof-of-work result from previous step
            const powStep = execution.steps.find(s => s.step_id === 'proof_of_work');
            if (powStep?.result) {
              const powResult = powStep.result as any;
              proof = powResult.proof || powResult.hash;
              nonce = powResult.nonce;
            }
          } else {
            structId = (parameters.struct_id as string);
            proof = (parameters.proof as string);
            nonce = (parameters.nonce as number);
          }
          
          if (!structId || !proof || nonce === undefined) {
            throw new Error('struct_build_complete requires struct_id, proof, and nonce from previous steps');
          }
          
          const completeResult = await submitTransaction(
            'struct_build_complete',
            execution.player_id,
            { struct_id: structId, proof, nonce },
            aiDocsPath
          );
          step.result = completeResult;
        } else {
          // Regular action step - submit transaction
          const actionResult = await submitTransaction(
            stepDef.action_type,
            execution.player_id,
            { ...parameters, ...stepDef.parameters },
            aiDocsPath
          );
          step.result = actionResult;
          
          // For struct_build_initiate, extract struct_id from result and store it
          if (stepDef.action_type === 'struct_build_initiate' && actionResult.status === 'broadcast') {
            // The struct_id might be in the result, or we need to query for it
            const structId = (actionResult as any).struct_id || (actionResult as any).structId;
            if (structId) {
              (step.result as any).struct_id = structId;
            } else {
              // Query for the newly created struct
              const newStructId = await findNewStructId(execution.player_id, parameters, aiDocsPath);
              if (newStructId) {
                (step.result as any).struct_id = newStructId;
              }
            }
          }
        }

        step.status = 'completed';
        step.completed_at = new Date().toISOString();
      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        execution.status = 'failed';
        execution.error = step.error;
        return;
      }
    }

    execution.status = 'completed';
    execution.completed_at = new Date().toISOString();
  } catch (error) {
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Find newly created struct ID by querying player's structs
 * This is used when struct_id is not directly returned from initiate step
 */
async function findNewStructId(
  playerId: string,
  parameters: Record<string, unknown>,
  aiDocsPath: string
): Promise<string | undefined> {
  try {
    // Query player to get their structs
    const { queryPlayer } = await import('./query.js');
    const playerResult = await queryPlayer(playerId);
    
    if (playerResult.error || !playerResult.player) {
      return undefined;
    }
    
    const player = playerResult.player as any;
    
    // The struct should be in the planet's struct slots
    // We need to check the planet that matches the slot and ambit
    const planetId = player.planetId || player.planet_id;
    if (!planetId) {
      return undefined;
    }
    
    const { queryPlanet } = await import('./query.js');
    const planetResult = await queryPlanet(planetId);
    
    if (planetResult.error || !planetResult.planet) {
      return undefined;
    }
    
    const planet = planetResult.planet as any;
    const operateAmbit = parameters.operate_ambit as string;
    const slot = parameters.slot as number;
    
    // Check the appropriate ambit slot
    const ambitMap: Record<string, string> = {
      'space': 'space',
      'air': 'air',
      'land': 'land',
      'water': 'water',
    };
    
    const ambitKey = ambitMap[operateAmbit];
    if (!ambitKey || !planet[ambitKey]) {
      return undefined;
    }
    
    const slots = planet[ambitKey] as string[];
    if (slots && slots[slot]) {
      return slots[slot];
    }
    
    return undefined;
  } catch (error) {
    console.error('Error finding new struct ID:', error);
    return undefined;
  }
}

/**
 * Wait for entity state change
 */
async function waitForEntityState(
  entityId: string,
  checkInterval: number,
  timeout: number,
  step: WorkflowStep
): Promise<void> {
  const startTime = Date.now();
  const timeoutMs = timeout * 1000;
  const intervalMs = checkInterval * 1000;

  while (Date.now() - startTime < timeoutMs) {
    // Check if struct exists by querying it
    try {
      const { queryStruct } = await import('./query.js');
      const structResult = await queryStruct(entityId);
      
      if (!structResult.error && structResult.struct) {
        // Struct exists, we can proceed
        return;
      }
    } catch (error) {
      // Struct doesn't exist yet, continue waiting
    }
    
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Timeout waiting for struct ${entityId} to be created`);
}

/**
 * In-memory workflow storage (simplified - would use persistent storage in production)
 */
const workflowStorage = new Map<string, WorkflowExecution>();

/**
 * Monitor workflow progress
 * 
 * @param workflowId - Workflow ID
 * @returns Workflow status
 */
export async function monitorWorkflow(workflowId: string): Promise<{
  workflow_id: string;
  status: string;
  current_step?: string;
  progress: number;
  steps: Array<{
    step_id: string;
    name: string;
    status: string;
    started_at?: string;
    completed_at?: string;
  }>;
  estimated_completion?: string;
  error?: string;
}> {
  const execution = workflowStorage.get(workflowId);
  
  if (!execution) {
    return {
      workflow_id: workflowId,
      status: 'not_found',
      progress: 0,
      steps: [],
      error: 'Workflow not found. It may have been cleaned up or never existed.',
    };
  }

  const completedSteps = execution.steps.filter((s) => s.status === 'completed').length;
  const progress = execution.steps.length > 0 
    ? Math.round((completedSteps / execution.steps.length) * 100)
    : 0;

  return {
    workflow_id: workflowId,
    status: execution.status,
    current_step: execution.current_step,
    progress,
    steps: execution.steps.map((step) => ({
      step_id: step.step_id,
      name: step.name,
      status: step.status,
      started_at: step.started_at,
      completed_at: step.completed_at,
    })),
    estimated_completion: execution.completed_at,
    error: execution.error,
  };
}

/**
 * Get workflow steps and requirements
 * 
 * @param workflowType - Workflow type
 * @returns Workflow definition with steps
 */
export async function getWorkflowSteps(workflowType: string): Promise<{
  workflow_type: string;
  steps: Array<{
    step_id: string;
    name: string;
    action_type: string;
    description: string;
    estimated_time?: number;
    requirements?: string[];
  }>;
  estimated_time?: number;
  requirements?: string[];
}> {
  const workflowDef = WORKFLOW_DEFINITIONS[workflowType];
  if (!workflowDef) {
    throw new Error(
      `Unknown workflow type: ${workflowType}. Valid types: ${Object.keys(WORKFLOW_DEFINITIONS).join(', ')}`
    );
  }

  return {
    workflow_type: workflowType,
    steps: workflowDef.steps.map((step) => ({
      step_id: step.step_id,
      name: step.name,
      action_type: step.action_type,
      description: `Execute ${step.action_type} action`,
      estimated_time: step.wait_for?.timeout,
      requirements: step.wait_for ? [`Wait for entity ${step.wait_for.entity_id || 'state change'}`] : undefined,
    })),
    estimated_time: workflowDef.estimated_time,
    requirements: [`Player ID`, `Entity ID (struct_id or fleet_id depending on workflow)`],
  };
}

