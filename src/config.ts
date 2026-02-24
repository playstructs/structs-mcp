/**
 * Configuration
 * 
 * @module config
 */

/**
 * Default configuration
 */
export const config = {
  // Base path for AI documentation / Structs Compendium data.
  // By default this points to a local clone of the structs-ai compendium
  // under ./data/structs-ai. Override with AI_DOCS_PATH for a different path.
  aiDocsPath: process.env.AI_DOCS_PATH || './data/structs-ai',
  cacheEnabled: true,
  cacheMaxSize: 1000,
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // API Endpoints
  consensusRPCUrl: process.env.CONSENSUS_RPC_URL || 'http://localhost:26657',
  consensusApiUrl: process.env.CONSENSUS_API_URL || 'http://localhost:1317',
  webappApiUrl: process.env.WEBAPP_API_URL || 'http://localhost:8080',
  
  // Streaming (NATS)
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  natsWebSocketUrl: process.env.NATS_WEBSOCKET_URL || 'ws://localhost:1443',
  
  // Database (Optional)
  databaseUrl: process.env.DATABASE_URL,
  
  // Database Access Control
  danger: process.env.DANGER === 'true', // Default to false (safe mode)
  
  // Proof-of-Work Configuration
  targetDifficultyStart: parseInt(process.env.TARGET_DIFFICULTY_START || '5', 10), // Default to 5
  
  // Server Transport
  transport: process.env.MCP_TRANSPORT || 'stdio', // 'stdio' or 'http'
  httpPort: parseInt(process.env.MCP_HTTP_PORT || '3000', 10),
  httpHost: process.env.MCP_HTTP_HOST || '0.0.0.0',
  
  // Job Persistence
  jobsDataDir: process.env.JOBS_DATA_DIR || './data/jobs',
  persistJobs: process.env.PERSIST_JOBS !== 'false', // Default to true
  
  // References Feature Configuration
  references: {
    enabled: process.env.REFERENCES_ENABLED === 'true', // Default: false (opt-in)
    maxReferences: parseInt(process.env.MAX_REFERENCES || '50', 10),
    maxReferencesPerEntity: parseInt(process.env.MAX_REFERENCES_PER_ENTITY || '5', 10),
    maxParallelQueries: parseInt(process.env.MAX_PARALLEL_QUERIES || '5', 10),
    referenceQueryTimeout: parseInt(process.env.REFERENCE_QUERY_TIMEOUT || '2000', 10),
    cacheEnabled: process.env.REFERENCES_CACHE_ENABLED !== 'false', // Default: true
    cacheMaxSize: parseInt(process.env.REFERENCES_CACHE_MAX_SIZE || '1000', 10),
    cacheTTL: parseInt(process.env.REFERENCES_CACHE_TTL || '30000', 10), // 30 seconds
  },
};

