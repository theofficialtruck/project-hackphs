import { describe, expect, it } from 'vitest';
import {
  FACTORS,
  FACTOR_IDS,
  emissionsPerLevel,
  initialFactorStates,
  newlyUnlockable,
  totalEmissions,
  type FactorId,
  type FactorStates,
} from './factors';
import { GAMEPLAY } from './gameplay';
import { SCIENCE } from './science';
import { presentDayState } from './test-helpers';

describe('factor definitions', () => {
  it('have unique ids and a starting state for every factor', () => {
    expect(new Set(FACTOR_IDS).size).toBe(FACTORS.length);
    expect(Object.keys(initialFactorStates()).sort()).toEqual([...FACTOR_IDS].sort());
  });

  it('have a name, description and some real emissions', () => {
    for (const factor of FACTORS) {
      expect(factor.name.length).toBeGreaterThan(0);
      expect(factor.description.length).toBeGreaterThan(0);
      const { co2, ch4, n2o } = factor.presentDay;
      expect(co2 + ch4 + n2o).toBeGreaterThan(0);
      expect(Math.min(co2, ch4, n2o)).toBeGreaterThanOrEqual(0);
    }
  });

  it('only require existing factors at reachable levels', () => {
    for (const factor of FACTORS) {
      for (const r of factor.requires) {
        if (r.type === 'factorLevel') {
          expect(FACTOR_IDS).toContain(r.factor);
          expect(r.level).toBeLessThanOrEqual(GAMEPLAY.maxFactorLevel.value);
        }
      }
    }
  });

  it('can all be unlocked by upgrading factors (no circular requirements)', () => {
    let states: FactorStates = initialFactorStates();
    for (let round = 0; round < FACTORS.length; round++) {
      const next: Record<FactorId, { level: number; unlocked: boolean }> = { ...states };
      for (const id of FACTOR_IDS) {
        if (next[id].unlocked) next[id] = { level: GAMEPLAY.maxFactorLevel.value, unlocked: true };
      }
      for (const id of newlyUnlockable(next, 10)) next[id] = { ...next[id], unlocked: true };
      states = next;
    }
    expect(FACTOR_IDS.every((id) => states[id].unlocked)).toBe(true);
  });

  it('start with some factors available and others locked', () => {
    const start = initialFactorStates();
    expect(start.coal.unlocked).toBe(true);
    expect(start.fertilizer.unlocked).toBe(false);
    expect(FACTOR_IDS.every((id) => start[id].level === 0)).toBe(true);
  });
});

describe('factor emissions', () => {
  it('add up to the real world sector totals at the present day level', () => {
    const total = totalEmissions(presentDayState().factors);
    const shares = SCIENCE.fossilCo2Shares.value;
    const fossilShare = shares.coal + shares.oil + shares.naturalGas + shares.cement;
    const expectedCo2 =
      SCIENCE.fossilCo2Emissions.value * fossilShare +
      SCIENCE.landUseCo2Emissions.value * SCIENCE.co2PerCarbon.value;
    const expectedCh4 =
      SCIENCE.coalMiningMethane.value +
      SCIENCE.livestockMethane.value +
      SCIENCE.riceMethane.value +
      SCIENCE.oilAndGasMethane.value +
      SCIENCE.wasteMethane.value;

    expect(total.co2).toBeCloseTo(expectedCo2, 10);
    expect(total.co2).toBeCloseTo(40.4, 1); // about 40 billion tonnes of CO2 per year
    expect(total.ch4).toBeCloseTo(expectedCh4, 10);
    expect(total.n2o).toBeCloseTo(SCIENCE.agricultureNitrousOxide.value, 10);
  });

  it('grow by the same amount for every level', () => {
    for (const factor of FACTORS) {
      const perLevel = emissionsPerLevel(factor);
      expect(perLevel.co2 * GAMEPLAY.presentDayLevel.value).toBeCloseTo(factor.presentDay.co2, 10);
      expect(perLevel.ch4 * GAMEPLAY.presentDayLevel.value).toBeCloseTo(factor.presentDay.ch4, 10);
    }
  });

  it('are zero when every factor is at level 0', () => {
    expect(totalEmissions(initialFactorStates())).toEqual({ co2: 0, ch4: 0, n2o: 0 });
  });
});
