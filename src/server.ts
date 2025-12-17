/**
 * Structs MCP Server
 * 
 * Main entry point for the MCP server implementation.
 * 
 * @module server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getResource, listResources, getResourceMimeType } from "./resources/index.js";
import { config } from "./config.js";
// Tool definitions and handlers are now modular
import { getAllToolDefinitions } from "./tools/definitions/index.js";
import { getToolHandler } from "./tools/handlers/index.js";

/**
 * Initialize and start the MCP server
 */
async function main() {
  console.error("🚀 Starting Structs MCP Server...");
  console.error(`   Version: 0.1.0`);
  console.error(`   Transport: ${config.transport}`);
  
  const server = new Server(
    {
      name: "structs-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );
  console.error("✅ MCP Server instance created");

  // Get AI docs path from environment or use default
  const aiDocsPath = process.env.AI_DOCS_PATH || config.aiDocsPath;
  console.error(`📁 AI Docs Path: ${aiDocsPath}`);

  // Phase 1: Resource Server
  console.error("📚 Setting up resource handlers...");
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await listResources(aiDocsPath);
    return {
      resources: resources.map((uri) => ({
        uri,
        name: uri,
        mimeType: getResourceMimeType(uri),
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = await getResource(request.params.uri, aiDocsPath);
    if (!resource) {
      throw new Error(`Resource not found: ${request.params.uri}`);
    }
    return resource;
  });
  console.error("✅ Resource handlers registered");

  // Phase 2: Validation Tools + Phase 3: Query & Action Tools
  console.error("🔧 Setting up tool handlers...");
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getAllToolDefinitions(),
    };
  });
  console.error("✅ Tool definitions registered");

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Get handler from registry
    const handler = getToolHandler(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  });
  console.error("✅ Tool call handler registered");

  // Phase 3: API Integration Tools - ✅ COMPLETE
  // Phase 4: Calculation Tools - ✅ COMPLETE

  // Choose transport based on configuration
  console.error(`\n🌐 Initializing transport: ${config.transport}...`);
  if (config.transport === 'http' || config.transport === 'sse') {
    // HTTP/SSE transport for Cursor and other HTTP-based clients
    // Use createMcpExpressApp for proper setup with body parsing
    console.error("   Creating Express app with MCP configuration...");
    const allowedHosts = config.httpHost === '0.0.0.0' ? ['localhost', '127.0.0.1'] : undefined;
    const app = createMcpExpressApp({
      host: config.httpHost,
      allowedHosts: allowedHosts,
    });
    console.error("   ✅ Express app created with DNS rebinding protection");
    
    // Create a single transport that handles all sessions
    // Use stateless mode (sessionIdGenerator: undefined) to avoid session initialization requirements
    // Enable JSON responses for better client compatibility (Cursor, etc.)
    console.error("   Creating StreamableHTTPServerTransport (stateless mode, JSON responses enabled)...");
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,  // Stateless mode - no session ID required
      enableJsonResponse: true  // Return JSON instead of SSE for better client compatibility
    });
    console.error("   ✅ Transport created");
    
    // Connect server to transport once (this will start the transport internally)
    console.error("   Connecting server to transport...");
    await server.connect(transport);
    console.error("   ✅ Server connected to transport");
    
    // Handle all MCP requests (GET, POST, DELETE)
    // The transport expects req.body to be parsed for POST requests
    // createMcpExpressApp already sets up express.json() middleware
    console.error("   Setting up /mcp route handler...");
    
    // Add middleware to normalize Accept headers for better client compatibility
    // This ensures clients that don't send proper Accept headers still work
    app.all('/mcp', (req, res, next) => {
      const originalAccept = req.headers.accept || req.headers['accept'] || '';
      
      // Normalize Accept header to ensure MCP transport requirements are met
      if (!originalAccept || originalAccept === '*/*' || originalAccept.trim() === '') {
        // No Accept header or generic Accept - set appropriate defaults
        if (req.method === 'GET') {
          req.headers.accept = 'text/event-stream';
        } else if (req.method === 'POST') {
          req.headers.accept = 'application/json, text/event-stream';
        }
      } else {
        // Accept header exists - ensure it includes required types
        const acceptLower = originalAccept.toLowerCase();
        if (req.method === 'GET') {
          if (!acceptLower.includes('text/event-stream')) {
            req.headers.accept = `${originalAccept}, text/event-stream`;
          }
        } else if (req.method === 'POST') {
          const needsJson = !acceptLower.includes('application/json');
          const needsSse = !acceptLower.includes('text/event-stream');
          if (needsJson || needsSse) {
            const additions: string[] = [];
            if (needsJson) additions.push('application/json');
            if (needsSse) additions.push('text/event-stream');
            req.headers.accept = `${originalAccept}, ${additions.join(', ')}`;
          }
        }
      }
      
      next();
    });
    
    app.all('/mcp', async (req, res, next) => {
      try {
        // For POST requests, pass the parsed body (req.body) to handleRequest
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
    
    app.listen(config.httpPort, config.httpHost, () => {
      console.error(`\n✅ MCP Server running on http://${config.httpHost}:${config.httpPort}/mcp`);
      console.error(`   Ready to accept connections`);
    });
  } else {
    // stdio transport (default)
    console.error("   Using stdio transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("   ✅ Server connected to stdio transport");
    console.error("\n✅ MCP Server ready (stdio mode)");
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down...');
  const { closeDatabasePool } = await import('./utils/database.js');
  await closeDatabasePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Shutting down...');
  const { closeDatabasePool } = await import('./utils/database.js');
  await closeDatabasePool();
  process.exit(0);
});
