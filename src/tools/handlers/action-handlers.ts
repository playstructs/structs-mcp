/**
 * Action Tool Handlers
 * 
 * @module tools/handlers/action-handlers
 */

import { submitTransaction, createPlayer, buildStruct, activateStruct, attack, moveFleet } from '../action.js';
import { createHandler } from './wrapper.js';
import { config } from '../../config.js';

const aiDocsPath = config.aiDocsPath;

export const actionHandlers = new Map([
  ['structs_action_submit_transaction', createHandler(
    (args) => submitTransaction(
      args?.action as string,
      args?.player_id as string,
      args?.args as Record<string, unknown> | undefined,
      aiDocsPath
    )
  )],
  ['structs_action_create_player', createHandler(
    (args) => createPlayer(
      args?.username as string,
      args?.guild_id as string
    )
  )],
  ['structs_action_build_struct', createHandler(
    (args) => buildStruct(
      args?.struct_type_id as number,
      args?.operate_ambit as string,
      args?.slot as number,
      args?.player_id as string,
      aiDocsPath
    )
  )],
  ['structs_action_activate_struct', createHandler(
    (args) => activateStruct(
      args?.struct_id as string,
      args?.player_id as string
    )
  )],
  ['structs_action_attack', createHandler(
    (args) => attack(
      args?.attacker_struct_id as string,
      args?.target_struct_id as string,
      args?.player_id as string
    )
  )],
  ['structs_action_move_fleet', createHandler(
    (args) => moveFleet(
      args?.fleet_id as string,
      args?.destination_planet_id as string,
      args?.player_id as string
    )
  )],
]);
