// Helpers shared by the engine tests. Not used by the game itself.
import { FACTOR_IDS, type FactorId, type FactorState } from './factors';
import { GAMEPLAY } from './gameplay';
import { createInitialState, type GameState } from './state';

/** A new game with the given factors unlocked and set to the given levels. */
export function stateWithLevels(levels: Partial<Record<FactorId, number>>): GameState {
  const start = createInitialState();
  const factors: Record<FactorId, FactorState> = { ...start.factors };
  for (const id of FACTOR_IDS) {
    const level = levels[id];
    if (level !== undefined) {
      factors[id] = { level, unlocked: true };
    }
  }
  return { ...start, factors };
}

/** Every factor at the level that matches real world emissions today. */
export function presentDayState(): GameState {
  const level = GAMEPLAY.presentDayLevel.value;
  return stateWithLevels(Object.fromEntries(FACTOR_IDS.map((id) => [id, level])));
}
