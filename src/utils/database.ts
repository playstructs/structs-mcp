/**
 * Database Utilities
 * 
 * Provides PostgreSQL database connection and query utilities for the signer.* schema.
 * 
 * @module utils/database
 */

import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getDatabasePool(): pg.Pool {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for database operations');
    }
    
    // Parse connection string and add SSL if needed
    const connectionConfig: pg.PoolConfig = {
      connectionString: config.databaseUrl,
      // Connection pool settings
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
    };

    // Add SSL configuration if not already in connection string
    // PostgreSQL requires SSL for remote connections
    if (!config.databaseUrl.includes('sslmode=')) {
      connectionConfig.ssl = {
        rejectUnauthorized: false, // Allow self-signed certificates
      };
    }
    
    pool = new Pool(connectionConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }

  return pool;
}

/**
 * Execute a database query
 * 
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  queryText: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const dbPool = getDatabasePool();
  return await dbPool.query<T>(queryText, params);
}

/**
 * Close database connection pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if database is available
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    if (!config.databaseUrl) {
      return false;
    }
    const result = await query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    return false;
  }
}

/**
 * Check if DANGER mode is enabled
 * 
 * @returns True if DANGER=true, false otherwise
 */
export function isDangerEnabled(): boolean {
  return config.danger === true;
}

/**
 * Get DANGER error response for a tool
 * 
 * @param toolName - Name of the tool requiring DANGER
 * @param operation - Description of the operation
 * @returns Error response object
 */
export function getDangerErrorResponse(
  toolName: string,
  operation: string
): {
  status: string;
  message: string;
  error: string;
  details: {
    tool: string;
    required: string;
  };
} {
  return {
    status: 'error',
    message: `Database access disabled. Set DANGER=true to enable ${operation}.`,
    error: 'DANGER_DISABLED',
    details: {
      tool: toolName,
      required: 'DANGER=true',
    },
  };
}
