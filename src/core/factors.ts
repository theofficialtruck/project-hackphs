/**
 * Environmental factors: real human activities the player can expand. For most of them each
 * level adds a fixed share of the activity's real present day emissions (see
 * science/constants.ts), and level GAMEPLAY.presentDayLevel equals today's real world emissions.
 * Refrigerants (CFCs) are mostly banned today, so their amount per level is a gameplay value.
 */
import { GAMEPLAY } from './gameplay';
import { NO_EMISSIONS, SCIENCE, type Emissions } from './science';

export type FactorId =
  | 'coal'
  | 'oil'
  | 'naturalGas'
  | 'cement'
  | 'deforestation'
  | 'livestock'
  | 'rice'
  | 'fertilizer'
  | 'landfills'
  | 'refrigerants';

export type UnlockRequirement =
  | { readonly type: 'factorLevel'; readonly factor: FactorId; readonly level: number }
  | { readonly type: 'warming'; readonly atLeast: number };

export interface FactorDefinition {
  readonly id: FactorId;
  readonly name: string;
  readonly description: string;
  readonly presentDay: Emissions | null;
  readonly perLevel: Emissions;
  readonly requires: readonly UnlockRequirement[];
}

const FOSSIL_CO2 = SCIENCE.fossilCo2Emissions.value;
const FOSSIL_SHARE = SCIENCE.fossilCo2Shares.value;

function scale(emissions: Emissions, factor: number): Emissions {
  return {
    co2: emissions.co2 * factor,
    ch4: emissions.ch4 * factor,
    n2o: emissions.n2o * factor,
    cfc: emissions.cfc * factor,
  };
}

function add(a: Emissions, b: Emissions): Emissions {
  return { co2: a.co2 + b.co2, ch4: a.ch4 + b.ch4, n2o: a.n2o + b.n2o, cfc: a.cfc + b.cfc };
}

function realWorld(emissions: Partial<Emissions>) {
  const presentDay = { ...NO_EMISSIONS, ...emissions };
  return { presentDay, perLevel: scale(presentDay, 1 / GAMEPLAY.presentDayLevel.value) };
}

export const FACTORS: readonly FactorDefinition[] = [
  {
    id: 'coal',
    name: 'Coal power',
    description:
      'Burning coal for electricity and industry releases CO2. Coal mines also leak methane.',
    ...realWorld({ co2: FOSSIL_CO2 * FOSSIL_SHARE.coal, ch4: SCIENCE.coalMiningMethane.value }),
    requires: [],
  },
  {
    id: 'deforestation',
    name: 'Deforestation',
    description:
      'Clearing forests for farms and towns releases the carbon stored in trees and soil as CO2.',
    // Real data covers all land use change, of which clearing forests is the main part.
    ...realWorld({ co2: SCIENCE.landUseCo2Emissions.value * SCIENCE.co2PerCarbon.value }),
    requires: [],
  },
  {
    id: 'livestock',
    name: 'Livestock',
    description:
      'Cows and other farm animals release methane as they digest food, and their manure releases more.',
    ...realWorld({ ch4: SCIENCE.livestockMethane.value }),
    requires: [],
  },
  {
    id: 'rice',
    name: 'Rice farming',
    description:
      'Flooded rice fields have little oxygen in the soil, so microbes there produce methane.',
    ...realWorld({ ch4: SCIENCE.riceMethane.value }),
    requires: [{ type: 'factorLevel', factor: 'livestock', level: 2 }],
  },
  {
    id: 'cement',
    name: 'Cement',
    description:
      'Making cement means heating limestone, which gives off CO2 even before any fuel is burned.',
    ...realWorld({ co2: FOSSIL_CO2 * FOSSIL_SHARE.cement }),
    requires: [{ type: 'factorLevel', factor: 'coal', level: 2 }],
  },
  {
    id: 'oil',
    name: 'Oil and transport',
    description: 'Gasoline and diesel burned by cars, trucks, ships and planes release CO2.',
    ...realWorld({ co2: FOSSIL_CO2 * FOSSIL_SHARE.oil }),
    requires: [{ type: 'factorLevel', factor: 'coal', level: 3 }],
  },
  {
    id: 'naturalGas',
    name: 'Natural gas',
    description:
      'Burning natural gas releases CO2, and gas wells and pipelines leak methane, a powerful greenhouse gas.',
    // Simplification: all oil and gas methane leaks are counted here.
    ...realWorld({
      co2: FOSSIL_CO2 * FOSSIL_SHARE.naturalGas,
      ch4: SCIENCE.oilAndGasMethane.value,
    }),
    requires: [{ type: 'factorLevel', factor: 'oil', level: 2 }],
  },
  {
    id: 'landfills',
    name: 'Landfills',
    description: 'Food and paper rotting in landfills without oxygen produce methane.',
    ...realWorld({ ch4: SCIENCE.wasteMethane.value }),
    requires: [{ type: 'factorLevel', factor: 'oil', level: 2 }],
  },
  {
    id: 'fertilizer',
    name: 'Fertilizer',
    description:
      'Nitrogen fertilizer and manure on fields feed soil microbes that release nitrous oxide.',
    ...realWorld({ n2o: SCIENCE.agricultureNitrousOxide.value }),
    requires: [
      { type: 'factorLevel', factor: 'rice', level: 2 },
      { type: 'warming', atLeast: 0.3 },
    ],
  },
  {
    id: 'refrigerants',
    name: 'CFC refrigerants',
    description:
      'CFCs were once used in almost all fridges and air conditioners. They destroy the ozone layer and also trap heat as greenhouse gases.',
    presentDay: null,
    perLevel: { ...NO_EMISSIONS, cfc: GAMEPLAY.cfcPerLevel.value },
    requires: [{ type: 'factorLevel', factor: 'coal', level: 2 }],
  },
];

