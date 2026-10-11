/**
 * The view is a ready to display snapshot of the game. It contains the stored state plus
 * values calculated from it, so no physics has to be done outside the engine.
 */
import {
  FACTORS,
  describeRequirement,
  emissionsPerLevel,
  factorEmissions,
  isRequirementMet,
  totalEmissions,
  type FactorId,
} from './factors';
import { incomePerYear, savingsCap, upgradeCost } from './economy';
import { CARDS } from './education';
import { GAMEPLAY } from './gameplay';
import { MILESTONES, OBJECTIVES, createDebrief, type Debrief, type Milestone } from './progression';
import { regionClimates, type RegionClimate } from './regions';
import {
  SCIENCE,
  concentrations,
  effectiveRadiativeForcing,
  energyImbalance,
  equilibriumWarming,
  feedbackBreakdown,
  ozoneLossPercent,
  radiationBudget,
  type Emissions,
  type FeedbackBreakdown,
  type ForcingBreakdown,
  type GasConcentrations,
  type RadiationBudget,
} from './science';
import { TICKS_PER_YEAR, type GameState, type HistoryPoint } from './state';

/**
 * Surface temperature used as the starting point for the radiation budget: NASA's rounded
 * average of 288 K. Only used for the illustrative energy flows, not for the warming itself.
 */
const STARTING_SURFACE_TEMPERATURE_K = SCIENCE.averageSurfaceTemperature.value;

export interface RequirementView {
  /** Plain text, e.g. "Coal power at level 3". */
  readonly text: string;
  readonly met: boolean;
}

export interface FactorView {
  readonly id: FactorId;
  readonly name: string;
  readonly description: string;
  readonly level: number;
  readonly maxLevel: number;
  /** The level that matches what this activity releases in the real world today. */
  readonly presentDayLevel: number | null;
  readonly unlocked: boolean;
  /** What must happen to unlock it (all met once unlocked). */
  readonly requirements: readonly RequirementView[];
  /** Yearly emissions at the current level. */
  readonly emissions: Emissions;
  /** Extra yearly emissions from one more level. */
  readonly emissionsPerLevel: Emissions;
  readonly upgradeCost: number | null;
  readonly affordable: boolean;
}

export interface MilestoneView extends Milestone {
  readonly reached: boolean;
}

export interface ObjectiveView {
  readonly id: string;
  readonly text: string;
  readonly lesson: string;
  readonly reward: number;
  readonly done: boolean;
}

export interface CardView {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly source: string;
  readonly shown: boolean;
}

export interface OzoneView {
  readonly cfcConcentration: number;
  readonly lossPercent: number;
  readonly realWorldLossPercent: number;
}

export interface RealWorldView {
  readonly warming: number;
  readonly co2: number;
  readonly ch4: number;
  readonly n2o: number;
}

export interface GameView {
  readonly cards: readonly CardView[];
  readonly ozone: OzoneView;
  readonly dollars: number;
  readonly incomePerYear: number;
  readonly savingsCap: number;
  readonly realWorld: RealWorldView;
  readonly milestones: readonly MilestoneView[];
  readonly objectives: readonly ObjectiveView[];
  readonly endingWarming: number;
  readonly ended: boolean;
  readonly debrief: Debrief | null;
  /** Simulated years since the start of the game (fractional, updates every month). */
  readonly elapsedYears: number;
  /** All environmental factors in display order. */
  readonly factors: readonly FactorView[];
  /** Yearly human emissions in effect: CO2 in Gt, CH4 in Tg, N2O in Tg of nitrogen. */
  readonly emissions: Emissions;
  /** CO2 in ppm, CH4 and N2O in ppb. */
  readonly concentrations: GasConcentrations;
  /** Extra energy trapped by each gas compared with 1750, W m^-2. */
  readonly forcing: ForcingBreakdown;
  /** Global surface warming, degrees C above pre industrial. */
  readonly surfaceWarming: number;
  /** Deep ocean warming, degrees C above pre industrial (lags far behind the surface). */
  readonly deepOceanWarming: number;
  /** Warming the planet would eventually reach if gas levels stayed as they are now. */
  readonly equilibriumWarming: number;
  /** Energy Earth is currently gaining, W m^-2. Positive means it is still heating up. */
  readonly energyImbalance: number;
  /** Global average energy flows, W m^-2. */
  readonly radiation: RadiationBudget;
  /** Energy each climate feedback adds (+) or removes (-) at the current warming, W m^-2. */
  readonly feedbacks: FeedbackBreakdown;
  readonly regions: readonly RegionClimate[];
  /** One point per simulated year, oldest first. */
  readonly history: readonly HistoryPoint[];
}

