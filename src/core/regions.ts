// Climate change in each IPCC AR6 land region and each country, found by scaling global warming
// with regional patterns from the IPCC Atlas climate models (pattern scaling).
import { GAMEPLAY } from './gameplay';
import {
  COUNTRY_REGIONS,
  REGIONAL_CLIMATE_MODELS,
  REGION_DATA,
} from './regional-climate.generated';
import type { Sourced } from './science';

export const REGIONAL_PATTERNS = {
  value: REGIONAL_CLIMATE_MODELS.length,
  unit: 'climate models',
  description:
    'How much each region warms and how its rainfall changes for every degree of global warming, using the middle result of many climate models.',
  source:
    'IPCC WGI AR6 Atlas repository (Iturbide et al., 2022, Scientific Data), regionally aggregated CMIP6 data, ' +
    'historical and SSP5-8.5 experiments, CC BY 4.0, https://github.com/IPCC-WG1/Atlas. Reference regions: ' +
    'Iturbide et al. (2020), https://doi.org/10.5194/essd-12-2959-2020. Processed by ' +
    'scripts/build-regional-climate.mjs: 1850-1900 baseline, straight line fit against global warming.',
  kind: 'model-parameter',
} as const satisfies Sourced<number>;

export type RainfallTrend = 'wetter' | 'drier' | 'uncertain';

export interface RegionalChange {
  readonly warming: number;
  readonly warmingLow: number;
  readonly warmingHigh: number;
  readonly rainfallChangePercent: number;
  readonly rainfallLowPercent: number;
  readonly rainfallHighPercent: number;
  readonly modelsWetterShare: number;
  readonly rainfallTrend: RainfallTrend;
}

export interface RegionClimate extends RegionalChange {
  readonly id: string;
  readonly name: string;
}

export interface CountryClimate extends RegionalChange {
  readonly country: string;
  readonly regions: readonly {
    readonly id: string;
    readonly name: string;
    readonly share: number;
  }[];
}

export function plainCountryName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '');
}

function trend(modelsWetterShare: number): RainfallTrend {
  const agreement = GAMEPLAY.rainfallAgreement.value;
  if (modelsWetterShare >= agreement) return 'wetter';
  if (modelsWetterShare <= 1 - agreement) return 'drier';
  return 'uncertain';
}

export function regionClimates(globalWarming: number): RegionClimate[] {
  return REGION_DATA.map((r) => ({
    id: r.id,
    name: r.name,
    warming: r.warmingPerDegree[0] * globalWarming,
    warmingLow: r.warmingPerDegree[1] * globalWarming,
    warmingHigh: r.warmingPerDegree[2] * globalWarming,
    rainfallChangePercent: r.rainfallPercentPerDegree[0] * globalWarming,
    rainfallLowPercent: r.rainfallPercentPerDegree[1] * globalWarming,
    rainfallHighPercent: r.rainfallPercentPerDegree[2] * globalWarming,
    modelsWetterShare: r.modelsWetter,
    rainfallTrend: trend(r.modelsWetter),
  }));
}

export function countryNames(): string[] {
  return Object.keys(COUNTRY_REGIONS);
}

export function countryClimate(
  country: string,
  regions: readonly RegionClimate[],
): CountryClimate | undefined {
  const shares = COUNTRY_REGIONS[plainCountryName(country)];
  if (!shares) return undefined;
  const parts = shares.flatMap(([id, share]) => {
    const region = regions.find((r) => r.id === id);
    return region ? [{ region, share }] : [];
  });
  if (parts.length === 0) return undefined;
  const totalShare = parts.reduce((sum, { share }) => sum + share, 0);
  const weighted = (pick: (r: RegionClimate) => number) =>
    parts.reduce((sum, { region, share }) => sum + pick(region) * share, 0) / totalShare;
  const modelsWetterShare = weighted((r) => r.modelsWetterShare);
  return {
    country: plainCountryName(country),
    regions: parts.map(({ region, share }) => ({ id: region.id, name: region.name, share })),
    warming: weighted((r) => r.warming),
    warmingLow: weighted((r) => r.warmingLow),
    warmingHigh: weighted((r) => r.warmingHigh),
    rainfallChangePercent: weighted((r) => r.rainfallChangePercent),
    rainfallLowPercent: weighted((r) => r.rainfallLowPercent),
    rainfallHighPercent: weighted((r) => r.rainfallHighPercent),
    modelsWetterShare,
    rainfallTrend: trend(modelsWetterShare),
  };
}
