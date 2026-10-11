// Money in the game: upgrade prices and yearly income. All numbers here are gameplay values.
import { FACTOR_IDS, type FactorId, type FactorStates } from './factors';
import { GAMEPLAY } from './gameplay';

export function upgradeCost(factor: FactorId, currentLevel: number): number {
  const base = GAMEPLAY.factorBaseCosts.value[factor];
  return Math.round(base * GAMEPLAY.costGrowth.value ** currentLevel);
}

export function incomePerYear(states: FactorStates): number {
  const levels = FACTOR_IDS.reduce((sum, id) => sum + states[id].level, 0);
  return GAMEPLAY.baseIncome.value + GAMEPLAY.incomePerLevel.value * levels;
}

/** Maximum savings from ordinary income: twenty years at the current income rate. */
export function savingsCap(states: FactorStates): number {
  return incomePerYear(states) * 20;
}
