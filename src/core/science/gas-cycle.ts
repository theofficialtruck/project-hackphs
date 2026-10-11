/**
 * Gas cycle: turns yearly human emissions into atmospheric concentrations.
 *
 * Only the human caused excess above 1750 levels is tracked; natural sources and sinks
 * are assumed to stay in balance as they were before industrialization.
 *
 * - CH4 and N2O: the excess decays with a single perturbation lifetime.
 * - CO2: no single lifetime. An emitted pulse is split into four parts removed on
 *   different timescales (Joos et al. 2013); about a fifth effectively stays for millennia.
 *
 * Simplification: the CO2 response was fitted for a pulse on a present day background and
 * does not weaken as oceans and land absorb more carbon, so at very high cumulative
 * emissions it slightly overestimates how fast CO2 is removed.
 */
import { assertFinite, assertPositive } from './checks';
import { SCIENCE } from './constants';
import { PREINDUSTRIAL_CONCENTRATIONS, type GasConcentrations } from './forcing';

const CO2_RESPONSE = SCIENCE.co2ImpulseResponse.value;

/** Giga tonnes of CO2 that raise the atmospheric concentration by 1 ppm (~7.78). */
export const GT_CO2_PER_PPM = SCIENCE.gigatonnesCarbonPerPpm.value * SCIENCE.co2PerCarbon.value;

export const KT_CFC12_PER_PPB =
  SCIENCE.methaneTgPerPpb.value *
  (SCIENCE.cfc12MolarMass.value / SCIENCE.methaneMolarMass.value) *
  1000;

/** Human emission rates. */
export interface Emissions {
  readonly co2: number;
  readonly ch4: number;
  readonly n2o: number;
  readonly cfc: number;
}

export const NO_EMISSIONS: Emissions = { co2: 0, ch4: 0, n2o: 0, cfc: 0 };

/** Excess concentration above 1750 levels held in each CO2 removal part, ppm. */
export interface Co2Parts {
  readonly permanent: number;
  readonly slow: number;
  readonly medium: number;
  readonly fast: number;
}

export interface GasCycleState {
  readonly co2Parts: Co2Parts;
  /** Excess CH4 above 1750, ppb. */
  readonly ch4Excess: number;
  /** Excess N2O above 1750, ppb. */
  readonly n2oExcess: number;
  readonly cfcExcess: number;
}

export const PREINDUSTRIAL_GAS_CYCLE: GasCycleState = {
  co2Parts: { permanent: 0, slow: 0, medium: 0, fast: 0 },
  ch4Excess: 0,
  n2oExcess: 0,
  cfcExcess: 0,
};

/**
 * Exact solution of dX/dt = inflow - X / lifetime over `years`, assuming the inflow
 * stays constant during the step. With an infinite lifetime nothing is removed.
 */
export function decayWithInflow(
  amount: number,
  inflowPerYear: number,
  lifetime: number,
  years: number,
): number {
  if (lifetime === Infinity) {
    return amount + inflowPerYear * years;
  }
  const remaining = Math.exp(-years / lifetime);
  return amount * remaining + inflowPerYear * lifetime * (1 - remaining);
}

/** Advances the gas cycle by `years` with constant `emissions`. */
export function stepGasCycle(
  state: GasCycleState,
  emissions: Emissions,
  years: number,
): GasCycleState {
  assertPositive(years, 'years');
  assertFinite(emissions.co2, 'emissions.co2');
  assertFinite(emissions.ch4, 'emissions.ch4');
  assertFinite(emissions.n2o, 'emissions.n2o');
  assertFinite(emissions.cfc, 'emissions.cfc');

  const co2PpmPerYear = emissions.co2 / GT_CO2_PER_PPM;
  const stepPart = (part: keyof Co2Parts): number =>
    decayWithInflow(
      state.co2Parts[part],
      CO2_RESPONSE[part].fraction * co2PpmPerYear,
      CO2_RESPONSE[part].lifetime,
      years,
    );

  return {
    co2Parts: {
      permanent: stepPart('permanent'),
      slow: stepPart('slow'),
      medium: stepPart('medium'),
      fast: stepPart('fast'),
    },
    ch4Excess: decayWithInflow(
      state.ch4Excess,
      emissions.ch4 / SCIENCE.methaneTgPerPpb.value,
      SCIENCE.methanePerturbationLifetime.value,
      years,
    ),
    n2oExcess: decayWithInflow(
      state.n2oExcess,
      emissions.n2o / SCIENCE.nitrousOxideTgNPerPpb.value,
      SCIENCE.nitrousOxidePerturbationLifetime.value,
      years,
    ),
    cfcExcess: decayWithInflow(
      state.cfcExcess,
      emissions.cfc / KT_CFC12_PER_PPB,
      SCIENCE.cfc12PerturbationLifetime.value,
      years,
    ),
  };
}

/** Atmospheric concentrations implied by the gas cycle state. */
export function concentrations(state: GasCycleState): GasConcentrations {
  const { permanent, slow, medium, fast } = state.co2Parts;
  return {
    co2: PREINDUSTRIAL_CONCENTRATIONS.co2 + permanent + slow + medium + fast,
    ch4: PREINDUSTRIAL_CONCENTRATIONS.ch4 + state.ch4Excess,
    n2o: PREINDUSTRIAL_CONCENTRATIONS.n2o + state.n2oExcess,
    cfc: PREINDUSTRIAL_CONCENTRATIONS.cfc + state.cfcExcess,
  };
}
