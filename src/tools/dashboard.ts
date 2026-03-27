/**
 * Player Dashboard
 *
 * Composite state view that replaces 5-10 individual query calls.
 * One tool call returns: player state, structs, fleets, power, and in-progress ops.
 *
 * @module tools/dashboard
 */

import { queryPlayer, queryFleet, listStructs, listAllocations } from './query.js';
import axios from 'axios';
import { config } from '../config.js';

interface StructSummary {
  id: string;
  type_id?: number;
  type_name?: string;
  status?: string;
  planet_id?: string;
  ambit?: string;
}

interface FleetSummary {
  id: string;
  planet_id?: string;
  on_station?: boolean;
  struct_ids?: string[];
}

interface PowerSummary {
  capacity?: number;
  load?: number;
  online: boolean;
  margin?: number;
}

interface OperationInProgress {
  type: string;
  entity_id?: string;
  detail?: string;
}

export interface PlayerDashboard {
  player: {
    id: string;
    address?: string;
    guild_id?: string;
    guild_rank?: number;
    halted?: boolean;
  };
  power: PowerSummary;
  structs: StructSummary[];
  fleets: FleetSummary[];
  operations_in_progress: OperationInProgress[];
  summary: {
    total_structs: number;
    online_structs: number;
    total_fleets: number;
    total_allocations: number;
  };
  timestamp: string;
  errors: string[];
}

function extractField(obj: unknown, field: string): unknown {
  if (obj && typeof obj === 'object' && field in obj) {
    return (obj as Record<string, unknown>)[field];
  }
  return undefined;
}

function toArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
}

export async function getPlayerDashboard(playerId: string): Promise<PlayerDashboard> {
  const errors: string[] = [];

  const apiBase = config.consensusApiUrl;

  const [playerResult, structsResult, allocResult] = await Promise.allSettled([
    queryPlayer(playerId),
    axios.get(`${apiBase}/structs/struct`, { params: { 'pagination.limit': '200' }, timeout: 15000 }).catch(() => null),
    listAllocations(),
  ]);

  // -- Player --
  let playerData: Record<string, unknown> = {};
  if (playerResult.status === 'fulfilled' && !playerResult.value.error) {
    playerData = (playerResult.value.player as Record<string, unknown>) || {};
  } else {
    const err = playerResult.status === 'fulfilled' ? playerResult.value.error : String(playerResult.reason);
    errors.push(`Player query failed: ${err}`);
  }

  const halted = playerData.halted === true || playerData.halted === 'true';
  const guildId = playerData.guildId ?? playerData.guild_id;
  const guildRank = playerData.guildRank ?? playerData.guild_rank;
  const primaryAddress = playerData.primaryAddress ?? playerData.primary_address ?? playerData.address;

  // -- Structs --
  let allStructs: unknown[] = [];
  if (structsResult.status === 'fulfilled' && structsResult.value) {
    const resp = structsResult.value as { data?: Record<string, unknown> };
    const raw = resp.data?.Struct ?? resp.data?.structs ?? resp.data;
    allStructs = toArray(raw);
  } else {
    errors.push('Struct list query failed');
  }

  const playerIdIndex = playerId.split('-')[1];
  const myStructs: StructSummary[] = allStructs
    .filter((s: any) => {
      const owner = s?.owner ?? s?.creator ?? s?.playerId ?? s?.player_id;
      return owner === playerId || String(owner) === String(playerIdIndex);
    })
    .map((s: any) => ({
      id: s?.index ? `5-${s.index}` : s?.id ?? 'unknown',
      type_id: Number(s?.structType ?? s?.struct_type ?? s?.type),
      status: s?.status ?? (s?.activatedAt || s?.activated_at ? 'active' : 'built'),
      planet_id: s?.planetId ?? s?.planet_id,
      ambit: s?.operatingAmbit ?? s?.operating_ambit ?? s?.ambit,
    }));

  const onlineStructs = myStructs.filter(s => s.status === 'active' || s.status === 'ACTIVE').length;

  // -- Fleets: derive from player's command ships --
  const fleets: FleetSummary[] = [];
  const fleetIds = new Set<string>();
  for (const s of myStructs) {
    if (s.type_id === 1) {
      const fId = s.planet_id ? `fleet-on-${s.planet_id}` : 'unknown';
      if (!fleetIds.has(fId)) {
        fleetIds.add(fId);
        fleets.push({
          id: fId,
          planet_id: s.planet_id,
          on_station: true,
        });
      }
    }
  }

  // -- Allocations --
  let allocCount = 0;
  if (allocResult.status === 'fulfilled' && !allocResult.value.error) {
    const allAllocs = toArray(allocResult.value.allocations);
    allocCount = allAllocs.filter((a: any) => {
      const ctrl = a?.controller ?? a?.creator;
      return ctrl === playerId || String(ctrl) === String(playerIdIndex);
    }).length;
  }

  // -- Power (from player data) --
  const capacity = Number(playerData.capacityTotal ?? playerData.capacity ?? 0);
  const load = Number(playerData.loadTotal ?? playerData.load ?? 0);
  const power: PowerSummary = {
    capacity: capacity || undefined,
    load: load || undefined,
    online: !halted,
    margin: capacity && load ? capacity - load : undefined,
  };

  // -- Operations in progress (heuristic from struct state) --
  const ops: OperationInProgress[] = [];
  for (const s of myStructs) {
    if (s.status === 'building' || s.status === 'BUILDING') {
      ops.push({ type: 'build', entity_id: s.id, detail: `Struct type ${s.type_id}` });
    }
  }

  return {
    player: {
      id: playerId,
      address: primaryAddress as string | undefined,
      guild_id: guildId as string | undefined,
      guild_rank: guildRank !== undefined ? Number(guildRank) : undefined,
      halted,
    },
    power,
    structs: myStructs,
    fleets,
    operations_in_progress: ops,
    summary: {
      total_structs: myStructs.length,
      online_structs: onlineStructs,
      total_fleets: fleets.length,
      total_allocations: allocCount,
    },
    timestamp: new Date().toISOString(),
    errors,
  };
}
