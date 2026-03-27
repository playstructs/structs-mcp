/**
 * Command Preparation Tool
 *
 * Generates exact `structsd` CLI commands for any game action.
 * The agent copies the output and runs it -- no signer DB needed.
 *
 * @module tools/command
 */

export interface PreparedCommand {
  command: string;
  verify_command?: string;
  prerequisites: string[];
  warnings: string[];
  pattern: 'single' | 'two_step' | 'proof_of_work';
  next_step?: {
    action: string;
    description: string;
    command_template: string;
  };
  deprecated?: {
    replacement: string;
    reason: string;
  };
}

type ArgSpec = {
  name: string;
  required: boolean;
  description?: string;
};

interface ActionDef {
  cli_name: string;
  positional_args: ArgSpec[];
  flags?: Record<string, { description: string; default?: string }>;
  prerequisites: string[];
  warnings: string[];
  pattern: 'single' | 'two_step' | 'proof_of_work';
  next_step?: {
    action: string;
    description: string;
  };
  verify_query?: string;
  deprecated?: {
    replacement: string;
    reason: string;
  };
}

const COMMON_TX_FLAGS = '--gas auto --gas-adjustment 1.5 -y';

const ACTION_KNOWLEDGE_BASE: Record<string, ActionDef> = {
  // -- Exploration --
  'planet-explore': {
    cli_name: 'planet-explore',
    positional_args: [{ name: 'player_id', required: true }],
    prerequisites: ['Player must be online (not halted)'],
    warnings: ['Always your first action after player creation.'],
    pattern: 'single',
    verify_query: 'structsd query structs show-planets-by-player {player_id}',
  },

  // -- Construction --
  'struct-build-initiate': {
    cli_name: 'struct-build-initiate',
    positional_args: [
      { name: 'player_id', required: true },
      { name: 'struct_type_id', required: true, description: 'Struct type (e.g. 14=Ore Extractor, 15=Ore Refinery, 1=Command Ship)' },
      { name: 'ambit', required: true, description: 'Operating ambit: space, air, land, or water' },
      { name: 'slot', required: true, description: 'Slot number (0-3)' },
    ],
    prerequisites: [
      'Player must be online (not halted)',
      'Fleet must be on station',
      'Command Ship must be online',
      'Sufficient power capacity for struct passive draw',
    ],
    warnings: ['Build difficulty is 700. Follow with struct-build-compute to complete.'],
    pattern: 'two_step',
    next_step: {
      action: 'struct-build-compute',
      description: 'Compute proof-of-work to complete the build',
    },
    verify_query: 'structsd query structs show-structs-by-player {player_id}',
  },

  'struct-build-compute': {
    cli_name: 'struct-build-compute',
    positional_args: [{ name: 'struct_id', required: true }],
    flags: { '-D': { description: 'Difficulty level (1=slow/gentle, 3=fast/recommended)', default: '3' } },
    prerequisites: ['Struct must be in build-initiated state'],
    warnings: [
      'Build difficulty is 700. At -D 1 takes ~95 min, at -D 3 takes ~17 min.',
      'One signing key, one compute job at a time. Never run two concurrent *-compute commands with the same key.',
    ],
    pattern: 'proof_of_work',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  // -- Struct Management --
  'struct-activate': {
    cli_name: 'struct-activate',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online', 'Struct must have sufficient charge (ActivateCharge=1)'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-deactivate': {
    cli_name: 'struct-deactivate',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: ['Deactivated structs stop consuming power but cannot perform actions.'],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-move': {
    cli_name: 'struct-move',
    positional_args: [
      { name: 'struct_id', required: true },
      { name: 'destination', required: true, description: 'Destination location ID' },
    ],
    prerequisites: ['Player must be online', 'Valid destination location'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-defense-set': {
    cli_name: 'struct-defense-set',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online', 'Struct must be activated'],
    warnings: ['Defense mode enables counter-attacks and PDC interception.'],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-defense-clear': {
    cli_name: 'struct-defense-clear',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-stealth-activate': {
    cli_name: 'struct-stealth-activate',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online', 'Struct must be activated'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-stealth-deactivate': {
    cli_name: 'struct-stealth-deactivate',
    positional_args: [{ name: 'struct_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  // -- Combat --
  'struct-attack': {
    cli_name: 'struct-attack',
    positional_args: [
      { name: 'attacker_struct_id', required: true },
      { name: 'target_struct_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Attacker must have sufficient charge', 'Target must be valid and attackable'],
    warnings: [
      'v0.15.0 combat: counter-attacks fire once per invocation. Defender counters before block, target counters after shots.',
      'Block does NOT apply on evaded shots. Min damage floor is 1 per hit.',
    ],
    pattern: 'single',
    verify_query: 'structsd query structs struct {target_struct_id}',
  },

  'planet-raid-complete': {
    cli_name: 'planet-raid-complete',
    positional_args: [
      { name: 'fleet_id', required: true },
      { name: 'proof', required: true },
      { name: 'nonce', required: true },
    ],
    prerequisites: [
      'Player must be online',
      'Fleet must be away (not on station)',
      'Command Ship must be online',
      'Proof-of-work must be completed',
    ],
    warnings: ['Ore stolen in raids is stealable. Refine immediately.'],
    pattern: 'proof_of_work',
    verify_query: 'structsd query structs fleet {fleet_id}',
  },

  // -- Mining / Refining --
  'struct-ore-mine-compute': {
    cli_name: 'struct-ore-mine-compute',
    positional_args: [{ name: 'struct_id', required: true }],
    flags: { '-D': { description: 'Difficulty level (1=slow/gentle, 3=fast/recommended)', default: '3' } },
    prerequisites: ['Player must be online', 'Struct must be an Ore Extractor (type 14)', 'Struct must be activated'],
    warnings: [
      'Mining takes ~17 hours at -D 1. Initiate early, compute later.',
      'One signing key, one compute job at a time.',
      'Requires PermHashMine on the struct.',
    ],
    pattern: 'proof_of_work',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-ore-refine-compute': {
    cli_name: 'struct-ore-refine-compute',
    positional_args: [{ name: 'struct_id', required: true }],
    flags: { '-D': { description: 'Difficulty level (1=slow/gentle, 3=fast/recommended)', default: '3' } },
    prerequisites: ['Player must be online', 'Struct must be an Ore Refinery (type 15)', 'Struct must be activated', 'Must have ore to refine'],
    warnings: [
      'Refining takes ~34 hours at -D 1. Refine ore immediately -- ore is stealable, Alpha Matter is not.',
      'One signing key, one compute job at a time.',
      'Requires PermHashRefine on the struct.',
    ],
    pattern: 'proof_of_work',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  'struct-generator-infuse': {
    cli_name: 'struct-generator-infuse',
    positional_args: [
      { name: 'struct_id', required: true },
      { name: 'amount', required: true, description: 'Amount of Alpha Matter to infuse' },
    ],
    prerequisites: ['Player must be online', 'Struct must be a Generator type', 'Must have Alpha Matter to infuse'],
    warnings: ['Infusing a generator converts Alpha Matter into energy capacity.'],
    pattern: 'single',
    verify_query: 'structsd query structs struct {struct_id}',
  },

  // -- Fleet --
  'fleet-move': {
    cli_name: 'fleet-move',
    positional_args: [
      { name: 'fleet_id', required: true },
      { name: 'destination_planet_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Command Ship must be online', 'Valid destination planet'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs fleet {fleet_id}',
  },

  // -- Reactor / Staking --
  'reactor-infuse': {
    cli_name: 'reactor-infuse',
    positional_args: [
      { name: 'reactor_id', required: true },
      { name: 'amount', required: true, description: 'Amount of Alpha Matter (ualpha)' },
    ],
    prerequisites: ['Player must be online', 'Must have Alpha Matter to infuse'],
    warnings: ['Also handles validation delegation. Infusing increases energy capacity.'],
    pattern: 'single',
    verify_query: 'structsd query structs reactor {reactor_id}',
  },

  'reactor-defuse': {
    cli_name: 'reactor-defuse',
    positional_args: [
      { name: 'reactor_id', required: true },
      { name: 'amount', required: true, description: 'Amount to defuse (ualpha)' },
    ],
    prerequisites: ['Player must be online', 'Requires PermTokenDefuse'],
    warnings: ['Also handles validation undelegation. Defusing decreases energy capacity.'],
    pattern: 'single',
    verify_query: 'structsd query structs reactor {reactor_id}',
  },

  'reactor-begin-migration': {
    cli_name: 'reactor-begin-migration',
    positional_args: [{ name: 'reactor_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermTokenMigrate'],
    warnings: ['Begins redelegation process for reactor validation stake.'],
    pattern: 'single',
    verify_query: 'structsd query structs reactor {reactor_id}',
  },

  'reactor-cancel-defusion': {
    cli_name: 'reactor-cancel-defusion',
    positional_args: [{ name: 'reactor_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: ['Cancels an in-progress undelegation.'],
    pattern: 'single',
    verify_query: 'structsd query structs reactor {reactor_id}',
  },

  // -- Guild --
  'guild-create': {
    cli_name: 'guild-create',
    positional_args: [{ name: 'reactor_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermReactorGuildCreate on the reactor'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs guilds',
  },

  'guild-update-entry-rank': {
    cli_name: 'guild-update-entry-rank',
    positional_args: [
      { name: 'guild_id', required: true },
      { name: 'entry_rank', required: true, description: 'Default rank for new members (numeric, lower = more privileged)' },
    ],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the guild'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs guild {guild_id}',
  },

  'guild-membership-join': {
    cli_name: 'guild-membership-join',
    positional_args: [
      { name: 'guild_id', required: true },
      { name: 'player_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Guild must accept new members'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs player {player_id}',
  },

  'guild-membership-kick': {
    cli_name: 'guild-membership-kick',
    positional_args: [
      { name: 'guild_id', required: true },
      { name: 'player_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Requires PermGuildMembership on the guild or rank-based authority'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs player {player_id}',
  },

  'guild-bank-mint': {
    cli_name: 'guild-bank-mint',
    positional_args: [
      { name: 'guild_id', required: true },
      { name: 'amount', required: true },
    ],
    prerequisites: ['Player must be online', 'Requires PermGuildTokenMint on the guild', 'Sufficient collateral'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs guild {guild_id}',
  },

  'guild-bank-redeem': {
    cli_name: 'guild-bank-redeem',
    positional_args: [
      { name: 'guild_id', required: true },
      { name: 'amount', required: true },
    ],
    prerequisites: ['Player must be online', 'Must hold guild tokens to redeem'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs guild {guild_id}',
  },

  'player-update-guild-rank': {
    cli_name: 'player-update-guild-rank',
    positional_args: [
      { name: 'player_id', required: true, description: 'Target player to update' },
      { name: 'guild_rank', required: true, description: 'New rank (numeric, lower = more privileged)' },
    ],
    prerequisites: ['Caller must be online', 'Requires PermAdmin on the guild or rank-based authority'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs player {player_id}',
  },

  'player-send': {
    cli_name: 'player-send',
    positional_args: [
      { name: 'to_player_id', required: true },
      { name: 'amount', required: true, description: 'Amount to send (ualpha or guild token denom)' },
    ],
    prerequisites: ['Player must be online', 'Requires PermTokenTransfer', 'Sufficient balance'],
    warnings: [],
    pattern: 'single',
    verify_query: 'structsd query structs player {to_player_id}',
  },

  // -- Permissions --
  'permission-grant-on-object': {
    cli_name: 'permission-grant-on-object',
    positional_args: [
      { name: 'object_id', required: true, description: 'Object to grant permissions on (e.g., guild ID, struct ID)' },
      { name: 'player_id', required: true, description: 'Player receiving the permissions' },
      { name: 'permission_value', required: true, description: 'Permission bitmask to grant (bitwise OR with existing)' },
    ],
    prerequisites: ['Caller must already have the permission flags being granted'],
    warnings: ['Bitwise OR: adds flags without removing existing ones. Use PermAll=16777215 for all permissions.'],
    pattern: 'single',
    verify_query: 'structsd query structs permission {object_id}@{player_id}',
  },

  'permission-revoke-on-object': {
    cli_name: 'permission-revoke-on-object',
    positional_args: [
      { name: 'object_id', required: true },
      { name: 'player_id', required: true },
      { name: 'permission_value', required: true, description: 'Permission bitmask to revoke (bitwise AND NOT)' },
    ],
    prerequisites: ['Caller must already have the permission flags being revoked'],
    warnings: ['Bitwise AND NOT: removes only the specified flags.'],
    pattern: 'single',
    verify_query: 'structsd query structs permission {object_id}@{player_id}',
  },

  'permission-set-on-object': {
    cli_name: 'permission-set-on-object',
    positional_args: [
      { name: 'object_id', required: true },
      { name: 'player_id', required: true },
      { name: 'permission_value', required: true, description: 'Exact permission bitmask to set (replaces existing)' },
    ],
    prerequisites: ['Caller must already have all the permission flags in the new value'],
    warnings: ['Replaces entire permission value. Use grant/revoke for incremental changes.'],
    pattern: 'single',
    verify_query: 'structsd query structs permission {object_id}@{player_id}',
  },

  'permission-grant-on-address': {
    cli_name: 'permission-grant-on-address',
    positional_args: [
      { name: 'address', required: true, description: 'Cosmos address (e.g., cosmos1abc...)' },
      { name: 'permission_value', required: true, description: 'Permission bitmask to grant' },
    ],
    prerequisites: ['Caller must already have the permission flags being granted'],
    warnings: ['Address permissions control what the address can do on behalf of its player.'],
    pattern: 'single',
  },

  'permission-revoke-on-address': {
    cli_name: 'permission-revoke-on-address',
    positional_args: [
      { name: 'address', required: true },
      { name: 'permission_value', required: true },
    ],
    prerequisites: ['Caller must already have the permission flags being revoked'],
    warnings: [],
    pattern: 'single',
  },

  'permission-set-on-address': {
    cli_name: 'permission-set-on-address',
    positional_args: [
      { name: 'address', required: true },
      { name: 'permission_value', required: true },
    ],
    prerequisites: ['Caller must already have all the permission flags in the new value'],
    warnings: ['Replaces entire address permission value.'],
    pattern: 'single',
  },

  'permission-guild-rank-set': {
    cli_name: 'permission-guild-rank-set',
    positional_args: [
      { name: 'object_id', required: true, description: 'Object to set guild rank permission on' },
      { name: 'guild_rank', required: true, description: 'Guild rank threshold (players at or below this rank get the permissions)' },
      { name: 'permission_value', required: true, description: 'Permission bitmask' },
    ],
    prerequisites: ['Caller must already have the permission flags being set'],
    warnings: ['Guild rank permissions grant flags based on member rank. Lower rank = more privileged.'],
    pattern: 'single',
  },

  'permission-guild-rank-revoke': {
    cli_name: 'permission-guild-rank-revoke',
    positional_args: [
      { name: 'object_id', required: true },
      { name: 'guild_rank', required: true },
    ],
    prerequisites: ['Caller must have authority to manage guild rank permissions'],
    warnings: [],
    pattern: 'single',
  },

  // -- Providers --
  'provider-create': {
    cli_name: 'provider-create',
    positional_args: [{ name: 'substation_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
  },

  'provider-delete': {
    cli_name: 'provider-delete',
    positional_args: [{ name: 'provider_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermDelete on the provider'],
    warnings: [],
    pattern: 'single',
  },

  'provider-withdraw-balance': {
    cli_name: 'provider-withdraw-balance',
    positional_args: [{ name: 'provider_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermProviderWithdraw'],
    warnings: [],
    pattern: 'single',
  },

  'provider-update-capacity-minimum': {
    cli_name: 'provider-update-capacity-minimum',
    positional_args: [{ name: 'provider_id', required: true }, { name: 'value', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the provider'],
    warnings: [],
    pattern: 'single',
  },

  'provider-update-capacity-maximum': {
    cli_name: 'provider-update-capacity-maximum',
    positional_args: [{ name: 'provider_id', required: true }, { name: 'value', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the provider'],
    warnings: [],
    pattern: 'single',
  },

  'provider-update-duration-minimum': {
    cli_name: 'provider-update-duration-minimum',
    positional_args: [{ name: 'provider_id', required: true }, { name: 'value', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the provider'],
    warnings: [],
    pattern: 'single',
  },

  'provider-update-duration-maximum': {
    cli_name: 'provider-update-duration-maximum',
    positional_args: [{ name: 'provider_id', required: true }, { name: 'value', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the provider'],
    warnings: [],
    pattern: 'single',
  },

  'provider-update-access-policy': {
    cli_name: 'provider-update-access-policy',
    positional_args: [{ name: 'provider_id', required: true }, { name: 'policy', required: true }],
    prerequisites: ['Player must be online', 'Requires PermProviderOpen on the provider'],
    warnings: [],
    pattern: 'single',
  },

  // -- Agreements --
  'agreement-open': {
    cli_name: 'agreement-open',
    positional_args: [
      { name: 'provider_id', required: true },
      { name: 'capacity', required: true },
      { name: 'duration', required: true },
    ],
    prerequisites: ['Player must be online', 'Provider must exist and accept agreements'],
    warnings: [],
    pattern: 'single',
  },

  'agreement-close': {
    cli_name: 'agreement-close',
    positional_args: [{ name: 'agreement_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermDelete on the agreement'],
    warnings: [],
    pattern: 'single',
  },

  'agreement-capacity-increase': {
    cli_name: 'agreement-capacity-increase',
    positional_args: [{ name: 'agreement_id', required: true }, { name: 'amount', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the agreement'],
    warnings: [],
    pattern: 'single',
  },

  'agreement-capacity-decrease': {
    cli_name: 'agreement-capacity-decrease',
    positional_args: [{ name: 'agreement_id', required: true }, { name: 'amount', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the agreement'],
    warnings: [],
    pattern: 'single',
  },

  'agreement-duration-increase': {
    cli_name: 'agreement-duration-increase',
    positional_args: [{ name: 'agreement_id', required: true }, { name: 'blocks', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the agreement'],
    warnings: [],
    pattern: 'single',
  },

  // -- Allocations --
  'allocation-create': {
    cli_name: 'allocation-create',
    positional_args: [
      { name: 'source_id', required: true, description: 'Source substation or reactor ID' },
      { name: 'power', required: true, description: 'Power allocation amount' },
    ],
    prerequisites: ['Player must be online', 'Requires PermSourceAllocation on the source'],
    warnings: ['Controller field is the PlayerId of the creator (not an address).'],
    pattern: 'single',
  },

  'allocation-update': {
    cli_name: 'allocation-update',
    positional_args: [{ name: 'allocation_id', required: true }, { name: 'power', required: true }],
    prerequisites: ['Player must be online', 'Requires PermUpdate on the allocation'],
    warnings: [],
    pattern: 'single',
  },

  'allocation-delete': {
    cli_name: 'allocation-delete',
    positional_args: [{ name: 'allocation_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermDelete on the allocation'],
    warnings: [],
    pattern: 'single',
  },

  'allocation-transfer': {
    cli_name: 'allocation-transfer',
    positional_args: [{ name: 'allocation_id', required: true }, { name: 'to_player_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermAdmin on the allocation'],
    warnings: [],
    pattern: 'single',
  },

  // -- Substations --
  'substation-create': {
    cli_name: 'substation-create',
    positional_args: [{ name: 'allocation_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
  },

  'substation-delete': {
    cli_name: 'substation-delete',
    positional_args: [{ name: 'substation_id', required: true }],
    prerequisites: ['Player must be online', 'Requires PermDelete on the substation'],
    warnings: [],
    pattern: 'single',
  },

  'substation-player-connect': {
    cli_name: 'substation-player-connect',
    positional_args: [
      { name: 'substation_id', required: true },
      { name: 'player_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Requires PermSubstationConnection on the substation'],
    warnings: [],
    pattern: 'single',
  },

  'substation-player-disconnect': {
    cli_name: 'substation-player-disconnect',
    positional_args: [{ name: 'player_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
  },

  'substation-player-migrate': {
    cli_name: 'substation-player-migrate',
    positional_args: [
      { name: 'substation_id', required: true, description: 'Destination substation' },
      { name: 'player_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Requires PermSubstationConnection on destination substation'],
    warnings: [],
    pattern: 'single',
  },

  'substation-allocation-connect': {
    cli_name: 'substation-allocation-connect',
    positional_args: [
      { name: 'substation_id', required: true },
      { name: 'allocation_id', required: true },
    ],
    prerequisites: ['Player must be online', 'Requires PermAllocationConnection on the substation'],
    warnings: [],
    pattern: 'single',
  },

  'substation-allocation-disconnect': {
    cli_name: 'substation-allocation-disconnect',
    positional_args: [{ name: 'allocation_id', required: true }],
    prerequisites: ['Player must be online'],
    warnings: [],
    pattern: 'single',
  },

  // -- Address --
  'address-register': {
    cli_name: 'address-register',
    positional_args: [{ name: 'address', required: true, description: 'New cosmos address to register' }],
    prerequisites: ['Player must be online'],
    warnings: ['v0.15.0: no longer takes playerId as a separate argument.'],
    pattern: 'single',
  },

  'player-update-primary-address': {
    cli_name: 'player-update-primary-address',
    positional_args: [{ name: 'address', required: true, description: 'New primary address' }],
    prerequisites: ['Player must be online', 'Address must already be registered'],
    warnings: ['v0.15.0: no longer takes playerId as a separate argument.'],
    pattern: 'single',
  },
};

const DEPRECATED_ACTIONS: Record<string, { replacement: string; reason: string }> = {
  'agreement-create': { replacement: 'agreement-open', reason: 'MsgAgreementCreate does not exist. Use MsgAgreementOpen instead.' },
  'ore-mining': { replacement: 'struct-ore-mine-compute', reason: 'Use struct-based mining compute.' },
  'ore-refining': { replacement: 'struct-ore-refine-compute', reason: 'Use struct-based refining compute.' },
  'generator-allocate': { replacement: 'struct-generator-infuse', reason: 'Use struct-based generator infusion.' },
  'guild-membership-leave': { replacement: 'guild-membership-kick', reason: 'MsgGuildMembershipLeave does not exist. Use guild-membership-kick instead.' },
  'reactor-allocate': { replacement: 'allocation-create', reason: 'Use allocation system (MsgAllocationCreate) instead.' },
  'substation-connect': { replacement: 'substation-allocation-connect', reason: 'Use MsgSubstationAllocationConnect instead.' },
  'provider-guild-grant': { replacement: 'permission-guild-rank-set', reason: 'Removed in v0.15.0. Use guild rank permissions instead.' },
  'provider-guild-revoke': { replacement: 'permission-guild-rank-revoke', reason: 'Removed in v0.15.0. Use guild rank permissions instead.' },
};

function interpolateTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const val = params[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

export function prepareCommand(
  action: string,
  params: Record<string, unknown>,
): PreparedCommand {
  const keyName = (params.key_name as string) || '[key-name]';

  const deprecated = DEPRECATED_ACTIONS[action];
  if (deprecated) {
    const replacementDef = ACTION_KNOWLEDGE_BASE[deprecated.replacement];
    const argPlaceholders = replacementDef
      ? replacementDef.positional_args.map(a => `[${a.name}]`).join(' ')
      : '';
    return {
      command: `# DEPRECATED: ${action} → use ${deprecated.replacement} instead`,
      prerequisites: [],
      warnings: [deprecated.reason],
      pattern: 'single',
      deprecated,
      verify_command: replacementDef
        ? `structsd tx structs ${deprecated.replacement} --from ${keyName} ${COMMON_TX_FLAGS} -- ${argPlaceholders}`
        : undefined,
    };
  }

  const def = ACTION_KNOWLEDGE_BASE[action];
  if (!def) {
    return {
      command: `# Unknown action: ${action}. Use structs_query_endpoints or structs.ai/reference/action-quick-reference to find valid actions.`,
      prerequisites: [],
      warnings: [`Action "${action}" is not in the knowledge base. Check spelling or consult https://structs.ai/reference/action-quick-reference`],
      pattern: 'single',
    };
  }

  const positionalParts: string[] = [];
  const missingArgs: string[] = [];
  for (const arg of def.positional_args) {
    const val = params[arg.name];
    if (val !== undefined && val !== null) {
      positionalParts.push(String(val));
    } else if (arg.required) {
      positionalParts.push(`[${arg.name}]`);
      missingArgs.push(arg.name);
    }
  }

  let flagStr = '';
  if (def.flags) {
    for (const [flag, spec] of Object.entries(def.flags)) {
      const val = params[flag.replace(/^-+/, '')] ?? params.difficulty ?? spec.default;
      if (val !== undefined && val !== null) {
        flagStr += ` ${flag} ${val}`;
      }
    }
  }

  const command = `structsd tx structs ${def.cli_name}${flagStr} --from ${keyName} ${COMMON_TX_FLAGS} -- ${positionalParts.join(' ')}`;

  const warnings = [...def.warnings];
  if (missingArgs.length > 0) {
    warnings.unshift(`Missing arguments shown as placeholders: ${missingArgs.join(', ')}. Provide them to get a complete command.`);
  }

  let nextStep: PreparedCommand['next_step'];
  if (def.next_step) {
    const nextDef = ACTION_KNOWLEDGE_BASE[def.next_step.action];
    let nextTemplate: string;
    if (nextDef) {
      const nextFlags = nextDef.flags
        ? Object.entries(nextDef.flags).map(([f, s]) => `${f} ${s.default || '[n]'}`).join(' ')
        : '';
      const nextArgs = nextDef.positional_args.map(a => {
        const val = params[a.name];
        return val !== undefined ? String(val) : `[${a.name}]`;
      }).join(' ');
      nextTemplate = `structsd tx structs ${nextDef.cli_name}${nextFlags ? ' ' + nextFlags : ''} --from ${keyName} ${COMMON_TX_FLAGS} -- ${nextArgs}`;
    } else {
      nextTemplate = `structsd tx structs ${def.next_step.action} --from ${keyName} ${COMMON_TX_FLAGS} -- [args]`;
    }
    nextStep = {
      action: def.next_step.action,
      description: def.next_step.description,
      command_template: nextTemplate,
    };
  }

  const verifyCommand = def.verify_query
    ? interpolateTemplate(def.verify_query, params)
    : undefined;

  return {
    command,
    verify_command: verifyCommand,
    prerequisites: def.prerequisites,
    warnings,
    pattern: def.pattern,
    next_step: nextStep,
  };
}

export function listAvailableActions(): { actions: string[]; deprecated: string[] } {
  return {
    actions: Object.keys(ACTION_KNOWLEDGE_BASE).sort(),
    deprecated: Object.keys(DEPRECATED_ACTIONS).sort(),
  };
}
