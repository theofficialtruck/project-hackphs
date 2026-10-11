import { describe, expect, it } from 'vitest';
import {
  PREINDUSTRIAL_CLIMATE,
  energyImbalance,
  equilibriumWarming,
  feedbackBreakdown,
  noFeedbackEquilibriumWarming,
  stepClimate,
  type ClimateState,
} from './climate';
import { SCIENCE } from './constants';
import { PREINDUSTRIAL_CONCENTRATIONS, effectiveRadiativeForcing } from './forcing';

const DOUBLED_CO2_FORCING = effectiveRadiativeForcing({
  ...PREINDUSTRIAL_CONCENTRATIONS,
  co2: 2 * PREINDUSTRIAL_CONCENTRATIONS.co2,
}).total;

function runConstantForcing(forcing: number, years: number): ClimateState {
  let state = PREINDUSTRIAL_CLIMATE;
  for (let year = 0; year < years; year++) {
    state = stepClimate(state, forcing, 1);
  }
  return state;
}

describe('two-layer climate model', () => {
  it('stays at zero warming with no forcing', () => {
    expect(runConstantForcing(0, 100)).toEqual(PREINDUSTRIAL_CLIMATE);
  });

  it('eventually reaches equilibrium warming, where the energy imbalance disappears', () => {
    const state = runConstantForcing(DOUBLED_CO2_FORCING, 3000);
    const expected = equilibriumWarming(DOUBLED_CO2_FORCING);
    expect(state.surfaceWarming).toBeCloseTo(expected, 2);
    expect(state.deepOceanWarming).toBeCloseTo(expected, 2);
    expect(Math.abs(energyImbalance(DOUBLED_CO2_FORCING, state.surfaceWarming))).toBeLessThan(0.01);
  });

  it('has an equilibrium sensitivity inside the AR6 likely range (2.5 to 4 C)', () => {
    const ecs = equilibriumWarming(DOUBLED_CO2_FORCING);
    expect(ecs).toBeGreaterThanOrEqual(2.5);
    expect(ecs).toBeLessThanOrEqual(4.0);
  });

  it('lags behind the forcing: after 10 years it is far from equilibrium', () => {
    const state = runConstantForcing(DOUBLED_CO2_FORCING, 10);
    const equilibrium = equilibriumWarming(DOUBLED_CO2_FORCING);
    expect(state.surfaceWarming).toBeGreaterThan(0);
    expect(state.surfaceWarming).toBeLessThan(0.7 * equilibrium);
    expect(state.deepOceanWarming).toBeLessThan(state.surfaceWarming);
    expect(energyImbalance(DOUBLED_CO2_FORCING, state.surfaceWarming)).toBeGreaterThan(0);
  });

  it('has a transient climate response inside the AR6 likely range (1.4 to 2.2 C)', () => {
    // CO2 rising 1% per year doubles after about 70 years.
    let state = PREINDUSTRIAL_CLIMATE;
    for (let year = 0; year < 70; year++) {
      const co2 = PREINDUSTRIAL_CONCENTRATIONS.co2 * 1.01 ** (year + 0.5);
      const forcing = effectiveRadiativeForcing({ ...PREINDUSTRIAL_CONCENTRATIONS, co2 }).total;
      state = stepClimate(state, forcing, 1);
    }
    expect(state.surfaceWarming).toBeGreaterThanOrEqual(1.4);
    expect(state.surfaceWarming).toBeLessThanOrEqual(2.2);
  });

  it('gives nearly the same answer with ten times smaller time steps', () => {
    const normal = stepClimate(PREINDUSTRIAL_CLIMATE, DOUBLED_CO2_FORCING, 50);
    const fine = stepClimate(PREINDUSTRIAL_CLIMATE, DOUBLED_CO2_FORCING, 50, 240);
    const relativeDifference =
      Math.abs(normal.surfaceWarming - fine.surfaceWarming) / fine.surfaceWarming;
    expect(relativeDifference).toBeLessThan(0.005);
  });

  it('rejects invalid input', () => {
    expect(() => stepClimate(PREINDUSTRIAL_CLIMATE, 1, 0)).toThrow(RangeError);
    expect(() => stepClimate(PREINDUSTRIAL_CLIMATE, Number.NaN, 1)).toThrow(RangeError);
  });
});

describe('feedbacks', () => {
  it('add up to the net feedback at any warming', () => {
    const b = feedbackBreakdown(2);
    const sum = b.planck + b.waterVapourLapseRate + b.surfaceAlbedo + b.clouds + b.biogeophysical;
    expect(sum).toBeCloseTo(SCIENCE.netFeedback.value * 2, 10);
  });

  it('show water vapour as the largest amplifying feedback', () => {
    const b = feedbackBreakdown(1);
    expect(b.waterVapourLapseRate).toBeGreaterThan(b.clouds);
    expect(b.waterVapourLapseRate).toBeGreaterThan(b.surfaceAlbedo);
  });

  it('nearly triple the warming compared with the Planck response alone', () => {
    const amplification =
      equilibriumWarming(DOUBLED_CO2_FORCING) / noFeedbackEquilibriumWarming(DOUBLED_CO2_FORCING);
    expect(amplification).toBeCloseTo(3.22 / 1.16, 10);
  });
});
