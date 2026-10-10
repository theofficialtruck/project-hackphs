import type { GameEvent, StepResult } from './events';
import { newlyUnlockable } from './factors';
import type { GameState } from './state';

/**
 * Unlocks every factor whose requirements are now met. Once unlocked, a factor stays
 * unlocked even if the conditions later stop being true.
 */
export function applyUnlocks(state: GameState): StepResult<GameState> {
  const ids = newlyUnlockable(state.factors, state.climate.surfaceWarming);
  if (ids.length === 0) {
    return { state, events: [] };
  }
  const factors = { ...state.factors };
  const events: GameEvent[] = [];
  for (const id of ids) {
    factors[id] = { ...factors[id], unlocked: true };
    events.push({ type: 'factorUnlocked', factor: id });
  }
  return { state: { ...state, factors }, events };
}
