import { describe, expect, it } from 'vitest';
import { FACTORS } from './factors';
import { advanceTicks } from './simulation';
import { createInitialState } from './state';
import { presentDayState, stateWithLevels } from './test-helpers';
import { selectView } from './view';

describe('view', () => {
  it('shows a balanced planet at the start', () => {
    const view = selectView(createInitialState());
    expect(view.elapsedYears).toBe(0);
    expect(view.emissions).toEqual({ co2: 0, ch4: 0, n2o: 0, cfc: 0 });
    expect(view.ozone.lossPercent).toBe(0);
    expect(view.cards.every((c) => !c.shown)).toBe(true);
    expect(view.forcing.total).toBe(0);
    expect(view.surfaceWarming).toBe(0);
    expect(view.equilibriumWarming).toBe(0);
    expect(view.energyImbalance).toBe(0);
    expect(view.radiation.outgoingInfrared).toBeCloseTo(view.radiation.absorbedSolar, 10);
  });

  it('gives the real world values to compare against', () => {
    const view = selectView(createInitialState());
    expect(view.realWorld).toEqual({ warming: 1.09, co2: 410, ch4: 1866, n2o: 332 });
  });

  it('lists every factor with its level, lock status and requirements', () => {
    const view = selectView(createInitialState());
    expect(view.factors.map((f) => f.id)).toEqual(FACTORS.map((f) => f.id));
    const oil = view.factors.find((f) => f.id === 'oil');
    expect(oil).toMatchObject({ level: 0, unlocked: false, maxLevel: 10, presentDayLevel: 5 });
    expect(oil?.requirements).toEqual([{ text: 'Coal power at level 3', met: false }]);
  });

  it('marks a requirement as met once it is true', () => {
    const view = selectView(stateWithLevels({ coal: 3 }));
    const oil = view.factors.find((f) => f.id === 'oil');
    expect(oil?.requirements[0]?.met).toBe(true);
  });

  it('shows the emissions of each factor and in total', () => {
    const view = selectView(stateWithLevels({ livestock: 2 }));
    const livestock = view.factors.find((f) => f.id === 'livestock');
    expect(livestock?.emissions.ch4).toBeCloseTo(2 * (livestock?.emissionsPerLevel.ch4 ?? 0), 10);
    expect(view.emissions.ch4).toBeCloseTo(livestock?.emissions.ch4 ?? 0, 10);
  });

  it('shows Earth gaining energy and warming that has not caught up yet', () => {
    const { state } = advanceTicks(presentDayState(), 30 * 12);
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
