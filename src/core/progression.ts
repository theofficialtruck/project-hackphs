// Milestones, objectives and the ending. Facts shown to players are quoted from the IPCC AR6 WG1
// Summary for Policymakers (SPM), https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/
import type { GameEvent, StepResult } from './events';
import { GAMEPLAY } from './gameplay';
import { concentrations } from './science';
import { TICKS_PER_YEAR, type GameState } from './state';

const SPM = 'IPCC AR6 WG1 Summary for Policymakers';
const HEAT_STRESS =
  'Sherwood and Huber (2010), An adaptability limit to climate change due to heat stress, PNAS 107, 9552-9555';

export interface Milestone {
  readonly warming: number;
  readonly title: string;
  readonly text: string;
  readonly source: string;
}

export const MILESTONES: readonly Milestone[] = [
  {
    warming: 0.5,
    title: 'Half a degree warmer',
    text: 'Every extra half degree of warming makes heatwaves and heavy rain clearly stronger and more frequent.',
    source: `${SPM}, B.2.2`,
  },
  {
    warming: 1,
    title: 'One degree warmer',
    text: 'A heat extreme that used to happen once every 10 years now happens about 2.8 times as often. The real world reached about 1.1 degrees C of warming in 2011 to 2020.',
    source: `${SPM}, Figure SPM.6 and A.1.2`,
  },
  {
    warming: 1.5,
    title: 'One and a half degrees warmer',
    text: 'Once in 10 years heat extremes now happen about 4.1 times as often and are about 1.9 degrees C hotter.',
    source: `${SPM}, Figure SPM.6`,
  },
  {
    warming: 2,
    title: 'Two degrees warmer',
    text: 'Once in 10 years heat extremes now happen about 5.6 times as often and are about 2.6 degrees C hotter.',
    source: `${SPM}, Figure SPM.6`,
  },
  {
    warming: 3,
    title: 'Three degrees warmer',
    text: 'The last time Earth stayed 2.5 degrees C or more above 1850 to 1900 levels was over 3 million years ago.',
    source: `${SPM}, B.1.1`,
  },
  {
    warming: 4,
    title: 'Four degrees warmer',
    text: 'Once in 10 years heat extremes now happen about 9.4 times as often and are about 5.1 degrees C hotter.',
    source: `${SPM}, Figure SPM.6`,
  },
  {
    warming: 7,
    title: 'Seven degrees warmer',
    text: 'Heat and humidity together would start to pass the limit the human body can survive for long in some regions, raising the question of whether people could still live there.',
    source: HEAT_STRESS,
  },
  {
    warming: 11,
    title: 'Eleven degrees warmer',
    text: 'With 11 to 12 degrees C of warming, the regions too hot and humid for the human body would cover the places where most people live today.',
    source: HEAT_STRESS,
  },
];

export interface Objective {
  readonly id: string;
  readonly text: string;
  readonly lesson: string;
  readonly reward: number;
  readonly isComplete: (state: GameState, completed: readonly string[]) => boolean;
}

export const OBJECTIVES: readonly Objective[] = [
  {
    id: 'co2-350',
    text: 'Raise CO2 above 350 parts per million',
    lesson: 'CO2 builds up because most of it stays in the air for a long time.',
    reward: 300,
    isComplete: (s) => concentrations(s.gases).co2 > 350,
  },
  {
    id: 'methane-2000',
    text: 'Push methane above 2000 parts per billion',
    lesson: 'Methane traps much more heat per molecule than CO2.',
    reward: 400,
    isComplete: (s) => concentrations(s.gases).ch4 > 2000,
  },
  {
    id: 'methane-falls',
    text: 'After methane passes 2000 parts per billion, lower it below 1500',
    lesson:
      'Extra methane breaks down in about 12 years, so it falls fast once emissions drop. CO2 does not.',
    reward: 600,
    isComplete: (s, done) => done.includes('methane-2000') && concentrations(s.gases).ch4 < 1500,
  },
];

export interface Debrief {
  readonly yearsPlayed: number;
  readonly finalWarming: number;
  readonly finalCo2: number;
  readonly totalCo2Emitted: number;
  readonly realWorld: readonly { readonly text: string; readonly source: string }[];
  readonly gameSimplifications: readonly string[];
}

export function createDebrief(state: GameState): Debrief | null {
  if (state.progress.endedAtYear === null) return null;
  return {
    yearsPlayed: state.progress.endedAtYear,
    finalWarming: state.climate.surfaceWarming,
    finalCo2: concentrations(state.gases).co2,
    totalCo2Emitted: state.progress.cumulativeCo2,
    realWorld: [
      {
        text: 'Real world: Earth was about 1.09 degrees C warmer in 2011 to 2020 than in 1850 to 1900.',
        source: `${SPM}, A.1.2`,
      },
      {
        text: 'Real world: with very high emissions, warming by 2081 to 2100 is very likely 3.3 to 5.7 degrees C.',
        source: `${SPM}, B.1.1`,
      },
      {
        text: 'Real world: in that very high emissions scenario, sea level likely rises 0.63 to 1.01 meters by 2100.',
        source: `${SPM}, B.5.3`,
      },
      {
        text: 'Real world: every 1000 billion tonnes of CO2 emitted causes about 0.45 degrees C of warming (likely 0.27 to 0.63).',
        source: `${SPM}, D.1.1`,
      },
    ],
    gameSimplifications: [
      'The game starts from 1750 conditions and how fast years pass is a game choice.',
      'Pollution particles (aerosols) that hide some real world warming are left out.',
      'Warming far above 5 degrees C goes past what the IPCC assesses for this century, and the simple climate model is less reliable there.',
      'Country values come from large IPCC regions, not from each country separately.',
    ],
  };
}

export function applyProgression(state: GameState): StepResult<GameState> {
  if (state.progress.endedAtYear !== null) return { state, events: [] };
  const warming = state.climate.surfaceWarming;
  const events: GameEvent[] = [];

  const milestonesReached = [...state.progress.milestonesReached];
  for (const m of MILESTONES) {
    if (warming >= m.warming && !milestonesReached.includes(m.warming)) {
      milestonesReached.push(m.warming);
      events.push({ type: 'milestoneReached', warming: m.warming });
    }
  }

  const objectivesCompleted = [...state.progress.objectivesCompleted];
  let dollars = state.dollars;
  for (const o of OBJECTIVES) {
    if (!objectivesCompleted.includes(o.id) && o.isComplete(state, objectivesCompleted)) {
      objectivesCompleted.push(o.id);
      dollars += o.reward;
      events.push({ type: 'objectiveCompleted', objective: o.id, reward: o.reward });
    }
  }

  let endedAtYear: number | null = null;
  if (warming >= GAMEPLAY.endingWarming.value) {
    endedAtYear = state.tick / TICKS_PER_YEAR;
    events.push({ type: 'gameEnded', year: endedAtYear });
  }

  if (events.length === 0) return { state, events };
  return {
    state: {
      ...state,
      dollars,
      progress: { ...state.progress, milestonesReached, objectivesCompleted, endedAtYear },
    },
    events,
  };
}
