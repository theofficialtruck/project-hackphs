import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { CARDS, applyCards } from './education';
import type { GameEvent } from './events';
import { advanceTicks } from './simulation';
import { createInitialState, type GameState } from './state';
import { stateWithLevels } from './test-helpers';

const cardsIn = (events: readonly GameEvent[]) =>
  events.flatMap((e) => (e.type === 'cardShown' ? [e.card] : []));

function upgrade(state: GameState, factor: 'coal' | 'refrigerants') {
  const result = applyAction({ ...state, dollars: 1e6 }, { type: 'upgradeFactor', factor });
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

describe('science cards', () => {
  it('have unique ids and a source for every card', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const card of CARDS) expect(card.source.length).toBeGreaterThan(0);
  });

  it('explain the natural greenhouse effect after the first purchase', () => {
    expect(cardsIn(upgrade(createInitialState(), 'coal').events)).toContain('greenhouse-natural');
  });

  it('correct the ozone myth when CFCs are first used', () => {
    const result = upgrade(stateWithLevels({ coal: 2, refrigerants: 0 }), 'refrigerants');
    expect(cardsIn(result.events)).toContain('ozone-not-warming');
  });

  it('explain that cutting back does not undo warming on the first downgrade', () => {
    const result = applyAction(stateWithLevels({ coal: 2 }), {
      type: 'downgradeFactor',
      factor: 'coal',
    });
    expect(result.ok && cardsIn(result.events)).toContain('stopping-emissions');
  });

  it('appear during play as warming and gases rise', () => {
    const { events } = advanceTicks(
      stateWithLevels({ coal: 10, deforestation: 10, livestock: 10 }),
      12 * 40,
    );
    const shown = cardsIn(events);
    expect(shown).toContain('co2-small-amount');
    expect(shown).toContain('water-vapour');
    expect(shown).toContain('warming-lag');
  });

  it('compare CO2 with the real record once it passes the 2019 level', () => {
    const { state, events } = advanceTicks(
      stateWithLevels({ coal: 10, deforestation: 10 }),
      12 * 80,
    );
    expect(cardsIn(events)).toContain('co2-record');
    expect(state.progress.cardsShown).toContain('co2-record');
    expect(cardsIn(advanceTicks(createInitialState(), 12 * 80).events)).not.toContain('co2-record');
  });
  it('warn about the thinning ozone layer once CFCs reach real world levels', () => {
    const { events } = advanceTicks(stateWithLevels({ coal: 2, refrigerants: 10 }), 12 * 60);
    expect(cardsIn(events)).toContain('ozone-today');
  });

  it('are only shown once', () => {
    const first = upgrade(createInitialState(), 'coal');
    const second = applyCards(first.state, first.events);
    expect(second.events).toEqual([]);
  });
});
