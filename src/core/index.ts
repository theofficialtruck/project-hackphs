/**
 * Public entry point of the game engine.
 *
 * Everything a UI needs from the engine will be exported from this file.
 * The engine is plain TypeScript: no DOM, no timers, no storage.
 */

/** Version of the engine interface. Bumped when the interface the UI uses changes. */
export const ENGINE_VERSION = '0.3.0';

export { createGame, MAX_YEARS_PER_ADVANCE } from './game';
export type { DispatchResult, Game, GameListener } from './game';
export type { ActionError, ActionErrorCode, GameAction } from './actions';
export type { GameEvent } from './events';
export type { FactorId } from './factors';
export { GAMEPLAY } from './gameplay';
export type { FactorView, GameView, RequirementView } from './view';
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
