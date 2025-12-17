/**
 * Process Manager
 * 
 * Manages background processes for long-running tasks like proof-of-work calculation.
 * Uses child_process.fork() to create isolated processes that don't block the main MCP server loop.
 * 
 * @module utils/process-manager
 */

import { fork, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { createRequire } from 'module';
import { config } from '../config.js';

/**
 * Job status
 */
export interface JobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'waiting' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
  waiting_info?: {
    current_age: number;
    target_age: number;
    blocks_remaining: number;
  };
  job_data?: {
    action_type: string;
    entity_id: string;
    /**
     * Optional target identifier used for some proof-of-work inputs.
     * For raids this is typically the target planet ID (e.g. "2-1"),
     * which is combined with the fleet ID to form "fleetId@planetId".
     */
    target_id?: string;
    difficulty: number; // difficulty range
    max_iterations?: number;
    block_start: number;
    player_id: string;
  };
  difficulty_info?: {
    current_difficulty: number;
    target_difficulty: number;
    current_age: number;
    difficulty_range: number;
    max_iterations: number;
  };
}

/**
 * Process Manager class
 */
export class ProcessManager {
  private jobs: Map<string, JobStatus> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private workerPath: string;
  private jobsDataDir: string;
  private jobsFilePath: string;
  private persistJobs: boolean;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Get the path to the worker script
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Try to find the worker script
    // First try compiled JavaScript
    const jsPath = join(__dirname, '../workers/proof-of-work-worker.js');
    // Then try TypeScript source (for development with tsx/ts-node)
    const tsPath = join(__dirname, '../workers/proof-of-work-worker.ts');
    
    if (existsSync(jsPath)) {
      this.workerPath = jsPath;
    } else if (existsSync(tsPath)) {
      // If TypeScript exists, we'll need to use tsx or ts-node
      // For now, use the TypeScript file and assume tsx is available
      this.workerPath = tsPath;
    } else {
      console.error(`⚠️  Warning: Worker script not found at ${jsPath} or ${tsPath}`);
      // Fallback: use the TypeScript path anyway and hope tsx handles it
      this.workerPath = tsPath;
    }

    // Setup job persistence
    this.persistJobs = config.persistJobs;
    this.jobsDataDir = config.jobsDataDir;
    this.jobsFilePath = join(this.jobsDataDir, 'jobs.json');
    
