/**
 * Every scientific value the engine uses, with its source.
 *
 * Rule: a value only goes in this file after it has been checked in the cited source.
 * Gameplay values never go in this file.
 *
 * `unit` and `description` may be shown to players, so they are written in plain words.
 */
import type { Sourced } from './sourced';

const NASA_EARTH_FACT_SHEET =
  'NASA Earth Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html';
const AR6_CH5 =
  'IPCC AR6 WG1 Chapter 5 (Canadell et al., 2021), https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-5/';
const AR6_CH7 =
  'IPCC AR6 WG1 Chapter 7 (Forster et al., 2021), https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/';
const AR6_CH7_TWO_LAYER =
  'IPCC AR6 WG1 Chapter 7 code and data, CMIP6 multi-model mean two-layer parameters (EBM-1 variant), ' +
  'https://github.com/IPCC-WG1/Chapter-7/blob/main/data_input/tunings/cmip6_twolayer_tuning_params.json ' +
  '(described in AR6 Ch. 7 Figure 7.7 caption and Supplementary Material 7.SM.2)';
const GLOBAL_CARBON_BUDGET_2023 =
  'Friedlingstein et al. (2023), Global Carbon Budget 2023, Earth Syst. Sci. Data 15, 5301, ' +
  'https://essd.copernicus.org/articles/15/5301/2023/';
const GLOBAL_METHANE_BUDGET_2020 =
  'Saunois et al. (2020), The Global Methane Budget 2000-2017, Earth Syst. Sci. Data 12, 1561, ' +
  'bottom up estimates for 2008-2017, https://essd.copernicus.org/articles/12/1561/2020/';

const WATTS_PER_SQUARE_METER_PER_DEGREE = 'watts per square meter per degree C';

