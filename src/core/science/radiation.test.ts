import { describe, expect, it } from 'vitest';
import { SCIENCE } from './constants';
import {
  absorbedSolar,
  blackBodyEmission,
  blackBodyTemperature,
  incomingSolar,
  noGreenhouseTemperature,
  radiationBudget,
} from './radiation';

describe('radiation', () => {
  it('spreads sunlight over the whole sphere: 1361 / 4 ≈ 340 W/m²', () => {
    expect(incomingSolar()).toBeCloseTo(340.25, 2);
  });

  it('reflects about 100 W/m² and absorbs about 240 W/m²', () => {
    const budget = radiationBudget(SCIENCE.averageSurfaceTemperature.value);
    expect(budget.reflectedSolar).toBeCloseTo(100.0, 0);
    expect(budget.absorbedSolar).toBeCloseTo(240.2, 1);
  });

  it('gives about 255 K (−18 °C) for an Earth with no greenhouse effect', () => {
    const t = noGreenhouseTemperature();
    // NASA lists a black body temperature of 254.0 K (computed with a slightly higher albedo).
    expect(Math.abs(t - 254.0)).toBeLessThan(1.5);
    expect(t - 273.15).toBeCloseTo(-18, 0);
  });

  it('shows the natural greenhouse effect keeps Earth about 33 °C warmer', () => {
    const warming = SCIENCE.averageSurfaceTemperature.value - noGreenhouseTemperature();
    expect(warming).toBeGreaterThan(32);
    expect(warming).toBeLessThan(34);
  });

  it('round trips between temperature and emitted infrared', () => {
    expect(blackBodyTemperature(blackBodyEmission(288))).toBeCloseTo(288, 10);
  });

  it('sends out as much infrared as absorbed sunlight when balanced', () => {
    const budget = radiationBudget(288, 0);
    expect(budget.outgoingInfrared).toBeCloseTo(absorbedSolar(), 10);
    expect(budget.greenhouseEffect).toBeGreaterThan(140);
    expect(budget.greenhouseEffect).toBeLessThan(160);
  });

  it('lets less infrared escape when Earth is gaining energy', () => {
    const balanced = radiationBudget(288, 0);
    const gaining = radiationBudget(288, 1);
    expect(gaining.outgoingInfrared).toBeCloseTo(balanced.outgoingInfrared - 1, 10);
    expect(gaining.greenhouseEffect).toBeCloseTo(balanced.greenhouseEffect + 1, 10);
  });

  it('rejects impossible temperatures', () => {
    expect(() => blackBodyEmission(-5)).toThrow(RangeError);
    expect(() => radiationBudget(0)).toThrow(RangeError);
    expect(() => radiationBudget(288, Number.NaN)).toThrow(RangeError);
  });
});
