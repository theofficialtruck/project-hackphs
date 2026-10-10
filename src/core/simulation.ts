/**
 * Moves the simulation forward in time. Each tick (one month) runs the chain:
 * factor levels -> emissions -> gas concentrations -> radiative forcing -> temperature.
 */
import type { GameEvent, StepResult } from './events';
import { totalEmissions } from './factors';
import { concentrations, effectiveRadiativeForcing, stepClimate, stepGasCycle } from './science';
import {
  MAX_HISTORY_YEARS,
  TICKS_PER_YEAR,
  historyPoint,
  type GameState,
  type HistoryPoint,
} from './state';
import { applyUnlocks } from './unlocks';

const YEARS_PER_TICK = 1 / TICKS_PER_YEAR;

function appendHistory(
  history: readonly HistoryPoint[],
  point: HistoryPoint,
): readonly HistoryPoint[] {
  const next = [...history, point];
  return next.length > MAX_HISTORY_YEARS ? next.slice(next.length - MAX_HISTORY_YEARS) : next;
}

/** Advances the simulation by one tick (one month). Returns a new state. */
export function tick(state: GameState): StepResult<GameState> {
  const gases = stepGasCycle(state.gases, totalEmissions(state.factors), YEARS_PER_TICK);
  const forcing = effectiveRadiativeForcing(concentrations(gases)).total;
  const climate = stepClimate(state.climate, forcing, YEARS_PER_TICK);

  const nextTick = state.tick + 1;
  const finishedYear = nextTick % TICKS_PER_YEAR === 0;
  const history = finishedYear
    ? appendHistory(state.history, historyPoint(nextTick / TICKS_PER_YEAR, gases, climate))
    : state.history;

  // Warming may have crossed an unlock threshold.
  return applyUnlocks({ ...state, tick: nextTick, gases, climate, history });
}

/** Advances the simulation by a whole number of ticks. */
export function advanceTicks(state: GameState, ticks: number): StepResult<GameState> {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError(`ticks must be a non negative integer, got ${ticks}`);
  }
  let next = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const result = tick(next);
    next = result.state;
    events.push(...result.events);
  }
  return { state: next, events };
}
