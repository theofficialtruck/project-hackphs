import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { incomePerYear, savingsCap, upgradeCost } from './economy';
import { FACTORS, FACTOR_IDS, initialFactorStates, type FactorId } from './factors';
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

  it('stops saving money at the cap, so waiting cannot give unlimited money', () => {
    const idle = advanceTicks(createInitialState(), 12 * 1000).state;
    expect(idle.dollars).toBeCloseTo(GAMEPLAY.savingsYears.value * GAMEPLAY.baseIncome.value, 6);
    expect(savingsCap(idle.factors)).toBe(GAMEPLAY.savingsYears.value * GAMEPLAY.baseIncome.value);
  });

  it('keeps money above the cap, for example from rewards, but adds no more', () => {
    const rich = { ...createInitialState(), dollars: 5000 };
    expect(advanceTicks(rich, 12).state.dollars).toBe(5000);
  });

  it('lets every upgrade fit under the cap with the fewest levels needed to unlock it', () => {
    const minLevels = (id: FactorId): Partial<Record<FactorId, number>> => {
      const factor = FACTORS.find((f) => f.id === id)!;
      const needed: Partial<Record<FactorId, number>> = {};
      for (const r of factor.requires) {
        if (r.type !== 'factorLevel') continue;
        for (const [k, v] of Object.entries({ ...minLevels(r.factor), [r.factor]: r.level })) {
          needed[k as FactorId] = Math.max(needed[k as FactorId] ?? 0, v);
        }
      }
      return needed;
    };
    for (const id of FACTOR_IDS) {
      const top = GAMEPLAY.maxFactorLevel.value - 1;
      const states = stateWithLevels({ ...minLevels(id), [id]: top }).factors;
      expect(upgradeCost(id, top)).toBeLessThanOrEqual(savingsCap(states));
    }
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
