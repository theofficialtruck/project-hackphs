import { describe, expect, it } from 'vitest';
import { SCIENCE } from './constants';
import { PREINDUSTRIAL_CONCENTRATIONS } from './forcing';
import {
  GT_CO2_PER_PPM,
  NO_EMISSIONS,
  PREINDUSTRIAL_GAS_CYCLE,
  concentrations,
  stepGasCycle,
  type Emissions,
  type GasCycleState,
} from './gas-cycle';

function run(state: GasCycleState, emissions: Emissions, years: number): GasCycleState {
  let s = state;
  for (let year = 0; year < years; year++) {
    s = stepGasCycle(s, emissions, 1);
  }
  return s;
}

/** Emits `amount` almost instantly (over 0.001 years), like a single pulse. */
function pulse(emissions: Partial<Emissions>): GasCycleState {
  const dt = 0.001;
  const rate: Emissions = {
    co2: (emissions.co2 ?? 0) / dt,
    ch4: (emissions.ch4 ?? 0) / dt,
    n2o: (emissions.n2o ?? 0) / dt,
  };
  return stepGasCycle(PREINDUSTRIAL_GAS_CYCLE, rate, dt);
}

const excessCo2 = (s: GasCycleState) => concentrations(s).co2 - PREINDUSTRIAL_CONCENTRATIONS.co2;

describe('gas cycle', () => {
  it('starts at the 1750 concentrations', () => {
    expect(concentrations(PREINDUSTRIAL_GAS_CYCLE)).toEqual(PREINDUSTRIAL_CONCENTRATIONS);
  });

  it('needs about 7.8 Gt of CO2 to raise CO2 by 1 ppm (2.124 GtC x 3.664)', () => {
    expect(GT_CO2_PER_PPM).toBeCloseTo(7.782, 3);
    expect(excessCo2(pulse({ co2: GT_CO2_PER_PPM }))).toBeCloseTo(1, 3);
  });

  it('keeps about a quarter of a CO2 pulse in the air after 1000 years (Joos et al. 2013: 25 +/- 9%)', () => {
    const after = run(pulse({ co2: 100 * GT_CO2_PER_PPM }), NO_EMISSIONS, 1000);
    const fractionLeft = excessCo2(after) / 100;
    expect(fractionLeft).toBeGreaterThan(0.16);
    expect(fractionLeft).toBeLessThan(0.34);
  });

  it('removes extra methane with an 11.8 year lifetime', () => {
    const start = pulse({ ch4: 100 * SCIENCE.methaneTgPerPpb.value });
    expect(start.ch4Excess).toBeCloseTo(100, 2);
    const later = stepGasCycle(start, NO_EMISSIONS, SCIENCE.methanePerturbationLifetime.value);
    expect(later.ch4Excess / start.ch4Excess).toBeCloseTo(1 / Math.E, 10);
  });

  it('removes extra nitrous oxide with a 109 year lifetime', () => {
    const start = pulse({ n2o: 10 * SCIENCE.nitrousOxideTgNPerPpb.value });
    expect(start.n2oExcess).toBeCloseTo(10, 2);
    const later = stepGasCycle(start, NO_EMISSIONS, SCIENCE.nitrousOxidePerturbationLifetime.value);
    expect(later.n2oExcess / start.n2oExcess).toBeCloseTo(1 / Math.E, 10);
  });

  it('reaches a steady methane level when emissions stay constant', () => {
    const emissions: Emissions = { ...NO_EMISSIONS, ch4: 100 };
    const steady = run(PREINDUSTRIAL_GAS_CYCLE, emissions, 300);
    const expected =
      (100 / SCIENCE.methaneTgPerPpb.value) * SCIENCE.methanePerturbationLifetime.value;
    expect(steady.ch4Excess).toBeCloseTo(expected, 3);
  });

  it('keeps building up CO2 while emissions stay constant (no steady level)', () => {
    const emissions: Emissions = { ...NO_EMISSIONS, co2: 40 };
    const at100 = excessCo2(run(PREINDUSTRIAL_GAS_CYCLE, emissions, 100));
    const at200 = excessCo2(run(PREINDUSTRIAL_GAS_CYCLE, emissions, 200));
    expect(at200).toBeGreaterThan(at100 * 1.5);
  });

  it('gives the same result for one 10 year step as for ten 1 year steps', () => {
    const emissions: Emissions = { co2: 40, ch4: 300, n2o: 7 };
    const oneStep = stepGasCycle(PREINDUSTRIAL_GAS_CYCLE, emissions, 10);
    const tenSteps = run(PREINDUSTRIAL_GAS_CYCLE, emissions, 10);
    expect(concentrations(oneStep).co2).toBeCloseTo(concentrations(tenSteps).co2, 10);
    expect(oneStep.ch4Excess).toBeCloseTo(tenSteps.ch4Excess, 10);
    expect(oneStep.n2oExcess).toBeCloseTo(tenSteps.n2oExcess, 10);
  });

  it('rejects invalid input', () => {
    expect(() => stepGasCycle(PREINDUSTRIAL_GAS_CYCLE, NO_EMISSIONS, 0)).toThrow(RangeError);
    expect(() =>
      stepGasCycle(PREINDUSTRIAL_GAS_CYCLE, { ...NO_EMISSIONS, co2: Number.NaN }, 1),
    ).toThrow(RangeError);
  });
});
