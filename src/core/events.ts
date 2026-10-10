import type { Emissions } from './science';

/**
 * Something that happened in the game that a UI may want to react to (show a message,
 * play an animation). More event types are added as game systems are built.
 */
export type GameEvent =
  | { readonly type: 'emissionsChanged'; readonly emissions: Emissions }
  | { readonly type: 'gameReset' };
