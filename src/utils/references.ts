/**
 * References Utility
 * 
 * Core functionality for extracting entity IDs from responses and resolving
 * references to include full entity data.
 * 
 * @module utils/references
 */

import {
  EntityType,
  References,
  ReferencedEntity,
  ReferenceOptions,
  DEFAULT_REFERENCE_OPTIONS,
  getEntityTypeFromId,
  isValidEntityId,
} from '../types/references.js';
import {
  queryPlayer,
  queryPlanet,
  queryGuild,
  queryFleet,
  queryStruct,
  queryReactor,
  querySubstation,
  queryProvider,
  queryAgreement,
  queryAllocation,
} from '../tools/query.js';
import { config } from '../config.js';
import axios, { AxiosError } from 'axios';

/**
 * Non-entity fields that should never be treated as entity IDs
 */
const NON_ENTITY_FIELDS = new Set([
  'version',
  'schema_version',
  'api_version',
  'coordinates',
  'position',
  'range',
  'timestamp',
  'created_at',
  'updated_at',
  'pagination',
  'next_key',
  'total',
]);

/**
 * Primary reference fields (for list tools - only include these)
 */
const PRIMARY_REFERENCE_FIELDS = new Set([
  'owner',
  'guildId',
  'guild_id',
  'planetId',
  'planet_id',
  'fleetId',
  'fleet_id',
  'substationId',
  'substation_id',
  'reactorId',
  'reactor_id',
  'primaryReactorId',
  'primary_reactor_id',
  'entrySubstationId',
  'entry_substation_id',
]);

/**
 * Simple in-memory cache for resolved references
 */
interface CacheEntry {
  data: ReferencedEntity;
  timestamp: number;
}

class ReferenceCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttl: number = 30000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(entityId: string): ReferencedEntity | null {
    const entry = this.cache.get(entityId);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(entityId);
      return null;
    }

    return entry.data;
  }

  set(entityId: string, data: ReferencedEntity): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(entityId)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(entityId, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance (uses config values if available)
const referenceCache = new ReferenceCache(
  config.references?.cacheMaxSize ?? 1000,
  config.references?.cacheTTL ?? 30000
);

/**
 * Extract all entity IDs from a response payload
 * 
 * @param data - Response data to scan
 * @param excludeId - Optional entity ID to exclude (self-reference)
 * @param options - Reference options for filtering
 * @param fieldPath - Current field path (for tracking)
 * @param collectedIds - Set of already collected IDs (for deduplication)
 * @returns Map of entity type to set of entity IDs
 */
export function extractEntityIds(
  data: unknown,
  excludeId?: string,
  options?: ReferenceOptions,
  fieldPath: string = '',
  collectedIds: Set<string> = new Set()
): Map<EntityType, Set<string>> {
  const result = new Map<EntityType, Set<string>>();
  const isPrimaryOnly = options?.include_references === 'primary';
  const maxPerEntity = options?.max_references_per_entity ?? DEFAULT_REFERENCE_OPTIONS.max_references_per_entity;

  function traverse(value: unknown, path: string, entityCount: number = 0): void {
    if (value === null || value === undefined) {
      return;
    }

    // Check if we've exceeded per-entity limit (for list tools)
    if (isPrimaryOnly && entityCount >= maxPerEntity) {
      return;
    }

    if (typeof value === 'string') {
      // Check if it matches entity ID pattern
      if (isValidEntityId(value)) {
        // Exclude self-reference
        if (excludeId && value === excludeId) {
          return;
        }

        // Skip if already collected
        if (collectedIds.has(value)) {
          return;
        }

        // For primary-only mode, check if field is a primary reference field
        if (isPrimaryOnly) {
          const fieldName = path.split('.').pop() || '';
          if (!PRIMARY_REFERENCE_FIELDS.has(fieldName)) {
            return;
          }
        }

        // Check field name blacklist
        const fieldName = path.split('.').pop() || '';
        if (NON_ENTITY_FIELDS.has(fieldName)) {
          return;
        }

        const entityType = getEntityTypeFromId(value);
        if (entityType) {
          // Check type filter if specified
          if (options?.reference_types && !options.reference_types.includes(entityType)) {
            return;
          }

          if (!result.has(entityType)) {
            result.set(entityType, new Set());
          }
          result.get(entityType)!.add(value);
          collectedIds.add(value);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        traverse(item, `${path}[${index}]`, entityCount);
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => {
        // Skip non-entity fields
        if (NON_ENTITY_FIELDS.has(key)) {
          return;
        }

        const newPath = path ? `${path}.${key}` : key;
        traverse(val, newPath, entityCount);
      });
    }
  }

  traverse(data, fieldPath);
  return result;
}

/**
 * Query entity by ID and type
 */
async function queryEntityById(
  entityId: string,
  entityType: EntityType,
  timeout: number
): Promise<ReferencedEntity> {
  // Check cache first (if enabled)
  if (config.references?.cacheEnabled !== false) {
    const cached = referenceCache.get(entityId);
    if (cached) {
      return cached;
    }
  }

  try {
    let entityData: unknown;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout);
    });

    // Query based on entity type
    const queryPromise = (async () => {
      switch (entityType) {
        case 'player':
          const playerResult = await queryPlayer(entityId);
          entityData = playerResult.player;
          break;
        case 'planet':
          const planetResult = await queryPlanet(entityId);
          entityData = planetResult.planet;
          break;
        case 'guild':
          const guildResult = await queryGuild(entityId);
          entityData = guildResult.guild;
          break;
        case 'fleet':
          const fleetResult = await queryFleet(entityId);
          entityData = fleetResult.fleet;
          break;
        case 'struct':
          const structResult = await queryStruct(entityId);
          entityData = structResult.struct;
          break;
        case 'reactor':
          const reactorResult = await queryReactor(entityId);
          entityData = reactorResult.reactor;
          break;
        case 'substation':
          const substationResult = await querySubstation(entityId);
          entityData = substationResult.substation;
          break;
        case 'provider':
          const providerResult = await queryProvider(entityId);
          entityData = providerResult.provider;
          break;
        case 'agreement':
          const agreementResult = await queryAgreement(entityId);
          entityData = agreementResult.agreement;
          break;
        case 'allocation':
          const allocationResult = await queryAllocation(entityId);
          entityData = allocationResult.allocation;
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    })();

    await Promise.race([queryPromise, timeoutPromise]);

    if (!entityData) {
      throw new Error('Entity not found');
    }

    // Build referenced entity
    const referencedEntity: ReferencedEntity = {
      reference_type: entityType,
      id: entityId,
      status: 'success',
      ...(typeof entityData === 'object' && entityData !== null ? entityData as Record<string, unknown> : {}),
    };

    // Cache the result (if enabled)
    if (config.references?.cacheEnabled !== false) {
      referenceCache.set(entityId, referencedEntity);
    }

    return referencedEntity;
  } catch (error) {
    // Return error indicator
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const referencedEntity: ReferencedEntity = {
      reference_type: entityType,
      id: entityId,
      status: 'failed',
      error: errorMessage,
    };

    // Don't cache errors
    return referencedEntity;
  }
}

/**
 * Resolve references with rate limiting and parallel query control
 */