function selectFactors(state: GameState): FactorView[] {
  const warming = state.climate.surfaceWarming;
  return FACTORS.map((factor) => {
    const { level, unlocked } = state.factors[factor.id];
    return {
      id: factor.id,
      name: factor.name,
      description: factor.description,
      level,
      maxLevel: GAMEPLAY.maxFactorLevel.value,
      presentDayLevel: factor.presentDay ? GAMEPLAY.presentDayLevel.value : null,
      unlocked,
      requirements: factor.requires.map((r) => ({
        text: describeRequirement(r),
        met: unlocked || isRequirementMet(r, state.factors, warming),
      })),
      emissions: factorEmissions(factor, level),
      emissionsPerLevel: emissionsPerLevel(factor),
      upgradeCost: level < GAMEPLAY.maxFactorLevel.value ? upgradeCost(factor.id, level) : null,
      affordable:
        unlocked &&
        level < GAMEPLAY.maxFactorLevel.value &&
        upgradeCost(factor.id, level) <= state.dollars,
    };
  });
}

export function selectView(state: GameState): GameView {
  const gas = concentrations(state.gases);
  const forcing = effectiveRadiativeForcing(gas);
  const warming = state.climate.surfaceWarming;
  const imbalance = energyImbalance(forcing.total, warming);

  return {
    cards: CARDS.map((c) => ({
      id: c.id,
      title: c.title,
      text: c.text,
      source: c.source,
      shown: state.progress.cardsShown.includes(c.id),
    })),
    ozone: {
      cfcConcentration: gas.cfc,
      lossPercent: ozoneLossPercent(gas.cfc),
      realWorldLossPercent: SCIENCE.ozoneLossToday.value,
    },
    dollars: state.dollars,
    incomePerYear: incomePerYear(state.factors),
    savingsCap: savingsCap(state.factors),
    realWorld: {
      warming: SCIENCE.observedWarming2011To2020.value,
      co2: SCIENCE.co2Concentration2019.value,
      ch4: SCIENCE.ch4Concentration2019.value,
      n2o: SCIENCE.n2oConcentration2019.value,
    },
    milestones: MILESTONES.map((m) => ({
      ...m,
      reached: state.progress.milestonesReached.includes(m.warming),
    })),
    objectives: OBJECTIVES.map((o) => ({
      id: o.id,
      text: o.text,
      lesson: o.lesson,
      reward: o.reward,
      done: state.progress.objectivesCompleted.includes(o.id),
    })),
    endingWarming: GAMEPLAY.endingWarming.value,
    ended: state.progress.endedAtYear !== null,
    debrief: createDebrief(state),
    elapsedYears: state.tick / TICKS_PER_YEAR,
    factors: selectFactors(state),
    emissions: totalEmissions(state.factors),
    concentrations: gas,
    forcing,
    surfaceWarming: warming,
    deepOceanWarming: state.climate.deepOceanWarming,
    equilibriumWarming: equilibriumWarming(forcing.total),
    energyImbalance: imbalance,
    radiation: radiationBudget(STARTING_SURFACE_TEMPERATURE_K + warming, imbalance),
    feedbacks: feedbackBreakdown(warming),
    regions: regionClimates(warming),
    history: state.history,
  };
}
