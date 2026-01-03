/**
 * Tool Metadata Utilities
 * 
 * Provides metadata about tools for AI agent discovery and filtering.
 * This helps AI agents quickly identify relevant tools without parsing descriptions.
 * 
 * @module utils/tool-metadata
 */

import { getAllToolDefinitions } from '../tools/definitions/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool categories
 */
export type ToolCategory = 
  | 'query'
  | 'action'
  | 'calculation'
  | 'validation'
  | 'workflow'
  | 'error_lookup'
  | 'gameplay';

/**
 * Entity types that tools operate on
 */
export type EntityType =
  | 'player'
  | 'planet'
  | 'guild'
  | 'struct'
  | 'fleet'
  | 'reactor'
  | 'substation'
  | 'provider'
  | 'agreement'
  | 'allocation'
  | 'struct_type'
  | 'none'; // For tools that don't operate on a specific entity

/**
 * Tool metadata for AI agent discovery
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  entityType?: EntityType;
  isListTool?: boolean;
  isQueryTool?: boolean;
  isActionTool?: boolean;
  isCalculationTool?: boolean;
  isValidationTool?: boolean;
  isWorkflowTool?: boolean;
  tags?: string[]; // Additional tags for filtering
}

/**
 * Extract category from tool name
 */
function extractCategory(toolName: string): ToolCategory {
  if (toolName.startsWith('structs_query_')) return 'query';
  if (toolName.startsWith('structs_list_')) return 'query';
  if (toolName.startsWith('structs_action_')) return 'action';
  if (toolName.startsWith('structs_calculate_')) return 'calculation';
  if (toolName.startsWith('structs_validate_')) return 'validation';
  if (toolName.startsWith('structs_workflow_')) return 'workflow';
  if (toolName.startsWith('structs_lookup_')) return 'error_lookup';
  if (toolName.startsWith('structs_validate_gameplay_')) return 'gameplay';
  return 'query'; // Default fallback
}

/**
 * Extract entity type from tool name
 */
function extractEntityType(toolName: string): EntityType | undefined {
  // List tools
  const listMatch = toolName.match(/^structs_list_(.+)$/);
  if (listMatch) {
    const entity = listMatch[1];
    if (entity === 'struct_types') return 'struct_type';
    return entity as EntityType;
  }

  // Query tools
  const queryMatch = toolName.match(/^structs_query_(.+)$/);
  if (queryMatch) {
    const entity = queryMatch[1];
    // Special cases
    if (entity === 'endpoints' || entity === 'planet_activity' || entity === 'work_info' || entity === 'proof_of_work_status') {
      return undefined;
    }
    return entity as EntityType;
  }

  // Action tools that operate on entities
  if (toolName.includes('player')) return 'player';
  if (toolName.includes('planet')) return 'planet';
  if (toolName.includes('guild')) return 'guild';
  if (toolName.includes('struct') && !toolName.includes('struct_type')) return 'struct';
  if (toolName.includes('fleet')) return 'fleet';
  if (toolName.includes('reactor')) return 'reactor';
  if (toolName.includes('substation')) return 'substation';
  if (toolName.includes('provider')) return 'provider';
  if (toolName.includes('agreement')) return 'agreement';
  if (toolName.includes('allocation')) return 'allocation';

  return undefined;
}

/**
 * Extract additional tags from tool name and description
 */
