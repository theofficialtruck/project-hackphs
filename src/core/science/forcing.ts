/**
 * Radiative forcing: how much extra energy (W m^-2) is trapped because greenhouse gas
 * concentrations are higher than in 1750.
 *
 * Uses the simplified expressions of Meinshausen et al. (2020), the ones used by IPCC
 * AR6 (Table 7.SM.1). They give stratospheric-temperature-adjusted radiative forcing (SARF);
 * multiplying by (1 + adjustment) converts that to effective radiative forcing (ERF), which
 * is what drives surface warming.
 */
import { assertFinite, assertPositive } from './checks';
import { SCIENCE } from './constants';

/** CO2 in ppm, CH4 and N2O in ppb. */
export interface GasConcentrations {
  readonly co2: number;
  readonly ch4: number;
  readonly n2o: number;
  readonly cfc: number;
}

export const PREINDUSTRIAL_CONCENTRATIONS: GasConcentrations = {
  co2: SCIENCE.co2Preindustrial.value,
  ch4: SCIENCE.ch4Preindustrial.value,
  n2o: SCIENCE.n2oPreindustrial.value,
  cfc: 0,
};

const { a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, d3 } = SCIENCE.greenhouseForcingCoefficients.value;

/**
 * CO2 radiative forcing (SARF), W m^-2.
 *
 * Roughly logarithmic: each doubling of CO2 adds about the same forcing, because the
 * centre of CO2's absorption band is already saturated and extra CO2 mostly absorbs at
 * its edges. `alphaPrime` slightly strengthens the effect at higher concentrations, up to
 * a maximum (around 1800 ppm), after which it is held constant. N2O absorbs at some of the
 * same wavelengths, so more N2O slightly reduces CO2's effect (`alphaN2O`).
 */
export function co2RadiativeForcing(co2: number, n2o: number, co2Baseline: number): number {
  assertPositive(co2, 'co2');
  assertPositive(n2o, 'n2o');
  assertPositive(co2Baseline, 'co2Baseline');

  const co2AtMaxAlpha = co2Baseline - b1 / (2 * a1);
  let alphaPrime: number;
  if (co2 <= co2Baseline) {
    alphaPrime = d1;
  } else if (co2 <= co2AtMaxAlpha) {
    const excess = co2 - co2Baseline;
    alphaPrime = d1 + a1 * excess ** 2 + b1 * excess;
  } else {
    alphaPrime = d1 - b1 ** 2 / (4 * a1);
  }
  const alphaN2O = c1 * Math.sqrt(n2o);
  return (alphaPrime + alphaN2O) * Math.log(co2 / co2Baseline);
}

/** CH4 radiative forcing (SARF), W m^-2. Grows with the square root of concentration. */
export function ch4RadiativeForcing(ch4: number, n2o: number, ch4Baseline: number): number {
  assertPositive(ch4, 'ch4');
  assertPositive(n2o, 'n2o');
  assertPositive(ch4Baseline, 'ch4Baseline');
  return (
    (a3 * Math.sqrt(ch4) + b3 * Math.sqrt(n2o) + d3) * (Math.sqrt(ch4) - Math.sqrt(ch4Baseline))
  );
}

/** N2O radiative forcing (SARF), W m^-2. Grows with the square root of concentration. */
export function n2oRadiativeForcing(
  co2: number,
  ch4: number,
  n2o: number,
  n2oBaseline: number,
): number {
  assertPositive(co2, 'co2');
  assertPositive(ch4, 'ch4');
  assertPositive(n2o, 'n2o');
  assertPositive(n2oBaseline, 'n2oBaseline');
  return (
    (a2 * Math.sqrt(co2) + b2 * Math.sqrt(n2o) + c2 * Math.sqrt(ch4) + d2) *
    (Math.sqrt(n2o) - Math.sqrt(n2oBaseline))
  );
}

/** Effective radiative forcing per gas and in total, W m^-2. */
export interface ForcingBreakdown {
  readonly co2: number;
  readonly ch4: number;
  readonly n2o: number;
  readonly cfc: number;
  readonly total: number;
}

/**
 * Effective radiative forcing (ERF) of the given concentrations relative to `baseline`
 * (by default the 1750 levels). Positive = extra energy trapped.
 */
export function effectiveRadiativeForcing(
  current: GasConcentrations,
  baseline: GasConcentrations = PREINDUSTRIAL_CONCENTRATIONS,
): ForcingBreakdown {
  const co2 =
    co2RadiativeForcing(current.co2, current.n2o, baseline.co2) *
    (1 + SCIENCE.co2ForcingAdjustment.value);
  const ch4 =
    ch4RadiativeForcing(current.ch4, current.n2o, baseline.ch4) *
    (1 + SCIENCE.ch4ForcingAdjustment.value);
  const n2o =
    n2oRadiativeForcing(current.co2, current.ch4, current.n2o, baseline.n2o) *
    (1 + SCIENCE.n2oForcingAdjustment.value);
  assertFinite(current.cfc, 'cfc');
  const cfc = SCIENCE.cfc12RadiativeEfficiency.value * (current.cfc - baseline.cfc);

  return { co2, ch4, n2o, cfc, total: co2 + ch4 + n2o + cfc };
}