    // Create data directory if it doesn't exist
    if (this.persistJobs) {
      try {
        if (!existsSync(this.jobsDataDir)) {
          mkdirSync(this.jobsDataDir, { recursive: true });
        }
      } catch (error) {
        console.error(`⚠️  Warning: Could not create jobs data directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.persistJobs = false;
      }
    }

    // Load jobs from disk on startup
    if (this.persistJobs) {
      this.loadJobsFromDisk();
    }
  }

  /**
   * Start a proof-of-work job in a background process
   * 
   * @param jobData - Job data including action type, entity ID, etc.
   * @returns Job ID and initial status
   */
  async startProofOfWorkJob(jobData: {
    action_type: string;
    entity_id: string;
    target_id?: string;
    difficulty: number;
    max_iterations?: number;
    block_start: number; // Now required - should be queried from view.work
    player_id: string;
    ai_docs_path?: string;
  }): Promise<{
    job_id: string;
    status: 'queued';
    message: string;
  }> {
    // Generate unique job ID
    const jobId = `pow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create job status
    const jobStatus: JobStatus = {
      job_id: jobId,
      status: 'queued',
      started_at: new Date().toISOString(),
      job_data: {
        action_type: jobData.action_type,
        entity_id: jobData.entity_id,
        difficulty: jobData.difficulty,
        max_iterations: jobData.max_iterations,
        block_start: jobData.block_start,
        player_id: jobData.player_id,
      },
    };

    this.jobs.set(jobId, jobStatus);

    // Prepare job data for worker
    const workerJobData = {
      job_id: jobId,
      ...jobData,
    };

    // Fork a new process for the worker
    // If the worker is TypeScript, we need to use tsx or ts-node
    // For now, we'll use a simpler approach: use node with --loader if TypeScript
    // In production, the TypeScript should be compiled to JavaScript
    const isTypeScript = this.workerPath.endsWith('.ts');
    const workerArgs = [JSON.stringify(workerJobData)];
    
    let workerProcess: ChildProcess;
    
    if (isTypeScript) {
      // For TypeScript, we need to use a tool like tsx to run it
      // In production, TypeScript should be compiled to JavaScript
      // For development, we'll try to use tsx if available
      const require = createRequire(import.meta.url);
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const tsxPath = join(currentDir, '../../node_modules/.bin/tsx');
      
      if (existsSync(tsxPath)) {
        // Use tsx directly
        workerProcess = fork(tsxPath, [this.workerPath, ...workerArgs], {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          detached: false,
          execArgv: [],
        });
      } else {
        // Fallback: try to use require.resolve to find tsx
        try {
          const tsxModule = require.resolve('tsx/cli');
          workerProcess = fork(tsxModule, [this.workerPath, ...workerArgs], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            detached: false,
            execArgv: [],
          });
        } catch (error) {
          // Last resort: use node with --loader (may not work in all Node versions)
          // This requires tsx to be installed as a dependency
          workerProcess = fork(this.workerPath, workerArgs, {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            detached: false,
            execArgv: ['--loader', 'tsx/esm'],
          });
        }
      }
    } else {
      // Run JavaScript directly
      workerProcess = fork(this.workerPath, workerArgs, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        detached: false,
        execArgv: [],
      });
    }

    // Update job status to running
    jobStatus.status = 'running';
    this.processes.set(jobId, workerProcess);

    // Setup worker process handlers
    this.setupWorkerProcess(workerProcess, jobId, jobStatus);
    
    return {
      job_id: jobId,
      status: 'queued',
      message: `Proof-of-work job started. Job ID: ${jobId}. The transaction will be submitted automatically when proof-of-work is complete.`,
    };
  }

