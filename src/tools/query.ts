/**
 * Query Tools
 * 
 * Implements query tools for accessing game state via Structs APIs.
 * 
 * @module tools/query
 */

import axios, { AxiosError } from 'axios';
import { validateEntityId } from './validation.js';
import { config } from '../config.js';
import { query as executeQuery, isDangerEnabled, getDangerErrorResponse } from '../utils/database.js';
import { getAllToolMetadata } from '../utils/tool-metadata.js';
import { getAllToolDefinitions } from './definitions/index.js';

/**
 * Get API configuration from config
 */
function getAPIConfig() {
  return {
    consensusRPCUrl: config.consensusApiUrl,
    webappApiUrl: config.webappApiUrl,
  };
}

/**
 * List all players from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of players with pagination
 */
export async function listPlayers(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  players: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/player`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      players: response.data.Player || response.data.players || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        players: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      players: null,
      timestamp: new Date().toISOString(),
      error: `Error listing players: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query player state from consensus API
 * 
 * @param playerId - Player ID (e.g., "1-11")
 * @returns Player data
 */
export async function queryPlayer(playerId: string): Promise<{
  player: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(playerId, 'player');
    if (!validation.valid) {
      return {
        player: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid player ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/player/${playerId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      player: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        player: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      player: null,
      timestamp: new Date().toISOString(),
      error: `Error querying player: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query planet state from consensus API
 * 
 * @param planetId - Planet ID (e.g., "2-1")
 * @returns Planet data
 */
export async function queryPlanet(planetId: string): Promise<{
  planet: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(planetId, 'planet');
    if (!validation.valid) {
      return {
        planet: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid planet ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/planet/${planetId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      planet: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        planet: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      planet: null,
      timestamp: new Date().toISOString(),
      error: `Error querying planet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query guild state from consensus API
 * 
 * @param guildId - Guild ID (e.g., "0-1")
 * @returns Guild data
 */
export async function queryGuild(guildId: string): Promise<{
  guild: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(guildId, 'guild');
    if (!validation.valid) {
      return {
        guild: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid guild ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/guild/${guildId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      guild: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        guild: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      guild: null,
      timestamp: new Date().toISOString(),
      error: `Error querying guild: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List available endpoints
 * 
 * @param entityType - Optional entity type filter
 * @param category - Optional category filter (queries, transactions, etc.)
 * @param aiDocsPath - Base path to /ai directory
 * @returns List of endpoints
 */
export async function queryEndpoints(
  entityType?: string,
  category?: string,
  aiDocsPath?: string
): Promise<{
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    entity?: string;
    category?: string;
  }>;
  mcp_tools?: Array<{
    name: string;
    category: string;
    entity_type?: string;
    description: string;
  }>;
  error?: string;
}> {
  try {
    // Load endpoint index from resources
    const endpoints: Array<{
      path: string;
      method: string;
      description: string;
      entity?: string;
      category?: string;
    }> = [];

    // Basic endpoint list (can be expanded to load from resources)
    const allEndpoints = [
      {
        path: '/structs/player/{id}',
        method: 'GET',
        description: 'Query player by ID',
        entity: 'player',
        category: 'queries',
      },
      {
        path: '/structs/planet/{id}',
        method: 'GET',
        description: 'Query planet by ID',
        entity: 'planet',
        category: 'queries',
      },
      {
        path: '/structs/guild/{id}',
        method: 'GET',
        description: 'Query guild by ID',
        entity: 'guild',
        category: 'queries',
      },
      {
        path: '/structs/struct/{id}',
        method: 'GET',
        description: 'Query struct by ID',
        entity: 'struct',
        category: 'queries',
      },
    ];

    // Apply filters
    let filtered = allEndpoints;
    if (entityType) {
      filtered = filtered.filter((ep) => ep.entity === entityType);
    }
    if (category) {
      filtered = filtered.filter((ep) => ep.category === category);
    }

    // Include MCP tool metadata for AI agent discovery
    const toolMetadata = getAllToolMetadata();
    const toolDefinitions = getAllToolDefinitions();
    const toolMap = new Map(toolDefinitions.map(tool => [tool.name, tool]));
    
    const mcpTools = toolMetadata.map(tool => {
      const toolDef = toolMap.get(tool.name);
      return {
        name: tool.name,
        category: tool.category,
        entity_type: tool.entityType,
        description: toolDef?.description || '',
      };
    });

    // Filter MCP tools if filters are applied
    let filteredMcpTools = mcpTools;
    if (entityType) {
      filteredMcpTools = filteredMcpTools.filter(tool => tool.entity_type === entityType);
    }
    if (category) {
      // Map category filter to tool category
      const categoryMap: Record<string, string> = {
        'queries': 'query',
        'transactions': 'action',
        'calculations': 'calculation',
        'validations': 'validation',
      };
      const toolCategory = categoryMap[category] || category;
      filteredMcpTools = filteredMcpTools.filter(tool => tool.category === toolCategory);
    }

    return {
      endpoints: filtered,
      mcp_tools: filteredMcpTools.length > 0 ? filteredMcpTools : undefined,
    };
  } catch (error) {
    return {
      endpoints: [],
      error: `Error querying endpoints: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all planets from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of planets with pagination
 */
export async function listPlanets(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  planets: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/planet`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      planets: response.data.Planet || response.data.planets || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        planets: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      planets: null,
      timestamp: new Date().toISOString(),
      error: `Error listing planets: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all structs from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of structs with pagination
 */
export async function listStructs(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  structs: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/struct`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      structs: response.data.Struct || response.data.structs || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        structs: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      structs: null,
      timestamp: new Date().toISOString(),
      error: `Error listing structs: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all struct types from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of struct types with pagination
 */
export async function listStructTypes(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  struct_types: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/struct_type`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      struct_types: response.data.StructType || response.data.struct_types || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        struct_types: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      struct_types: null,
      timestamp: new Date().toISOString(),
      error: `Error listing struct types: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all guilds from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of guilds with pagination
 */
export async function listGuilds(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  guilds: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/guild`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      guilds: response.data.Guild || response.data.guilds || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        guilds: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      guilds: null,
      timestamp: new Date().toISOString(),
      error: `Error listing guilds: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all providers from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of providers with pagination
 */
export async function listProviders(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  providers: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/provider`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      providers: response.data.Provider || response.data.providers || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        providers: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      providers: null,
      timestamp: new Date().toISOString(),
      error: `Error listing providers: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all agreements from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of agreements with pagination
 */
export async function listAgreements(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  agreements: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/agreement`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      agreements: response.data.Agreement || response.data.agreements || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        agreements: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      agreements: null,
      timestamp: new Date().toISOString(),
      error: `Error listing agreements: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all substations from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of substations with pagination
 */
export async function listSubstations(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  substations: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/substation`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      substations: response.data.Substation || response.data.substations || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        substations: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      substations: null,
      timestamp: new Date().toISOString(),
      error: `Error listing substations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all allocations from consensus API
 * 
 * @param paginationKey - Optional pagination key
 * @param paginationLimit - Optional page size limit
 * @returns List of allocations with pagination
 */
export async function listAllocations(
  paginationKey?: string,
  paginationLimit?: number
): Promise<{
  allocations: unknown;
  pagination?: {
    next_key: string | null;
    total: string;
  };
  timestamp: string;
  error?: string;
}> {
  try {
    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/allocation`;
    
    const params: Record<string, string> = {};
    if (paginationKey) {
      params['pagination.key'] = paginationKey;
    }
    if (paginationLimit) {
      params['pagination.limit'] = paginationLimit.toString();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000,
    });

    return {
      allocations: response.data.Allocation || response.data.allocations || response.data,
      pagination: response.data.pagination,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        allocations: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      allocations: null,
      timestamp: new Date().toISOString(),
      error: `Error listing allocations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query planet activity log from database
 * 
 * @param planetId - Planet ID (e.g., "2-1")
 * @param limit - Optional limit for number of entries (default: 100)
 * @param startTime - Optional start time (ISO timestamp)
 * @param endTime - Optional end time (ISO timestamp)
 * @returns Planet activity log entries
 */
export async function queryPlanetActivity(
  planetId: string,
  limit?: number,
  startTime?: string,
  endTime?: string
): Promise<{
  activities: Array<{
    time: string;
    seq: number;
    planet_id: string;
    category: string;
    detail: unknown;
  }>;
  timestamp: string;
  error?: string;
  details?: {
    tool: string;
    required: string;
  };
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(planetId, 'planet');
    if (!validation.valid) {
      return {
        activities: [],
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid planet ID',
      };
    }

    // Check DANGER mode (planet activity requires database access)
    if (!isDangerEnabled()) {
      const errorResponse = getDangerErrorResponse(
        'structs_query_planet_activity',
        'database queries'
      );
      return {
        activities: [],
        timestamp: new Date().toISOString(),
        ...errorResponse,
      };
    }

    // Check if database is available
    if (!config.databaseUrl) {
      return {
        activities: [],
        timestamp: new Date().toISOString(),
        error: 'DATABASE_URL is required for planet activity queries',
      };
    }

    // Build query
    let queryText = `
      SELECT 
        time,
        seq,
        planet_id,
        category,
        detail
      FROM structs.planet_activity
      WHERE planet_id = $1
    `;
    const params: any[] = [planetId];

    // Add time filters
    if (startTime) {
      queryText += ` AND time >= $${params.length + 1}`;
      params.push(startTime);
    }
    if (endTime) {
      queryText += ` AND time <= $${params.length + 1}`;
      params.push(endTime);
    }

    // Order by time descending (most recent first)
    queryText += ` ORDER BY time DESC, seq DESC`;

    // Add limit
    const queryLimit = limit || 100;
    queryText += ` LIMIT $${params.length + 1}`;
    params.push(queryLimit);

    const result = await executeQuery(queryText, params);

    return {
      activities: result.rows.map((row) => ({
        time: row.time instanceof Date ? row.time.toISOString() : row.time,
        seq: row.seq,
        planet_id: row.planet_id,
        category: row.category,
        detail: row.detail, // JSONB field
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      activities: [],
      timestamp: new Date().toISOString(),
      error: `Error querying planet activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query fleet state from consensus API
 * 
 * @param fleetId - Fleet ID (e.g., "3-1")
 * @returns Fleet data
 */
export async function queryFleet(fleetId: string): Promise<{
  fleet: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(fleetId, 'fleet');
    if (!validation.valid) {
      return {
        fleet: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid fleet ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/fleet/${fleetId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      fleet: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        fleet: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      fleet: null,
      timestamp: new Date().toISOString(),
      error: `Error querying fleet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query struct state from consensus API
 * 
 * @param structId - Struct ID (e.g., "5-1")
 * @returns Struct data
 */
export async function queryStruct(structId: string): Promise<{
  struct: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(structId, 'struct');
    if (!validation.valid) {
      return {
        struct: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid struct ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/struct/${structId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      struct: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        struct: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      struct: null,
      timestamp: new Date().toISOString(),
      error: `Error querying struct: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query reactor state from consensus API
 * 
 * @param reactorId - Reactor ID (e.g., "4-1")
 * @returns Reactor data
 */
export async function queryReactor(reactorId: string): Promise<{
  reactor: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(reactorId, 'reactor');
    if (!validation.valid) {
      return {
        reactor: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid reactor ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/reactor/${reactorId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      reactor: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        reactor: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      reactor: null,
      timestamp: new Date().toISOString(),
      error: `Error querying reactor: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query substation state from consensus API
 * 
 * @param substationId - Substation ID (e.g., "6-1")
 * @returns Substation data
 */
export async function querySubstation(substationId: string): Promise<{
  substation: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(substationId, 'substation');
    if (!validation.valid) {
      return {
        substation: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid substation ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/substation/${substationId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      substation: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        substation: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      substation: null,
      timestamp: new Date().toISOString(),
      error: `Error querying substation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query provider state from consensus API
 * 
 * @param providerId - Provider ID (e.g., "7-1")
 * @returns Provider data
 */
export async function queryProvider(providerId: string): Promise<{
  provider: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(providerId, 'provider');
    if (!validation.valid) {
      return {
        provider: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid provider ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/provider/${providerId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      provider: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        provider: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      provider: null,
      timestamp: new Date().toISOString(),
      error: `Error querying provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query agreement state from consensus API
 * 
 * @param agreementId - Agreement ID (e.g., "8-1")
 * @returns Agreement data
 */
export async function queryAgreement(agreementId: string): Promise<{
  agreement: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(agreementId, 'agreement');
    if (!validation.valid) {
      return {
        agreement: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid agreement ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/agreement/${agreementId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      agreement: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        agreement: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      agreement: null,
      timestamp: new Date().toISOString(),
      error: `Error querying agreement: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query allocation state from consensus API
 * 
 * @param allocationId - Allocation ID (e.g., "9-1")
 * @returns Allocation data
 */
export async function queryAllocation(allocationId: string): Promise<{
  allocation: unknown;
  timestamp: string;
  error?: string;
}> {
  try {
    // Validate entity ID
    const validation = validateEntityId(allocationId, 'allocation');
    if (!validation.valid) {
      return {
        allocation: null,
        timestamp: new Date().toISOString(),
        error: validation.error || 'Invalid allocation ID',
      };
    }

    const apiConfig = getAPIConfig();
    const url = `${apiConfig.consensusRPCUrl}/structs/allocation/${allocationId}`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    return {
      allocation: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        allocation: null,
        timestamp: new Date().toISOString(),
        error: `API error: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`,
      };
    }
    return {
      allocation: null,
      timestamp: new Date().toISOString(),
      error: `Error querying allocation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query work information from view.work database table
 * 
 * Gets block_start and difficulty for proof-of-work operations
 * 
 * @param entityId - Entity ID (struct ID for building/mining/refining, fleet ID for raids)
 * @param actionType - Action type to determine which work record to query
 * @returns Work information with block_start and difficulty
 */
export async function queryWorkInfo(
  entityId: string,
  actionType: string
): Promise<{
  block_start?: number;
  difficulty?: number;
  block_time?: string;
  /**
   * For raids, this is typically the target planet ID (e.g. "2-1").
   * For other actions, this will usually be undefined.
   */
  target_id?: string;
  timestamp: string;
  error?: string;
}> {
  try {
    // Check if database is available
    if (!config.databaseUrl) {
      return {
        timestamp: new Date().toISOString(),
        error: 'DATABASE_URL is required for work info queries',
      };
    }

    // Map action types to categories in view.work
    // view.work structure: object_id, player_id, target_id, category, block_start, difficulty_target
    // Categories: 'BUILD', 'MINE', 'REFINE', 'RAID'
    const workTypeMap: Record<string, string> = {
      'struct_build_complete': 'BUILD',
      'ore_miner_complete': 'MINE',
      'ore_refinery_complete': 'REFINE',
      'planet_raid_complete': 'RAID',
    };

    const workCategory = workTypeMap[actionType];
    if (!workCategory) {
      return {
        timestamp: new Date().toISOString(),
        error: `Unknown action type: ${actionType}`,
      };
    }

    // Try to query view.work first
    // view.work structure: object_id, player_id, target_id, category, block_start, difficulty_target
    let queryText = `
      SELECT 
        block_start,
        difficulty_target,
        target_id
      FROM view.work
      WHERE object_id = $1 
        AND category = $2
      ORDER BY block_start DESC
      LIMIT 1
    `;
    
    let result = await executeQuery(queryText, [entityId, workCategory]);

    // If view.work doesn't have the record, try fallback queries based on action type
    if (result.rows.length === 0) {
      if (actionType === 'struct_build_complete') {
        // For struct builds, try querying struct_attribute for blockStartBuild
        // Also get difficulty from struct_type
        queryText = `
          SELECT 
            sa.val as block_start_build,
            st.build_difficulty as difficulty
          FROM structs.struct s
          JOIN structs.struct_attribute sa ON sa.object_id = s.id 
            AND sa.attribute_type = 'blockStartBuild'
          JOIN structs.struct_type st ON st.id = s.type
          WHERE s.id = $1
          LIMIT 1
        `;
        result = await executeQuery(queryText, [entityId]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          // val might be stored as numeric, text, or JSONB - handle all cases
          let blockStart: number | undefined;
          if (row.block_start_build !== null && row.block_start_build !== undefined) {
            if (typeof row.block_start_build === 'number') {
              blockStart = row.block_start_build;
            } else if (typeof row.block_start_build === 'string') {
              blockStart = parseInt(row.block_start_build, 10);
              if (isNaN(blockStart)) blockStart = undefined;
            } else if (typeof row.block_start_build === 'object') {
              // JSONB case - try to extract numeric value
              const parsed = typeof row.block_start_build === 'object' && 'value' in row.block_start_build
                ? row.block_start_build.value
                : row.block_start_build;
              blockStart = typeof parsed === 'number' ? parsed : parseInt(String(parsed), 10);
              if (isNaN(blockStart)) blockStart = undefined;
            }
          }
          
          return {
            block_start: blockStart,
            difficulty: row.difficulty ? Number(row.difficulty) : undefined,
            timestamp: new Date().toISOString(),
          };
        }
      } else if (actionType === 'ore_miner_complete' || actionType === 'ore_refinery_complete') {
        // For mining/refining, try struct_attribute for blockStartMining/blockStartRefining
        const attributeType = actionType === 'ore_miner_complete' ? 'blockStartMining' : 'blockStartRefining';
        queryText = `
          SELECT 
            sa.val as block_start,
            st.ore_mining_difficulty as difficulty
          FROM structs.struct s
          JOIN structs.struct_attribute sa ON sa.object_id = s.id 
            AND sa.attribute_type = $2
          JOIN structs.struct_type st ON st.id = s.type
          WHERE s.id = $1
          LIMIT 1
        `;
        result = await executeQuery(queryText, [entityId, attributeType]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          // val might be stored as numeric, text, or JSONB - handle all cases
          let blockStart: number | undefined;
          if (row.block_start !== null && row.block_start !== undefined) {
            if (typeof row.block_start === 'number') {
              blockStart = row.block_start;
            } else if (typeof row.block_start === 'string') {
              blockStart = parseInt(row.block_start, 10);
              if (isNaN(blockStart)) blockStart = undefined;
            } else if (typeof row.block_start === 'object') {
              // JSONB case - try to extract numeric value
              const parsed = typeof row.block_start === 'object' && 'value' in row.block_start
                ? row.block_start.value
                : row.block_start;
              blockStart = typeof parsed === 'number' ? parsed : parseInt(String(parsed), 10);
              if (isNaN(blockStart)) blockStart = undefined;
            }
          }
          
          return {
            block_start: blockStart,
            difficulty: row.difficulty ? Number(row.difficulty) : undefined,
            timestamp: new Date().toISOString(),
          };
        }
      } else if (actionType === 'planet_raid_complete') {
        // For raids, try fleet table or planet_raid table
        // This might need different handling - raids might be tracked differently
        return {
          timestamp: new Date().toISOString(),
          error: `No work record found for entity ${entityId} with category ${workCategory}. Raid completion may need different query.`,
        };
      }

      // If all fallbacks failed
      return {
        timestamp: new Date().toISOString(),
        error: `No work record found for entity ${entityId} with category ${workCategory}. Tried view.work and fallback queries.`,
      };
    }

    const work = result.rows[0];
    return {
      block_start: work.block_start ? Number(work.block_start) : undefined,
      difficulty: work.difficulty_target ? Number(work.difficulty_target) : undefined,
      // Pass through target_id for cases (like raids) where it's needed to
      // construct the correct proof-of-work input (e.g. "fleetId@planetId").
      target_id: work.target_id || undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: `Error querying work info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

