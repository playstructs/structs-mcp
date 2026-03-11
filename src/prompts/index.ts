/**
 * MCP Prompts for structs.ai workflows
 *
 * @module prompts
 */

export interface PromptTemplate {
  name: string;
  description: string;
  arguments?: Array< { name: string; description?: string; required?: boolean } >;
  /** Returns the message text, with optional placeholder substitution from args */
  getMessage: (args?: Record<string, string>) => string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'structs_state_assessment',
    description: 'Assess current game state: power, resources, threats, opportunities. Use after checking jobs and before planning. Based on structs.ai awareness/state-assessment.',
    getMessage: () => `Assess the current Structs game state for the player(s) in context.

1. Check jobs first: What proof-of-work or background operations have completed since last check?
2. Power & resources: Alpha Matter, energy, ore, structs, fleets.
3. Threats: Exposed ore, nearby enemies, PDC coverage, raid risk.
4. Opportunities: Ready-to-complete operations, build slots, mining/refining windows, raid targets.

Use MCP query and list tools (structs_query_player, structs_list_planets, structs_query_proof_of_work_status, etc.) to gather data. Summarize concisely with actionable priorities.`,
  },
  {
    name: 'structs_game_loop',
    description: 'One tick of the async game loop: Check jobs → Assess → Plan → Initiate → Dispatch → Verify. Use this prompt to run a full loop step.',
    getMessage: () => `Run one tick of the Structs async game loop:

1. **Check jobs** — Poll proof-of-work status; complete any finished jobs (activate structs, submit complete TXs). Update job tracker.
2. **Assess** — State assessment: power, resources, threats, opportunities (see structs_state_assessment if needed).
3. **Plan** — Decide actions. Think in pipelines: what should be initiated now so it's ready later? One TX per account at a time; wait ~6s between TXs from same account.
4. **Initiate** — Batch initiation transactions. Start age clocks (build, mine, refine, raid). Use --gas auto; use -- before entity IDs in CLI.
5. **Dispatch** — Launch compute for PoW where difficulty is low (e.g. D=3). Prefer initiate early, compute later.
6. **Verify** — Query state to confirm completions. Update memory (jobs, charge tracker, game state).

Never block on PoW. Refine ore immediately (ore is stealable).`,
  },
  {
    name: 'structs_first_session',
    description: 'Bootstrap and first steps for a new agent session. Clone/fetch compendium, check identity, run first game loop. From structs.ai AGENTS.',
    arguments: [
      { name: 'player_id', description: 'Optional player ID (e.g. 1-11) to focus on', required: false },
    ],
    getMessage: (args) => {
      const focus = args?.player_id ? ` Focus on player ${args.player_id}.` : '';
      return `First session bootstrap for Structs:

1. **Environment** — Ensure structs-ai compendium is available (clone or fetch). Reference: https://structs.ai/llms.txt, TOOLS, AGENTS.
2. **Identity** — Load player identity and TOOLS config (address, MCP server).${focus}
3. **Critical rules** — Every structsd tx must use --gas auto; use -- before entity IDs; one TX per account ~6s apart; never block on PoW (initiate early, compute later); refine ore immediately.
4. **First loop** — Run structs_game_loop once: check jobs, assess state, plan, initiate, dispatch, verify. Use structs_query_endpoints to discover tools.`;
    },
  },
];

/** Prompt list item for MCP prompts/list (matches PromptSchema) */
export interface ListPromptItem {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

/**
 * Return prompts for ListPrompts (MCP prompts/list)
 */
export function listPrompts(): ListPromptItem[] {
  return PROMPT_TEMPLATES.map((t) => ({
    name: t.name,
    description: t.description,
    arguments: t.arguments,
  }));
}

/**
 * Return prompt result for GetPrompt (MCP prompts/get). Builds messages with optional argument substitution.
 */
export function getPrompt(
  name: string,
  args?: Record<string, string>
): { description: string; messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> } | null {
  const template = PROMPT_TEMPLATES.find((p) => p.name === name);
  if (!template) {
    return null;
  }
  const text = template.getMessage(args);
  return {
    description: template.description,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text },
      },
    ],
  };
}
