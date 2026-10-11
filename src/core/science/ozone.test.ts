import { describe, expect, it } from 'vitest';
import { SCIENCE } from './constants';
import { effectiveRadiativeForcing, PREINDUSTRIAL_CONCENTRATIONS } from './forcing';
import { ozoneLossPercent } from './ozone';

describe('ozone layer', () => {
  it('is untouched without CFCs', () => {
    expect(ozoneLossPercent(0)).toBe(0);
  });

  it("matches the real world's ozone loss at today's real CFC-12 level (WMO 2022, Q12)", () => {
    expect(ozoneLossPercent(SCIENCE.cfc12Concentration2019.value)).toBeCloseTo(2.5, 10);
  });

  it('thins more with more CFCs but never past 100%', () => {
    expect(ozoneLossPercent(1)).toBeGreaterThan(ozoneLossPercent(0.5));
    expect(ozoneLossPercent(1000)).toBe(100);
  });

  it('is a separate system: CO2 changes the warming but not the ozone layer', () => {
    const lots = { ...PREINDUSTRIAL_CONCENTRATIONS, co2: 800 };
    expect(effectiveRadiativeForcing(lots).total).toBeGreaterThan(0);
    expect(ozoneLossPercent(lots.cfc)).toBe(0);
  });

  it('CFCs both thin the ozone layer and trap heat', () => {
    const cfcs = { ...PREINDUSTRIAL_CONCENTRATIONS, cfc: 0.5 };
    expect(ozoneLossPercent(cfcs.cfc)).toBeGreaterThan(0);
    expect(effectiveRadiativeForcing(cfcs).cfc).toBeGreaterThan(0);
  });
});
