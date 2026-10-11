import { describe, expect, it } from 'vitest';
import { SCIENCE } from './constants';
import type { ValueKind } from './sourced';

const KINDS: readonly ValueKind[] = ['measured', 'assessed', 'model-parameter', 'gameplay'];

describe('SCIENCE constants', () => {
  it.each(Object.entries(SCIENCE))('%s has a unit, description, source and valid kind', (_, c) => {
    expect(c.unit.length).toBeGreaterThan(0);
    expect(c.description.length).toBeGreaterThan(0);
    expect(c.source.length).toBeGreaterThan(0);
    expect(KINDS).toContain(c.kind);
  });

  it('contains no gameplay values', () => {
    const kinds = Object.values(SCIENCE).map((c) => c.kind);
    expect(kinds).not.toContain('gameplay');
  });

  it('has a net feedback equal to the sum of the individual feedbacks (AR6 Table 7.10)', () => {
    const sum =
      SCIENCE.planckFeedback.value +
      SCIENCE.waterVapourLapseRateFeedback.value +
      SCIENCE.surfaceAlbedoFeedback.value +
      SCIENCE.cloudFeedback.value +
      SCIENCE.biogeophysicalFeedback.value;
    expect(sum).toBeCloseTo(SCIENCE.netFeedback.value, 10);
  });

  it('splits a CO2 pulse into parts whose fractions add up to 1', () => {
    const parts = Object.values(SCIENCE.co2ImpulseResponse.value);
    const total = parts.reduce((sum, part) => sum + part.fraction, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});
