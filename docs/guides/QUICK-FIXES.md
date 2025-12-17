# Quick Fixes: Immediate Improvements

**Priority**: High  
**Effort**: Low-Medium  
**Impact**: High

---

## 1. Extract Tool Definitions (30 minutes)

**Problem**: 1,500+ lines of tool definitions in `server.ts`

**Fix**: Create `tools/definitions/index.ts`

```typescript
// tools/definitions/index.ts
import { queryTools } from './query-tools.js';
import { actionTools } from './action-tools.js';
import { calculationTools } from './calculation-tools.js';
// ...

export function getAllToolDefinitions() {
  return [
    ...queryTools,
    ...actionTools,
    ...calculationTools,
    // ...
  ];
}
```

**Update server.ts**:
```typescript
import { getAllToolDefinitions } from './tools/definitions/index.js';

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getAllToolDefinitions(),
  };
});
```

**Impact**: Reduces `server.ts` by ~1,500 lines

---

## 2. Extract Tool Handlers (30 minutes)

**Problem**: 500+ lines of switch cases in `server.ts`

**Fix**: Create `tools/handlers/index.ts`

```typescript
// tools/handlers/index.ts
import { queryHandlers } from './query-handlers.js';
import { actionHandlers } from './action-handlers.js';
// ...

export function getToolHandler(name: string) {
  return queryHandlers.get(name) ||
         actionHandlers.get(name) ||
         // ... fallback
         null;
}
```

**Update server.ts**:
```typescript
import { getToolHandler } from './tools/handlers/index.js';

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const handler = getToolHandler(request.params.name);
  if (!handler) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  return await handler(request.params.arguments);
});
```

**Impact**: Reduces `server.ts` by ~500 lines

---

## 3. Create Query Tool Factory (15 minutes)

**Problem**: 8+ nearly identical query tool definitions

**Fix**: Create factory function

```typescript
// tools/definitions/factories.ts
export function createQueryTool(
  entityName: string,
  entityIdPattern: string
) {
  const entityId = `${entityName.toLowerCase()}_id`;
  return {
    name: `structs_query_${entityName.toLowerCase()}`,
    description: `Query ${entityName} state from consensus API`,
    inputSchema: {
      type: "object",
      properties: {
        [entityId]: {
          type: "string",
          description: `${entityName} ID (e.g., '${entityIdPattern}')`,
        },
      },
      required: [entityId],
    },
  };
}

// Usage:
export const queryTools = [
  createQueryTool('Player', '1-11'),
  createQueryTool('Planet', '2-1'),
  createQueryTool('Fleet', '3-1'),
  createQueryTool('Struct', '5-1'),
  createQueryTool('Reactor', '4-1'),
  createQueryTool('Substation', '6-1'),
  createQueryTool('Provider', '7-1'),
  createQueryTool('Agreement', '8-1'),
  createQueryTool('Allocation', '9-1'),
];
```

**Impact**: Reduces query tool definitions from ~200 lines to ~30 lines

---

## 4. Create Handler Wrapper (20 minutes)

**Problem**: Repetitive handler code

**Fix**: Create wrapper function

```typescript
// tools/handlers/wrapper.ts
export function createHandler<T>(
  handlerFn: (args: any) => Promise<T>
) {
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

// Usage:
export const queryHandlers = new Map([
  ['structs_query_player', createHandler(
    (args) => queryPlayer(args?.player_id as string)
  )],
  ['structs_query_planet', createHandler(
    (args) => queryPlanet(args?.planet_id as string)
  )],
  // ...
]);
```

**Impact**: Reduces handler code by ~70%

---

## 5. Cache Tool Definitions (10 minutes)

**Problem**: Tool list rebuilt on every request

**Fix**: Add caching

```typescript
// tools/definitions/index.ts
let cachedDefinitions: Tool[] | null = null;

export function getAllToolDefinitions(): Tool[] {
  if (!cachedDefinitions) {
    cachedDefinitions = [
      ...queryTools,
      ...actionTools,
      ...calculationTools,
      // ...
    ];
  }
  return cachedDefinitions;
}
```

**Impact**: Faster `tools/list` responses

---

## Total Impact

- **server.ts**: 2,083 lines → ~200 lines (**90% reduction**)
- **Context window**: ~2,083 lines → ~300 lines per request (**85% reduction**)
- **Code maintainability**: Significantly improved
- **Time to implement**: ~2 hours

---

## Implementation Order

1. Extract tool definitions (30 min)
2. Extract tool handlers (30 min)
3. Create factories (15 min)
4. Create handler wrapper (20 min)
5. Add caching (10 min)
6. Test everything (30 min)

**Total**: ~2.5 hours for massive improvement

---

*Last Updated: December 14, 2025*
