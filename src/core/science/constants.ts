/**
 * Every scientific value the engine uses, with its source.
 *
 * Rule: a value only goes in this file after it has been checked in the cited source.
 * Gameplay values never go in this file.
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
  'Section 1 and Table 1, https://essd.copernicus.org/articles/15/5301/2023/';

export const SCIENCE = {
  // ---------------------------------------------------------------- radiation
  stefanBoltzmann: {
    value: 5.670374419e-8,
    unit: 'W m⁻² K⁻⁴',
    description:
      'Stefan–Boltzmann constant: how much infrared power an object radiates per square metre at a given temperature (exact by SI definition).',
    source: 'NIST CODATA 2022, https://physics.nist.gov/cgi-bin/cuu/Value?sigma',
    kind: 'measured',
  },
  solarIrradiance: {
    value: 1361.0,
    unit: 'W m⁻²',
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
    unit: 'K',
    description: "Earth's average surface temperature (15 °C).",
    source: `${NASA_EARTH_FACT_SHEET} ("Average temperature")`,
    kind: 'measured',
  },

  // --------------------------------------------------- pre-industrial (1750)
  co2Preindustrial: {
    value: 278.3,
    unit: 'ppm',
    description: 'CO2 concentration in 1750, before industrialisation.',
    source: `${AR6_CH7}, Table 7.5`,
    kind: 'measured',
  },
  ch4Preindustrial: {
    value: 729.2,
    unit: 'ppb',
    description: 'Methane concentration in 1750.',
    source: `${AR6_CH7}, Table 7.5`,
    kind: 'measured',
  },
  n2oPreindustrial: {
    value: 270.1,
    unit: 'ppb',
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
    unit: 'see forcing.ts',
    description:
      'Fitted coefficients that turn CO2, CH4 and N2O concentrations into radiative forcing (stratospheric-temperature-adjusted).',
    source:
      'Meinshausen et al. (2020), Geosci. Model Dev. 13, 3571, Table 3; used by IPCC AR6 WG1 Table 7.SM.1. ' +
      'Transcribed from FaIR v1.6.4 (https://github.com/OMS-NetZero/FAIR/blob/v1.6.4/fair/forcing/ghg.py) and ' +
      'validated by reproducing the AR6 Table 7.5 forcing values for 2019 (see forcing.test.ts).',
    kind: 'model-parameter',
  },
  co2ForcingAdjustment: {
    value: 0.05,
    unit: 'fraction',
    description:
      'Extra forcing from fast atmospheric adjustments to CO2 (+5%), converting radiative forcing to effective radiative forcing.',
    source: `${AR6_CH7}, Section 7.3.2.1`,
    kind: 'assessed',
  },
  ch4ForcingAdjustment: {
    value: -0.14,
    unit: 'fraction',
    description: 'Adjustment for methane (−14%, low confidence).',
    source: `${AR6_CH7}, Section 7.3.2.2`,
    kind: 'assessed',
  },
  n2oForcingAdjustment: {
    value: 0.07,
    unit: 'fraction',
    description: 'Adjustment for nitrous oxide (+7%, low confidence).',
    source: `${AR6_CH7}, Section 7.3.2.3`,
    kind: 'assessed',
  },
  co2DoublingForcing: {
    value: 3.93,
    unit: 'W m⁻²',
    description: 'Effective radiative forcing from doubling CO2 from its 1750 level (±0.47).',
    source: `${AR6_CH7}, Section 7.3.2.1`,
    kind: 'assessed',
  },

  // --------------------------------------------------------------- feedbacks
  // Feedback parameters: extra energy flow (W m^-2) per degree of warming.
  // Negative = pushes temperature back down (stabilising); positive = amplifies warming.
  planckFeedback: {
    value: -3.22,
    unit: 'W m⁻² K⁻¹',
    description: 'A warmer Earth radiates more infrared to space (the basic stabilising response).',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  waterVapourLapseRateFeedback: {
    value: 1.3,
    unit: 'W m⁻² K⁻¹',
    description: 'Warmer air holds more water vapour, a greenhouse gas, which traps more infrared.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  surfaceAlbedoFeedback: {
    value: 0.35,
    unit: 'W m⁻² K⁻¹',
    description: 'Melting snow and ice expose darker surfaces that absorb more sunlight.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  cloudFeedback: {
    value: 0.42,
    unit: 'W m⁻² K⁻¹',
    description: 'Changes in clouds with warming, which on balance amplify it.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  biogeophysicalFeedback: {
    value: -0.01,
    unit: 'W m⁻² K⁻¹',
    description: 'Biogeophysical and non CO2 biogeochemical feedbacks (small).',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  netFeedback: {
    value: -1.16,
    unit: 'W m⁻² K⁻¹',
    description: 'Sum of all the feedbacks above.',
    source: `${AR6_CH7}, Table 7.10`,
    kind: 'assessed',
  },
  equilibriumClimateSensitivity: {
    value: 3.0,
    unit: 'K',
    description:
      'Best estimate of long-term warming from doubling CO2 (likely 2.5–4 °C), combining all lines of evidence.',
    source: `${AR6_CH7}, Executive Summary / Section 7.5`,
    kind: 'assessed',
  },
  transientClimateResponse: {
    value: 1.8,
    unit: 'K',
    description:
      'Best estimate of warming at the moment CO2 doubles when rising 1% per year (likely 1.4–2.2 °C).',
    source: `${AR6_CH7}, Executive Summary / Section 7.5.5`,
    kind: 'assessed',
  },

  // ------------------------------------------------------ two-layer ocean model
  upperLayerHeatCapacity: {
    value: 7.308,
    unit: 'W yr m⁻² K⁻¹',
    description:
      'Heat capacity of the surface and upper ocean: energy needed to warm it by 1 °C (fast to respond).',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },
  deepOceanHeatCapacity: {
    value: 110.4,
    unit: 'W yr m⁻² K⁻¹',
    description: 'Heat capacity of the deep ocean (about 15× the upper layer, so it warms slowly).',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },
  oceanHeatExchange: {
    value: 0.679,
    // The source file lists this unit as "W yr m-2 K-1", but the parameter multiplies a
    // temperature difference to give a flux, so its unit is W m^-2 K^-1.
    unit: 'W m⁻² K⁻¹',
    description:
      'How fast heat moves from the upper ocean into the deep ocean per °C of difference.',
    source: AR6_CH7_TWO_LAYER,
    kind: 'model-parameter',
  },

  // ---------------------------------------------------------------- gas cycle
  gigatonnesCarbonPerPpm: {
    value: 2.124,
    unit: 'GtC ppm⁻¹',
    description: 'Mass of carbon in the atmosphere that raises CO2 by 1 ppm.',
    source: `${GLOBAL_CARBON_BUDGET_2023} (citing Ballantyne et al., 2012)`,
    kind: 'measured',
  },
  co2PerCarbon: {
    value: 3.664,
    unit: 'GtCO2 GtC⁻¹',
    description: 'Converts a mass of carbon to the mass of CO2 containing it.',
    source: GLOBAL_CARBON_BUDGET_2023,
    kind: 'measured',
  },
  methaneTgPerPpb: {
    value: 2.75,
    unit: 'Tg CH4 ppb⁻¹',
    description: 'Mass of methane in the atmosphere that raises its concentration by 1 ppb.',
    source: `${AR6_CH5}, Figure 5.14 caption (citing Chandra et al., 2021)`,
    kind: 'measured',
  },
  nitrousOxideTgNPerPpb: {
    value: 4.79,
    unit: 'Tg N ppb⁻¹',
    description: 'Mass of nitrogen (as N2O) in the atmosphere that raises N2O by 1 ppb.',
    source: `${AR6_CH5}, Figure 5.17 caption (citing Prather et al., 2012)`,
    kind: 'measured',
  },
  methanePerturbationLifetime: {
    value: 11.8,
    unit: 'yr',
    description: 'Time for extra methane to fall to about 37% (1/e) of its size (±1.8 years).',
    source: `${AR6_CH7}, Section 7.6 and Table 7.15`,
    kind: 'assessed',
  },
  nitrousOxidePerturbationLifetime: {
    value: 109,
    unit: 'yr',
    description: 'Time for extra nitrous oxide to fall to about 37% (1/e) of its size (±10 years).',
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
    unit: 'fraction, yr',
    description:
      'Fraction of an emitted CO₂ pulse in each part and how long each part takes to be absorbed by oceans and land. Fit valid for 0–1000 years.',
    source:
      'Joos et al. (2013), Atmos. Chem. Phys. 13, 2793–2825, Table 5 (multi-model mean, 100 GtC pulse), ' +
      'https://acp.copernicus.org/articles/13/2793/2013/',
    kind: 'model-parameter',
  },
} as const satisfies Record<string, Sourced<unknown>>;