  /**
   * Setup worker process event handlers
   * 
   * @param workerProcess - Child process
   * @param jobId - Job ID
   * @param jobStatus - Job status object
   */
  private setupWorkerProcess(workerProcess: ChildProcess, jobId: string, jobStatus: JobStatus): void {
    // Handle worker output
    let stdout = '';
    let stderr = '';

    workerProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    workerProcess.stderr?.on('data', (data: Buffer) => {
      const stderrData = data.toString();
      stderr += stderrData;
      
      // Try to parse status updates from stderr (worker logs status to stderr)
      try {
        const lines = stderrData.trim().split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            try {
              const statusUpdate = JSON.parse(line);
              if (statusUpdate.status === 'waiting') {
                jobStatus.status = 'waiting';
                jobStatus.waiting_info = {
                  current_age: statusUpdate.current_age || 0,
                  target_age: statusUpdate.target_age || 10,
                  blocks_remaining: statusUpdate.blocks_remaining || 0,
                };
              } else if (statusUpdate.status === 'ready') {
                // Worker is ready to start proof-of-work
                jobStatus.status = 'running';
                delete jobStatus.waiting_info;
              } else if (statusUpdate.status === 'difficulty_update') {
                // Difficulty was updated - log this in the result
                if (!jobStatus.result) {
                  jobStatus.result = {};
                }
                if (!jobStatus.result.difficulty_updates) {
                  jobStatus.result.difficulty_updates = [];
                }
                jobStatus.result.difficulty_updates.push({
                  old_difficulty: statusUpdate.old_difficulty,
                  new_difficulty: statusUpdate.new_difficulty,
                  current_age: statusUpdate.current_age,
                  iteration: statusUpdate.iteration,
                  timestamp: new Date().toISOString(),
                });
                // Update current difficulty in result
                if (jobStatus.result.proof_of_work) {
                  jobStatus.result.proof_of_work.current_difficulty = statusUpdate.new_difficulty;
                  jobStatus.result.proof_of_work.current_age = statusUpdate.current_age;
                }
              } else if (statusUpdate.status === 'error') {
                // Log errors but don't fail the job yet
                if (!jobStatus.result) {
                  jobStatus.result = {};
                }
                if (!jobStatus.result.errors) {
                  jobStatus.result.errors = [];
                }
                jobStatus.result.errors.push({
                  message: statusUpdate.message,
                  iteration: statusUpdate.iteration,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (parseError) {
              // Not valid JSON, ignore this line
            }
          }
        }
      } catch (error) {
        // Not JSON, ignore
      }
    });

    // Handle worker completion
    workerProcess.on('exit', (code, signal) => {
      try {
        if (code === 0 && stdout) {
          // Parse result from stdout
          const result = JSON.parse(stdout.trim());
          jobStatus.status = result.status === 'completed' ? 'completed' : 'failed';
          jobStatus.result = result;
          jobStatus.completed_at = result.completed_at || new Date().toISOString();
          if (result.error) {
            jobStatus.error = result.error;
          }
        } else {
          // Worker failed
          jobStatus.status = 'failed';
          jobStatus.error = stderr || `Worker process exited with code ${code}${signal ? `, signal ${signal}` : ''}`;
          jobStatus.completed_at = new Date().toISOString();
        }
      } catch (error) {
        jobStatus.status = 'failed';
        jobStatus.error = `Failed to parse worker result: ${error instanceof Error ? error.message : 'Unknown error'}`;
        jobStatus.completed_at = new Date().toISOString();
      }

      // Clean up process reference
      this.processes.delete(jobId);
    });

    // Handle worker errors
    workerProcess.on('error', (error) => {
      jobStatus.status = 'failed';
      jobStatus.error = `Worker process error: ${error.message}`;
      jobStatus.completed_at = new Date().toISOString();
      this.processes.delete(jobId);
    });
  }

  /**
   * Get job status
   * 
   * @param jobId - Job ID
   * @returns Job status or null if not found
   */
  getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get job status with current difficulty information
   * 
   * @param jobId - Job ID
   * @returns Job status with difficulty info or null if not found
   */
  async getJobStatusWithDifficulty(jobId: string): Promise<JobStatus | null> {
    const jobStatus = this.jobs.get(jobId);
    if (!jobStatus) {
      return null;
    }

    // Calculate current and target difficulty if job data is available
    if (jobStatus.job_data && jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
      try {
        const { calculateDifficulty } = await import('../utils/proof-of-work.js');
        const { getCurrentBlockHeight } = await import('../workers/proof-of-work-worker.js');
        
        // Calculate current difficulty
        const blockStart = jobStatus.job_data.block_start;
        const difficultyRange = jobStatus.job_data.difficulty;
        const maxIterations = jobStatus.job_data.max_iterations || 1000000;
        
        try {
          const currentBlockHeight = await getCurrentBlockHeight();
          const currentAge = currentBlockHeight - blockStart;
          const currentDifficulty = calculateDifficulty(currentAge, difficultyRange);
          
          // Calculate target difficulty (feasible for max iterations)
          // For difficulty d, expected iterations = 16^d
          // We want: 16^target_difficulty <= maxIterations * 2
          // So: target_difficulty <= log16(maxIterations * 2)
          const targetExpectedIterations = maxIterations * 2;
          const targetDifficulty = Math.floor(Math.log(targetExpectedIterations) / Math.log(16));
          
          // Update job status with difficulty info
          jobStatus.difficulty_info = {
            current_difficulty: currentDifficulty,
            target_difficulty: targetDifficulty,
            current_age: currentAge,
            difficulty_range: difficultyRange,
            max_iterations: maxIterations,
          };
          
          // Update waiting_info if status is waiting
          if (jobStatus.status === 'waiting' && jobStatus.waiting_info) {
            jobStatus.waiting_info.current_age = currentAge;
          }
        } catch (error) {
          // If we can't get block height, skip difficulty calculation
          // The status will still be returned without difficulty_info
        }
      } catch (error) {
        // If calculation fails, continue without difficulty info
      }
    }
    
    return jobStatus;
  }

  /**
   * Get all jobs
   * 
   * @returns Array of all job statuses
   */
  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clean up completed/failed jobs older than specified age
   * 
   * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupOldJobs(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    let cleaned = false;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completed_at || job.status === 'failed') {
        const completedAt = job.completed_at ? new Date(job.completed_at).getTime() : now;
        if (now - completedAt > maxAgeMs) {
          this.jobs.delete(jobId);
          cleaned = true;
        }
      }
    }
    
    // Persist cleanup to disk
    if (cleaned && this.persistJobs) {
      this.saveJobsToDisk();
    }
  }

