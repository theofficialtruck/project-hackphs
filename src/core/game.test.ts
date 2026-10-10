import { describe, expect, it, vi } from 'vitest';
import { MAX_YEARS_PER_ADVANCE, createGame } from './game';

const EMISSIONS = { co2: 40, ch4: 350, n2o: 7 };

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
    game.dispatch({ type: 'setEmissions', emissions: EMISSIONS });
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
    game.dispatch({ type: 'setEmissions', emissions: { co2: -5, ch4: 0, n2o: 0 } });
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
    const result = game.dispatch({
      type: 'setEmissions',
      emissions: { co2: Number.NaN, ch4: 0, n2o: 0 },
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_EMISSIONS' } });
    expect(game.getState()).toBe(before);
  });

  it('warms the planet once emissions are set and time passes', () => {
    const game = createGame();
    game.dispatch({ type: 'setEmissions', emissions: EMISSIONS });
    game.advance(50);
    expect(game.getView().surfaceWarming).toBeGreaterThan(0.5);
  });

  it('resets to the start, including leftover time', () => {
    const game = createGame();
    game.dispatch({ type: 'setEmissions', emissions: EMISSIONS });
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