export const FACTOR_IDS: readonly FactorId[] = FACTORS.map((f) => f.id);

const BY_ID = new Map<string, FactorDefinition>(FACTORS.map((f) => [f.id, f]));

/** Looks up a factor definition; undefined if `id` is not a known factor. */
export function findFactor(id: string): FactorDefinition | undefined {
  return BY_ID.get(id);
}

export function isFactorId(id: string): id is FactorId {
  return BY_ID.has(id);
}

/** Level and unlock status of one factor. */
export interface FactorState {
  readonly level: number;
  readonly unlocked: boolean;
}

export type FactorStates = Readonly<Record<FactorId, FactorState>>;

export function initialFactorStates(): FactorStates {
  const entries = FACTORS.map((f) => [f.id, { level: 0, unlocked: f.requires.length === 0 }]);
  return Object.fromEntries(entries) as FactorStates;
}

/** Emissions one level of a factor adds. */
export function emissionsPerLevel(factor: FactorDefinition): Emissions {
  return factor.perLevel;
}

/** Emissions of a factor at a given level. */
export function factorEmissions(factor: FactorDefinition, level: number): Emissions {
  return scale(emissionsPerLevel(factor), level);
}

/** Total yearly human emissions from all factors. */
export function totalEmissions(states: FactorStates): Emissions {
  return FACTORS.reduce(
    (sum, factor) => add(sum, factorEmissions(factor, states[factor.id].level)),
    NO_EMISSIONS,
  );
}

export function isRequirementMet(
  requirement: UnlockRequirement,
  states: FactorStates,
  surfaceWarming: number,
): boolean {
  switch (requirement.type) {
    case 'factorLevel':
      return states[requirement.factor].level >= requirement.level;
    case 'warming':
      return surfaceWarming >= requirement.atLeast;
  }
}

/** Plain text description of a requirement, for players. */
export function describeRequirement(requirement: UnlockRequirement): string {
  switch (requirement.type) {
    case 'factorLevel': {
      const name = findFactor(requirement.factor)?.name ?? requirement.factor;
      return `${name} at level ${requirement.level}`;
    }
    case 'warming':
      return `Global warming of at least ${requirement.atLeast} degrees C`;
  }
}

/** Factors that are still locked but whose requirements are now all met. */
export function newlyUnlockable(states: FactorStates, surfaceWarming: number): FactorId[] {
  return FACTORS.filter(
    (f) =>
      !states[f.id].unlocked &&
      f.requires.every((r) => isRequirementMet(r, states, surfaceWarming)),
  ).map((f) => f.id);
}
