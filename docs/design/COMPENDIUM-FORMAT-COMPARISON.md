# Compendium Format Comparison: structs-compendium vs structs-ai

**Date**: 2026-02-24  
**Purpose**: Compare MCP code that consumes the Structs compendium with the new [structs-ai](https://structs.ai) / [playstructs/structs-ai](https://github.com/playstructs/structs-ai) format (Markdown-first).  
**References**: [structs.ai](https://structs.ai), [structs.ai llms.txt](https://structs.ai/llms.txt), [GitHub structs-ai](https://github.com/playstructs/structs-ai)

---

## Summary

| Aspect | Old (structs-compendium) | New (structs-ai) |
|--------|---------------------------|------------------|
| **Repo** | `playstructs/structs-compendium` | `playstructs/structs-ai` |
| **Primary format** | JSON / YAML (schemas, api, reference) | **Markdown** (`.md`) |
| **Entry points** | Directory scan (`schemas/`, `api/`, etc.) | `llms.txt`, `llms-full.txt`, plus directory layout |
| **Schema files** | `schemas/entities/player.json`, `schemas/errors.json`, etc. | `schemas/entities/player.md`, `schemas/errors.md`, etc. |
| **API specs** | `api/*.yaml` | `api/` content served as Markdown (e.g. [api/error-codes](https://structs.ai/api/error-codes)) |
| **Guides** | Root `AGENTS.md`, etc. | Root `AGENTS.md`, `SOUL.md`, `QUICKSTART.md`, etc. (same idea, same names) |

The MCP server currently assumes the **old** layout and **JSON/YAML** for schema and lookup data. Switching the compendium source to structs-ai without code changes will break several features that `JSON.parse()` or expect specific JSON shapes.

---

## 1. Compendium source and clone

### Current MCP code

| File | Usage |
|------|--------|
| `src/utils/compendium.ts` | Clones `STRUCTS_MCP_COMPENDIUM_REPO` (default `https://github.com/playstructs/structs-compendium.git`) into `aiDocsPath` if missing/empty. |
| `src/config.ts` | `aiDocsPath`: default `./data/structs-compendium`. |
| `README.md`, `Dockerfile`, `docs/guides/DOCKER.md` | Document `STRUCTS_MCP_COMPENDIUM_REPO` and `AI_DOCS_PATH`. |

### New format (structs-ai)

- **Repo**: [https://github.com/playstructs/structs-ai](https://github.com/playstructs/structs-ai).
- **Entry for agents**: [llms.txt](https://structs.ai/llms.txt) (discovery), [llms-full.txt](https://structs.ai/llms-full.txt) (~200KB full load).
- **Layout**: Identity, skills, knowledge, playbooks, awareness, memory, **schemas**, **api**, reference, patterns, etc. — same category names in many cases, but **files are `.md`**, not `.json`/`.yaml`.

### Recommendation

- Point default compendium repo to structs-ai:  
  `STRUCTS_MCP_COMPENDIUM_REPO=https://github.com/playstructs/structs-ai.git` (and document it).
- Keep `ensureCompendiumPresent(aiDocsPath)` cloning into `aiDocsPath`; only the repo URL and on-disk layout change (see below for URI/path implications).

---

## 2. Resource URI scheme and scanner

### Current MCP code

| File | Behavior |
|------|----------|
| `src/utils/uri.ts` | Maps `structs://{category}/{path}` to `{aiDocsPath}/{categoryDir}/{path}`. Categories: `schemas`, `api`, `protocols`, `examples`, `reference`, `patterns`, `visuals`, `guides` (guides = root). |
| `src/resources/scanner.ts` | Scans those category dirs; builds URIs like `structs://schemas/entities/player.json`. **Guides**: only root files matching `^[A-Z_]+\.md$`. |
| `src/resources/index.ts` | Serves content from disk; MIME from extension (`.json`, `.yaml`, `.md`, `.txt`). |

Current URIs are **file-extension-specific** (e.g. `structs://schemas/entities/player.json`). In structs-ai, the same logical resource is `schemas/entities/player.md`.

### New format (structs-ai)

- **schemas**: All top-level and entity schemas are `.md` (e.g. `schemas/entities/player.md`, `schemas/errors.md`, `schemas/formulas.md`, `schemas/actions.md`, `schemas/economics.md`). There is no `schemas/structs.json`; struct-type/build info lives in markdown (e.g. `schemas/entities/struct-type.md`, `schemas/formulas.md`).
- **api**: Content is Markdown (e.g. [structs.ai/api/error-codes](https://structs.ai/api/error-codes)); no `.yaml` files in the repo listing.
- **Root / guides**: Same idea (AGENTS.md, SOUL.md, etc.); scanner’s `^[A-Z_]+\.md$` still matches.

### Recommendation

- **URI resolution (implemented)**: The compendium is now Markdown-first; legacy JSON/YAML files are no longer used. In `src/resources/index.ts`, when resolving a URI that refers to a path ending in `.json`, `.yaml`, or `.yml`, the server **resolves to the same path with `.md` first** (e.g. `structs://schemas/entities/player.json` → `schemas/entities/player.md`). If the `.md` file exists, it is served with MIME type `text/markdown`; otherwise the original path is tried for backward compatibility.
- **List/resources**: Scanner already includes all files in category dirs; with a structs-ai clone, `listResources` will list `.md` URIs and MIME types will reflect the resolved file (e.g. `text/markdown`).

---

## 3. Error code lookup (structs_lookup_error_code)

### Current MCP code

| File | Usage |
|------|--------|
| `src/tools/error-lookup.ts` | Loads **`structs://schemas/errors.json`** via `getResource()`, then `JSON.parse(resource.text)`. Expects shape: `errorCodes[codeStr]`, `structs:retryableErrors.retryable[]`. |

### New format (structs-ai)

- **Path**: [structs.ai/schemas/errors](https://structs.ai/schemas/errors) and repo file **`schemas/errors.md`** (and [api/error-codes](https://structs.ai/api/error-codes) for API errors). Content is **Markdown** (tables, headings), not JSON.

### Impact

- **Break**: Error lookup will fail when only `errors.md` exists — no `errors.json` to parse.
- **Options**:
  1. **Adapter**: Add a small layer that parses `schemas/errors.md` (and/or `api/error-codes`) and builds an in-memory map compatible with existing lookup (e.g. extract tables into `errorCodes` + retryable list). Prefer reusing one canonical source (e.g. `schemas/errors.md`) if it contains the same codes.
  2. **Dual source**: Prefer `structs://schemas/errors.json` if present; if not, try `structs://schemas/errors.md` and parse markdown (or fetch [structs.ai/api/error-codes](https://structs.ai/api/error-codes) and parse that).
  3. **Bundle**: Ship a minimal `errors.json` in this repo or in structs-ai, generated from the Markdown (CI or manual).

---

## 4. Schema validation (structs_validate_schema, structs_validate_transaction, structs_validate_action)

### Current MCP code

| File | Usage |
|------|--------|
| `src/tools/validation.ts` | `validateSchema(data, schemaUri, aiDocsPath)`: loads resource at `schemaUri`, parses as **JSON**, compiles with **Ajv** (JSON Schema Draft 7). Examples: `structs://schemas/entities/player.json`, **`structs://schemas/actions.json`**. |
| | `validateTransaction()` and `validateAction()` call `validateSchema(..., 'structs://schemas/actions.json', ...)`. |

### New format (structs-ai)

- **Entity schemas**: `schemas/entities/player.md`, `planet.md`, etc. — **Markdown** (tables, field descriptions), not JSON Schema.
- **Actions**: **`schemas/actions.md`** (single large Markdown file), no `schemas/actions.json`.

### Impact

- **Break**: Ajv cannot validate against Markdown. Any tool that passes `structs://schemas/entities/player.json` or `structs://schemas/actions.json` will fail to load a JSON schema when only `.md` exists.
- **Options**:
  1. **Keep JSON Schema elsewhere**: structs-ai could add or link to JSON Schema files (e.g. in `schemas/` or a subfolder) and MCP could point to those; then only URI resolution (e.g. `.json` → `.md` fallback) or paths need updating.
  2. **Don’t validate against compendium**: Remove or make optional the schema-validation step for transactions/actions when compendium is structs-ai; keep only structural checks (e.g. `body.messages` array) in code.
  3. **Markdown → JSON Schema**: Build a pipeline that generates JSON Schema from the Markdown entity/action docs and serve or cache that (out of scope for a minimal comparison).

---

## 5. Calculation tools (formulas, struct costs, economics)

### Current MCP code

| File | Resource | Expected shape |
|------|----------|-----------------|
| `src/tools/calculation.ts` | `structs://schemas/formulas.json` | `formulas.formulas.resource['ore-extraction-rate']`, `formulas.formulas.battle['damage-calculation']` |
| | `structs://schemas/structs.json` | `structs.structs[struct_type].buildCost.{alphaMatter, watts}` |
| | `structs://schemas/economics.json` | Used for market/trade (structure not strictly defined in snippet) |

All are **JSON** and `JSON.parse()`d.

### New format (structs-ai)

- **Formulas**: **`schemas/formulas.md`** — Markdown (no `formulas.json`).
- **Struct types / build costs**: In **`schemas/entities/struct-type.md`** (and possibly formulas.md); no `structs.json`.
- **Economics**: **`schemas/economics.md`** — Markdown (no `economics.json`).

### Impact

- **Break**: All three calculation helpers that rely on these paths will get no JSON (or wrong type). They already have fallbacks (default mining rate, placeholder build cost, default market rate), so behavior degrades gracefully but compendium-driven values are lost.
- **Options**:
  1. **Parsers**: Add Markdown parsers for formulas, struct-type, and economics (e.g. extract tables/sections) and populate the same internal structures the code expects.
  2. **Generated JSON**: In structs-ai (or this repo), provide small JSON files (e.g. `formulas.json`, `structs.json`, `economics.json`) generated from the Markdown for MCP consumption.
  3. **Leave as fallbacks**: Accept that with structs-ai-only, calculations use defaults until either adapters or generated JSON exist.

---

## 6. Tool descriptions and documentation references

### Current MCP code

| Location | Reference |
|----------|-----------|
| `src/tools/definitions/validation-tools.ts` | Description suggests URIs like `structs://schemas/entities/player.json`. |
| `docs/design/resource-scheme.md` | Documents many `structs://schemas/...json`, `structs://api/...yaml` examples. |

### Recommendation

- Update tool descriptions and docs to mention that **structs-ai** uses **Markdown**; e.g. “Schema resource URI (e.g. `structs://schemas/entities/player` or `structs://schemas/entities/player.md`). Use structs_query_endpoints to find available schemas.”
- If you add “no-extension” or “.md fallback” resolution, document the resolution order (e.g. try `.json` then `.md`).

---

## 7. Path and category mapping

| Old (structs-compendium) | New (structs-ai) | Notes |
|--------------------------|------------------|--------|
| `schemas/entities/player.json` | `schemas/entities/player.md` | Same path, different extension. |
| `schemas/errors.json` | `schemas/errors.md` | Same path, different extension. |
| `schemas/actions.json` | `schemas/actions.md` | Same path, different extension. |
| `schemas/formulas.json` | `schemas/formulas.md` | Same path, different extension. |
| `schemas/structs.json` | (none) | Build/cost info in `schemas/entities/struct-type.md` + formulas. |
| `schemas/economics.json` | `schemas/economics.md` | Same path, different extension. |
| `schemas/formats.json` | `schemas/formats.md` | Same path, different extension. |
| `api/*.yaml` | `api/` (Markdown) | structs.ai serves api as Markdown (e.g. error-codes). |
| Root `AGENTS.md`, etc. | Same | Guides in root; scanner already matches `^[A-Z_]+\.md$`. |

---

## 8. Recommended next steps

1. **Compendium source**
   - Default `STRUCTS_MCP_COMPENDIUM_REPO` to `https://github.com/playstructs/structs-ai.git` and document that structs-ai is Markdown-first.

2. **URI resolution** ✅ *Done*
   - Implemented in `src/resources/index.ts`: for URIs whose path ends in `.json`, `.yaml`, or `.yml`, the server resolves to the same path with `.md` first and serves that file as Markdown if it exists (e.g. `structs://schemas/entities/player.json` → `player.md`).

3. **Scanner**
   - Include `.md` (and if needed `.yaml`) in scanned categories so `listResources` and MIME types reflect structs-ai.

4. **Error lookup**
   - Add an adapter for `structs://schemas/errors.md` (and optionally api/error-codes) that parses Markdown tables into the shape expected by `error-lookup.ts` (`errorCodes`, `structs:retryableErrors`), or introduce a small generated `errors.json` consumed by existing code.

5. **Schema validation**
   - Decide whether to keep Ajv-based validation:
     - If yes: obtain or generate JSON Schema from structs-ai (e.g. entities, actions) and serve via same URIs or new paths.
     - If no: make transaction/action schema validation optional when only Markdown is present and document the limitation.

6. **Calculations**
   - Either add Markdown parsers for formulas, struct-type, and economics, or provide/generate small JSON artifacts (formulas, struct build costs, economics) for MCP and keep current calculation code.

7. **Docs and tool text**
   - Update resource-scheme.md, validation-tool descriptions, and any other references to prefer or mention structs-ai and `.md` URIs.

---

## 9. References

- [structs.ai](https://structs.ai/) — Entry for AI agents.
- [structs.ai llms.txt](https://structs.ai/llms.txt) — Discovery index.
- [GitHub playstructs/structs-ai](https://github.com/playstructs/structs-ai) — Repo (Markdown-first layout).
- [structs.ai schemas/entities](https://structs.ai/schemas/entities) — Entity definitions (Markdown).
- [structs.ai api/error-codes](https://structs.ai/api/error-codes) — Error code catalog (Markdown).
