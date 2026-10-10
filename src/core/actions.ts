/**
 * Actions are requests to change the game (from the player or the UI). Expected problems,
 * such as invalid input, are returned as an error result instead of being thrown.
 */
import type { GameEvent } from './events';
import type { Emissions } from './science';
import { createInitialState, type GameState } from './state';

export type GameAction =
  | { readonly type: 'setEmissions'; readonly emissions: Emissions }
  | { readonly type: 'reset' };

export type ActionErrorCode = 'INVALID_EMISSIONS';

export interface ActionError {
  readonly code: ActionErrorCode;
  readonly message: string;
}

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: ActionError };

function isValidRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function applyAction(state: GameState, action: GameAction): ActionResult {
  switch (action.type) {
    case 'setEmissions': {
      const { co2, ch4, n2o } = action.emissions;
      if (!isValidRate(co2) || !isValidRate(ch4) || !isValidRate(n2o)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_EMISSIONS',
            message: `Emissions must be finite and not negative, got ${JSON.stringify(action.emissions)}`,
          },
        };
      }
      const emissions = { co2, ch4, n2o };
      return {
        ok: true,
        state: { ...state, emissions },
        events: [{ type: 'emissionsChanged', emissions }],
      };
    }
    case 'reset':
      return { ok: true, state: createInitialState(), events: [{ type: 'gameReset' }] };
  }
}
