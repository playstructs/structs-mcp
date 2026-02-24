/**
 * Tool Definition Factories
 * 
 * Factory functions for creating tool definitions with common patterns.
 * 
 * @module tools/definitions/factories
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Create a query tool definition for a single entity
 */
export function createQueryTool(
  entityName: string,
  entityIdPattern: string
): Tool {
  const entityId = `${entityName.toLowerCase()}_id`;
  const descriptions: Record<string, string> = {
    Player: "Get information about a player, including their resources, location, and owned entities",
    Planet: "Get information about a planet, including its owner, resources, and structures",
    Guild: "Get information about a guild, including its members, resources, and structures",
    Fleet: "Get information about a fleet, including its owner, location, and ships",
    Struct: "Get information about a struct, including its owner, location, and status",
    Reactor: "Get information about a reactor, including its owner and power generation",
    Substation: "Get information about a substation, including its owner and connections",
    Provider: "Get information about a provider",
    Agreement: "Get information about an agreement",
    Allocation: "Get information about an allocation",
  };
  return {
    name: `structs_query_${entityName.toLowerCase()}`,
    description: descriptions[entityName] || `Get information about a ${entityName.toLowerCase()}`,
    inputSchema: {
      type: "object",
      properties: {
        [entityId]: {
          type: "string",
          description: `${entityName} ID in type-index format (e.g., '${entityIdPattern}'). Can also be passed as "id" for compatibility.`,
        },
        id: {
          type: "string",
          description: `Alias for ${entityId}. Entity ID in type-index format (e.g., '${entityIdPattern}'). Either this or ${entityId} must be provided.`,
        },
        include_references: {
          anyOf: [
            { type: "boolean" },
            { type: "string", enum: ["primary", "all"] }
          ],
          description: "Include detailed information about related entities. false: no extra details (default), true or 'all': include all related entities, 'primary': only include direct relationships (like owner). Recommended: use 'primary' for list tools to avoid large responses.",
          default: false,
        },
        reference_depth: {
          type: "number",
          description: "Depth of reference resolution. 1: direct references only (default), 2: includes references of references. Max: 2.",
          default: 1,
          minimum: 1,
          maximum: 2,
        },
        reference_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["guild", "player", "planet", "reactor", "substation", "struct", "allocation", "infusion", "address", "fleet", "provider", "agreement"],
          },
          description: "Optional: only include references of these entity types",
        },
        max_references: {
          type: "number",
          description: "Maximum number of related entities to include (optional, default: 50). Prevents responses from getting too large.",
          default: 50,
        },
        max_parallel_queries: {
          type: "number",
          description: "Maximum number of related entity lookups to do at the same time (optional, default: 5). Higher values may be faster but use more resources.",
          default: 5,
        },
        reference_query_timeout: {
          type: "number",
          description: "Maximum time to wait for each related entity lookup in milliseconds (optional, default: 2000). If a lookup takes longer, it will be skipped.",
          default: 2000,
        },
      },
      // Either entity-specific id (e.g. player_id) or generic id must be provided
      required: [entityId],
    },
  };
}

/**
 * Create a list tool definition with pagination
 */
export function createListTool(
  entityName: string,
  description?: string
): Tool {
  // Handle special case for struct_type -> struct_types
  const pluralName = entityName === 'struct_type' ? 'struct_types' : entityName.toLowerCase() + 's';
  return {
    name: `structs_list_${pluralName}`,
    description: description || `Get a list of all ${pluralName}. You can request more results using pagination.`,
    inputSchema: {
      type: "object",
      properties: {
        pagination_key: {
          type: "string",
          description: "Pagination key for the next page (optional). Use the key from the previous response to get more results.",
        },
        pagination_limit: {
          type: "number",
          description: "Maximum number of items to return per page (optional). Use this to control how many results you get at once.",
        },
        include_references: {
          anyOf: [
            { type: "boolean" },
            { type: "string", enum: ["primary", "all"] }
          ],
          description: "Include detailed information about related entities. false: no extra details (default), true or 'all': include all related entities, 'primary': only include direct relationships (like owner). Recommended: use 'primary' for list tools to avoid large responses.",
          default: false,
        },
        reference_depth: {
          type: "number",
          description: "How many levels of relationships to include. 1: only direct relationships (default, recommended), 2: also include relationships of those entities. Maximum: 2.",
          default: 1,
          minimum: 1,
          maximum: 2,
        },
        reference_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["guild", "player", "planet", "reactor", "substation", "struct", "allocation", "infusion", "address", "fleet", "provider", "agreement"],
          },
          description: "Optional: only include references of these entity types",
        },
        max_references: {
          type: "number",
          description: "Maximum number of related entities to include (optional, default: 50). Prevents responses from getting too large.",
          default: 50,
        },
        max_references_per_entity: {
          type: "number",
          description: "Maximum related entities to include per item in the list (optional, default: 5). Only applies when include_references is 'primary'.",
          default: 5,
        },
        max_parallel_queries: {
          type: "number",
          description: "Maximum number of related entity lookups to do at the same time (optional, default: 5). Higher values may be faster but use more resources.",
          default: 5,
        },
        reference_query_timeout: {
          type: "number",
          description: "Maximum time to wait for each related entity lookup in milliseconds (optional, default: 2000). If a lookup takes longer, it will be skipped.",
          default: 2000,
        },
      },
    },
  };
}

/**
 * Create a pagination schema (reusable)
 */
export const paginationSchema = {
  type: "object",
  properties: {
    pagination_key: {
      type: "string",
      description: "Optional pagination key for next page",
    },
    pagination_limit: {
      type: "number",
      description: "Optional page size limit",
    },
  },
} as const;
