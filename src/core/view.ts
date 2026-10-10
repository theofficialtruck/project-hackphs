/**
 * The view is a ready to display snapshot of the game for a UI. It contains the stored
 * state plus values calculated from it, so a UI never has to do any physics itself.
 */
import {
  SCIENCE,
  concentrations,
  effectiveRadiativeForcing,
  energyImbalance,
  equilibriumWarming,
  feedbackBreakdown,
  radiationBudget,
  type Emissions,
  type FeedbackBreakdown,
  type ForcingBreakdown,
  type GasConcentrations,
  type RadiationBudget,
} from './science';
import { TICKS_PER_YEAR, type GameState, type HistoryPoint } from './state';

/**
 * Surface temperature used as the starting point for the radiation budget: NASA's rounded
 * average of 288 K. Only used for the illustrative energy flows, not for the warming itself.
 */
const STARTING_SURFACE_TEMPERATURE_K = SCIENCE.averageSurfaceTemperature.value;

export interface GameView {
  /** Simulated years since the start of the game (fractional, updates every month). */
  readonly elapsedYears: number;
  /** Yearly human emissions in effect: CO2 in Gt, CH4 in Tg, N2O in Tg of nitrogen. */
  readonly emissions: Emissions;
  /** CO2 in ppm, CH4 and N2O in ppb. */
  readonly concentrations: GasConcentrations;
  /** Extra energy trapped by each gas compared with 1750, W m^-2. */
  readonly forcing: ForcingBreakdown;
  /** Global surface warming, °C above pre industrial. */
  readonly surfaceWarming: number;
  /** Deep ocean warming, °C above pre industrial (lags far behind the surface). */
  readonly deepOceanWarming: number;
  /** Warming the planet would eventually reach if gas levels stayed as they are now, °C. */
  readonly equilibriumWarming: number;
  /** Energy Earth is currently gaining, W m^-2. Positive means it is still heating up. */
  readonly energyImbalance: number;
  /** Global average energy flows, W m^-2. */
  readonly radiation: RadiationBudget;
  /** Energy each climate feedback adds (+) or removes (−) at the current warming, W m^-2. */
  readonly feedbacks: FeedbackBreakdown;
  /** One point per simulated year, oldest first. */
  readonly history: readonly HistoryPoint[];
}

export function selectView(state: GameState): GameView {
  const gas = concentrations(state.gases);
  const forcing = effectiveRadiativeForcing(gas);
  const warming = state.climate.surfaceWarming;
  const imbalance = energyImbalance(forcing.total, warming);

  return {
    elapsedYears: state.tick / TICKS_PER_YEAR,
    emissions: state.emissions,
    concentrations: gas,
    forcing,
    surfaceWarming: warming,
    deepOceanWarming: state.climate.deepOceanWarming,
    equilibriumWarming: equilibriumWarming(forcing.total),
    energyImbalance: imbalance,
    radiation: radiationBudget(STARTING_SURFACE_TEMPERATURE_K + warming, imbalance),
    feedbacks: feedbackBreakdown(warming),
    history: state.history,
  };
}
