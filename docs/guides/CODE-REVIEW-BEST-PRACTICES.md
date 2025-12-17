# Code Review: Best Practices & Efficiency Analysis

**Date**: December 14, 2025  
**Reviewer**: AI Code Review  
**Focus**: Execution efficiency, planning, prompts, and context window optimization

---

## Executive Summary

The MCP server has grown significantly with 50+ tools implemented. While functionality is comprehensive, there are several areas for optimization to improve:
- **Context window efficiency** (critical)
- **Code organization** (high priority)
- **Execution performance** (medium priority)
- **Maintainability** (high priority)

---

## Critical Issues

### 1. Context Window Bloat ⚠️ **CRITICAL**

**Problem**: `server.ts` is **2,083 lines** with all tool definitions and handlers in a single file.

**Impact**:
- AI agents must load entire file to understand available tools
- Large context consumption for every request
- Slower tool discovery and understanding
- Higher token costs

**Current Structure**:
```
server.ts (2,083 lines)
├── 50+ tool definitions (inline, ~1,500 lines)
├── 50+ tool handlers (switch cases, ~500 lines)
└── Transport setup (~100 lines)
```

**Recommendation**: **Refactor into modular structure**

```typescript
// Proposed structure:
src/
├── server.ts (main entry, ~200 lines)
├── tools/
│   ├── registry.ts (tool registry, ~100 lines)
│   ├── definitions/
│   │   ├── query-tools.ts
│   │   ├── action-tools.ts
│   │   ├── calculation-tools.ts
│   │   ├── workflow-tools.ts
│   │   └── validation-tools.ts
│   └── handlers/
│       ├── query-handlers.ts
│       ├── action-handlers.ts
│       ├── calculation-handlers.ts
│       ├── workflow-handlers.ts
│       └── validation-handlers.ts
```

**Benefits**:
- AI can load only relevant tool categories
- Smaller context windows per request
- Better code organization
- Easier maintenance

---

### 2. Tool Definition Duplication ⚠️ **HIGH**

**Problem**: Tool definitions have repetitive patterns that could be abstracted.

**Example**:
```typescript
// Repeated 8+ times for query tools:
{
  name: "structs_query_X",
  description: "Query X state from consensus API",
  inputSchema: {
    type: "object",
    properties: {
      x_id: {
        type: "string",
        description: "X ID (e.g., 'N-M')",
      },
    },
    required: ["x_id"],
  },
}
```

**Recommendation**: **Create tool definition factories**

```typescript
// tools/definitions/factories.ts
function createQueryTool(entityName: string, entityIdPattern: string) {
  return {
    name: `structs_query_${entityName.toLowerCase()}`,
    description: `Query ${entityName} state from consensus API`,
    inputSchema: {
      type: "object",
      properties: {
        [`${entityName.toLowerCase()}_id`]: {
          type: "string",
          description: `${entityName} ID (e.g., '${entityIdPattern}')`,
        },
      },
      required: [`${entityName.toLowerCase()}_id`],
    },
  };
}

// Usage:
const queryTools = [
  createQueryTool('Player', '1-11'),
  createQueryTool('Planet', '2-1'),
  createQueryTool('Fleet', '3-1'),
  // ...
];
```

**Benefits**:
- 80% reduction in definition code
- Consistent tool schemas
- Easier to add new query tools
- Smaller context footprint

---

### 3. Handler Pattern Repetition ⚠️ **HIGH**

**Problem**: Every tool handler follows the same pattern:

