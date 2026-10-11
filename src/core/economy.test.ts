import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { incomePerYear, upgradeCost } from './economy';
import { initialFactorStates } from './factors';
import { GAMEPLAY } from './gameplay';
import { advanceTicks } from './simulation';
import { createInitialState } from './state';
import { stateWithLevels } from './test-helpers';

describe('economy', () => {
  it('starts with enough money for the first upgrade', () => {
    expect(createInitialState().dollars).toBeGreaterThanOrEqual(upgradeCost('coal', 0));
  });

  it('makes each level more expensive than the last', () => {
    for (let level = 1; level < GAMEPLAY.maxFactorLevel.value; level++) {
      expect(upgradeCost('coal', level)).toBeGreaterThan(upgradeCost('coal', level - 1));
    }
  });

  it('earns more money with more activity', () => {
    const none = incomePerYear(initialFactorStates());
    const some = incomePerYear(stateWithLevels({ coal: 3, livestock: 2 }).factors);
    expect(none).toBe(GAMEPLAY.baseIncome.value);
    expect(some).toBe(none + 5 * GAMEPLAY.incomePerLevel.value);
  });

  it('pays income every month', () => {
    const { state } = advanceTicks(createInitialState(), 12);
    expect(state.dollars).toBeCloseTo(createInitialState().dollars + GAMEPLAY.baseIncome.value, 6);
  });

  it('charges for upgrades and refuses when money runs out', () => {
    const start = { ...createInitialState(), dollars: upgradeCost('coal', 0) };
    const first = applyAction(start, { type: 'upgradeFactor', factor: 'coal' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.dollars).toBe(0);
    const second = applyAction(first.state, { type: 'upgradeFactor', factor: 'coal' });
    expect(second).toMatchObject({ ok: false, error: { code: 'NOT_ENOUGH_DOLLARS' } });
  });

  it('lets factors be lowered for free', () => {
    const state = stateWithLevels({ coal: 2 });
    const result = applyAction(state, { type: 'downgradeFactor', factor: 'coal' });
    expect(result.ok && result.state.dollars).toBe(state.dollars);
  });
});
