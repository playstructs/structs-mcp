/**
 * Resource Server
 * 
 * Handles resource URI mapping and serving for MCP resources.
 * 
 * @module resources
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parseResourceURI, uriToFilePath } from '../utils/uri.js';
import { scanAllResources, getResourceMimeType } from './scanner.js';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extended Resource type with text content
 */
interface ResourceWithText extends Resource {
  text?: string;
}

/**
 * Resource cache (in-memory)
 */
const resourceCache = new Map<string, { content: string; mimeType: string; timestamp: number }>();

/**
 * Get resource from cache or file system
 * 
 * @param uri - Resource URI
 * @param aiDocsPath - Base path to /ai directory
 * @returns Resource content and metadata
 */
export async function getResource(
  uri: string,
  aiDocsPath: string
): Promise<ResourceWithText | null> {
  // Check cache first
  const cached = resourceCache.get(uri);
  if (cached) {
    return {
      uri,
      mimeType: cached.mimeType,
      text: cached.content,
    } as ResourceWithText;
  }
  
  // Parse URI
  const parsed = parseResourceURI(uri);
  if (!parsed) {
    return null;
  }

  // Convert to file path
  const filePath = uriToFilePath(uri, aiDocsPath);
  if (!filePath) {
    return null;
  }

  // Compendium is now Markdown-first (structs-ai). For legacy URIs that request
  // .json or .yaml, resolve to the same path with .md first.
  const ext = path.extname(filePath).toLowerCase();
  const legacyExtensions = ['.json', '.yaml', '.yml'];
  const resolvedPath =
    legacyExtensions.includes(ext) && parsed.path
      ? (() => {
          const basePath = path.join(path.dirname(filePath), path.basename(filePath, ext));
          const mdPath = `${basePath}.md`;
          return existsSync(mdPath) ? mdPath : filePath;
        })()
      : filePath;

  if (!existsSync(resolvedPath)) {
    return null;
  }

  // Read file
  try {
    const content = await readFile(resolvedPath, 'utf-8');

    // Determine MIME type from the resolved file's extension
    const mimeType = getMimeType(resolvedPath);
    
    // Cache resource
    resourceCache.set(uri, {
      content,
      mimeType,
      timestamp: Date.now(),
    });
    
    return {
      uri,
      mimeType,
      text: content,
    } as ResourceWithText;
  } catch (error) {
    console.error(`Error reading resource ${uri}:`, error);
    return null;
  }
}

/**
 * List available resources
 * 
 * @param aiDocsPath - Base path to /ai directory
 * @returns List of resource URIs
 */
export async function listResources(aiDocsPath: string): Promise<string[]> {
  return await scanAllResources(aiDocsPath);
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    md: 'text/markdown',
    txt: 'text/plain',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// Re-export for convenience
export { getResourceMimeType };

/**
 * Clear resource cache
 */
export function clearCache(): void {
  resourceCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: resourceCache.size,
    entries: Array.from(resourceCache.keys()),
  };
}

