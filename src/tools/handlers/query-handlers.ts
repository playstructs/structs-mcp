/**
 * Query Tool Handlers
 * 
 * @module tools/handlers/query-handlers
 */

import {
  queryPlayer,
  listPlayers,
  queryPlanet,
  listPlanets,
  queryGuild,
  listGuilds,
  queryEndpoints,
  listStructs,
  listStructTypes,
  listProviders,
  listAgreements,
  listSubstations,
  listAllocations,
  queryPlanetActivity,
  queryWorkInfo,
  queryFleet,
  queryStruct,
  queryReactor,
  querySubstation,
  queryProvider,
  queryAgreement,
  queryAllocation,
} from '../query.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const queryHandlers = new Map([
  // List handlers (marked as list tools for primary references only)
  ['structs_list_players', createHandler(
    (args) => listPlayers(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_planets', createHandler(
    (args) => listPlanets(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_structs', createHandler(
    (args) => listStructs(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_struct_types', createHandler(
    (args) => listStructTypes(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_guilds', createHandler(
    (args) => listGuilds(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_providers', createHandler(
    (args) => listProviders(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_agreements', createHandler(
    (args) => listAgreements(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_substations', createHandler(
    (args) => listSubstations(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],
  ['structs_list_allocations', createHandler(
    (args) => listAllocations(args?.pagination_key, args?.pagination_limit),
    { isListTool: true }
  )],

  // Query handlers: accept entity-specific id (e.g. player_id) or generic "id" for compatibility
  ['structs_query_player', createHandler(
    (args) => queryPlayer((args?.player_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.player_id ?? args?.id) as string }
  )],
  ['structs_query_planet', createHandler(
    (args) => queryPlanet((args?.planet_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.planet_id ?? args?.id) as string }
  )],
  ['structs_query_guild', createHandler(
    (args) => queryGuild((args?.guild_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.guild_id ?? args?.id) as string }
  )],
  ['structs_query_fleet', createHandler(
    (args) => queryFleet((args?.fleet_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.fleet_id ?? args?.id) as string }
  )],
  ['structs_query_struct', createHandler(
    (args) => queryStruct((args?.struct_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.struct_id ?? args?.id) as string }
  )],
  ['structs_query_reactor', createHandler(
    (args) => queryReactor((args?.reactor_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.reactor_id ?? args?.id) as string }
  )],
  ['structs_query_substation', createHandler(
    (args) => querySubstation((args?.substation_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.substation_id ?? args?.id) as string }
  )],
  ['structs_query_provider', createHandler(
    (args) => queryProvider((args?.provider_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.provider_id ?? args?.id) as string }
  )],
  ['structs_query_agreement', createHandler(
    (args) => queryAgreement((args?.agreement_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.agreement_id ?? args?.id) as string }
  )],
  ['structs_query_allocation', createHandler(
    (args) => queryAllocation((args?.allocation_id ?? args?.id) as string),
    { extractExcludeId: (args) => (args?.allocation_id ?? args?.id) as string }
  )],
  ['structs_query_endpoints', createHandler(
    (args) => queryEndpoints(args?.entity_type as string | undefined, args?.category as string | undefined, aiDocsPath)
  )],
  ['structs_query_planet_activity', createHandler(
    (args) => queryPlanetActivity(
      args?.planet_id as string,
      args?.limit as number | undefined,
      args?.start_time as string | undefined,
      args?.end_time as string | undefined
    )
  )],
  ['structs_query_work_info', createHandler(
    (args) => queryWorkInfo(args?.entity_id as string, args?.action_type as string)
  )],
]);
