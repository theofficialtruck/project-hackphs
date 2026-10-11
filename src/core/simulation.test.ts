import { describe, expect, it } from 'vitest';
import { PREINDUSTRIAL_CONCENTRATIONS, concentrations } from './science';
import { advanceTicks, tick } from './simulation';
import { MAX_HISTORY_YEARS, TICKS_PER_YEAR, createInitialState } from './state';
import { presentDayState, stateWithLevels } from './test-helpers';

const years = (n: number) => n * TICKS_PER_YEAR;

describe('simulation', () => {
  it('starts from 1750 conditions with one history point', () => {
    const state = createInitialState();
    expect(state.tick).toBe(0);
    expect(concentrations(state.gases)).toEqual(PREINDUSTRIAL_CONCENTRATIONS);
    expect(state.climate.surfaceWarming).toBe(0);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.year).toBe(0);
  });

  it('changes nothing but time while every factor is at level 0', () => {
    const { state } = advanceTicks(createInitialState(), years(5));
    expect(state.tick).toBe(60);
    expect(concentrations(state.gases)).toEqual(PREINDUSTRIAL_CONCENTRATIONS);
    expect(state.climate.surfaceWarming).toBe(0);
  });

  it('adds one history point per finished year', () => {
    const start = createInitialState();
    expect(advanceTicks(start, 11).state.history).toHaveLength(1);
    const oneYear = advanceTicks(start, 12).state;
    expect(oneYear.history).toHaveLength(2);
    expect(oneYear.history[1]?.year).toBe(1);
  });

  it('raises concentrations first and temperature more slowly', () => {
    const { state } = advanceTicks(presentDayState(), years(10));
    const c = concentrations(state.gases);
    expect(c.co2).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.co2);
    expect(c.ch4).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.ch4);
    expect(c.n2o).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.n2o);
    expect(state.climate.surfaceWarming).toBeGreaterThan(0);
    expect(state.climate.deepOceanWarming).toBeLessThan(state.climate.surfaceWarming);
  });

  it('only releases the gases of the factors in use', () => {
    const { state } = advanceTicks(stateWithLevels({ livestock: 5 }), years(5));
    const c = concentrations(state.gases);
    expect(c.ch4).toBeGreaterThan(PREINDUSTRIAL_CONCENTRATIONS.ch4);
    expect(c.co2).toBe(PREINDUSTRIAL_CONCENTRATIONS.co2);
  });

  it('unlocks a factor once warming crosses its threshold, exactly once', () => {
    // Fertilizer needs rice at level 2 and 0.3 degrees C of warming.
    const start = stateWithLevels({ coal: 10, deforestation: 10, livestock: 10, rice: 2 });
    expect(start.factors.fertilizer.unlocked).toBe(false);
    const { state, events } = advanceTicks(start, years(30));
    expect(state.climate.surfaceWarming).toBeGreaterThan(0.3);
    expect(state.factors.fertilizer.unlocked).toBe(true);
    const fertilizerUnlocks = events.filter(
      (e) => e.type === 'factorUnlocked' && e.factor === 'fertilizer',
    );
    expect(fertilizerUnlocks).toHaveLength(1);
  });

  it('is repeatable: the same inputs always give exactly the same state', () => {
    const a = advanceTicks(presentDayState(), 600);
    const b = advanceTicks(presentDayState(), 600);
    expect(a).toEqual(b);
  });

  it('does not modify the state it was given', () => {
    const start = presentDayState();
    const copy = structuredClone(start);
    tick(start);
    expect(start).toEqual(copy);
  });

  it(`keeps at most ${MAX_HISTORY_YEARS} years of history`, () => {
    const { state } = advanceTicks(createInitialState(), years(MAX_HISTORY_YEARS + 5));
    expect(state.history).toHaveLength(MAX_HISTORY_YEARS);
    expect(state.history.at(-1)?.year).toBe(MAX_HISTORY_YEARS + 5);
  });

  it('rejects a negative or fractional number of ticks', () => {
    expect(() => advanceTicks(createInitialState(), -1)).toThrow(RangeError);
    expect(() => advanceTicks(createInitialState(), 1.5)).toThrow(RangeError);
  });
});