function extractTags(toolName: string, description: string): string[] {
  const tags: string[] = [];
  const lowerName = toolName.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // Operation tags
  if (lowerName.includes('list') || lowerDesc.includes('list')) tags.push('list');
  if (lowerName.includes('query') || lowerDesc.includes('get information')) tags.push('read');
  if (lowerName.includes('create') || lowerDesc.includes('create')) tags.push('create');
  if (lowerName.includes('build') || lowerDesc.includes('build')) tags.push('build');
  if (lowerName.includes('move') || lowerDesc.includes('move')) tags.push('move');
  if (lowerName.includes('attack') || lowerDesc.includes('attack')) tags.push('combat');
  if (lowerName.includes('activate') || lowerDesc.includes('activate')) tags.push('activate');
  if (lowerName.includes('validate') || lowerDesc.includes('validate')) tags.push('validation');
  if (lowerName.includes('calculate') || lowerDesc.includes('calculate')) tags.push('calculation');
  if (lowerName.includes('workflow') || lowerDesc.includes('workflow')) tags.push('workflow');
  if (lowerName.includes('proof_of_work') || lowerDesc.includes('proof-of-work')) tags.push('proof-of-work');
  if (lowerName.includes('pagination') || lowerDesc.includes('pagination')) tags.push('pagination');
  if (lowerName.includes('reference') || lowerDesc.includes('reference')) tags.push('references');

  // Resource tags
  if (lowerDesc.includes('alpha matter') || lowerDesc.includes('alpha_matter')) tags.push('alpha-matter');
  if (lowerDesc.includes('energy') || lowerDesc.includes('power')) tags.push('energy');
  if (lowerDesc.includes('ore') || lowerDesc.includes('mining')) tags.push('mining');
  if (lowerDesc.includes('refining') || lowerDesc.includes('refinery')) tags.push('refining');
  if (lowerDesc.includes('raid') || lowerDesc.includes('raiding')) tags.push('raiding');
  if (lowerDesc.includes('combat') || lowerDesc.includes('damage')) tags.push('combat');
  if (lowerDesc.includes('trade') || lowerDesc.includes('economics')) tags.push('economics');

  return tags;
}

/**
 * Get metadata for all tools
 */
export function getAllToolMetadata(): ToolMetadata[] {
  const tools = getAllToolDefinitions();
  return tools.map(tool => ({
    name: tool.name,
    category: extractCategory(tool.name),
    entityType: extractEntityType(tool.name),
    isListTool: tool.name.startsWith('structs_list_'),
    isQueryTool: tool.name.startsWith('structs_query_') || tool.name.startsWith('structs_list_'),
    isActionTool: tool.name.startsWith('structs_action_'),
    isCalculationTool: tool.name.startsWith('structs_calculate_'),
    isValidationTool: tool.name.startsWith('structs_validate_'),
    isWorkflowTool: tool.name.startsWith('structs_workflow_'),
    tags: extractTags(tool.name, tool.description || ''),
  }));
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
  return getAllToolMetadata().filter(tool => tool.category === category);
}

/**
 * Get tools by entity type
 */
export function getToolsByEntityType(entityType: EntityType): ToolMetadata[] {
  return getAllToolMetadata().filter(tool => tool.entityType === entityType);
}

/**
 * Get tools by tag
 */
export function getToolsByTag(tag: string): ToolMetadata[] {
  return getAllToolMetadata().filter(tool => 
    tool.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Search tools by name, description, or tags
 */
export function searchTools(query: string): ToolMetadata[] {
  const lowerQuery = query.toLowerCase();
  const allMetadata = getAllToolMetadata();
  const tools = getAllToolDefinitions();
  
  return allMetadata.filter((metadata, index) => {
    const tool = tools[index];
    return (
      metadata.name.toLowerCase().includes(lowerQuery) ||
      tool.description?.toLowerCase().includes(lowerQuery) ||
      metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      metadata.category.toLowerCase().includes(lowerQuery) ||
      metadata.entityType?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get tool metadata for a specific tool
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return getAllToolMetadata().find(tool => tool.name === toolName);
}

/**
 * Get all available categories
 */
export function getCategories(): ToolCategory[] {
  return ['query', 'action', 'calculation', 'validation', 'workflow', 'error_lookup', 'gameplay'];
}

/**
 * Get all available entity types
 */
export function getEntityTypes(): EntityType[] {
  return [
    'player',
    'planet',
    'guild',
    'struct',
    'fleet',
    'reactor',
    'substation',
    'provider',
    'agreement',
    'allocation',
    'struct_type',
    'none',
  ];
}

