import type { FactorId } from './factors';

/**
 * Something that happened in the game that a UI may want to react to (show a message,
 * play an animation). More event types are added as game systems are built.
 */
export type GameEvent =
  | { readonly type: 'factorUpgraded'; readonly factor: FactorId; readonly level: number }
  | { readonly type: 'factorDowngraded'; readonly factor: FactorId; readonly level: number }
  | { readonly type: 'factorUnlocked'; readonly factor: FactorId }
  | { readonly type: 'gameReset' };

/** A new state together with the events that produced it. */
export interface StepResult<State> {
  readonly state: State;
  readonly events: readonly GameEvent[];
}
