/**
 * Temperature response: a two layer energy balance model (Held et al. 2010; Geoffroy et
 * al. 2013), the same kind of emulator IPCC AR6 uses (Cross Chapter Box 7.1).
 *
 *   upper layer:  C  · dT/dt  = F + λ·T − γ·(T − T_d)
 *   deep ocean:   C_d · dT_d/dt = γ·(T − T_d)
 *
 * T is the surface/upper-ocean warming and T_d the deep ocean warming (both in K relative
 * to pre industrial), F the effective radiative forcing, λ the net feedback (negative), γ
 * the heat exchange between the layers. The deep ocean's large heat capacity is why
 * warming lags behind forcing.
 */
import { assertFinite, assertPositive } from './checks';
import { SCIENCE } from './constants';

const NET_FEEDBACK = SCIENCE.netFeedback.value;
const UPPER_HEAT_CAPACITY = SCIENCE.upperLayerHeatCapacity.value;
const DEEP_HEAT_CAPACITY = SCIENCE.deepOceanHeatCapacity.value;
const HEAT_EXCHANGE = SCIENCE.oceanHeatExchange.value;

/** Default sub steps per simulated year. The fastest timescale is ~4 years, so 24 is plenty. */
export const DEFAULT_SUBSTEPS_PER_YEAR = 24;

/** Warming relative to pre industrial, in K (a change of 1 K equals a change of 1 °C). */
export interface ClimateState {
  readonly surfaceWarming: number;
  readonly deepOceanWarming: number;
}

export const PREINDUSTRIAL_CLIMATE: ClimateState = { surfaceWarming: 0, deepOceanWarming: 0 };

/**
 * Energy imbalance at the top of the atmosphere, W m^-2: the forcing minus the extra
 * energy a warmer Earth sends back to space. Positive means Earth is still heating up.
 */
export function energyImbalance(forcing: number, surfaceWarming: number): number {
  assertFinite(forcing, 'forcing');
  assertFinite(surfaceWarming, 'surfaceWarming');
  return forcing + NET_FEEDBACK * surfaceWarming;
}

/**
 * Advances the climate by `years` with constant `forcing` (W m^-2), using forward Euler
 * integration with fixed sub steps.
 */
export function stepClimate(
  state: ClimateState,
  forcing: number,
  years: number,
  substepsPerYear = DEFAULT_SUBSTEPS_PER_YEAR,
): ClimateState {
  assertFinite(forcing, 'forcing');
  assertPositive(years, 'years');
  assertPositive(substepsPerYear, 'substepsPerYear');

  const steps = Math.ceil(years * substepsPerYear);
  const dt = years / steps;
  let surface = state.surfaceWarming;
  let deep = state.deepOceanWarming;

  for (let i = 0; i < steps; i++) {
    const heatToDeepOcean = HEAT_EXCHANGE * (surface - deep);
    const surfaceRate = (energyImbalance(forcing, surface) - heatToDeepOcean) / UPPER_HEAT_CAPACITY;
    const deepRate = heatToDeepOcean / DEEP_HEAT_CAPACITY;
    surface += surfaceRate * dt;
    deep += deepRate * dt;
  }

  return { surfaceWarming: surface, deepOceanWarming: deep };
}

/** Warming once the climate has fully caught up with a constant forcing: F / −λ. */
export function equilibriumWarming(forcing: number): number {
  assertFinite(forcing, 'forcing');
  return forcing / -NET_FEEDBACK;
}

/** Equilibrium warming if only the Planck response acted (no amplifying feedbacks). */
export function noFeedbackEquilibriumWarming(forcing: number): number {
  assertFinite(forcing, 'forcing');
  return forcing / -SCIENCE.planckFeedback.value;
}

/** Energy (W m^-2) each feedback adds (+) or removes (−) at the given surface warming. */
export interface FeedbackBreakdown {
  readonly planck: number;
  readonly waterVapourLapseRate: number;
  readonly surfaceAlbedo: number;
  readonly clouds: number;
  readonly biogeophysical: number;
}

export function feedbackBreakdown(surfaceWarming: number): FeedbackBreakdown {
  assertFinite(surfaceWarming, 'surfaceWarming');
  return {
    planck: SCIENCE.planckFeedback.value * surfaceWarming,
    waterVapourLapseRate: SCIENCE.waterVapourLapseRateFeedback.value * surfaceWarming,
    surfaceAlbedo: SCIENCE.surfaceAlbedoFeedback.value * surfaceWarming,
    clouds: SCIENCE.cloudFeedback.value * surfaceWarming,
    biogeophysical: SCIENCE.biogeophysicalFeedback.value * surfaceWarming,
  };
}
