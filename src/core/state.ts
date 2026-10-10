/**
 * The game state: everything needed to continue a game, stored as plain data (no classes,
 * no functions) so it can be saved as JSON and compared in tests.
 */
import {
  NO_EMISSIONS,
  PREINDUSTRIAL_CLIMATE,
  PREINDUSTRIAL_GAS_CYCLE,
  concentrations,
  effectiveRadiativeForcing,
  type ClimateState,
  type Emissions,
  type GasCycleState,
} from './science';

/** The simulation advances in fixed ticks of one month. */
export const TICKS_PER_YEAR = 12;

/** Only the most recent years of history are kept, so a long running game stays fast. */
export const MAX_HISTORY_YEARS = 1000;

/** A yearly sample of the simulation, for charts. */
export interface HistoryPoint {
  /** Years since the start of the game. */
  readonly year: number;
  /** °C above pre industrial (1750). */
  readonly surfaceWarming: number;
  /** ppm */
  readonly co2: number;
  /** ppb */
  readonly ch4: number;
  /** ppb */
  readonly n2o: number;
  /** Total effective radiative forcing, W m^-2. */
  readonly forcing: number;
}

export interface GameState {
  /** Months simulated since the start. The game starts from 1750 conditions. */
  readonly tick: number;
  /** Yearly human emissions currently in effect. */
  readonly emissions: Emissions;
  readonly gases: GasCycleState;
  readonly climate: ClimateState;
  /** One point per simulated year, oldest first, starting at year 0. */
  readonly history: readonly HistoryPoint[];
}

export function historyPoint(
  year: number,
  gases: GasCycleState,
  climate: ClimateState,
): HistoryPoint {
  const c = concentrations(gases);
  return {
    year,
    surfaceWarming: climate.surfaceWarming,
    co2: c.co2,
    ch4: c.ch4,
    n2o: c.n2o,
    forcing: effectiveRadiativeForcing(c).total,
  };
}

export function createInitialState(): GameState {
  return {
    tick: 0,
    emissions: NO_EMISSIONS,
    gases: PREINDUSTRIAL_GAS_CYCLE,
    climate: PREINDUSTRIAL_CLIMATE,
    history: [historyPoint(0, PREINDUSTRIAL_GAS_CYCLE, PREINDUSTRIAL_CLIMATE)],
  };
}
