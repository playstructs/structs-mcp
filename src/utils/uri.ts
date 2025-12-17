/**
 * URI utilities for resource URI parsing and validation
 * 
 * @module utils/uri
 */

/**
 * Parse a structs:// resource URI
 * 
 * @param uri - Resource URI (e.g., "structs://schemas/entities/player.json")
 * @returns Parsed URI components or null if invalid
 */
export function parseResourceURI(uri: string): {
  category: string;
  path: string;
  fragment?: string;
} | null {
  // Remove fragment if present
  const [uriPart, fragment] = uri.split('#');
  
  // Check if it's a structs:// URI
  if (!uriPart.startsWith('structs://')) {
    return null;
  }
  
  // Remove scheme
  const pathPart = uriPart.replace('structs://', '');
  
  // Split category and path
  const parts = pathPart.split('/');
  if (parts.length < 2) {
    return null;
  }
  
  const category = parts[0];
  const path = parts.slice(1).join('/');
  
  return {
    category,
    path,
    fragment: fragment || undefined,
  };
}

/**
 * Convert a structs:// URI to a file system path
 * 
 * @param uri - Resource URI
 * @param aiDocsPath - Base path to /ai directory
 * @returns File system path or null if invalid
 */
export function uriToFilePath(
  uri: string,
  aiDocsPath: string
): string | null {
  const parsed = parseResourceURI(uri);
  if (!parsed) {
    return null;
  }
  
  // Map category to directory
  const categoryMap: Record<string, string> = {
    schemas: 'schemas',
    api: 'api',
    protocols: 'protocols',
    examples: 'examples',
    reference: 'reference',
    patterns: 'patterns',
    visuals: 'visuals',
    guides: '', // Guides are in root of /ai
  };
  
  const categoryDir = categoryMap[parsed.category];
  if (!categoryDir && parsed.category !== 'guides') {
    return null;
  }
  
  // Build file path
  if (parsed.category === 'guides') {
    return `${aiDocsPath}/${parsed.path}`;
  }
  
  return `${aiDocsPath}/${categoryDir}/${parsed.path}`;
}

/**
 * Validate a resource URI format
 * 
 * @param uri - Resource URI to validate
 * @returns true if valid format
 */
export function isValidResourceURI(uri: string): boolean {
  return parseResourceURI(uri) !== null;
}

