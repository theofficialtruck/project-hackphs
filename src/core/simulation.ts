/**
 * Moves the simulation forward in time. Each tick (one month) runs the chain:
 * emissions -> gas concentrations -> radiative forcing -> temperature.
 */
import { concentrations, effectiveRadiativeForcing, stepClimate, stepGasCycle } from './science';
import {
  MAX_HISTORY_YEARS,
  TICKS_PER_YEAR,
  historyPoint,
  type GameState,
  type HistoryPoint,
} from './state';

const YEARS_PER_TICK = 1 / TICKS_PER_YEAR;

function appendHistory(
  history: readonly HistoryPoint[],
  point: HistoryPoint,
): readonly HistoryPoint[] {
  const next = [...history, point];
  return next.length > MAX_HISTORY_YEARS ? next.slice(next.length - MAX_HISTORY_YEARS) : next;
}

/** Advances the simulation by one tick (one month). Returns a new state. */
export function tick(state: GameState): GameState {
  const gases = stepGasCycle(state.gases, state.emissions, YEARS_PER_TICK);
  const forcing = effectiveRadiativeForcing(concentrations(gases)).total;
  const climate = stepClimate(state.climate, forcing, YEARS_PER_TICK);

  const nextTick = state.tick + 1;
  const finishedYear = nextTick % TICKS_PER_YEAR === 0;
  const history = finishedYear
    ? appendHistory(state.history, historyPoint(nextTick / TICKS_PER_YEAR, gases, climate))
    : state.history;

  return { ...state, tick: nextTick, gases, climate, history };
}

/** Advances the simulation by a whole number of ticks. */
export function advanceTicks(state: GameState, ticks: number): GameState {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError(`ticks must be a non negative integer, got ${ticks}`);
  }
  let next = state;
  for (let i = 0; i < ticks; i++) {
    next = tick(next);
  }
  return next;
}
