/**
 * The Game object is the interface a UI uses. It holds the current state, turns real
 * time into simulation ticks, and tells subscribers when something changed.
 */
import { applyAction, type ActionError, type GameAction } from './actions';
import type { GameEvent } from './events';
import type { FactorId } from './factors';
import { previewUpgrade, type UpgradePreview } from './preview';
import { advanceTicks } from './simulation';
import { TICKS_PER_YEAR, createInitialState, type GameState } from './state';
import { selectView, type GameView } from './view';

/** Largest amount of time one `advance` call may simulate. */
export const MAX_YEARS_PER_ADVANCE = 1000;

/** Result of `Game.dispatch` */
export type DispatchResult =
  | { readonly ok: true; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: ActionError };

export type GameListener = (view: GameView) => void;

export interface Game {
  getView(): GameView;
  getState(): GameState;
  /**
   * Advances simulated time by `years` (may be fractional). The UI owns the clock, for
   * example: `game.advance(secondsSinceLastFrame * yearsPerSecond)`. The simulation moves in
   * whole months; leftover time is kept and used by the next call.
   */
  advance(years: number): readonly GameEvent[];
  dispatch(action: GameAction): DispatchResult;
  subscribe(listener: GameListener): () => void;
  previewUpgrade(factor: FactorId): UpgradePreview | null;
}

export function createGame(initialState: GameState = createInitialState()): Game {
  let state = initialState;
  let cachedView: GameView | null = null;
  let leftoverYears = 0;
  const listeners = new Set<GameListener>();

  function getView(): GameView {
    cachedView ??= selectView(state);
    return cachedView;
  }

  function update(next: GameState): void {
    state = next;
    cachedView = null;
    const view = getView();
    listeners.forEach((listener) => listener(view));
  }

  return {
    getView,

    getState: () => state,

    advance(years) {
      if (!Number.isFinite(years) || years < 0 || years > MAX_YEARS_PER_ADVANCE) {
        throw new RangeError(`years must be between 0 and ${MAX_YEARS_PER_ADVANCE}, got ${years}`);
      }
      leftoverYears += years;
      const ticks = Math.floor(leftoverYears * TICKS_PER_YEAR + 1e-9);
      if (ticks === 0) {
        return [];
      }
      leftoverYears = Math.max(0, leftoverYears - ticks / TICKS_PER_YEAR);
      const result = advanceTicks(state, ticks);
      update(result.state);
      return result.events;
    },

    dispatch(action) {
      const result = applyAction(state, action);
      if (!result.ok) {
        return result;
      }
      if (action.type === 'reset') {
        leftoverYears = 0;
      }
      update(result.state);
      return { ok: true, events: result.events };
    },

    previewUpgrade: (factor) => previewUpgrade(state, factor),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
