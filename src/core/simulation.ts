/**
 * Moves the simulation forward in time. Each tick (one month) runs the chain:
 * factor levels -> emissions -> gas concentrations -> radiative forcing -> temperature.
 */
import { addIncome } from './economy';
import { applyCards } from './education';
import type { GameEvent, StepResult } from './events';
import { totalEmissions } from './factors';
import { applyProgression } from './progression';
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
  if (state.progress.endedAtYear !== null) return { state, events: [] };

  const emissions = totalEmissions(state.factors);
  const gases = stepGasCycle(state.gases, emissions, YEARS_PER_TICK);
  const forcing = effectiveRadiativeForcing(concentrations(gases)).total;
  const climate = stepClimate(state.climate, forcing, YEARS_PER_TICK);

  const nextTick = state.tick + 1;
  const finishedYear = nextTick % TICKS_PER_YEAR === 0;
  const history = finishedYear
    ? appendHistory(state.history, historyPoint(nextTick / TICKS_PER_YEAR, gases, climate))
    : state.history;

  const unlocked = applyUnlocks({
    ...state,
    tick: nextTick,
    gases,
    climate,
    history,
    dollars: addIncome(state.dollars, state.factors, YEARS_PER_TICK),
    progress: {
      ...state.progress,
      cumulativeCo2: state.progress.cumulativeCo2 + emissions.co2 * YEARS_PER_TICK,
    },
  });
  const progressed = applyProgression(unlocked.state);
  const events = [...unlocked.events, ...progressed.events];
  const carded = applyCards(progressed.state, events);
  return { state: carded.state, events: [...events, ...carded.events] };
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
