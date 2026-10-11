/**
 * Public entry point of the game engine.
 *
 * Everything needed to use the engine is exported from this file.
 * The engine is plain TypeScript: no DOM, no timers, no storage.
 */

/** Version of the engine interface. Bumped when the interface changes. */
export const ENGINE_VERSION = '0.8.0';

export { createGame, MAX_YEARS_PER_ADVANCE } from './game';
export type { DispatchResult, Game, GameListener } from './game';
export type { ActionError, ActionErrorCode, GameAction } from './actions';
export type { GameEvent } from './events';
export type { FactorId } from './factors';
export { GAMEPLAY } from './gameplay';
export type { FactorView, GameView, MilestoneView, ObjectiveView, RequirementView } from './view';
export type { Debrief, Milestone } from './progression';
export type { CardView, OzoneView, RealWorldView } from './view';
export type { UpgradePreview } from './preview';
export { SAVE_VERSION, loadGame, saveGame } from './save';
export type { LoadResult } from './save';
export { SCENARIOS, createScenario } from './scenarios';
export type { Scenario, ScenarioId } from './scenarios';
export { REGIONAL_PATTERNS, countryClimate, countryNames, plainCountryName } from './regions';
export type { CountryClimate, RainfallTrend, RegionClimate } from './regions';
export { TICKS_PER_YEAR } from './state';
export type { GameState, HistoryPoint } from './state';
export type {
  Emissions,
  FeedbackBreakdown,
  ForcingBreakdown,
  GasConcentrations,
  RadiationBudget,
} from './science';

/** Scientific constants (with sources) and the underlying science functions.
 * */
export * as science from './science';
