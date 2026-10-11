import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import type { FactorId } from './factors';
import { GAMEPLAY } from './gameplay';
import { advanceTicks } from './simulation';
import { createInitialState } from './state';
import { stateWithLevels } from './test-helpers';
import type { GameEvent } from './events';

const withoutCards = (events: readonly GameEvent[]) => events.filter((e) => e.type !== 'cardShown');

describe('upgrading and downgrading factors', () => {
  it('raises the level of an unlocked factor', () => {
    const result = applyAction(createInitialState(), { type: 'upgradeFactor', factor: 'coal' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.factors.coal.level).toBe(1);
      expect(withoutCards(result.events)).toEqual([
        { type: 'factorUpgraded', factor: 'coal', level: 1 },
      ]);
    }
  });

  it('refuses to upgrade a locked factor', () => {
    const result = applyAction(createInitialState(), { type: 'upgradeFactor', factor: 'oil' });
    expect(result).toMatchObject({ ok: false, error: { code: 'FACTOR_LOCKED' } });
  });

  it('refuses to go above the highest level', () => {
    const state = stateWithLevels({ coal: GAMEPLAY.maxFactorLevel.value });
    const result = applyAction(state, { type: 'upgradeFactor', factor: 'coal' });
    expect(result).toMatchObject({ ok: false, error: { code: 'MAX_LEVEL' } });
  });

  it('refuses to go below level 0', () => {
    const result = applyAction(createInitialState(), { type: 'downgradeFactor', factor: 'coal' });
    expect(result).toMatchObject({ ok: false, error: { code: 'MIN_LEVEL' } });
  });

  it('refuses an unknown factor id', () => {
    const result = applyAction(createInitialState(), {
      type: 'upgradeFactor',
      factor: 'volcanoes' as FactorId,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'UNKNOWN_FACTOR' } });
  });

  it('unlocks other factors when their level requirement is reached', () => {
    const state = stateWithLevels({ coal: 1 });
    expect(state.factors.cement.unlocked).toBe(false);
    const result = applyAction(state, { type: 'upgradeFactor', factor: 'coal' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.factors.cement.unlocked).toBe(true);
      expect(result.state.factors.refrigerants.unlocked).toBe(true);
      expect(withoutCards(result.events)).toEqual([
        { type: 'factorUpgraded', factor: 'coal', level: 2 },
        { type: 'factorUnlocked', factor: 'cement' },
        { type: 'factorUnlocked', factor: 'refrigerants' },
      ]);
    }
  });

  it('keeps a factor unlocked after its requirement stops being met', () => {
    const upgraded = applyAction(stateWithLevels({ coal: 1 }), {
      type: 'upgradeFactor',
      factor: 'coal',
    });
    if (!upgraded.ok) throw new Error('upgrade failed');
    const downgraded = applyAction(upgraded.state, { type: 'downgradeFactor', factor: 'coal' });
    expect(downgraded.ok).toBe(true);
    if (downgraded.ok) {
      expect(downgraded.state.factors.coal.level).toBe(1);
      expect(downgraded.state.factors.cement.unlocked).toBe(true);
      expect(withoutCards(downgraded.events)).toEqual([
        { type: 'factorDowngraded', factor: 'coal', level: 1 },
      ]);
    }
  });

  it('does not modify the state it was given', () => {
    const state = createInitialState();
    const copy = structuredClone(state);
    applyAction(state, { type: 'upgradeFactor', factor: 'coal' });
    expect(state).toEqual(copy);
  });
});

describe('reset', () => {
  it('returns to the starting state', () => {
    const played = advanceTicks(stateWithLevels({ coal: 5, livestock: 5 }), 120).state;
    const result = applyAction(played, { type: 'reset' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).toEqual(createInitialState());
      expect(result.events).toEqual([{ type: 'gameReset' }]);
    }
  });
});
