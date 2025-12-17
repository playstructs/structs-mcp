# Docker Setup for MCP Server

**Date**: January 2025  
**Status**: ✅ Ready

---

## Overview

The MCP server can be run in Docker for easy deployment and isolation. The Docker setup includes a multi-stage build for optimized production images.

---

## Quick Start

### Build Image

```bash
cd ProductManagement/Projects/structs-mcp/implementation
docker build -t structs-mcp-server:latest .
```

### Run Container

**For stdio transport** (default):
```bash
docker run -it \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e CONSENSUS_API_URL=http://host.docker.internal:1317 \
  -e WEBAPP_API_URL=http://host.docker.internal:8080 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e NATS_WEBSOCKET_URL=ws://host.docker.internal:1443 \
  structs-mcp-server:latest
```

**For HTTP transport** (for Cursor):
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e MCP_TRANSPORT=http \
  -e CONSENSUS_API_URL=http://host.docker.internal:1317 \
  -e WEBAPP_API_URL=http://host.docker.internal:8080 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e NATS_WEBSOCKET_URL=ws://host.docker.internal:1443 \
  structs-mcp-server:latest
```

**With database** (optional):
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e MCP_TRANSPORT=http \
  -e CONSENSUS_API_URL=http://host.docker.internal:1317 \
  -e WEBAPP_API_URL=http://host.docker.internal:8080 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e 'DATABASE_URL=postgresql://user:password@host.docker.internal:5432/structs' \
  structs-mcp-server:latest
```

**Important**: Always quote the `DATABASE_URL` value to prevent shell interpretation of special characters (`?`, `&`, etc.):
```bash
# Example with query parameters
-e 'DATABASE_URL=postgres://user@host:5432/db?serverVersion=17'
```

**Note**: 
- The `-it` flags are required for MCP stdio communication
- Use `host.docker.internal` to access services running on the host machine
- On Linux, you may need `--add-host=host.docker.internal:host-gateway`

### Using Docker Compose

```bash
docker-compose up -d
```

---

## Dockerfile Details

### Multi-Stage Build

**Stage 1: Builder**
- Installs all dependencies (including dev dependencies)
- Compiles TypeScript to JavaScript
- Produces optimized build

**Stage 2: Production**
- Only production dependencies
- Minimal Alpine Linux base
- Non-root user for security
- Optimized image size

### Image Size

- **Builder stage**: ~500MB (includes dev dependencies)
- **Production stage**: ~150MB (production only)

---

## Configuration

### Environment Variables

The following environment variables can be set:

```env
# Required
AI_DOCS_PATH=/app/ai

# API Endpoints (defaults provided)
CONSENSUS_RPC_URL=http://localhost:26657
CONSENSUS_API_URL=http://localhost:1317
WEBAPP_API_URL=http://localhost:8080

# Streaming (NATS)
NATS_URL=nats://localhost:4222
NATS_WEBSOCKET_URL=ws://localhost:1443

# Database (Optional)
# DATABASE_URL=postgresql://user:password@localhost:5432/structs

# Transport Configuration
MCP_TRANSPORT=stdio  # or 'http' for HTTP transport
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0
```

**Note**: When running in Docker, use `host.docker.internal` instead of `localhost` for services on the host machine:
```env
CONSENSUS_API_URL=http://host.docker.internal:1317
WEBAPP_API_URL=http://host.docker.internal:8080
NATS_URL=nats://host.docker.internal:4222
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/structs
```

### Volume Mounts

**Required**:
- `/app/ai` - AI documentation directory (read-only recommended)

**Optional**:
- `.env` file (if using environment file)

---

## Docker Compose

### Basic Usage

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Network Configuration

**Option 1: Host Network** (Default)
- Uses host network mode
- Can access services on `localhost`
- Simpler configuration

**Option 2: Bridge Network**
- Isolated network
- Requires service discovery
- More secure

To use bridge network, uncomment network configuration in `docker-compose.yml` and create network:

```bash
docker network create structs-network
```

---

## MCP Client Integration

### Claude Desktop

Update configuration to use Docker:

```json
{
  "mcpServers": {
    "structs-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v", "/absolute/path/to/structs-docs/ai:/app/ai:ro",
        "-e", "CONSENSUS_API_URL=http://host.docker.internal:1317",
        "-e", "WEBAPP_API_URL=http://host.docker.internal:8080",
        "structs-mcp-server:latest"
      ]
    }
  }
}
```

**Note**: Use `host.docker.internal` to access host services from container.

### Cursor

Similar configuration, using Docker command.

---

## Development

### Build for Development

```bash
# Build with development dependencies
docker build --target builder -t structs-mcp-server:dev .

# Run with volume mounts for live development
docker run -it \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/../../ai:/app/ai:ro \
  structs-mcp-server:dev \
  npm run dev
```

### Run Tests in Container

```bash
docker run -it \
  -v $(pwd)/../../ai:/app/ai:ro \
  structs-mcp-server:latest \
  npm test
```

---

## Production Deployment

### Best Practices

1. **Use specific image tags** (not `latest`)
   ```bash
   docker build -t structs-mcp-server:v0.1.0 .
   ```

2. **Set resource limits**
   - Already configured in `docker-compose.yml`
   - Adjust based on usage

3. **Use read-only mounts**
   - AI docs mounted as read-only
   - Prevents accidental modifications

4. **Non-root user**
   - Container runs as `mcp` user (UID 1001)
   - Improves security

5. **Health checks**
   - Optional (commented in Dockerfile)
   - MCP uses stdio, so health checks may not be applicable

---

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker logs structs-mcp-server
```

**Common issues**:
- Missing `/app/ai` directory
- Incorrect environment variables
- Network connectivity issues

### Can't Access Services

**Host network mode**:
- Services should be accessible on `localhost`
- Check firewall settings

**Bridge network mode**:
- Use service names or `host.docker.internal`
- Verify network configuration

### Permission Issues

**AI docs mount**:
- Ensure directory is readable
- Check file permissions
- Use `:ro` flag for read-only

---

## Examples

### Local Development

```bash
# Build and run
docker build -t structs-mcp-server .
docker run -it \
  -v $(pwd)/../../ai:/app/ai:ro \
  -e CONSENSUS_API_URL=http://localhost:1317 \
  structs-mcp-server
```

### Production Deployment

```bash
# Build with tag
docker build -t structs-mcp-server:v0.1.0 .

# Push to registry
docker tag structs-mcp-server:v0.1.0 registry.example.com/structs-mcp-server:v0.1.0
docker push registry.example.com/structs-mcp-server:v0.1.0

# Deploy
docker-compose up -d
```

---

## Security Considerations

1. **Non-root user**: Container runs as `mcp` user
2. **Read-only mounts**: AI docs mounted read-only
3. **Minimal base image**: Alpine Linux for smaller attack surface
4. **No exposed ports**: MCP uses stdio
5. **Resource limits**: Configured in docker-compose.yml

---

## Performance

### Image Size
- Production image: ~150MB
- Optimized with multi-stage build
- Only production dependencies included

### Resource Usage
- Default limits: 512MB RAM, 1 CPU
- Adjust based on usage
- Monitor with `docker stats`

---

## Next Steps

1. ✅ **Dockerfile created** - Multi-stage build
2. ✅ **Docker Compose** - Easy deployment
3. ⏳ **Test in Docker** - Verify functionality
4. ⏳ **Deploy to production** - After testing

---

*Last Updated: January 2025*

