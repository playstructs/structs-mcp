/**
 * Pre-flight Validation
 *
 * Query-based checks that tell the agent whether an action will succeed
 * before they spend gas. No keys needed -- just reads chain state.
 *
 * @module tools/preflight
 */

import { queryPlayer, queryStruct, queryFleet } from './query.js';
import { validateEntityId } from './validation.js';

interface Blocker {
  type: 'permission' | 'resource' | 'state' | 'target' | 'prerequisite';
  detail: string;
  fix_hint?: string;
}

export interface PreflightResult {
  feasible: boolean;
  action: string;
  blockers: Blocker[];
  warnings: string[];
  checks_performed: string[];
}

async function checkPlayerOnline(playerId: string): Promise<{ online: boolean; blocker?: Blocker; playerData?: Record<string, unknown> }> {
  const result = await queryPlayer(playerId);
  if (result.error || !result.player) {
    return {
      online: false,
      blocker: { type: 'state', detail: `Player ${playerId} not found or query failed: ${result.error}`, fix_hint: 'Verify the player ID is correct.' },
    };
  }
  const p = result.player as Record<string, unknown>;
  const halted = p.halted === true || p.halted === 'true';
  if (halted) {
    return {
      online: false,
      blocker: { type: 'state', detail: `Player ${playerId} is halted (offline).`, fix_hint: 'Check power: if load > capacity, deactivate structs or increase power allocation.' },
      playerData: p,
    };
  }
  return { online: true, playerData: p };
}

async function checkStructExists(structId: string): Promise<{ exists: boolean; structData?: Record<string, unknown>; blocker?: Blocker }> {
  const result = await queryStruct(structId);
  if (result.error || !result.struct) {
    return {
      exists: false,
      blocker: { type: 'target', detail: `Struct ${structId} not found: ${result.error || 'unknown'}`, fix_hint: 'Verify the struct ID is correct.' },
    };
  }
  return { exists: true, structData: result.struct as Record<string, unknown> };
}

async function checkFleetExists(fleetId: string): Promise<{ exists: boolean; fleetData?: Record<string, unknown>; blocker?: Blocker }> {
  const result = await queryFleet(fleetId);
  if (result.error || !result.fleet) {
    return {
      exists: false,
      blocker: { type: 'target', detail: `Fleet ${fleetId} not found: ${result.error || 'unknown'}` },
    };
  }
  return { exists: true, fleetData: result.fleet as Record<string, unknown> };
}

