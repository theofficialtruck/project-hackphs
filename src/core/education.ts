// Short science cards that appear when the player does something they explain. Each card's
// claims come from the cited source.
import type { GameEvent, StepResult } from './events';
import {
  concentrations,
  effectiveRadiativeForcing,
  equilibriumWarming,
  ozoneLossPercent,
} from './science';
import type { GameState } from './state';

const AR6_SPM = 'IPCC AR6 WG1 Summary for Policymakers';
const AR6_CH7 = 'IPCC AR6 WG1 Chapter 7';
const WMO_OZONE = 'WMO/UNEP Twenty Questions and Answers About the Ozone Layer (2022)';

export interface Card {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly source: string;
  readonly isTriggered: (state: GameState, events: readonly GameEvent[]) => boolean;
}

const upgraded = (events: readonly GameEvent[], factor?: string) =>
  events.some((e) => e.type === 'factorUpgraded' && (factor === undefined || e.factor === factor));

export const CARDS: readonly Card[] = [
  {
    id: 'greenhouse-natural',
    title: 'The greenhouse effect is natural',
    text: 'Without any greenhouse gases Earth would be about -18 degrees C. Natural greenhouse gases keep it at about 15 degrees C. Your activities add more, so the planet holds in more heat.',
    source:
      'NASA Earth Fact Sheet (average 288 kelvin); -18 degrees C calculated from incoming sunlight and reflection',
    isTriggered: (_, events) => upgraded(events),
  },

  {
    id: 'co2-small-amount',
    title: 'A small amount with a big effect',
    text: 'CO2 is only about 0.03% of the air, yet it absorbs infrared heat. Doubling CO2 from its 1750 level would trap about 3.9 extra watts of energy on every square meter of Earth.',
    source: `${AR6_CH7}, Section 7.3.2.1`,
    isTriggered: (state) => concentrations(state.gases).co2 > 300,
  },
  {
    id: 'water-vapour',
    title: 'Water vapour makes it worse',
    text: 'Warmer air holds more water vapour, which is also a greenhouse gas, so it traps even more heat. Of all climate feedbacks it amplifies warming the most. Its amount follows the temperature, so it is a feedback, not the starting cause.',
    source: `${AR6_CH7}, Table 7.10`,
    isTriggered: (state) => state.climate.surfaceWarming >= 0.5,
  },
  {
    id: 'warming-lag',
    title: 'The oceans slow things down',
    text: 'Oceans take decades to warm up. Even if gas levels stopped rising now, Earth would keep warming for years before it caught up with the gases already in the air.',
    source: `${AR6_CH7}, two layer energy balance model (Cross-Chapter Box 7.1)`,
    isTriggered: (state) => {
      const forcing = effectiveRadiativeForcing(concentrations(state.gases)).total;
      return equilibriumWarming(forcing) - state.climate.surfaceWarming >= 0.5;
    },
  },
  {
    id: 'ozone-not-warming',
    title: 'Myth: the ozone hole causes global warming',
    text: 'Ozone depletion is not the main cause of climate change. The ozone layer absorbs harmful ultraviolet (UV) sunlight, while greenhouse gases trap outgoing infrared heat. CFCs do both kinds of damage: they thin the ozone layer and they are strong greenhouse gases.',
    source: `${WMO_OZONE}, Q2 and Q17`,
    isTriggered: (_, events) => upgraded(events, 'refrigerants'),
  },
  {
    id: 'ozone-today',
    title: 'The ozone layer is thinning',
    text: 'Your CFCs have thinned the ozone layer as much as the real world did: since 2010 it has been about 2 to 3% thinner than in 1964 to 1980. More harmful UV-B now reaches the ground.',
    source: `${WMO_OZONE}, Q2 and Q12`,
    isTriggered: (state) => ozoneLossPercent(state.gases.cfcExcess) >= 2.5,
  },
  {
    id: 'stopping-emissions',
    title: 'Cutting back does not undo warming',
    text: 'Lowering emissions slows the rise of CO2, but CO2 already in the air stays for centuries. Warming from CO2 only stops rising when CO2 emissions reach about zero, and then temperatures stay high instead of going back down.',
    source: `${AR6_SPM}, D.1.1, and Chapter 5, Section 5.5.2.2.4`,
    isTriggered: (_, events) => events.some((e) => e.type === 'factorDowngraded'),
  },
];

export function applyCards(state: GameState, events: readonly GameEvent[]): StepResult<GameState> {
  const shown = state.progress.cardsShown;
  const newCards = CARDS.filter((c) => !shown.includes(c.id) && c.isTriggered(state, events));
  if (newCards.length === 0) return { state, events: [] };
  return {
    state: {
      ...state,
      progress: { ...state.progress, cardsShown: [...shown, ...newCards.map((c) => c.id)] },
    },
    events: newCards.map((c) => ({ type: 'cardShown', card: c.id })),
  };
}
