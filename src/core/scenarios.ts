// Ready made game situations for testing and demos. Each is made by playing the game from the
// start with one simple rule: every year, buy the cheapest upgrades that can be afforded.
import { applyAction } from './actions';
import { upgradeCost } from './economy';
import { FACTOR_IDS } from './factors';
import { GAMEPLAY } from './gameplay';
import { advanceTicks } from './simulation';
import { TICKS_PER_YEAR, createInitialState, type GameState } from './state';

export type ScenarioId = 'start' | 'oneDegree' | 'twoDegrees' | 'fourDegrees' | 'nearEnd';

export interface Scenario {
  readonly id: ScenarioId;
  readonly name: string;
  readonly warming: number;
}

export const SCENARIOS: readonly Scenario[] = [
  { id: 'start', name: 'Start of the game', warming: 0 },
  { id: 'oneDegree', name: 'About +1 degree C', warming: 1 },
  { id: 'twoDegrees', name: 'About +2 degrees C', warming: 2 },
  { id: 'fourDegrees', name: 'About +4 degrees C', warming: 4 },
  { id: 'nearEnd', name: 'Close to the ending', warming: 19.5 },
];

const MAX_YEARS = 10000;

export function buyCheapestUpgrades(state: GameState): GameState {
  let current = state;
  for (;;) {
    const options = FACTOR_IDS.filter((id) => {
      const f = current.factors[id];
      return f.unlocked && f.level < GAMEPLAY.maxFactorLevel.value;
    }).sort(
      (a, b) => upgradeCost(a, current.factors[a].level) - upgradeCost(b, current.factors[b].level),
    );
    const choice = options[0];
    if (!choice) return current;
    const result = applyAction(current, { type: 'upgradeFactor', factor: choice });
    if (!result.ok) return current;
    current = result.state;
  }
}

export function createScenario(id: ScenarioId): GameState {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new RangeError(`Unknown scenario "${id}"`);
  let state = createInitialState();
  for (let year = 0; year < MAX_YEARS && state.climate.surfaceWarming < scenario.warming; year++) {
    state = advanceTicks(buyCheapestUpgrades(state), TICKS_PER_YEAR).state;
  }
  return state;
}
