// Plays whole games with a simple automated player to check the game can be finished and is paced sensibly.
import { describe, expect, it } from 'vitest';
import { FACTOR_IDS } from '../src/core/factors';
import { GAMEPLAY } from '../src/core/gameplay';
import { MILESTONES } from '../src/core/progression';
import { advanceTicks } from '../src/core/simulation';
import { stateWithLevels } from '../src/core/test-helpers';
import { runBot } from './bot';

describe('full playthrough', () => {
  const fast = runBot(600);
  const slow = runBot(600, 1);
  const early = [0.5, 1, 1.5, 2, 3, 4];

  it('reaches every milestone up to +4 degrees C in order', () => {
    for (const run of [fast, slow]) {
      const years = early.map((w) => run.milestoneYears[w] ?? Infinity);
      expect(years.every((y) => Number.isFinite(y))).toBe(true);
      expect([...years].sort((a, b) => a - b)).toEqual(years);
    }
  });

  it('takes a sensible number of game years', () => {
    expect(fast.milestoneYears[1.5]).toBeGreaterThan(30);
    expect(fast.milestoneYears[1.5]).toBeLessThan(120);
    expect(fast.milestoneYears[4]).toBeGreaterThan(80);
    expect(slow.milestoneYears[4]).toBeLessThan(300);
  });

  it('completes the CO2 and methane goals along the way', () => {
    const goals = fast.events.flatMap((e) =>
      e.type === 'objectiveCompleted' ? [e.objective] : [],
    );
    expect(goals).toContain('co2-350');
    expect(goals).toContain('methane-2000');
  });

  it('reaches every milestone and the +20 degrees C ending with every activity at the top level', () => {
    const top = Object.fromEntries(FACTOR_IDS.map((id) => [id, GAMEPLAY.maxFactorLevel.value]));
    const { state, events } = advanceTicks(stateWithLevels(top), 12 * 6000);
    const reached = events.flatMap((e) => (e.type === 'milestoneReached' ? [e.warming] : []));
    expect(reached).toEqual(MILESTONES.map((m) => m.warming));
    expect(state.progress.endedAtYear).not.toBeNull();
    expect(state.climate.surfaceWarming).toBeGreaterThanOrEqual(GAMEPLAY.endingWarming.value);
  });
});
