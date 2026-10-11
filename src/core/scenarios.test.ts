import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { SCENARIOS, createScenario } from './scenarios';
import { createInitialState } from './state';

describe('scenarios', () => {
  it('start matches a new game', () => {
    expect(createScenario('start')).toEqual(createInitialState());
  });

  it.each(SCENARIOS.filter((s) => s.id !== 'start'))(
    '$name reaches its warming without ending the game',
    (scenario) => {
      const state = createScenario(scenario.id);
      expect(state.climate.surfaceWarming).toBeGreaterThanOrEqual(scenario.warming);
      expect(state.climate.surfaceWarming).toBeLessThan(scenario.warming + 0.3);
      expect(state.progress.endedAtYear).toBeNull();
    },
  );

  it('always gives the same result', () => {
    expect(createScenario('twoDegrees')).toEqual(createScenario('twoDegrees'));
  });

  it('can be loaded into a running game', () => {
    const game = createGame();
    game.loadScenario('nearEnd');
    expect(game.getView().surfaceWarming).toBeGreaterThan(3.7);
    expect(game.getView().ended).toBe(false);
  });

  it('rejects an unknown scenario', () => {
    expect(() => createScenario('volcano' as never)).toThrow(RangeError);
  });
});
