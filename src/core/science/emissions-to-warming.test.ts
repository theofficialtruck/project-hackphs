// From emissions to warming: combines the gas cycle, forcing and climate model.
// Reference values from IPCC AR6 WG1 Chapter 5:
// - Section 5.5.1.4: warming per 1000 GtC of cumulative CO2 emissions (TCRE) is likely
//   1.0 to 2.3 C, best estimate 1.65 C.
// - Section 5.5.2.2.4: the zero emissions commitment (warming in the 50 years after CO2
//   emissions stop) has a central value of zero, likely range +/-0.19 C.
import { describe, expect, it } from 'vitest';
import { PREINDUSTRIAL_CLIMATE, stepClimate, type ClimateState } from './climate';
import { effectiveRadiativeForcing } from './forcing';
import {
  NO_EMISSIONS,
  PREINDUSTRIAL_GAS_CYCLE,
  concentrations,
  stepGasCycle,
  type Emissions,
  type GasCycleState,
} from './gas-cycle';

interface World {
  readonly gases: GasCycleState;
  readonly climate: ClimateState;
}

function simulate(start: World, emissions: Emissions, years: number): World {
  let { gases, climate } = start;
  for (let year = 0; year < years; year++) {
    gases = stepGasCycle(gases, emissions, 1);
    climate = stepClimate(climate, effectiveRadiativeForcing(concentrations(gases)).total, 1);
  }
  return { gases, climate };
}

const START: World = { gases: PREINDUSTRIAL_GAS_CYCLE, climate: PREINDUSTRIAL_CLIMATE };
// 10 GtC per year (36.64 GtCO2) for 100 years = 1000 GtC in total.
const CO2_ONLY: Emissions = { ...NO_EMISSIONS, co2: 36.64 };

describe('cumulative CO2 emissions', () => {
  it('warms by an amount per 1000 GtC inside the AR6 likely range (1.0 to 2.3 C)', () => {
    const afterEmitting = simulate(START, CO2_ONLY, 100);
    expect(afterEmitting.climate.surfaceWarming).toBeGreaterThanOrEqual(1.0);
    expect(afterEmitting.climate.surfaceWarming).toBeLessThanOrEqual(2.3);
  });
});

describe('stopping emissions', () => {
  const afterEmitting = simulate(START, CO2_ONLY, 100);

  it('keeps warming if CO2 emissions continue at the same rate', () => {
    const continued = simulate(afterEmitting, CO2_ONLY, 50);
    expect(continued.climate.surfaceWarming).toBeGreaterThan(
      afterEmitting.climate.surfaceWarming + 0.3,
    );
  });

  it('levels off temperature, within the AR6 likely range, when CO2 emissions stop', () => {
    const stopped = simulate(afterEmitting, NO_EMISSIONS, 50);
    const zeroEmissionsCommitment =
      stopped.climate.surfaceWarming - afterEmitting.climate.surfaceWarming;
    expect(Math.abs(zeroEmissionsCommitment)).toBeLessThanOrEqual(0.19);
  });

  it('does not bring CO2 back to its 1750 level for centuries', () => {
    const stopped = simulate(afterEmitting, NO_EMISSIONS, 300);
    expect(concentrations(stopped.gases).co2).toBeGreaterThan(
      concentrations(START.gases).co2 + 100,
    );
  });

  it('removes most of the methane warming within decades, unlike CO2', () => {
    const methaneOnly: Emissions = { ...NO_EMISSIONS, ch4: 300 };
    const methaneWorld = simulate(START, methaneOnly, 100);
    const methaneBefore = effectiveRadiativeForcing(concentrations(methaneWorld.gases)).ch4;
    const methaneAfter = effectiveRadiativeForcing(
      concentrations(simulate(methaneWorld, NO_EMISSIONS, 30).gases),
    ).ch4;

    const co2Before = effectiveRadiativeForcing(concentrations(afterEmitting.gases)).co2;
    const co2After = effectiveRadiativeForcing(
      concentrations(simulate(afterEmitting, NO_EMISSIONS, 30).gases),
    ).co2;

    expect(methaneAfter / methaneBefore).toBeLessThan(0.15);
    expect(co2After / co2Before).toBeGreaterThan(0.7);
  });
});
