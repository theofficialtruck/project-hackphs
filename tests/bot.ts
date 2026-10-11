// A simple automated player for balance tests: every year it buys the cheapest upgrades it can afford.
import { createGame, type GameEvent } from '../src/core';

export interface BotRun {
  readonly milestoneYears: Record<number, number>;
  readonly endYear: number | null;
  readonly events: readonly GameEvent[];
}

export function runBot(maxYears: number, upgradesPerYear = Infinity): BotRun {
  const game = createGame();
  const milestoneYears: Record<number, number> = {};
  const events: GameEvent[] = [];
  for (let year = 0; year < maxYears && !game.getView().ended; year++) {
    for (let bought = 0; bought < upgradesPerYear; bought++) {
      const options = game
        .getView()
        .factors.filter((f) => f.affordable && f.upgradeCost !== null)
        .sort((a, b) => (a.upgradeCost ?? 0) - (b.upgradeCost ?? 0));
      const choice = options[0];
      if (!choice) break;
      const result = game.dispatch({ type: 'upgradeFactor', factor: choice.id });
      if (result.ok) events.push(...result.events);
    }
    for (const event of game.advance(1)) {
      events.push(event);
      if (event.type === 'milestoneReached') milestoneYears[event.warming] = year + 1;
    }
  }
  const view = game.getView();
  return { milestoneYears, endYear: view.debrief?.yearsPlayed ?? null, events };
}
