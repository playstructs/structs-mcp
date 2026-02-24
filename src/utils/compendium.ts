/**
 * Structs Compendium setup helper
 *
 * Ensures that the AI docs directory is populated with the
 * Structs Compendium repository. If the directory is missing
 * or empty, it will automatically clone the repository.
 *
 * Repository URL can be overridden with:
 *   STRUCTS_MCP_COMPENDIUM_REPO
 *
 * The target directory is whatever path the server is using
 * as its AI docs root (typically config.aiDocsPath or
 * process.env.AI_DOCS_PATH).
 *
 * @module utils/compendium
 */

import { existsSync } from 'fs';
import { mkdir, readdir, rm } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Determine if a directory exists and has at least one entry.
 *
 * @param dir - Directory path
 * @returns true if directory exists and is non-empty
 */
async function directoryExistsAndNonEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length > 0;
  } catch (error: any) {
    if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Run `git clone` using spawn to avoid shell escaping issues.
 *
 * @param repoUrl - Repository URL
 * @param targetDir - Target directory for clone
 */
function runGitClone(repoUrl: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['clone', '--depth=1', repoUrl, targetDir], {
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git clone exited with code ${code ?? 'null'}`));
      }
    });
  });
}

/**
 * Ensure that the Structs Compendium is present at the given path.
 *
 * - If the directory exists and is non-empty, this is a no-op.
 * - If the directory is missing or empty, it will be populated by
 *   cloning the Structs Compendium repository.
 *
 * @param aiDocsPath - Target directory where the compendium should live
 */
export async function ensureCompendiumPresent(aiDocsPath: string): Promise<void> {
  // Default repository: structs-ai (Markdown-first compendium for AI agents)
  const defaultRepoUrl = 'https://github.com/playstructs/structs-ai.git';

  // Allow override via environment variable
  const repoUrl = process.env.STRUCTS_MCP_COMPENDIUM_REPO || defaultRepoUrl;

  // Resolve the docs directory to an absolute path for clarity in logs
  const targetDir = path.isAbsolute(aiDocsPath)
    ? aiDocsPath
    : path.resolve(aiDocsPath);

  // Fast path: directory exists and has content
  const hasContent = await directoryExistsAndNonEmpty(targetDir);
  if (hasContent) {
    return;
  }

  console.error(
    `📦 Structs Compendium not found at ${targetDir} (directory missing or empty).`
  );
  console.error(
    `   Cloning from ${repoUrl}...`
  );

  // Ensure parent directory exists
  const parentDir = path.dirname(targetDir);
  await mkdir(parentDir, { recursive: true });

  // If the target directory exists but is empty, remove it so git clone can create it
  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir);
    if (entries.length === 0) {
      await rm(targetDir, { recursive: true, force: true });
    }
  }

  try {
    await runGitClone(repoUrl, targetDir);
    console.error(`✅ Structs Compendium cloned to ${targetDir}`);
  } catch (error) {
    console.error('❌ Failed to clone Structs Compendium repository.');
    console.error('   Please ensure that `git` is installed and accessible in PATH.');
    console.error(`   Target directory: ${targetDir}`);
    console.error(`   Repository URL: ${repoUrl}`);
    throw error;
  }
}


