import { describe, expect, it } from 'vitest';
import { advanceTicks } from './simulation';
import { createInitialState } from './state';
import { selectView } from './view';

describe('view', () => {
  it('shows a balanced planet at the start', () => {
    const view = selectView(createInitialState());
    expect(view.elapsedYears).toBe(0);
    expect(view.forcing.total).toBe(0);
    expect(view.surfaceWarming).toBe(0);
    expect(view.equilibriumWarming).toBe(0);
    expect(view.energyImbalance).toBe(0);
    expect(view.radiation.outgoingInfrared).toBeCloseTo(view.radiation.absorbedSolar, 10);
  });

  it('shows Earth gaining energy and warming that has not caught up yet', () => {
    const state = advanceTicks(
      { ...createInitialState(), emissions: { co2: 40, ch4: 350, n2o: 7 } },
      30 * 12,
    );
    const view = selectView(state);
    expect(view.elapsedYears).toBe(30);
    expect(view.forcing.total).toBeGreaterThan(0);
    expect(view.energyImbalance).toBeGreaterThan(0);
    expect(view.radiation.outgoingInfrared).toBeLessThan(view.radiation.absorbedSolar);
    expect(view.equilibriumWarming).toBeGreaterThan(view.surfaceWarming);
    expect(view.feedbacks.waterVapourLapseRate).toBeGreaterThan(0);
    expect(view.history).toHaveLength(31);
  });
});
