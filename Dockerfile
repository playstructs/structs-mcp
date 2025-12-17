# Multi-stage build for Structs MCP Server
# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Install git for runtime cloning (if compendium needs to be updated or cloned elsewhere)
RUN apk add --no-cache git

# Set environment variables with defaults
ENV NODE_ENV=production
# Default to baked-in compendium, but can be overridden via volume mount to /app/ai
ENV AI_DOCS_PATH=/app/data/structs-compendium
ENV CONSENSUS_RPC_URL=http://localhost:26657
ENV CONSENSUS_API_URL=http://localhost:1317
ENV WEBAPP_API_URL=http://localhost:8080
ENV NATS_URL=nats://localhost:4222
ENV NATS_WEBSOCKET_URL=ws://localhost:1443

# Database (Optional)
# ENV DATABASE_URL=postgresql://user:password@localhost:5432/structs

# MCP Transport Configuration
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_PORT=3000
ENV MCP_HTTP_HOST=0.0.0.0

# Expose HTTP port (if using HTTP transport)
# Default: stdio transport (no port needed)
# Set MCP_TRANSPORT=http to enable HTTP mode
EXPOSE 3000

# Run as non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 && \
    chown -R mcp:mcp /app

USER mcp

# Entrypoint
ENTRYPOINT ["node", "dist/server.js"]

# Health check (optional - MCP uses stdio so this may not be applicable)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "console.log('health check')" || exit 1

