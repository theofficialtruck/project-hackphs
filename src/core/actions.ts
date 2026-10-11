/**
 * Actions are requests to change the game (from the player). Expected problems,
 * such as invalid input, are returned as an error result instead of being thrown.
 */
import { upgradeCost } from './economy';
import { applyCards } from './education';
import type { GameEvent } from './events';
import { isFactorId, type FactorId } from './factors';
import { GAMEPLAY } from './gameplay';
import { createInitialState, type GameState } from './state';
import { applyUnlocks } from './unlocks';

export type GameAction =
  | { readonly type: 'upgradeFactor'; readonly factor: FactorId }
  | { readonly type: 'downgradeFactor'; readonly factor: FactorId }
  | { readonly type: 'reset' };

export type ActionErrorCode =
  | 'UNKNOWN_FACTOR'
  | 'FACTOR_LOCKED'
  | 'MAX_LEVEL'
  | 'MIN_LEVEL'
  | 'NOT_ENOUGH_DOLLARS'
  | 'GAME_OVER';

export interface ActionError {
  readonly code: ActionErrorCode;
  readonly message: string;
}

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: ActionError };

function fail(code: ActionErrorCode, message: string): ActionResult {
  return { ok: false, error: { code, message } };
}

function changeLevel(state: GameState, factor: string, change: 1 | -1): ActionResult {
  if (state.progress.endedAtYear !== null) {
    return fail('GAME_OVER', 'The game has ended; start a new game to keep playing');
  }
  // Any string may arrive at runtime, so the id is checked even though the type is FactorId.
  if (!isFactorId(factor)) {
    return fail('UNKNOWN_FACTOR', `There is no factor called "${factor}"`);
  }
  const current = state.factors[factor];
  if (!current.unlocked) {
    return fail('FACTOR_LOCKED', `${factor} is still locked`);
  }
  const level = current.level + change;
  if (level > GAMEPLAY.maxFactorLevel.value) {
    return fail('MAX_LEVEL', `${factor} is already at the highest level`);
  }
  if (level < 0) {
    return fail('MIN_LEVEL', `${factor} is already at level 0`);
  }
  const cost = change > 0 ? upgradeCost(factor, current.level) : 0;
  if (cost > state.dollars) {
    return fail('NOT_ENOUGH_DOLLARS', `${factor} costs ${cost} dollars`);
  }

  const changed: GameState = {
    ...state,
    dollars: state.dollars - cost,
    factors: { ...state.factors, [factor]: { ...current, level } },
  };
  const event: GameEvent =
    change > 0
      ? { type: 'factorUpgraded', factor, level }
      : { type: 'factorDowngraded', factor, level };
  // A higher level may meet another factor's unlock requirement.
  const unlocked = applyUnlocks(changed);
  const events = [event, ...unlocked.events];
  const carded = applyCards(unlocked.state, events);
  return { ok: true, state: carded.state, events: [...events, ...carded.events] };
}

export function applyAction(state: GameState, action: GameAction): ActionResult {
  switch (action.type) {
    case 'upgradeFactor':
      return changeLevel(state, action.factor, 1);
    case 'downgradeFactor':
      return changeLevel(state, action.factor, -1);
    case 'reset':
      return { ok: true, state: createInitialState(), events: [{ type: 'gameReset' }] };
  }
}
