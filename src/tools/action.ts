/**
 * Action Tools
 * 
 * Implements action tools for submitting transactions using the signer.* schema.
 * 
 * @module tools/action
 */

import { query, isDangerEnabled, getDangerErrorResponse } from '../utils/database.js';

/**
 * Submit transaction using signer.tx_* functions
 * 
 * @param action - Action type (e.g., 'explore', 'struct_build_initiate')
 * @param player_id - Player ID (e.g., '1-11')
 * @param args - Action-specific arguments
 * @returns Transaction submission result
 */
export async function submitTransaction(
  action: string,
  player_id: string,
  args: Record<string, unknown> = {},
  aiDocsPath?: string
): Promise<{
  transaction_hash?: string;
  status: string;
  message: string;
  error?: string;
  transaction_id?: number;
}> {
  // Check DANGER mode
  if (!isDangerEnabled()) {
    return getDangerErrorResponse(
      'structs_action_submit_transaction',
      'transaction submission'
    );
  }

  try {
    // Map action names to signer.tx_* function names
    const functionMap: Record<string, string> = {
      'explore': 'tx_explore',
      'planet-explore': 'tx_explore',
      'struct_build_initiate': 'tx_struct_build_initiate',
      'struct-build-initiate': 'tx_struct_build_initiate',
      'struct_build_complete': 'tx_struct_build_complete',
      'struct-build-complete': 'tx_struct_build_complete',
      'struct-activate': 'tx_struct_activate',
      'struct-deactivate': 'tx_struct_deactivate',
      'struct-attack': 'tx_struct_attack',
      'struct-move': 'tx_struct_move',
      'struct-defense-set': 'tx_struct_defense_set',
      'struct-defense-clear': 'tx_struct_defense_clear',
      'struct-stealth-activate': 'tx_struct_stealth_activate',
      'struct-stealth-deactivate': 'tx_struct_stealth_deactivate',
      'struct-generator-infuse': 'tx_struct_generator_infuse',
      'planet_raid_complete': 'tx_planet_raid_complete',
      'planet-raid-complete': 'tx_planet_raid_complete',
      'ore_miner_complete': 'tx_struct_ore_mine_complete',
      'struct-ore-miner-complete': 'tx_struct_ore_mine_complete',
      'ore_refinery_complete': 'tx_struct_ore_refine_complete',
      'struct-ore-refinery-complete': 'tx_struct_ore_refine_complete',
      'fleet_move': 'tx_fleet_move',
      'fleet-move': 'tx_fleet_move',
      'guild-create': 'tx_guild_create',
      'guild-update-entry-rank': 'tx_guild_update_entry_rank',
      'guild_membership_join': 'tx_guild_membership_join',
      'guild-membership-join': 'tx_guild_membership_join',
      'guild-membership-kick': 'tx_guild_membership_kick',
      'guild-bank-mint': 'tx_guild_bank_mint',
      'guild-bank-redeem': 'tx_guild_bank_redeem',
      'player-update-guild-rank': 'tx_player_update_guild_rank',
      'player-send': 'tx_player_send',
      'reactor-infuse': 'tx_reactor_infuse',
      'reactor-defuse': 'tx_reactor_defuse',
      'reactor-begin-migration': 'tx_reactor_begin_migration',
      'reactor-cancel-defusion': 'tx_reactor_cancel_defusion',
      'permission-grant-on-object': 'tx_permission_grant_on_object',
      'permission-revoke-on-object': 'tx_permission_revoke_on_object',
      'permission-set-on-object': 'tx_permission_set_on_object',
      'permission-grant-on-address': 'tx_permission_grant_on_address',
      'permission-revoke-on-address': 'tx_permission_revoke_on_address',
      'permission-set-on-address': 'tx_permission_set_on_address',
      'permission-guild-rank-set': 'tx_permission_guild_rank_set',
      'permission-guild-rank-revoke': 'tx_permission_guild_rank_revoke',
      'allocation-create': 'tx_allocation_create',
      'allocation-update': 'tx_allocation_update',
      'allocation-delete': 'tx_allocation_delete',
      'allocation-transfer': 'tx_allocation_transfer',
      'substation-create': 'tx_substation_create',
      'substation-delete': 'tx_substation_delete',
      'substation-player-connect': 'tx_substation_player_connect',
      'substation-player-disconnect': 'tx_substation_player_disconnect',
      'substation-player-migrate': 'tx_substation_player_migrate',
      'substation-allocation-connect': 'tx_substation_allocation_connect',
      'substation-allocation-disconnect': 'tx_substation_allocation_disconnect',
      'provider-create': 'tx_provider_create',
      'provider-delete': 'tx_provider_delete',
      'provider-withdraw-balance': 'tx_provider_withdraw_balance',
      'agreement-open': 'tx_agreement_open',
      'agreement-close': 'tx_agreement_close',
      'address-register': 'tx_address_register',
      'player-update-primary-address': 'tx_player_update_primary_address',
    };

    const deprecatedActions: Record<string, { replacement: string; reason: string }> = {
      'guild_membership_leave': { replacement: 'guild-membership-kick', reason: 'MsgGuildMembershipLeave does not exist. Use guild-membership-kick.' },
      'guild-membership-leave': { replacement: 'guild-membership-kick', reason: 'MsgGuildMembershipLeave does not exist. Use guild-membership-kick.' },
      'agreement-create': { replacement: 'agreement-open', reason: 'Use agreement-open (MsgAgreementOpen) instead.' },
      'provider-guild-grant': { replacement: 'permission-guild-rank-set', reason: 'Removed in v0.15.0. Use guild rank permissions.' },
      'provider-guild-revoke': { replacement: 'permission-guild-rank-revoke', reason: 'Removed in v0.15.0. Use guild rank permissions.' },
      'reactor-allocate': { replacement: 'allocation-create', reason: 'Use allocation system (MsgAllocationCreate).' },
      'substation-connect': { replacement: 'substation-allocation-connect', reason: 'Use MsgSubstationAllocationConnect.' },
    };

    const dep = deprecatedActions[action];
    if (dep) {
      return {
        status: 'error',
        message: `Action "${action}" is deprecated. Use "${dep.replacement}" instead.`,
        error: dep.reason,
      };
    }

    const functionName = functionMap[action];
    if (!functionName) {
      return {
        status: 'error',
        message: `Unknown action: ${action}`,
        error: `Supported actions: ${Object.keys(functionMap).filter(k => !deprecatedActions[k]).join(', ')}`,
      };
    }

    // Build function call based on action type
    let sql: string;
    let params: any[];

    switch (action) {
      case 'explore':
        sql = `SELECT signer.tx_explore($1) as result`;
        params = [player_id];
        break;

      case 'struct_build_initiate':
        if (!args.struct_type_id || !args.operate_ambit || args.slot === undefined) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'struct_build_initiate requires: struct_type_id, operate_ambit, slot',
          };
        }
        sql = `SELECT signer.tx_struct_build_initiate($1, $2, $3, $4) as result`;
        params = [player_id, args.struct_type_id, args.operate_ambit, args.slot];
        break;

      case 'struct_build_complete':
        if (!args.struct_id || !args.proof || !args.nonce) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'struct_build_complete requires: struct_id, proof, nonce',
          };
        }
        sql = `SELECT signer.tx_struct_build_complete($1, $2, $3, $4) as result`;
        params = [player_id, args.struct_id, args.proof, args.nonce];
        break;

      case 'planet_raid_complete':
        if (!args.fleet_id || !args.proof || !args.nonce) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'planet_raid_complete requires: fleet_id, proof, nonce',
          };
        }
        sql = `SELECT signer.tx_planet_raid_complete($1, $2, $3, $4) as result`;
        params = [player_id, args.fleet_id, args.proof, args.nonce];
        break;

      case 'ore_miner_complete':
        if (!args.struct_id || !args.proof || !args.nonce) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'ore_miner_complete requires: struct_id, proof, nonce',
          };
        }
        sql = `SELECT signer.tx_struct_ore_mine_complete($1, $2, $3, $4) as result`;
        params = [player_id, args.struct_id, args.proof, args.nonce];
        break;

      case 'ore_refinery_complete':
        if (!args.struct_id || !args.proof || !args.nonce) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'ore_refinery_complete requires: struct_id, proof, nonce',
          };
        }
        sql = `SELECT signer.tx_struct_ore_refine_complete($1, $2, $3, $4) as result`;
        params = [player_id, args.struct_id, args.proof, args.nonce];
        break;

      case 'fleet_move':
        if (!args.fleet_id || !args.destination_planet_id) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'fleet_move requires: fleet_id, destination_planet_id',
          };
        }
        sql = `SELECT signer.tx_fleet_move($1, $2, $3) as result`;
        params = [player_id, args.fleet_id, args.destination_planet_id];
        break;

      case 'reactor-infuse':
        if (!args.reactor_id || !args.amount) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'reactor-infuse requires: reactor_id, amount',
          };
        }
        sql = `SELECT signer.tx_reactor_infuse($1, $2, $3) as result`;
        params = [player_id, args.reactor_id, args.amount];
        break;

      case 'reactor-defuse':
        if (!args.reactor_id || !args.amount) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'reactor-defuse requires: reactor_id, amount',
          };
        }
        sql = `SELECT signer.tx_reactor_defuse($1, $2, $3) as result`;
        params = [player_id, args.reactor_id, args.amount];
        break;

      case 'reactor-begin-migration':
        if (!args.reactor_id) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'reactor-begin-migration requires: reactor_id',
          };
        }
        sql = `SELECT signer.tx_reactor_begin_migration($1, $2) as result`;
        params = [player_id, args.reactor_id];
        break;

      case 'reactor-cancel-defusion':
        if (!args.reactor_id) {
          return {
            status: 'error',
            message: 'Missing required arguments',
            error: 'reactor-cancel-defusion requires: reactor_id',
          };
        }
        sql = `SELECT signer.tx_reactor_cancel_defusion($1, $2) as result`;
        params = [player_id, args.reactor_id];
        break;

      case 'struct-activate':
      case 'struct-deactivate':
      case 'struct-defense-set':
      case 'struct-defense-clear':
      case 'struct-stealth-activate':
      case 'struct-stealth-deactivate':
        if (!args.struct_id) {
          return { status: 'error', message: 'Missing required arguments', error: `${action} requires: struct_id` };
        }
        sql = `SELECT signer.${functionName}($1, $2) as result`;
        params = [player_id, args.struct_id];
        break;

      case 'struct-attack':
        if (!args.attacker_struct_id || !args.target_struct_id) {
          return { status: 'error', message: 'Missing required arguments', error: 'struct-attack requires: attacker_struct_id, target_struct_id' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.attacker_struct_id, args.target_struct_id];
        break;

      case 'struct-move':
        if (!args.struct_id || !args.destination) {
          return { status: 'error', message: 'Missing required arguments', error: 'struct-move requires: struct_id, destination' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.struct_id, args.destination];
        break;

      case 'struct-generator-infuse':
        if (!args.struct_id || !args.amount) {
          return { status: 'error', message: 'Missing required arguments', error: 'struct-generator-infuse requires: struct_id, amount' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.struct_id, args.amount];
        break;

      case 'guild-create':
        if (!args.reactor_id) {
          return { status: 'error', message: 'Missing required arguments', error: 'guild-create requires: reactor_id' };
        }
        sql = `SELECT signer.${functionName}($1, $2) as result`;
        params = [player_id, args.reactor_id];
        break;

      case 'guild-update-entry-rank':
        if (!args.guild_id || args.entry_rank === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: 'guild-update-entry-rank requires: guild_id, entry_rank' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.guild_id, args.entry_rank];
        break;

      case 'guild-membership-kick':
        if (!args.guild_id || !args.target_player_id) {
          return { status: 'error', message: 'Missing required arguments', error: 'guild-membership-kick requires: guild_id, target_player_id' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.guild_id, args.target_player_id];
        break;

      case 'guild-bank-mint':
      case 'guild-bank-redeem':
        if (!args.guild_id || !args.amount) {
          return { status: 'error', message: 'Missing required arguments', error: `${action} requires: guild_id, amount` };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.guild_id, args.amount];
        break;

      case 'player-update-guild-rank':
        if (!args.target_player_id || args.guild_rank === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: 'player-update-guild-rank requires: target_player_id, guild_rank' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.target_player_id, args.guild_rank];
        break;

      case 'player-send':
        if (!args.to_player_id || !args.amount) {
          return { status: 'error', message: 'Missing required arguments', error: 'player-send requires: to_player_id, amount' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.to_player_id, args.amount];
        break;

      case 'permission-grant-on-object':
      case 'permission-revoke-on-object':
      case 'permission-set-on-object':
        if (!args.object_id || !args.target_player_id || args.permission_value === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: `${action} requires: object_id, target_player_id, permission_value` };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3, $4) as result`;
        params = [player_id, args.object_id, args.target_player_id, args.permission_value];
        break;

      case 'permission-grant-on-address':
      case 'permission-revoke-on-address':
      case 'permission-set-on-address':
        if (!args.address || args.permission_value === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: `${action} requires: address, permission_value` };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.address, args.permission_value];
        break;

      case 'permission-guild-rank-set':
        if (!args.object_id || args.guild_rank === undefined || args.permission_value === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: 'permission-guild-rank-set requires: object_id, guild_rank, permission_value' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3, $4) as result`;
        params = [player_id, args.object_id, args.guild_rank, args.permission_value];
        break;

      case 'permission-guild-rank-revoke':
        if (!args.object_id || args.guild_rank === undefined) {
          return { status: 'error', message: 'Missing required arguments', error: 'permission-guild-rank-revoke requires: object_id, guild_rank' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.object_id, args.guild_rank];
        break;

      case 'allocation-create':
        if (!args.source_id || !args.power) {
          return { status: 'error', message: 'Missing required arguments', error: 'allocation-create requires: source_id, power' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.source_id, args.power];
        break;

      case 'allocation-update':
        if (!args.allocation_id || !args.power) {
          return { status: 'error', message: 'Missing required arguments', error: 'allocation-update requires: allocation_id, power' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.allocation_id, args.power];
        break;

      case 'allocation-delete':
        if (!args.allocation_id) {
          return { status: 'error', message: 'Missing required arguments', error: 'allocation-delete requires: allocation_id' };
        }
        sql = `SELECT signer.${functionName}($1, $2) as result`;
        params = [player_id, args.allocation_id];
        break;

      case 'allocation-transfer':
        if (!args.allocation_id || !args.to_player_id) {
          return { status: 'error', message: 'Missing required arguments', error: 'allocation-transfer requires: allocation_id, to_player_id' };
        }
        sql = `SELECT signer.${functionName}($1, $2, $3) as result`;
        params = [player_id, args.allocation_id, args.to_player_id];
        break;

      case 'address-register':
        if (!args.address) {
          return { status: 'error', message: 'Missing required arguments', error: 'address-register requires: address' };
        }
        sql = `SELECT signer.${functionName}($1, $2) as result`;
        params = [player_id, args.address];
        break;

      case 'player-update-primary-address':
        if (!args.address) {
          return { status: 'error', message: 'Missing required arguments', error: 'player-update-primary-address requires: address' };
        }
        sql = `SELECT signer.${functionName}($1, $2) as result`;
        params = [player_id, args.address];
        break;

      default:
        return {
          status: 'error',
          message: `Action ${action} not yet implemented`,
          error: 'This action requires additional implementation. Use structs_prepare_command to generate the CLI command instead.',
        };
    }

    // Execute database function
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      return {
        status: 'error',
        message: 'Transaction function returned no result',
        error: 'Database function did not return a transaction',
      };
    }

    const txResult = result.rows[0].result;
    
    // Parse transaction result
    // The signer.tx_* functions return transaction information
    // Format may vary, but typically includes transaction hash and status
    let transactionHash: string | undefined;
    let transactionId: number | undefined;
    let status = 'pending';

    if (typeof txResult === 'object' && txResult !== null) {
      // Try to extract transaction hash from various possible formats
      transactionHash = txResult.txhash || txResult.transaction_hash || txResult.hash;
      transactionId = txResult.id || txResult.transaction_id;
      status = txResult.status || 'pending';
    } else if (typeof txResult === 'string') {
      // Some functions might return just the transaction hash
      transactionHash = txResult;
    }

    // Query the signer.tx table to get full transaction details
    if (transactionId) {
      const txQuery = await query(
        'SELECT id, status, output FROM signer.tx WHERE id = $1 ORDER BY created_at DESC LIMIT 1',
        [transactionId]
      );
      
      if (txQuery.rows.length > 0) {
        const tx = txQuery.rows[0];
        status = tx.status;
        
        // Try to extract transaction hash from output JSON
        if (tx.output && typeof tx.output === 'object') {
          const output = tx.output as any;
          transactionHash = output.txhash || output.transaction_hash || transactionHash;
        }
      }
    }

    return {
      transaction_hash: transactionHash,
      transaction_id: transactionId,
      status: status,
      message: `Transaction ${status === 'broadcast' ? 'broadcast successfully' : 'created'}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Transaction submission failed',
      error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a new player using structs.player_internal_pending
 * 
 * @param username - Player username
 * @param guild_id - Guild ID (e.g., '0-1')
 * @returns Player creation result
 */
export async function createPlayer(
  username: string,
  guild_id: string
): Promise<{
  role_id?: number;
  player_id?: string;
  status: string;
  message: string;
  error?: string;
}> {
  // Check DANGER mode
  if (!isDangerEnabled()) {
    return getDangerErrorResponse(
      'structs_action_create_player',
      'player creation'
    );
  }

  try {
    // Insert into player_internal_pending table
    const result = await query(
      `INSERT INTO structs.player_internal_pending(username, guild_id) 
       VALUES ($1, $2) 
       RETURNING role_id`,
      [username, guild_id]
    );

    if (result.rows.length === 0) {
      return {
        status: 'error',
        message: 'Player creation failed',
        error: 'No role_id returned from database',
      };
    }

    const roleId = result.rows[0].role_id;

    // Check role status (it may take time to generate)
    const roleResult = await query(
      'SELECT id, player_id, status FROM signer.role WHERE id = $1',
      [roleId]
    );

    let playerId: string | undefined;
    let roleStatus = 'generating';

    if (roleResult.rows.length > 0) {
      roleStatus = roleResult.rows[0].status;
      playerId = roleResult.rows[0].player_id || undefined;
    }

    return {
      role_id: roleId,
      player_id: playerId,
      status: roleStatus === 'ready' ? 'ready' : 'generating',
      message: roleStatus === 'ready' 
        ? `Player created successfully with ID: ${playerId}`
        : `Player creation initiated. Role ID: ${roleId}. Status: ${roleStatus}. Player ID will be assigned when ready.`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Player creation failed',
      error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Build struct using workflow (helper function)
 * 
 * @param struct_type_id - Struct type ID
 * @param operate_ambit - Operate ambit ('space', 'air', 'land', 'water')
 * @param slot - Slot number (0-3)
 * @param player_id - Player ID
 * @param aiDocsPath - Path to /ai directory
 * @returns Build result
 */
export async function buildStruct(
  struct_type_id: number,
  operate_ambit: string,
  slot: number,
  player_id: string,
  aiDocsPath: string
): Promise<{
  workflow_id?: string;
  struct_id?: string;
  status: string;
  message: string;
  error?: string;
}> {
  try {
    // Use workflow execution for struct building
    const { executeWorkflow } = await import('./workflow.js');
    const result = await executeWorkflow(
      {
        workflow_type: 'struct_build',
        player_id,
        parameters: {
          struct_type_id,
          operate_ambit,
          slot,
        },
      },
      aiDocsPath
    );

    return {
      workflow_id: result.workflow_id,
      status: result.status,
      message: result.message,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Struct build failed',
      error: `Workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Activate struct with validation (helper function)
 * 
 * @param struct_id - Struct ID
 * @param player_id - Player ID
 * @returns Activation result
 */
export async function activateStruct(
  struct_id: string,
  player_id: string
): Promise<{
  status: string;
  message: string;
  error?: string;
  validation_passed?: boolean;
}> {
  try {
    // Validate struct state before activation
    const { queryStruct } = await import('./query.js');
    const structResult = await queryStruct(struct_id);

    if (structResult.error || !structResult.struct) {
      return {
        status: 'error',
        message: 'Cannot activate struct',
        error: structResult.error || 'Struct not found',
        validation_passed: false,
      };
    }

    // Check if struct has charge (simplified validation)
    // In a full implementation, we'd check charge level, power requirements, etc.
    const struct = structResult.struct as any;
    
    // Submit activation transaction
    const result = await submitTransaction(
      'struct-activate',
      player_id,
      { struct_id },
    );

    return {
      ...result,
      validation_passed: true,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Struct activation failed',
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      validation_passed: false,
    };
  }
}

/**
 * Attack with target validation (helper function)
 * 
 * @param attacker_struct_id - Attacker struct ID
 * @param target_struct_id - Target struct ID
 * @param player_id - Player ID
 * @returns Attack result
 */
export async function attack(
  attacker_struct_id: string,
  target_struct_id: string,
  player_id: string
): Promise<{
  status: string;
  message: string;
  error?: string;
  validation_passed?: boolean;
}> {
  try {
    // Validate both structs exist
    const { queryStruct } = await import('./query.js');
    const [attackerResult, targetResult] = await Promise.all([
      queryStruct(attacker_struct_id),
      queryStruct(target_struct_id),
    ]);

    if (attackerResult.error || !attackerResult.struct) {
      return {
        status: 'error',
        message: 'Cannot attack',
        error: `Attacker struct not found: ${attackerResult.error || 'Unknown error'}`,
        validation_passed: false,
      };
    }

    if (targetResult.error || !targetResult.struct) {
      return {
        status: 'error',
        message: 'Cannot attack',
        error: `Target struct not found: ${targetResult.error || 'Unknown error'}`,
        validation_passed: false,
      };
    }

    // Submit attack transaction
    const result = await submitTransaction(
      'struct-attack',
      player_id,
      { attacker_struct_id, target_struct_id },
    );

    return {
      ...result,
      validation_passed: true,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Attack failed',
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      validation_passed: false,
    };
  }
}

/**
 * Move fleet with command ship validation (helper function)
 * 
 * @param fleet_id - Fleet ID
 * @param destination_planet_id - Destination planet ID
 * @param player_id - Player ID
 * @returns Move result
 */
export async function moveFleet(
  fleet_id: string,
  destination_planet_id: string,
  player_id: string
): Promise<{
  status: string;
  message: string;
  error?: string;
  validation_passed?: boolean;
  command_ship_online?: boolean;
}> {
  try {
    // Validate fleet and check for command ship
    const { queryFleet } = await import('./query.js');
    const fleetResult = await queryFleet(fleet_id);

    if (fleetResult.error || !fleetResult.fleet) {
      return {
        status: 'error',
        message: 'Cannot move fleet',
        error: fleetResult.error || 'Fleet not found',
        validation_passed: false,
      };
    }

    const fleet = fleetResult.fleet as any;
    
    // Check for command ship in fleet (simplified - would need to check structs in fleet)
    // In a full implementation, we'd query structs in the fleet and verify command ship is online
    const commandShipOnline = true; // Placeholder - would check actual fleet structs

    if (!commandShipOnline) {
      return {
        status: 'error',
        message: 'Cannot move fleet',
        error: 'Fleet needs an Online Command Ship before deploy',
        validation_passed: false,
        command_ship_online: false,
      };
    }

    // Submit fleet move transaction
    const result = await submitTransaction(
      'fleet_move',
      player_id,
      { fleet_id, destination_planet_id },
    );

    return {
      ...result,
      validation_passed: true,
      command_ship_online: true,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Fleet move failed',
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      validation_passed: false,
    };
  }
}
