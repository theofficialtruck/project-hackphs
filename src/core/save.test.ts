import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { SAVE_VERSION, loadGame, saveGame } from './save';
import { createScenario } from './scenarios';
import { createInitialState } from './state';

describe('saving and loading', () => {
  it('loads back exactly the state that was saved', () => {
    const state = createScenario('oneDegree');
    const result = loadGame(saveGame(state));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toEqual(state);
  });

  it('continues the same way after loading', () => {
    const original = createGame(createScenario('oneDegree'));
    const copy = createGame();
    copy.load(original.save());
    original.advance(20);
    copy.advance(20);
    expect(copy.getState()).toEqual(original.getState());
  });

  it('rejects text that is not JSON', () => {
    expect(loadGame('not a save')).toMatchObject({ ok: false });
  });

  it('rejects a different save version', () => {
    const text = JSON.stringify({ version: SAVE_VERSION + 1, state: createInitialState() });
    expect(loadGame(text)).toMatchObject({ ok: false });
  });

  it('rejects saves with missing or impossible values', () => {
    const state = createInitialState();
    const broken = [
      { ...state, dollars: 'lots' },
      { ...state, tick: -3 },
      { ...state, factors: { ...state.factors, coal: { level: 99, unlocked: true } } },
      { ...state, climate: { surfaceWarming: null, deepOceanWarming: 0 } },
      { ...state, progress: undefined },
    ];
    for (const b of broken) {
      const result = loadGame(JSON.stringify({ version: SAVE_VERSION, state: b }));
      expect(result.ok).toBe(false);
    }
  });

  it('leaves the game unchanged when a load fails', () => {
    const game = createGame(createScenario('oneDegree'));
    const before = game.getState();
    expect(game.load('{}').ok).toBe(false);
    expect(game.getState()).toBe(before);
  });
});