export async function preflightCheck(
  action: string,
  playerId: string,
  params: Record<string, unknown> = {},
): Promise<PreflightResult> {
  const blockers: Blocker[] = [];
  const warnings: string[] = [];
  const checks: string[] = [];

  // Validate player ID format
  const idValidation = validateEntityId(playerId, 'player');
  if (!idValidation.valid) {
    blockers.push({ type: 'prerequisite', detail: `Invalid player ID format: ${idValidation.error}` });
    return { feasible: false, action, blockers, warnings, checks_performed: ['player_id_format'] };
  }
  checks.push('player_id_format');

  // Check player is online (required for virtually all actions)
  const playerCheck = await checkPlayerOnline(playerId);
  checks.push('player_online');
  if (!playerCheck.online && playerCheck.blocker) {
    blockers.push(playerCheck.blocker);
  }

  // Action-specific checks
  switch (action) {
    case 'struct-build-initiate': {
      const structTypeId = params.struct_type_id;
      if (!structTypeId) {
        blockers.push({ type: 'prerequisite', detail: 'struct_type_id is required', fix_hint: 'e.g. 14 for Ore Extractor, 15 for Ore Refinery, 1 for Command Ship' });
      }
      const ambit = params.ambit;
      if (!ambit) {
        blockers.push({ type: 'prerequisite', detail: 'ambit is required', fix_hint: 'One of: space, air, land, water' });
      }
      if (params.slot === undefined) {
        blockers.push({ type: 'prerequisite', detail: 'slot is required (0-3)' });
      }
      warnings.push('Fleet must be on station and Command Ship must be online.');
      warnings.push('Requires sufficient power capacity for the new struct\'s passive draw.');
      checks.push('build_params');
      break;
    }

    case 'struct-activate': {
      const structId = (params.struct_id ?? params.id) as string;
      if (!structId) {
        blockers.push({ type: 'prerequisite', detail: 'struct_id is required' });
      } else {
        const structCheck = await checkStructExists(structId);
        checks.push('struct_exists');
        if (!structCheck.exists && structCheck.blocker) {
          blockers.push(structCheck.blocker);
        }
      }
      warnings.push('Requires ActivateCharge (1) and sufficient power.');
      break;
    }

    case 'struct-deactivate':
    case 'struct-defense-set':
    case 'struct-defense-clear':
    case 'struct-stealth-activate':
    case 'struct-stealth-deactivate': {
      const structId = (params.struct_id ?? params.id) as string;
      if (!structId) {
        blockers.push({ type: 'prerequisite', detail: 'struct_id is required' });
      } else {
        const structCheck = await checkStructExists(structId);
        checks.push('struct_exists');
        if (!structCheck.exists && structCheck.blocker) {
          blockers.push(structCheck.blocker);
        }
      }
      break;
    }

    case 'struct-attack': {
      const attackerId = (params.attacker_struct_id) as string;
      const targetId = (params.target_struct_id) as string;
      if (!attackerId) {
        blockers.push({ type: 'prerequisite', detail: 'attacker_struct_id is required' });
      }
      if (!targetId) {
        blockers.push({ type: 'prerequisite', detail: 'target_struct_id is required' });
      }
      if (attackerId && targetId) {
        const [attackerCheck, targetCheck] = await Promise.all([
          checkStructExists(attackerId),
          checkStructExists(targetId),
        ]);
        checks.push('attacker_exists', 'target_exists');
        if (!attackerCheck.exists && attackerCheck.blocker) blockers.push(attackerCheck.blocker);
        if (!targetCheck.exists && targetCheck.blocker) blockers.push(targetCheck.blocker);

        if (attackerId === targetId) {
          blockers.push({ type: 'target', detail: 'Cannot attack yourself.' });
        }
      }
      warnings.push('Attacker must have sufficient charge. v0.15.0: min damage is 1 per hit.');
      break;
    }

    case 'fleet-move': {
      const fleetId = (params.fleet_id) as string;
      const dest = (params.destination_planet_id) as string;
      if (!fleetId) {
        blockers.push({ type: 'prerequisite', detail: 'fleet_id is required' });
      } else {
        const fleetCheck = await checkFleetExists(fleetId);
        checks.push('fleet_exists');
        if (!fleetCheck.exists && fleetCheck.blocker) blockers.push(fleetCheck.blocker);
      }
      if (!dest) {
        blockers.push({ type: 'prerequisite', detail: 'destination_planet_id is required' });
      }
      warnings.push('Command Ship must be online.');
      break;
    }

    case 'struct-ore-mine-compute':
    case 'struct-ore-refine-compute':
    case 'struct-build-compute': {
      const structId = (params.struct_id ?? params.id) as string;
      if (!structId) {
        blockers.push({ type: 'prerequisite', detail: 'struct_id is required' });
      } else {
        const structCheck = await checkStructExists(structId);
        checks.push('struct_exists');
        if (!structCheck.exists && structCheck.blocker) blockers.push(structCheck.blocker);
      }
      warnings.push('One signing key, one compute job at a time. Never run two concurrent *-compute commands with the same key.');
      if (action === 'struct-ore-mine-compute') {
        warnings.push('Requires PermHashMine. Mining takes ~17 hours at -D 1.');
      } else if (action === 'struct-ore-refine-compute') {
        warnings.push('Requires PermHashRefine. Refine ore immediately -- ore is stealable.');
      } else {
        warnings.push('Requires PermHashBuild. Build difficulty is 700.');
      }
      break;
    }

    case 'reactor-infuse':
    case 'reactor-defuse': {
      const reactorId = (params.reactor_id) as string;
      const amount = (params.amount) as string;
      if (!reactorId) {
        blockers.push({ type: 'prerequisite', detail: 'reactor_id is required' });
      }
      if (!amount) {
        blockers.push({ type: 'prerequisite', detail: 'amount is required (in ualpha)' });
      }
      if (action === 'reactor-defuse') {
        warnings.push('Requires PermTokenDefuse. Defusing decreases energy capacity.');
      }
      checks.push('reactor_params');
      break;
    }

    case 'permission-grant-on-object':
    case 'permission-revoke-on-object':
    case 'permission-set-on-object': {
      const objectId = (params.object_id) as string;
      const targetPlayerId = (params.player_id) as string;
      const permValue = (params.permission_value) as string;
      if (!objectId) blockers.push({ type: 'prerequisite', detail: 'object_id is required' });
      if (!targetPlayerId) blockers.push({ type: 'prerequisite', detail: 'player_id (target) is required' });
      if (!permValue) blockers.push({ type: 'prerequisite', detail: 'permission_value (bitmask) is required' });
      warnings.push('Caller must already have the permission flags being granted/revoked/set. PermAll=16777215.');
      checks.push('permission_params');
      break;
    }

    case 'guild-create': {
      if (!params.reactor_id) {
        blockers.push({ type: 'prerequisite', detail: 'reactor_id is required' });
      }
      warnings.push('Requires PermReactorGuildCreate (bit 19, value 524288) on the reactor.');
      checks.push('guild_create_params');
      break;
    }

    case 'player-send': {
      if (!params.to_player_id) blockers.push({ type: 'prerequisite', detail: 'to_player_id is required' });
      if (!params.amount) blockers.push({ type: 'prerequisite', detail: 'amount is required' });
      warnings.push('Requires PermTokenTransfer (bit 4, value 16).');
      checks.push('send_params');
      break;
    }

    default:
      checks.push('generic_player_check');
      break;
  }

  return {
    feasible: blockers.length === 0,
    action,
    blockers,
    warnings,
    checks_performed: checks,
  };
}
