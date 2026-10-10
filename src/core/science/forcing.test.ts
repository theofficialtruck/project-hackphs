import { describe, expect, it } from 'vitest';
import { SCIENCE } from './constants';
import {
  PREINDUSTRIAL_CONCENTRATIONS,
  co2RadiativeForcing,
  effectiveRadiativeForcing,
  type GasConcentrations,
} from './forcing';

// IPCC AR6 WG1 Chapter 7, Table 7.5: concentrations in 2019 and ERF relative to 1750.
const AR6_2019: GasConcentrations = { co2: 409.9, ch4: 1866.3, n2o: 332.1 };
const AR6_2019_ERF = { co2: 2.156, ch4: 0.544, n2o: 0.208 };

const withCo2 = (co2: number): GasConcentrations => ({ ...PREINDUSTRIAL_CONCENTRATIONS, co2 });

describe('effective radiative forcing', () => {
  it('is zero at pre-industrial (1750) concentrations', () => {
    const f = effectiveRadiativeForcing(PREINDUSTRIAL_CONCENTRATIONS);
    expect(f.co2).toBe(0);
    expect(f.ch4).toBe(0);
    expect(f.n2o).toBe(0);
    expect(f.total).toBe(0);
  });

  it('reproduces the AR6 Table 7.5 forcing for 2019 concentrations', () => {
    const f = effectiveRadiativeForcing(AR6_2019);
    expect(f.co2).toBeCloseTo(AR6_2019_ERF.co2, 2);
    expect(f.ch4).toBeCloseTo(AR6_2019_ERF.ch4, 2);
    expect(f.n2o).toBeCloseTo(AR6_2019_ERF.n2o, 2);
    expect(f.total).toBeCloseTo(f.co2 + f.ch4 + f.n2o, 10);
  });

  it('gives the AR6 assessed forcing (3.93 W/m²) for doubled CO2', () => {
    const f = effectiveRadiativeForcing(withCo2(2 * PREINDUSTRIAL_CONCENTRATIONS.co2));
    expect(f.co2).toBeCloseTo(SCIENCE.co2DoublingForcing.value, 1);
  });

  it('is roughly logarithmic in CO2: a second doubling adds about as much as the first', () => {
    const base = PREINDUSTRIAL_CONCENTRATIONS.co2;
    const once = effectiveRadiativeForcing(withCo2(2 * base)).co2;
    const twice = effectiveRadiativeForcing(withCo2(4 * base)).co2;
    expect(twice / once).toBeGreaterThan(2.0);
    expect(twice / once).toBeLessThan(2.2);
  });

  it('always increases when CO2 increases', () => {
    let previous = -Infinity;
    for (let co2 = 280; co2 <= 3000; co2 += 20) {
      const f = effectiveRadiativeForcing(withCo2(co2)).co2;
      expect(f).toBeGreaterThan(previous);
      previous = f;
    }
  });

  it('is negative if CO2 falls below its 1750 level', () => {
    expect(co2RadiativeForcing(250, 270.1, 278.3)).toBeLessThan(0);
  });

  it('rejects impossible concentrations', () => {
    expect(() => effectiveRadiativeForcing({ co2: 0, ch4: 700, n2o: 270 })).toThrow(RangeError);
    expect(() => effectiveRadiativeForcing({ co2: 400, ch4: -1, n2o: 270 })).toThrow(RangeError);
  });
});
