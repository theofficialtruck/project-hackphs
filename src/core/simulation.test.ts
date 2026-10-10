import { describe, expect, it } from 'vitest';
import { PREINDUSTRIAL_CONCENTRATIONS, concentrations, type Emissions } from './science';
import { advanceTicks, tick } from './simulation';
import { MAX_HISTORY_YEARS, TICKS_PER_YEAR, createInitialState, type GameState } from './state';

const PRESENT_DAY_LIKE: Emissions = { co2: 40, ch4: 350, n2o: 7 };

function withEmissions(emissions: Emissions): GameState {
  return { ...createInitialState(), emissions };
}

describe('simulation', () => {
  it('starts from 1750 conditions with one history point', () => {
    const state = createInitialState();
    expect(state.tick).toBe(0);
    expect(concentrations(state.gases)).toEqual(PREINDUSTRIAL_CONCENTRATIONS);
    expect(state.climate.surfaceWarming).toBe(0);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.year).toBe(0);
  });

  it('changes nothing but time when there are no emissions', () => {
    const later = advanceTicks(createInitialState(), 5 * TICKS_PER_YEAR);
    expect(later.tick).toBe(60);
    expect(concentrations(later.gases)).toEqual(PREINDUSTRIAL_CONCENTRATIONS);
    expect(later.climate.surfaceWarming).toBe(0);
  });

  it('adds one history point per finished year', () => {
    const start = createInitialState();
    expect(advanceTicks(start, 11).history).toHaveLength(1);
    const oneYear = advanceTicks(start, 12);
    expect(oneYear.history).toHaveLength(2);
    expect(oneYear.history[1]?.year).toBe(1);
  });

  it('raises concentrations first and temperature more slowly', () => {
    const state = advanceTicks(withEmissions(PRESENT_DAY_LIKE), 10 * TICKS_PER_YEAR);
    const c = concentrations(state.gases);
    expect(c.co2).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.co2);
    expect(c.ch4).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.ch4);
    expect(c.n2o).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.n2o);
    expect(state.climate.surfaceWarming).toBeGreaterThan(0);
    expect(state.climate.deepOceanWarming).toBeLessThan(state.climate.surfaceWarming);
  });

  it('is repeatable: the same inputs always give exactly the same state', () => {
    const a = advanceTicks(withEmissions(PRESENT_DAY_LIKE), 600);
    const b = advanceTicks(withEmissions(PRESENT_DAY_LIKE), 600);
    expect(a).toEqual(b);
  });

  it('does not modify the state it was given', () => {
    const start = withEmissions(PRESENT_DAY_LIKE);
    const copy = structuredClone(start);
    tick(start);
    expect(start).toEqual(copy);
  });

  it(`keeps at most ${MAX_HISTORY_YEARS} years of history`, () => {
    const state = advanceTicks(createInitialState(), (MAX_HISTORY_YEARS + 5) * TICKS_PER_YEAR);
    expect(state.history).toHaveLength(MAX_HISTORY_YEARS);
    expect(state.history.at(-1)?.year).toBe(MAX_HISTORY_YEARS + 5);
  });

  it('rejects a negative or fractional number of ticks', () => {
    expect(() => advanceTicks(createInitialState(), -1)).toThrow(RangeError);
    expect(() => advanceTicks(createInitialState(), 1.5)).toThrow(RangeError);
  });
});
