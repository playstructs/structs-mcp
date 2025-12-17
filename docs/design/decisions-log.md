# Design Decisions Log

**Date**: December 8, 2025  
**Purpose**: Track all design decisions and their rationale

---

## Decision Process

1. **Proposal**: Initial proposal in design documents
2. **Team Input**: Team members provide input
3. **Discussion**: Team discusses options
4. **Decision**: Final decision documented here
5. **Rationale**: Why this decision was made

---

## Decisions

### Decision 1: Technology Stack

**Status**: ✅ **DECIDED** (January 2025)  
**Decision**: TypeScript/Node.js  
**Alternatives Considered**: Python, Go  
**Rationale**: 
- MCP SDK compatibility
- Team expertise (Developer Relations)
- Good ecosystem for JSON/YAML handling
- Good ecosystem for JSON/YAML handling
**Team Input**: Developer Relations confirmed preference for TypeScript/Node.js

---

### Decision 2: API Integration Approach

**Status**: ✅ **UPDATED** (January 2025)  
**Decision**: Use `structs-webapp/src/js/` folder for hashing, use `signer.*` schema for transactions  
**Rationale**: 
- `structs-webapp/src/js/` contains critical components:
  - `TaskManager.js` - Proof-of-work hashing functionality
  - GRASS examples - Real-time streaming integration
  - Game state and API logic - Comprehensive game state access
- **Transaction Signing**: Use `signer.*` schema instead of SigningClientManager.js
  - Avoids cryptographic key management in MCP server
  - Uses proven Play Tester method
  - Database handles all signing internally
- These are production-tested components used by the webapp
- Provides all necessary functionality in one place
- Better integration with existing Structs infrastructure
**Previous Decision**: Hybrid approach with `structs-client-ts` (superseded)
**Team Input**: PM recommendation to use structs-webapp/src/js/ instead, then updated to use signer.* schema (January 2025)

---

### Decision 3: Resource URI Scheme

**Status**: ✅ Draft Complete  
**Decision**: `structs://{category}/{path}` with direct mapping  
**Rationale**: Intuitive, preserves structure, supports fragments  
**Team Input Needed**: API Documentation Specialist (review)

---

### Decision 4: Resource Caching

**Status**: ✅ **DECIDED** (January 2025)  
**Decision**: In-memory cache initially (Option A)  
**Alternatives Considered**: 
- Option A: In-memory cache (chosen)
- Option B: File-based cache
- Option C: No caching initially
**Rationale**: 
- Fast and simple to implement
- Resources are relatively static (documentation files)
- Can add persistent cache later if needed
**Strategy**: Cache all resources on first access, invalidate on file changes  
**Future Consideration**: Consider persistent cache if memory becomes concern  
**Team Input**: Developer Relations recommended Option A (In-memory cache)

---

### Decision 5: Schema Versioning

**Status**: ⏳ Pending Team Input  
**Proposed**: Version in content, not URI (start simple)  
**Alternatives**: Version in URI  
**Rationale**: Simpler, can add URI versioning later if needed  
**Team Input Needed**: API Documentation Specialist

---

### Decision 6: Tool Naming Convention

**Status**: ✅ **DECIDED** (January 2025)  
**Decision**: `structs_{category}_{action}` (e.g., `structs_validate_entity_id`)  
**Rationale**: 
- Universal client compatibility (underscores supported by all MCP clients)
- Avoids risk of client incompatibility (some clients use regex that excludes dots)
- Still maintains clear namespace structure
- Can switch to dots later if verified safe with all target clients
**Team Input**: Developer Relations research and recommendation reviewed and approved
**Original Proposal**: `structs.{category}.{action}` (changed due to compatibility concerns)

---

### Decision 7: Error Handling Format

**Status**: ✅ Draft Complete  
**Decision**: Consistent error format across all tools  
**Rationale**: Easier for agents to handle, better UX  
**Team Input Needed**: Review by all team members

---

### Decision 8: Implementation Phases

**Status**: ✅ Draft Complete  
**Decision**: 4 phases (Resources → Validation → API → Advanced)  
**Rationale**: Prioritized by value, manageable complexity  
**Team Input Needed**: Review by all team members

---

### Decision 9: Database Access Control (DANGER Variable)

**Status**: ✅ **DECIDED** (December 2025)  
**Decision**: Add `DANGER` environment variable to control database access  
**Rationale**: 
- Allows running MCP server in safe read-only mode
- Prevents accidental transaction submission or player creation
- Default to safe mode (`DANGER=false`)
- When enabled, allows database write operations (transactions, player creation)
- When disabled, only allows read-only operations via webapp/structsd APIs
**Team Input**: PM recommendation for security and safety
**Affected Tools**:
- `structs_action_submit_transaction` - Requires `DANGER=true`
- `structs_action_create_player` - Requires `DANGER=true`
- `structs_query_planet_activity` - Requires `DANGER=true` (database query)

---

## Pending Decisions

### To Be Decided This Week

1. ✅ Technology stack (Developer Relations input) - **DECIDED**
2. ✅ API integration approach (Developer Relations input) - **DECIDED**
3. ✅ Resource caching strategy (Developer Relations input) - **DECIDED**
4. ⏳ Schema versioning approach (API Documentation Specialist input)
5. ⏳ Resource mapping details (API Documentation Specialist input)

---

## Decision History

### December 8, 2025

- **Project Setup**: Created project structure and coordination files
- **Architecture Design**: Created initial architecture document
- **Resource URI Scheme**: Drafted URI scheme specification
- **Tool Specifications**: Drafted tool API specifications
- **Implementation Plan**: Created phased implementation plan
- **Planning Documents**: Created planning discussion documents

### January 2025

- **Technology Stack**: Decided on TypeScript/Node.js (Developer Relations input)
- **API Integration**: Updated to use `structs-webapp/src/js/` modules (PM recommendation - December 8, 2025)
- **Resource Caching**: Decided on in-memory cache initially (Developer Relations input)
- **Tool Naming Convention**: Decided on underscores (`structs_{category}_{action}`) for client compatibility (Developer Relations research + Technical Editor approval)
- **Planning Input**: Received Developer Relations responses to key questions

### December 2025

- **Database Access Control**: Added `DANGER` environment variable to control database access (PM recommendation - December 2025)
  - When `DANGER=true`: Database access enabled (transaction signing, player creation)
  - When `DANGER=false` or unset: Read-only mode via webapp/structsd APIs only
  - Default: `DANGER=false` (safe mode)
  - Rationale: Allows running MCP server in safe read-only mode without database write access

---

*Last Updated: December 8, 2025*

