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
    description: 'Assess current game state: power, resources, threats, opportunities. Use structs_player_dashboard for a one-call overview.',
    getMessage: () => `Assess the current Structs game state for the player(s) in context.

1. **Dashboard** — Call structs_player_dashboard with the player ID. This returns player state, structs, fleets, power, and in-progress operations in a single call.
2. **Threats** — Check for exposed ore (refine immediately!), nearby enemies, PDC coverage gaps, raid risk.
3. **Opportunities** — Ready-to-complete operations, build slots, mining/refining windows, raid targets.
4. **Permissions** — v0.15.0 uses 24-bit permissions. Check if you have required flags for planned actions (PermPlay, PermHashBuild, PermHashMine, etc.).

Summarize concisely with actionable priorities: Survival > Security > Economy > Expansion > Dominance.`,
  },
  {
    name: 'structs_game_loop',
    description: 'One tick of the async game loop: Dashboard → Assess → Plan → Preflight → Execute → Verify. References v0.15.0 intelligence tools.',
    getMessage: () => `Run one tick of the Structs async game loop (v0.15.0 / structstestnet-111):

1. **Dashboard** — Call structs_player_dashboard to get full state in one call. Check in-progress operations.
2. **Assess** — Power margin (capacity - load), exposed ore, threats, opportunities (see structs_state_assessment).
3. **Plan** — Decide actions. Think in pipelines: what should be initiated now so it's ready later? One TX per account at a time; wait ~6s between TXs.
4. **Preflight** — Before each action, call structs_preflight_check to verify the action will succeed (checks permissions, resources, entity state).
5. **Execute** — Use structs_prepare_command to generate exact CLI commands with correct flags (--gas auto --gas-adjustment 1.5, -- before IDs). Run commands.
6. **Verify** — Query state to confirm completions. If errors, use structs_diagnose_error for specific fix guidance.

Never block on PoW. Refine ore immediately (ore is stealable). v0.15.0: check 24-bit permissions before guild/permission actions.`,
  },
  {
    name: 'structs_first_session',
    description: 'Bootstrap for a new agent session. Discover tools, check identity, run first game loop. Updated for v0.15.0.',
    arguments: [
      { name: 'player_id', description: 'Optional player ID (e.g. 1-11) to focus on', required: false },
    ],
    getMessage: (args) => {
      const focus = args?.player_id ? ` Focus on player ${args.player_id}.` : '';
      return `First session bootstrap for Structs (v0.15.0 / structstestnet-111):

1. **Environment** — Reference: https://structs.ai/llms.txt, TOOLS, AGENTS. Compendium: structs-ai repo.
2. **Identity** — Load player identity and TOOLS config (address, MCP server).${focus}
3. **Intelligence tools** — You have 4 key tools:
   - structs_player_dashboard — full state in one call
   - structs_preflight_check — verify actions before spending gas
   - structs_prepare_command — generate exact CLI commands
   - structs_diagnose_error — diagnose failures with fix guidance
4. **Critical rules** — --gas auto --gas-adjustment 1.5 on every tx; -- before entity IDs; one TX per account ~6s apart; never block on PoW; refine ore immediately.
5. **First loop** — Run structs_game_loop once: dashboard, assess, plan, preflight, execute, verify.
6. **Permissions** — v0.15.0 uses 24-bit permission flags. PermAll=16777215. Check https://structs.ai/knowledge/mechanics/permissions.`;
    },
  },
  {
    name: 'structs_combat_assessment',
    description: 'Evaluate combat readiness: fleet composition, PDC coverage, counter-attack exposure, damage estimates. Use before engaging.',
    arguments: [
      { name: 'player_id', description: 'Player ID to assess', required: true },
    ],
    getMessage: (args) => {
      const pid = args?.player_id || '[player-id]';
      return `Combat readiness assessment for player ${pid} (v0.15.0 combat engine):

1. **Fleet composition** — Call structs_player_dashboard to list all structs. Identify combat-capable structs by type, ambit, and status.
2. **PDC coverage** — Check for Planetary Defense Cannons. Multiple PDCs on the same planet stack. PDC fires automatically after all targets resolved.
3. **Counter-attack exposure** — v0.15.0: each struct counters once per struct-attack invocation. Defender counters before block (first shot). Target counters after all shots (if alive). Attacker may take damage from both.
4. **Damage estimates** — Use structs_calculate_damage with attacker/target/defender params. Min damage is 1 per hit. Block does NOT apply on evaded shots.
5. **Ambit analysis** — Check weapon target matrix: which of your structs can hit which enemy ambits? Signal Jamming vs guided = 66% miss. Defensive Maneuver vs unguided = 66% miss. Armour always reduces by 1.
6. **Recommendations** — Assign defenders (struct-defense-set) to protect high-value targets (Command Ship, Ore Refinery). Consider stealth for cross-ambit protection.

Reference: https://structs.ai/knowledge/mechanics/combat`;
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
