// Plays whole games with a simple automated player to check the game can be finished and is paced sensibly.
import { describe, expect, it } from 'vitest';
import { runBot } from './bot';

describe('full playthrough', () => {
  const fast = runBot(600);
  const slow = runBot(600, 1);

  it('reaches the ending', () => {
    expect(fast.endYear).not.toBeNull();
    expect(slow.endYear).not.toBeNull();
  });

  it('reaches every milestone in order', () => {
    const years = [0.5, 1, 1.5, 2, 3, 4].map((w) => fast.milestoneYears[w] ?? Infinity);
    expect(years.every((y) => Number.isFinite(y))).toBe(true);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it('takes a sensible number of game years', () => {
    expect(fast.milestoneYears[1.5]).toBeGreaterThan(30);
    expect(fast.milestoneYears[1.5]).toBeLessThan(120);
    expect(fast.endYear).toBeGreaterThan(80);
    expect(slow.endYear).toBeLessThan(300);
  });

  it('completes the CO2 and methane goals along the way', () => {
    const goals = fast.events.flatMap((e) =>
      e.type === 'objectiveCompleted' ? [e.objective] : [],
    );
    expect(goals).toContain('co2-350');
    expect(goals).toContain('methane-2000');
  });
});