async function resolveReferencesWithThrottle(
  entityIds: string[],
  options: ReferenceOptions,
  resolvedIds: Set<string> = new Set()
): Promise<References> {
  const references: References = {};
  const maxParallel = options.max_parallel_queries ?? DEFAULT_REFERENCE_OPTIONS.max_parallel_queries;
  const timeout = options.reference_query_timeout ?? DEFAULT_REFERENCE_OPTIONS.reference_query_timeout;
  const maxReferences = options.max_references ?? DEFAULT_REFERENCE_OPTIONS.max_references;

  // Filter out already resolved IDs
  const idsToResolve = entityIds.filter(id => !resolvedIds.has(id));

  if (idsToResolve.length === 0) {
    return references;
  }

  // Process with concurrency limit using a semaphore-like pattern
  const pending: Promise<void>[] = [];
  let activeCount = 0;

  for (const entityId of idsToResolve) {
    // Check if we've reached the max references limit
    if (Object.keys(references).length >= maxReferences) {
      break;
    }

    // Wait for a slot if we're at max parallel
    while (activeCount >= maxParallel && pending.length > 0) {
      await Promise.race(pending);
      // Remove completed promises
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        // Check if promise is settled (this is a simple check)
        // In practice, we'll let Promise.race handle it
      }
    }

    const entityType = getEntityTypeFromId(entityId);
    if (!entityType) {
      continue;
    }

    activeCount++;
    const queryPromise = queryEntityById(entityId, entityType, timeout)
      .then((referencedEntity) => {
        // Check limit again before adding
        if (Object.keys(references).length < maxReferences) {
          references[entityId] = referencedEntity;
          resolvedIds.add(entityId);
        }
        activeCount--;
      })
      .catch(() => {
        // Error already handled in queryEntityById, but we still got a result
        activeCount--;
      })
      .finally(() => {
        // Remove from pending
        const index = pending.indexOf(queryPromise);
        if (index > -1) {
          pending.splice(index, 1);
        }
      });

    pending.push(queryPromise);
  }

  // Wait for all remaining queries
  await Promise.allSettled(pending);

  return references;
}

/**
 * Resolve references from extracted entity IDs
 * 
 * @param entityIdsByType - Map of entity type to set of entity IDs
 * @param options - Reference options
 * @param resolvedIds - Set of already resolved IDs (for depth limiting)
 * @returns References object
 */
export async function resolveReferences(
  entityIdsByType: Map<EntityType, Set<string>>,
  options: ReferenceOptions,
  resolvedIds: Set<string> = new Set()
): Promise<References> {
  // Flatten all IDs
  const allIds: string[] = [];
  for (const [entityType, ids] of entityIdsByType.entries()) {
    // Check type filter if specified
    if (options.reference_types && !options.reference_types.includes(entityType)) {
      continue;
    }
    allIds.push(...Array.from(ids));
  }

  if (allIds.length === 0) {
    return {};
  }

  // Resolve with throttling
  const references = await resolveReferencesWithThrottle(allIds, options, resolvedIds);

  // Handle depth > 1 (recursive references)
  const depth = options.reference_depth ?? DEFAULT_REFERENCE_OPTIONS.reference_depth;
  if (depth > 1 && Object.keys(references).length > 0) {
    // Extract IDs from resolved references
    const nestedIdsByType = new Map<EntityType, Set<string>>();
    
    for (const [entityId, referencedEntity] of Object.entries(references)) {
      if (referencedEntity.status === 'success') {
        // Extract IDs from this entity's data
        const nestedIds = extractEntityIds(
          referencedEntity,
          entityId, // Exclude self-reference
          { ...options, reference_depth: depth - 1 },
          '',
          resolvedIds
        );
        
        // Merge into nestedIdsByType
        for (const [type, ids] of nestedIds.entries()) {
          if (!nestedIdsByType.has(type)) {
            nestedIdsByType.set(type, new Set());
          }
          ids.forEach(id => nestedIdsByType.get(type)!.add(id));
        }
      }
    }

    // Resolve nested references
    if (nestedIdsByType.size > 0) {
      const nestedReferences = await resolveReferences(
        nestedIdsByType,
        { ...options, reference_depth: depth - 1 },
        resolvedIds
      );
      
      // Merge nested references (deduplication handled by object keys)
      Object.assign(references, nestedReferences);
    }
  }

  return references;
}

/**
 * Add references to response
 * 
 * @param response - Original response object
 * @param references - Resolved references
 * @returns Response with references added
 */
export function addReferencesToResponse(
  response: Record<string, unknown>,
  references: References
): Record<string, unknown> {
  // Add references at same level as existing fields (no wrapper)
  return {
    ...response,
    references: Object.keys(references).length > 0 ? references : undefined,
  };
}

/**
 * Clear reference cache (useful for testing)
 */
export function clearReferenceCache(): void {
  referenceCache.clear();
}