```typescript
case "structs_query_X": {
  const result = await queryX(args?.x_id as string);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

**Recommendation**: **Create handler wrapper**

```typescript
// tools/handlers/wrapper.ts
function createHandler<T>(
  handlerFn: (args: any) => Promise<T>
): (args: any) => Promise<{ content: Array<{ type: string; text: string }> }> {
  return async (args: any) => {
    const result = await handlerFn(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  };
}

// Usage in registry:
toolHandlers.set('structs_query_player', createHandler(
  (args) => queryPlayer(args?.player_id as string)
));
```

**Benefits**:
- 70% reduction in handler code
- Consistent error handling
- Easier to add logging/metrics
- Smaller file size

---

## Execution Efficiency Issues

### 4. Eager Import of All Tools ⚠️ **MEDIUM**

**Problem**: All tool functions imported at top level:

```typescript
import {
  queryPlayer, listPlayers, queryPlanet, listPlanets,
  queryGuild, listGuilds, queryEndpoints, listStructs,
  // ... 20+ more imports
} from "./tools/query.js";
```

**Impact**:
- All modules loaded at startup
- Higher memory usage
- Slower initial load time

**Recommendation**: **Lazy loading for rarely-used tools**

```typescript
// For rarely-used tools (workflows, advanced calculations):
case "structs_workflow_execute": {
  const { executeWorkflow } = await import('./tools/workflow.js');
  const result = await executeWorkflow(/* ... */);
  // ...
}
```

**Benefits**:
- Faster startup
- Lower memory footprint
- Only load what's needed

**Note**: Keep frequently-used tools (query, basic actions) as eager imports.

---

### 5. Inefficient Tool Discovery ⚠️ **MEDIUM**

**Problem**: Tool list is built as a massive array every time `tools/list` is called.

**Current**:
```typescript
const tools = [
  { name: "...", ... }, // 50+ tool definitions
];
```

**Recommendation**: **Cache tool definitions**

```typescript
// tools/registry.ts
let cachedToolDefinitions: Tool[] | null = null;

export function getToolDefinitions(): Tool[] {
  if (!cachedToolDefinitions) {
    cachedToolDefinitions = [
      ...getQueryTools(),
      ...getActionTools(),
      ...getCalculationTools(),
      // ...
    ];
  }
  return cachedToolDefinitions;
}
```

**Benefits**:
- Faster `tools/list` responses
- Lower CPU usage
- Better scalability

---

## Prompt & Planning Optimization

### 6. Tool Description Verbosity ⚠️ **LOW**

**Current**: Descriptions are good but could be more concise for AI parsing.

**Example**:
```typescript
description: "Query player state from consensus API"
// vs
description: "Get player data (id, resources, planet, fleet)"
```

**Recommendation**: **Add structured metadata**

```typescript
{
  name: "structs_query_player",
  description: "Get player data",
  category: "query",
  entity: "player",
  // AI can filter by category/entity without reading descriptions
}
```

**Benefits**:
- Faster tool selection by AI
- Better tool grouping
- Smaller context for tool discovery

---

### 7. Schema Verbosity ⚠️ **LOW**

**Problem**: Some schemas are overly verbose with redundant descriptions.

**Example**:
```typescript
pagination_key: {
  type: "string",
  description: "Optional pagination key for next page",
},
pagination_limit: {
  type: "number",
  description: "Optional page size limit",
},
```

**Recommendation**: **Use schema references for common patterns**

```typescript
// schemas/common.ts
export const paginationSchema = {
  type: "object",
  properties: {
    pagination_key: { type: "string" },
    pagination_limit: { type: "number" },
  },
};

// Usage:
inputSchema: {
  allOf: [
    { $ref: "#/definitions/pagination" },
    // ... other properties
  ],
}
```

**Benefits**:
- Smaller schemas
- Consistent patterns
- Easier maintenance

---

## Code Organization Issues

### 8. Missing Error Boundaries ⚠️ **MEDIUM**

**Problem**: Errors in one tool handler could crash the entire server.

**Current**:
```typescript
case "structs_query_player": {
  const result = await queryPlayer(args?.player_id as string);
  // No try-catch
}
```

**Recommendation**: **Add error boundaries**

```typescript
// tools/handlers/wrapper.ts
function createHandler<T>(handlerFn: (args: any) => Promise<T>) {
  return async (args: any) => {
    try {
      const result = await handlerFn(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              status: 'error',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  };
}
```

**Benefits**:
- Server stability
- Better error reporting
- Graceful degradation

---

### 9. Configuration Scattered ⚠️ **LOW**

**Current**: Configuration is well-organized in `config.ts`, but some tool-specific configs are hardcoded.

**Recommendation**: **Centralize all configuration**

```typescript
// config.ts
export const toolConfig = {
  query: {
    timeout: 10000,
    retries: 3,
  },
  action: {
    requireDanger: true,
    timeout: 30000,
  },
  calculation: {
    cacheResults: true,
    cacheTTL: 60000,
  },
};
```

**Benefits**:
- Easier configuration management
- Environment-specific tuning
- Better testing

---

## Recommendations Priority

### Immediate (This Week)
1. ✅ **Refactor server.ts into modular structure** (Critical for context windows)
2. ✅ **Create tool definition factories** (High impact, low risk)
3. ✅ **Add handler wrapper** (High impact, low risk)

### Short Term (This Month)
4. ✅ **Implement lazy loading for advanced tools** (Medium impact)
5. ✅ **Add error boundaries** (Medium impact, high value)
6. ✅ **Cache tool definitions** (Medium impact)

### Long Term (Next Quarter)
7. ✅ **Optimize tool descriptions** (Low impact, nice to have)
8. ✅ **Schema references** (Low impact, nice to have)
9. ✅ **Centralize configuration** (Low impact, nice to have)

---

## Implementation Plan

### Phase 1: Modular Structure (Week 1)
1. Create `tools/registry.ts` for tool registration
2. Split tool definitions into category files
3. Split handlers into category files
4. Update `server.ts` to use registry

### Phase 2: Code Reduction (Week 2)
1. Create tool definition factories
2. Create handler wrapper
3. Refactor existing tools to use factories/wrapper
4. Test all tools still work

### Phase 3: Performance (Week 3)
1. Implement lazy loading for advanced tools
2. Add tool definition caching
3. Add error boundaries
4. Performance testing

---

## Expected Improvements

### Context Window
- **Before**: ~2,083 lines loaded for tool discovery
- **After**: ~200 lines (main) + ~100 lines per category (on-demand)
- **Reduction**: **80-90%** for typical requests

### Code Size
- **Before**: ~2,083 lines in server.ts
- **After**: ~200 lines in server.ts + modular files
- **Maintainability**: **Significantly improved**

### Performance
- **Startup**: 20-30% faster (lazy loading)
- **Tool List**: 50% faster (caching)
- **Memory**: 15-20% reduction (lazy loading)

---

## Testing Strategy

1. **Unit Tests**: Test factories and wrappers
2. **Integration Tests**: Test all tools still work after refactoring
3. **Performance Tests**: Measure context window usage
4. **Load Tests**: Test with multiple concurrent requests

---

## Additional Findings

### 10. aiDocsPath Parameter Proliferation ⚠️ **LOW**

**Problem**: `aiDocsPath` is passed to 25+ functions, adding parameter noise.

**Current**:
```typescript
calculatePower(args, aiDocsPath)
calculateMining(args, aiDocsPath)
calculateCost(args, aiDocsPath)
// ... 20+ more
```

**Recommendation**: **Use module-level configuration**

```typescript
// tools/calculation.ts
import { config } from '../config.js';

// Use config.aiDocsPath directly instead of passing parameter
export async function calculatePower(args: {...}) {
  const aiDocsPath = config.aiDocsPath;
  // ...
}
```

**Benefits**:
- Cleaner function signatures
- Less parameter passing
- Easier to test (mock config)

**Note**: Only if `aiDocsPath` doesn't need to vary per-request.

---

### 11. Dynamic Import Usage ✅ **GOOD**

**Found**: Dynamic imports are already used for `process-manager` and `database` cleanup.

```typescript
const { getProcessManager } = await import('./utils/process-manager.js');
```

**Recommendation**: **Extend this pattern to more advanced tools**

- ✅ Keep: Frequently-used tools (query, basic actions) as static imports
- ✅ Use dynamic: Advanced tools (workflows, complex calculations) as dynamic imports

---

### 12. Error Handling Inconsistency ⚠️ **MEDIUM**

**Problem**: Some tools have try-catch, others don't. Error formats vary.

**Current**:
```typescript
// Some tools:
try {
  const result = await queryPlayer(id);
  return { player: result, ... };
} catch (error) {
  return { player: null, error: ... };
}

// Other tools:
const result = await queryPlanet(id); // No error handling
return { planet: result };
```

**Recommendation**: **Standardize error handling**

```typescript
// tools/utils/error-handler.ts
export function standardizeError(error: unknown, defaultMessage: string) {
  return {
    error: error instanceof Error ? error.message : defaultMessage,
    status: 'error',
    timestamp: new Date().toISOString(),
  };
}
```

**Benefits**:
- Consistent error responses
- Better debugging
- Easier error handling in clients

---

### 13. Tool Description Quality ✅ **GOOD**

**Found**: Tool descriptions are clear and informative. Good examples provided.

**Example**:
```typescript
description: "Query player state from consensus API"
// Clear, concise, informative
```

**Recommendation**: **Maintain this quality** - descriptions are well-written.

---

### 14. Schema Validation ⚠️ **MEDIUM**

**Problem**: Input validation happens in tool handlers, not at schema level.

**Current**:
```typescript
case "structs_query_player": {
  const result = await queryPlayer(args?.player_id as string);
  // No validation that player_id is actually a string
}
```

**Recommendation**: **Add runtime schema validation**

```typescript
import { validate } from 'ajv';

const validateInput = (schema: any, data: any) => {
  const valid = validate(schema, data);
  if (!valid) {
    throw new Error(`Invalid input: ${validate.errors}`);
  }
};

// Usage:
case "structs_query_player": {
  validateInput(playerQuerySchema, args);
  const result = await queryPlayer(args.player_id);
  // ...
}
```

**Benefits**:
- Type safety at runtime
- Better error messages
- Prevents invalid data from reaching tools

---

## Context Window Analysis

### Current State
- **server.ts**: 2,083 lines
- **Tool definitions**: ~1,500 lines (inline)
- **Tool handlers**: ~500 lines (switch cases)
- **Total context per request**: ~2,083 lines (if AI needs to understand all tools)

### After Refactoring
- **server.ts**: ~200 lines (main entry)
- **Tool registry**: ~100 lines (tool list)
- **Per-category**: ~100-200 lines (loaded on-demand)
- **Total context per request**: ~300-500 lines (80% reduction)

### Tool Discovery Pattern
**Current**: AI must load entire `server.ts` to see all tools  
**After**: AI can load registry (~100 lines) to see tool list, then load specific categories as needed

---

## Conclusion

The MCP server is functionally complete but needs structural refactoring for:
- **Context window efficiency** (critical for AI agents) - **80% reduction possible**
- **Code maintainability** (critical for long-term development) - **Modular structure needed**
- **Execution performance** (important for scalability) - **20-30% improvement possible**

The recommended refactoring is **low-risk, high-reward** and can be done incrementally without breaking existing functionality.

### Priority Actions
1. **Week 1**: Modular structure refactoring (critical)
2. **Week 2**: Code reduction via factories/wrappers (high value)
3. **Week 3**: Performance optimizations (medium value)

---

*Last Updated: December 14, 2025*
