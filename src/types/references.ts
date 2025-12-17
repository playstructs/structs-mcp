/**
 * References Feature Types
 * 
 * Type definitions for the references feature that includes full details
 * of all entity IDs referenced in MCP tool responses.
 * 
 * @module types/references
 */

/**
 * Entity type names (matching entity type codes 0-11)
 */
export type EntityType =
  | "guild"
  | "player"
  | "planet"
  | "reactor"
  | "substation"
  | "struct"
  | "allocation"
  | "infusion"
  | "address"
  | "fleet"
  | "provider"
  | "agreement";

/**
 * Entity type code to name mapping
 */
export const ENTITY_TYPE_MAP: Record<number, EntityType> = {
  0: "guild",
  1: "player",
  2: "planet",
  3: "reactor",
  4: "substation",
  5: "struct",
  6: "allocation",
  7: "infusion",
  8: "address",
  9: "fleet",
  10: "provider",
  11: "agreement",
};

/**
 * Entity type name to code mapping (reverse lookup)
 */
export const ENTITY_TYPE_CODE_MAP: Record<EntityType, number> = {
  guild: 0,
  player: 1,
  planet: 2,
  reactor: 3,
  substation: 4,
  struct: 5,
  allocation: 6,
  infusion: 7,
  address: 8,
  fleet: 9,
  provider: 10,
  agreement: 11,
};

/**
 * Referenced entity with full data or error indicator
 */
export interface ReferencedEntity {
  reference_type: EntityType;
  id: string;
  status?: "success" | "failed";
  error?: string;
  referenced_from?: string; // Field name where ID was found (e.g., "guildId")
  referenced_in?: string; // Entity that referenced it (e.g., "1-11")
  // ... full entity data from query endpoint (if status is "success" or undefined)
  [key: string]: unknown;
}

/**
 * References object - flat structure with entity IDs as keys
 */
export interface References {
  [entityId: string]: ReferencedEntity;
}

/**
 * Reference options for controlling reference resolution
 */
export interface ReferenceOptions {
  include_references?: boolean | "primary" | "all";
  reference_depth?: number; // Default: 1, Max: 2
  reference_types?: EntityType[]; // Optional: only include specific types
  max_references?: number; // Optional: max total references (default: 50)
  max_references_per_entity?: number; // Optional: max references per entity in lists (default: 5)
  max_parallel_queries?: number; // Optional: max concurrent queries (default: 5)
  reference_query_timeout?: number; // Optional: timeout per query in ms (default: 2000)
}

/**
 * Default reference options
 */
export const DEFAULT_REFERENCE_OPTIONS: Required<Omit<ReferenceOptions, "include_references" | "reference_types">> = {
  reference_depth: 1,
  max_references: 50,
  max_references_per_entity: 5,
  max_parallel_queries: 5,
  reference_query_timeout: 2000,
};

/**
 * Extract entity type from entity ID
 * 
 * @param entityId - Entity ID (e.g., "2-1")
 * @returns Entity type or null if invalid
 */
export function getEntityTypeFromId(entityId: string): EntityType | null {
  const match = entityId.match(/^(\d+)-(\d+)$/);
  if (!match) {
    return null;
  }
  
  const typeCode = parseInt(match[1], 10);
  if (typeCode < 0 || typeCode > 11) {
    return null; // Invalid type code
  }
  
  return ENTITY_TYPE_MAP[typeCode] || null;
}

/**
 * Check if an entity ID is valid
 * 
 * @param entityId - Entity ID to check
 * @returns True if valid entity ID format and type code
 */
export function isValidEntityId(entityId: string): boolean {
  return getEntityTypeFromId(entityId) !== null;
}

