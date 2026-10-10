import { describe, expect, it, vi } from 'vitest';
import { MAX_YEARS_PER_ADVANCE, createGame } from './game';
import { stateWithLevels } from './test-helpers';

describe('Game', () => {
  it('turns advanced years into whole months of simulation', () => {
    const game = createGame();
    game.advance(1);
    expect(game.getView().elapsedYears).toBe(1);
    expect(game.getState().tick).toBe(12);
  });

  it('keeps leftover time between calls, like a frame by frame UI clock', () => {
    const game = createGame();
    for (let frame = 0; frame < 120; frame++) {
      game.advance(1 / 120);
    }
    expect(game.getState().tick).toBe(12);
  });

  it('notifies subscribers with the new view after a change', () => {
    const game = createGame();
    const listener = vi.fn();
    game.subscribe(listener);
    game.dispatch({ type: 'upgradeFactor', factor: 'coal' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(game.getView());
    game.advance(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when nothing changed', () => {
    const game = createGame();
    const listener = vi.fn();
    game.subscribe(listener);
    game.advance(0.01); // less than one month
    game.dispatch({ type: 'upgradeFactor', factor: 'oil' }); // locked
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const game = createGame();
    const listener = vi.fn();
    const unsubscribe = game.subscribe(listener);
    unsubscribe();
    game.advance(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns the same view object until the game changes', () => {
    const game = createGame();
    const first = game.getView();
    expect(game.getView()).toBe(first);
    game.advance(1);
    expect(game.getView()).not.toBe(first);
  });

  it('returns an error result for an invalid action and leaves the game unchanged', () => {
    const game = createGame();
    const before = game.getState();
    const result = game.dispatch({ type: 'downgradeFactor', factor: 'coal' });
    expect(result).toMatchObject({ ok: false, error: { code: 'MIN_LEVEL' } });
    expect(game.getState()).toBe(before);
  });

  it('warms the planet as factors are upgraded and time passes', () => {
    const game = createGame();
    for (let i = 0; i < 5; i++) {
      game.dispatch({ type: 'upgradeFactor', factor: 'coal' });
    }
    game.advance(50);
    expect(game.getView().surfaceWarming).toBeGreaterThan(0.3);
  });

  it('returns the events that happened while advancing time', () => {
    // Fertilizer unlocks once warming reaches 0.3 degrees C (rice is already at level 2).
    const game = createGame(stateWithLevels({ coal: 5, deforestation: 5, livestock: 5, rice: 2 }));
    expect(game.getState().factors.fertilizer.unlocked).toBe(false);
    const events = game.advance(60);
    expect(events).toContainEqual({ type: 'factorUnlocked', factor: 'fertilizer' });
  });

  it('resets to the start, including leftover time', () => {
    const game = createGame();
    game.dispatch({ type: 'upgradeFactor', factor: 'coal' });
    game.advance(10.08); // leaves 0.96 of a month unused
    game.dispatch({ type: 'reset' });
    expect(game.getView().elapsedYears).toBe(0);
    expect(game.getView().surfaceWarming).toBe(0);
    // If the leftover were kept, 0.96 + 0.12 months would complete one tick here.
    game.advance(0.01);
    expect(game.getState().tick).toBe(0);
  });

  it('rejects invalid amounts of time', () => {
    const game = createGame();
    expect(() => game.advance(-1)).toThrow(RangeError);
    expect(() => game.advance(Number.NaN)).toThrow(RangeError);
    expect(() => game.advance(MAX_YEARS_PER_ADVANCE + 1)).toThrow(RangeError);
  });
});
