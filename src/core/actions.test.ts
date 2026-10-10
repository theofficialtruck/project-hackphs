import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { advanceTicks } from './simulation';
import { createInitialState } from './state';

describe('actions', () => {
  it('sets emissions and reports an emissionsChanged event', () => {
    const emissions = { co2: 40, ch4: 350, n2o: 7 };
    const result = applyAction(createInitialState(), { type: 'setEmissions', emissions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.emissions).toEqual(emissions);
      expect(result.events).toEqual([{ type: 'emissionsChanged', emissions }]);
    }
  });

  it.each([
    { co2: -1, ch4: 0, n2o: 0 },
    { co2: 0, ch4: Number.NaN, n2o: 0 },
    { co2: 0, ch4: 0, n2o: Infinity },
  ])('rejects invalid emissions %o', (emissions) => {
    const result = applyAction(createInitialState(), { type: 'setEmissions', emissions });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_EMISSIONS');
    }
  });

  it('resets to the starting state', () => {
    const played = advanceTicks(
      { ...createInitialState(), emissions: { co2: 40, ch4: 350, n2o: 7 } },
      120,
    );
    const result = applyAction(played, { type: 'reset' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).toEqual(createInitialState());
      expect(result.events).toEqual([{ type: 'gameReset' }]);
    }
  });
});
