// Upgrade preview: runs the climate forward with and without one more level of a factor, so the
// player sees the expected chain of effects (emissions, gas levels, trapped energy, warming).
import { upgradeCost } from './economy';
import {
  emissionsPerLevel,
  findFactor,
  totalEmissions,
  type FactorId,
  type FactorStates,
} from './factors';
import { GAMEPLAY } from './gameplay';
import {
  concentrations,
  effectiveRadiativeForcing,
  stepClimate,
  stepGasCycle,
  type Emissions,
  type GasConcentrations,
} from './science';
import type { GameState } from './state';

export interface UpgradePreview {
  readonly factor: FactorId;
  readonly cost: number;
  readonly affordable: boolean;
  readonly years: number;
  readonly extraEmissionsPerYear: Emissions;
  readonly concentrationChange: GasConcentrations;
  readonly forcingChange: number;
  readonly warmingChange: number;
}

function project(state: GameState, factors: FactorStates, years: number) {
  const emissions = totalEmissions(factors);
  let gases = state.gases;
  let climate = state.climate;
  for (let year = 0; year < years; year++) {
    gases = stepGasCycle(gases, emissions, 1);
    climate = stepClimate(climate, effectiveRadiativeForcing(concentrations(gases)).total, 1);
  }
  const c = concentrations(gases);
  return { c, forcing: effectiveRadiativeForcing(c).total, warming: climate.surfaceWarming };
}

export function previewUpgrade(state: GameState, factor: FactorId): UpgradePreview | null {
  const definition = findFactor(factor);
  if (!definition) return null;
  const current = state.factors[factor];
  if (!current.unlocked || current.level >= GAMEPLAY.maxFactorLevel.value) return null;

  const years = GAMEPLAY.previewYears.value;
  const upgraded: FactorStates = {
    ...state.factors,
    [factor]: { ...current, level: current.level + 1 },
  };
  const without = project(state, state.factors, years);
  const withUpgrade = project(state, upgraded, years);
  const cost = upgradeCost(factor, current.level);

  return {
    factor,
    cost,
    affordable: cost <= state.dollars,
    years,
    extraEmissionsPerYear: emissionsPerLevel(definition),
    concentrationChange: {
      co2: withUpgrade.c.co2 - without.c.co2,
      ch4: withUpgrade.c.ch4 - without.c.ch4,
      n2o: withUpgrade.c.n2o - without.c.n2o,
    },
    forcingChange: withUpgrade.forcing - without.forcing,
    warmingChange: withUpgrade.warming - without.warming,
  };
}
