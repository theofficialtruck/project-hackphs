/**
 * Numbers chosen to make the game work. They are NOT scientific measurements, and each
 * one says why it was chosen, so the game can show players the difference.
 */
import type { Sourced } from './science';

export const GAMEPLAY = {
  presentDayLevel: {
    value: 5,
    unit: 'level',
    description: 'At this level an activity releases as much as it does in the real world today.',
    source:
      'Game design choice: players build up to real world emissions in a few steps, then can go beyond them.',
    kind: 'gameplay',
  },
  maxFactorLevel: {
    value: 10,
    unit: 'level',
    description: 'Highest level of each activity: twice what it releases in the real world today.',
    source:
      'Game design choice: lets players reach a very high emissions world without unlimited growth.',
    kind: 'gameplay',
  },
  rainfallAgreement: {
    value: 0.8,
    unit: 'fraction of climate models',
    description:
      'A region is only called wetter or drier when at least this share of climate models agree.',
    source:
      'Presentation choice: avoids claiming a rainfall direction when climate models disagree.',
    kind: 'gameplay',
  },
  startingDollars: {
    value: 120,
    unit: 'dollars',
    description: 'Money at the start of the game.',
    source: 'Game design choice: enough for the first upgrade right away.',
    kind: 'gameplay',
  },
  baseIncome: {
    value: 20,
    unit: 'dollars per year',
    description: 'Money earned every year even with no activities running.',
    source: 'Game design choice: keeps the game moving at the start.',
    kind: 'gameplay',
  },
  incomePerLevel: {
    value: 12,
    unit: 'dollars per year per level',
    description: 'Extra money earned every year for each level of every activity.',
    source: 'Game design choice: bigger industries earn more, so growth speeds up.',
    kind: 'gameplay',
  },
  costGrowth: {
    value: 1.3,
    unit: 'times per level',
    description: 'Each new level of an activity costs this many times more than the last one.',
    source: 'Game design choice: makes later levels harder to reach.',
    kind: 'gameplay',
  },
  factorBaseCosts: {
    value: {
      coal: 60,
      deforestation: 50,
      livestock: 50,
      rice: 90,
      cement: 120,
      oil: 160,
      naturalGas: 260,
      landfills: 200,
      fertilizer: 300,
      refrigerants: 150,
    },
    unit: 'dollars',
    description: 'Price of the first level of each activity.',
    source: 'Game design choice: activities unlocked later cost more.',
    kind: 'gameplay',
  },
  endingWarming: {
    value: 20,
    unit: 'degrees C',
    description: 'The game ends when global warming reaches this level.',
    source:
      'Game design choice: a long-run extreme scenario, well above the 2081–2100 ranges assessed by the IPCC.',
    kind: 'gameplay',
  },
  cfcPerLevel: {
    value: 30,
    unit: 'thousand tonnes of CFCs per year',
    description: 'CFCs released by each level of refrigerants.',
    source:
      "Game design choice: CFCs are mostly banned today, so there is no real present day amount. At level 10 the CFC level reaches about today's real CFC-12 level within 50 years.",
    kind: 'gameplay',
  },
  previewYears: {
    value: 50,
    unit: 'years',
    description: 'How far ahead an upgrade preview looks.',
    source: 'Game design choice: long enough to show slow warming, short enough to stay relevant.',
    kind: 'gameplay',
  },
} as const satisfies Record<string, Sourced<unknown>>;
