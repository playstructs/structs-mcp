/**
 * Resource Scanner
 * 
 * Scans the /ai directory structure to discover all available resources.
 * 
 * @module resources/scanner
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parseResourceURI } from '../utils/uri.js';

/**
 * Category to directory mapping
 */
const categoryMap: Record<string, string> = {
  schemas: 'schemas',
  api: 'api',
  protocols: 'protocols',
  examples: 'examples',
  reference: 'reference',
  patterns: 'patterns',
  visuals: 'visuals',
  guides: '', // Guides are in root
};

/**
 * Scan directory for resources
 * 
 * @param dirPath - Directory path to scan
 * @param category - Resource category
 * @param aiDocsPath - Base path to /ai directory
 * @returns List of resource URIs
 */
async function scanDirectory(
  dirPath: string,
  category: string,
  aiDocsPath: string
): Promise<string[]> {
  const resources: string[] = [];
  
  // Check if directory exists before scanning
  if (!existsSync(dirPath)) {
    // Directory doesn't exist, return empty array (not an error)
    return resources;
  }
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subResources = await scanDirectory(fullPath, category, aiDocsPath);
        resources.push(...subResources);
      } else if (entry.isFile()) {
        // Build resource URI
        const relativePath = fullPath.replace(aiDocsPath + '/', '');
        const categoryDir = categoryMap[category] || '';
        
        let resourcePath: string;
        if (category === 'guides') {
          resourcePath = entry.name;
        } else if (categoryDir) {
          resourcePath = relativePath.replace(`${categoryDir}/`, '');
        } else {
          resourcePath = relativePath;
        }
        
        const uri = `structs://${category}/${resourcePath}`;
        resources.push(uri);
      }
    }
  } catch (error) {
    // Directory might have been deleted or become inaccessible
    // Log only unexpected errors (not ENOENT)
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }
  
  return resources;
}

/**
 * Scan for guide files in root /ai directory
 * 
 * @param aiDocsPath - Base path to /ai directory
 * @returns List of guide resource URIs
 */
async function scanGuides(aiDocsPath: string): Promise<string[]> {
  const resources: string[] = [];
  
  try {
    const entries = await readdir(aiDocsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        // Check if it's a guide file (uppercase, ends with .md)
        const isGuide = /^[A-Z_]+\.md$/.test(entry.name);
        if (isGuide) {
          const uri = `structs://guides/${entry.name}`;
          resources.push(uri);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning guides:`, error);
  }
  
  return resources;
}

/**
 * Scan all resources in /ai directory
 * 
 * @param aiDocsPath - Base path to /ai directory
 * @returns List of all resource URIs
 */
export async function scanAllResources(aiDocsPath: string): Promise<string[]> {
  const allResources: string[] = [];
  
  // Check if base directory exists
  if (!existsSync(aiDocsPath)) {
    console.error(`AI docs path does not exist: ${aiDocsPath}`);
    return allResources;
  }
  
  // Scan each category
  const categories = Object.keys(categoryMap);
  
  for (const category of categories) {
    const categoryDir = categoryMap[category];
    let dirPath: string;
    
    if (category === 'guides') {
      // Guides are in root, scan separately
      const guides = await scanGuides(aiDocsPath);
      allResources.push(...guides);
      continue;
    } else {
      dirPath = categoryDir
        ? join(aiDocsPath, categoryDir)
        : aiDocsPath;
    }
    
    // scanDirectory now checks existence internally, so missing directories are handled gracefully
    const resources = await scanDirectory(dirPath, category, aiDocsPath);
    allResources.push(...resources);
  }
  
  return allResources;
}

/**
 * Get MIME type for a resource URI
 */
export function getResourceMimeType(uri: string): string {
  const parsed = parseResourceURI(uri);
  if (!parsed) {
    return 'application/octet-stream';
  }
  
  const ext = parsed.path.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    md: 'text/markdown',
    txt: 'text/plain',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