export const SCIENCE = {
  // ---------------------------------------------------------------- radiation
  stefanBoltzmann: {
    value: 5.670374419e-8,
    unit: 'watts per square meter per kelvin to the fourth power',
    description:
      'Stefan Boltzmann constant: how much infrared power an object gives off per square meter at a given temperature (exact by definition).',
    source: 'NIST CODATA 2022, https://physics.nist.gov/cgi-bin/cuu/Value?sigma',
    kind: 'measured',
  },
  solarIrradiance: {
    value: 1361.0,
    unit: 'watts per square meter',
    description:
      'Sunlight power arriving at Earth, on a surface facing the Sun, above the atmosphere.',
    source: `${NASA_EARTH_FACT_SHEET} ("Solar irradiance")`,
    kind: 'measured',
  },
  bondAlbedo: {
    value: 0.294,
    unit: 'fraction',
    description: 'Fraction of incoming sunlight that Earth reflects back to space.',
    source: `${NASA_EARTH_FACT_SHEET} ("Bond albedo")`,
    kind: 'measured',
  },
  averageSurfaceTemperature: {
    value: 288,
    unit: 'kelvin',
    description: "Earth's average surface temperature (15 degrees C).",
    source: `${NASA_EARTH_FACT_SHEET} ("Average temperature")`,
    kind: 'measured',
  },

  // --------------------------------------------------- pre industrial (1750)
  co2Preindustrial: {
    value: 278.3,
    unit: 'parts per million',
    description: 'CO2 concentration in 1750, before industry.',
    source: `${AR6_CH7}, Table 7.5`,
    kind: 'measured',
  },
  ch4Preindustrial: {
    value: 729.2,
    unit: 'parts per billion',
    description: 'Methane concentration in 1750.',
    source: `${AR6_CH7}, Table 7.5`,
    kind: 'measured',
  },
  n2oPreindustrial: {
    value: 270.1,
    unit: 'parts per billion',
    description: 'Nitrous oxide concentration in 1750.',
    source: `${AR6_CH7}, Table 7.5`,
    kind: 'measured',
  },

  // ---------------------------------------------------------------- forcing
  greenhouseForcingCoefficients: {
    value: {
      a1: -2.4785e-7,
      b1: 7.5906e-4,
      c1: -2.1492e-3,
      d1: 5.2488,
      a2: -3.4197e-4,
      b2: 2.5455e-4,
      c2: -2.4357e-4,
      d2: 0.12173,
      a3: -8.9603e-5,
      b3: -1.2462e-4,
      d3: 0.045194,
    },
    unit: 'fitted coefficients (see forcing.ts)',
    description:
      'Numbers from a published formula that turns CO2, methane and nitrous oxide levels into the extra energy they trap.',
    source:
      'Meinshausen et al. (2020), Geosci. Model Dev. 13, 3571, Table 3; used by IPCC AR6 WG1 Table 7.SM.1. ' +
      'Transcribed from FaIR v1.6.4 (https://github.com/OMS-NetZero/FAIR/blob/v1.6.4/fair/forcing/ghg.py) and ' +
      'validated by reproducing the AR6 Table 7.5 forcing values for 2019 (see forcing.test.ts).',
    kind: 'model-parameter',
  },
  co2ForcingAdjustment: {
    value: 0.05,
    unit: 'fraction',
    description: 'Fast changes in the atmosphere add about 5% to the energy trapped by CO2.',
    source: `${AR6_CH7}, Section 7.3.2.1`,
    kind: 'assessed',
  },
  ch4ForcingAdjustment: {
    value: -0.14,
    unit: 'fraction',
    description:
      'Fast changes in the atmosphere reduce the energy trapped by methane by about 14% (low confidence).',
    source: `${AR6_CH7}, Section 7.3.2.2`,
    kind: 'assessed',
  },
  n2oForcingAdjustment: {
    value: 0.07,
    unit: 'fraction',
    description:
      'Fast changes in the atmosphere add about 7% to the energy trapped by nitrous oxide (low confidence).',
    source: `${AR6_CH7}, Section 7.3.2.3`,
    kind: 'assessed',
  },
  co2DoublingForcing: {
    value: 3.93,
    unit: 'watts per square meter',
    description: 'Extra energy trapped if CO2 doubles from its 1750 level (give or take 0.47).',
    source: `${AR6_CH7}, Section 7.3.2.1`,
    kind: 'assessed',
  },

  // --------------------------------------------------------------- feedbacks
  // Feedback parameters: extra energy flow (W m^-2) per degree of warming.
  // Negative = pushes temperature back down (stabilising); positive = amplifies warming.
  planckFeedback: {
    value: -3.22,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'A warmer Earth gives off more infrared to space (the basic cooling response).',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  waterVapourLapseRateFeedback: {
    value: 1.3,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'Warmer air holds more water vapour, a greenhouse gas, which traps more infrared.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  surfaceAlbedoFeedback: {
    value: 0.35,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'Melting snow and ice uncover darker ground and water that absorb more sunlight.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  cloudFeedback: {
    value: 0.42,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'Clouds change as the planet warms, which on balance adds to the warming.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  biogeophysicalFeedback: {
    value: -0.01,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'Small effects from plants, soils and other chemistry.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  netFeedback: {
    value: -1.16,
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'All of the feedbacks above added together.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  equilibriumClimateSensitivity: {
    value: 3.0,
    unit: 'degrees C',
    description:
      'Best estimate of the long term warming from doubling CO2 (likely 2.5 to 4 degrees C).',
    source: `${AR6_CH7}, Executive Summary / Section 7.5`,
    kind: 'assessed',
  },
  transientClimateResponse: {
    value: 1.8,
    unit: 'degrees C',
    description:
      'Best estimate of the warming at the moment CO2 has doubled, if it rises 1% per year (likely 1.4 to 2.2 degrees C).',
    source: `${AR6_CH7}, Executive Summary / Section 7.5.5`,
    kind: 'assessed',
  },

  // ------------------------------------------------------ two layer ocean model
  upperLayerHeatCapacity: {
    value: 7.308,
    unit: 'watt years per square meter per degree C',
    description:
      'How much energy it takes to warm the surface and upper ocean by 1 degree C (it responds fast).',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },
  deepOceanHeatCapacity: {
    value: 110.4,
    unit: 'watt years per square meter per degree C',
    description:
      'How much energy it takes to warm the deep ocean by 1 degree C (about 15 times more, so it warms slowly).',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },
  oceanHeatExchange: {
    value: 0.679,
    // The source file lists this unit as "W yr m-2 K-1", but the parameter multiplies a
    // temperature difference to give a flux, so its unit is W m^-2 K^-1.
    unit: WATTS_PER_SQUARE_METER_PER_DEGREE,
    description: 'How fast heat moves from the upper ocean into the deep ocean.',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },

  // ---------------------------------------------------------------- gas cycle
  gigatonnesCarbonPerPpm: {
    value: 2.124,
    unit: 'billion tonnes of carbon per part per million',
    description: 'How much carbon must be added to the air to raise CO2 by 1 part per million.',
    source: `${GLOBAL_CARBON_BUDGET_2023}, Section 1 and Table 1 (citing Ballantyne et al., 2012)`,
    kind: 'measured',
  },
  co2PerCarbon: {
    value: 3.664,
    unit: 'tonnes of CO2 per tonne of carbon',
    description: 'Converts a mass of carbon into the mass of CO2 that contains it.',
    source: `${GLOBAL_CARBON_BUDGET_2023}, Section 1`,
    kind: 'measured',
  },
  methaneTgPerPpb: {
    value: 2.75,
    unit: 'million tonnes of methane per part per billion',
    description: 'How much methane must be added to the air to raise it by 1 part per billion.',
    source: `${AR6_CH5}, Figure 5.14 caption (citing Chandra et al., 2021)`,
    kind: 'measured',
  },
  nitrousOxideTgNPerPpb: {
    value: 4.79,
    unit: 'million tonnes of nitrogen per part per billion',
    description:
      'How much nitrogen (as nitrous oxide) must be added to the air to raise nitrous oxide by 1 part per billion.',
    source: `${AR6_CH5}, Figure 5.17 caption (citing Prather et al., 2012)`,
    kind: 'measured',
  },
  methanePerturbationLifetime: {
    value: 11.8,
    unit: 'years',
    description:
      'Time for extra methane to shrink to about 37% of its size (give or take 1.8 years).',
    source: `${AR6_CH7}, Section 7.6 and Table 7.15`,
    kind: 'assessed',
  },
  nitrousOxidePerturbationLifetime: {
    value: 109,
    unit: 'years',
    description:
      'Time for extra nitrous oxide to shrink to about 37% of its size (give or take 10 years).',
    source: `${AR6_CH7}, Section 7.6 and Table 7.15`,
    kind: 'assessed',
  },
  co2ImpulseResponse: {
    // CO2 is not removed with one lifetime. A pulse of CO2 is split into four parts that
    // are removed on different timescales; one part effectively stays for millennia.
    value: {
      permanent: { fraction: 0.2173, lifetime: Infinity },
      slow: { fraction: 0.224, lifetime: 394.4 },
      medium: { fraction: 0.2824, lifetime: 36.54 },
      fast: { fraction: 0.2763, lifetime: 4.304 },
    },
    unit: 'fraction and years',
    description:
      'Emitted CO2 is taken up by oceans and land in four parts, each at a different speed. About a fifth stays in the air for thousands of years.',
    source:
      'Joos et al. (2013), Atmos. Chem. Phys. 13, 2793-2825, Table 5 (multi-model mean, 100 GtC pulse), ' +
      'https://acp.copernicus.org/articles/13/2793/2013/',
    kind: 'model-parameter',
  },

  // ------------------------------------------------ present day emissions by sector
  fossilCo2Emissions: {
    value: 36.4,
    unit: 'billion tonnes of CO2 per year',
    description: 'CO2 from burning fossil fuels and making cement worldwide in 2022.',
    source: `${GLOBAL_CARBON_BUDGET_2023}, Executive Summary`,
    kind: 'measured',
  },
  fossilCo2Shares: {
    value: { coal: 0.41, oil: 0.32, naturalGas: 0.21, cement: 0.04 },
    unit: 'fraction',
    description: 'Share of 2022 fossil CO2 from coal, oil, natural gas and cement.',
    source: `${GLOBAL_CARBON_BUDGET_2023}, Section 3.1.3 (flaring 1% and other sources not included)`,
    kind: 'measured',
  },
  landUseCo2Emissions: {
    value: 1.3,
    unit: 'billion tonnes of carbon per year',
    description:
      'Carbon released by cutting down forests and other land use change (2013 to 2022 average).',
    source: `${GLOBAL_CARBON_BUDGET_2023}, Executive Summary (give or take 0.7)`,
    kind: 'measured',
  },
  livestockMethane: {
    value: 111,
    unit: 'million tonnes of methane per year',
    description: 'Methane from cattle and other farm animals (digestion and manure).',
    source: `${GLOBAL_METHANE_BUDGET_2020}, enteric fermentation and manure (range 106 to 116)`,
    kind: 'measured',
  },
  riceMethane: {
    value: 30,
    unit: 'million tonnes of methane per year',
    description: 'Methane from flooded rice fields.',
    source: `${GLOBAL_METHANE_BUDGET_2020}, rice cultivation (range 25 to 38)`,
    kind: 'measured',
  },
  wasteMethane: {
    value: 65,
    unit: 'million tonnes of methane per year',
    description: 'Methane from landfills and waste.',
    source: `${GLOBAL_METHANE_BUDGET_2020}, Section 3.1.4 waste management (range 60 to 69)`,
    kind: 'measured',
  },
  coalMiningMethane: {
    value: 42,
    unit: 'million tonnes of methane per year',
    description: 'Methane released from coal mines.',
    source: `${GLOBAL_METHANE_BUDGET_2020}, coal mining (range 29 to 61)`,
    kind: 'measured',
  },
  oilAndGasMethane: {
    value: 80,
    unit: 'million tonnes of methane per year',
    description: 'Methane leaking from oil and gas wells, pipelines and equipment.',
    source: `${GLOBAL_METHANE_BUDGET_2020}, oil and gas (range 68 to 92)`,
    kind: 'measured',
  },
  agricultureNitrousOxide: {
    value: 3.8,
    unit: 'million tonnes of nitrogen per year',
    description: 'Nitrous oxide from farming, mostly nitrogen fertilizer and manure on fields.',
    source: `${AR6_CH5}, Table 5.3, agriculture 2007 to 2016 (range 2.5 to 5.8)`,
    kind: 'measured',
  },
} as const satisfies Record<string, Sourced<unknown>>;