  /**
   * Kill a running job
   * 
   * @param jobId - Job ID
   * @returns True if job was killed, false if not found or already completed
   */
  killJob(jobId: string): boolean {
    const process = this.processes.get(jobId);
    if (process) {
      process.kill();
      this.processes.delete(jobId);
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = 'Job was killed by user';
        job.completed_at = new Date().toISOString();
      }
      
      // Persist job update to disk
      if (this.persistJobs) {
        this.saveJobsToDisk();
      }
      
      return true;
    }
    return false;
  }

  /**
   * Save jobs to disk
   */
  private saveJobsToDisk(): void {
    if (!this.persistJobs) {
      return;
    }

    try {
      // Convert Map to object for JSON serialization
      const jobsObject: Record<string, JobStatus> = {};
      for (const [jobId, job] of this.jobs.entries()) {
        jobsObject[jobId] = job;
      }

      // Write to file atomically (write to temp file, then rename)
      const tempFile = `${this.jobsFilePath}.tmp`;
      writeFileSync(tempFile, JSON.stringify(jobsObject, null, 2), 'utf8');
      
      // Rename temp file to actual file (atomic on most systems)
      renameSync(tempFile, this.jobsFilePath);
    } catch (error) {
      console.error(`⚠️  Warning: Could not save jobs to disk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load jobs from disk
   */
  private loadJobsFromDisk(): void {
    if (!this.persistJobs || !existsSync(this.jobsFilePath)) {
      return;
    }

    try {
      const jobsData = readFileSync(this.jobsFilePath, 'utf8');
      const jobsObject: Record<string, JobStatus> = JSON.parse(jobsData);

      // Restore jobs to Map
      for (const [jobId, job] of Object.entries(jobsObject)) {
        // Only restore completed/failed jobs (running jobs would have been lost anyway)
        // Running jobs that were interrupted will need to be restarted manually
        if (job.status === 'completed' || job.status === 'failed') {
          this.jobs.set(jobId, job);
        } else {
          // Mark interrupted jobs as failed
          job.status = 'failed';
          job.error = 'Job was interrupted by system shutdown';
          job.completed_at = job.completed_at || new Date().toISOString();
          this.jobs.set(jobId, job);
        }
      }

      console.error(`✅ Loaded ${this.jobs.size} jobs from disk`);
    } catch (error) {
      console.error(`⚠️  Warning: Could not load jobs from disk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule periodic job saves (debounced)
   */
  private scheduleSave(): void {
    if (!this.persistJobs) {
      return;
    }

    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Schedule save after 1 second (debounce rapid updates)
    this.saveTimer = setTimeout(() => {
      this.saveJobsToDisk();
      this.saveTimer = null;
    }, 1000);
  }
}

// Singleton instance
let processManagerInstance: ProcessManager | null = null;

/**
 * Get the global process manager instance
 * 
 * @returns Process manager instance
 */
export function getProcessManager(): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager();
  }
  return processManagerInstance;
}
