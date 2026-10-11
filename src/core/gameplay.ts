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
} as const satisfies Record<string, Sourced<number>>;
