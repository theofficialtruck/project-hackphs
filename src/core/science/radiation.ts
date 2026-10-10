/**
 * Earth's global mean radiation budget: sunlight in, sunlight reflected, infrared out.
 *
 * Simplification: albedo is held at its present value. The effect of melting ice on
 * reflection is included in the temperature model through the surface albedo feedback.
 */
import { assertFinite, assertPositive } from './checks';
import { SCIENCE } from './constants';

const SIGMA = SCIENCE.stefanBoltzmann.value;

/** Infrared power radiated per m^2 by a black body at `temperatureK` (Stefan Boltzmann law: σT^4). */
export function blackBodyEmission(temperatureK: number): number {
  assertPositive(temperatureK, 'temperatureK');
  return SIGMA * temperatureK ** 4;
}

/** Temperature of a black body radiating `fluxWm2` watts per m^2 (the inverse of σT^4). */
export function blackBodyTemperature(fluxWm2: number): number {
  assertPositive(fluxWm2, 'fluxWm2');
  return (fluxWm2 / SIGMA) ** 0.25;
}

/**
 * Sunlight per m^2 averaged over the whole globe. Earth intercepts sunlight over a disc
 * (pi*R^2) but spreads it over a sphere (4*pi*R^2), hence the division by 4.
 */
export function incomingSolar(): number {
  return SCIENCE.solarIrradiance.value / 4;
}

/** Sunlight per m^2 that Earth absorbs (the part that is not reflected). */
export function absorbedSolar(): number {
  return incomingSolar() * (1 - SCIENCE.bondAlbedo.value);
}

/**
 * Temperature Earth would have if it had no greenhouse effect: the temperature at which
 * a black body radiates away exactly the sunlight Earth absorbs (about 255 K, −18 °C).
 */
export function noGreenhouseTemperature(): number {
  return blackBodyTemperature(absorbedSolar());
}

/** All values in W m^-2 (global average). */
export interface RadiationBudget {
  /** Sunlight arriving at the top of the atmosphere. */
  readonly incomingSolar: number;
  /** Sunlight reflected back to space by clouds, ice, etc. */
  readonly reflectedSolar: number;
  /** Sunlight absorbed by the atmosphere and surface. */
  readonly absorbedSolar: number;
  /** Infrared radiated upward by the surface. */
  readonly surfaceInfrared: number;
  /** Infrared escaping to space. */
  readonly outgoingInfrared: number;
  /** Infrared kept in by the atmosphere: surface infrared minus outgoing infrared. */
  readonly greenhouseEffect: number;
  /** Energy gained by Earth (positive) or lost (negative). */
  readonly energyImbalance: number;
}

/**
 * @param surfaceTemperatureK Global mean surface temperature.
 * @param energyImbalance     Energy Earth is gaining, W m^-2 (0 = balanced).
 *   Earth gains energy when less infrared escapes than the sunlight it absorbs, so
 *   outgoing infrared = absorbed sunlight − imbalance.
 */
export function radiationBudget(surfaceTemperatureK: number, energyImbalance = 0): RadiationBudget {
  assertFinite(energyImbalance, 'energyImbalance');
  const incoming = incomingSolar();
  const absorbed = absorbedSolar();
  const surfaceInfrared = blackBodyEmission(surfaceTemperatureK);
  const outgoingInfrared = absorbed - energyImbalance;

  return {
    incomingSolar: incoming,
    reflectedSolar: incoming - absorbed,
    absorbedSolar: absorbed,
    surfaceInfrared,
    outgoingInfrared,
    greenhouseEffect: surfaceInfrared - outgoingInfrared,
    energyImbalance,
  };
}
