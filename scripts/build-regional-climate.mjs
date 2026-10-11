// Builds src/core/regional-climate.generated.ts from IPCC AR6 Atlas data (CC BY 4.0).
// Raw downloads are cached in data/ipcc-atlas (git ignored). Run: npm run build:regions
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const RAW = 'https://raw.githubusercontent.com/IPCC-WG1/Atlas/main';
const API =
  'https://api.github.com/repos/IPCC-WG1/Atlas/contents/datasets-aggregated-regionally/data/CMIP6';
const CACHE = 'data/ipcc-atlas';
const OUTPUT = 'src/core/regional-climate.generated.ts';
const BASELINE_FIRST = 1850;
const BASELINE_LAST = 1900;
const MIN_COUNTRY_WEIGHT = 0.05;
const HEADERS = { 'User-Agent': 'ozone-inc-build-script' };

async function cachedText(url, file) {
  if (existsSync(file)) return readFile(file, 'utf8');
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const text = await response.text();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return text;
}

async function listModelFiles(variable) {
  const listing = JSON.parse(
    await cachedText(`${API}/CMIP6_${variable}_landsea`, `${CACHE}/${variable}-listing.json`),
  );
  const files = new Map();
  for (const entry of listing) {
    const match = /^CMIP6_(.+)_(historical|ssp585)_(r\d+i\d+p\d+f\d+)\.csv$/.exec(entry.name);
    if (match) files.set(`${match[1]}_${match[3]} ${match[2]}`, entry.name);
  }
  return files;
}

function annualMeans(text) {
  const lines = text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  const header = lines[0].split(',').map((cell) => cell.replaceAll('"', ''));
  const totals = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((cell) => cell.replaceAll('"', ''));
    const year = Number(cells[0].slice(0, 4));
    if (!totals.has(year))
      totals.set(
        year,
        header.map(() => ({ sum: 0, count: 0 })),
      );
    const row = totals.get(year);
    for (let i = 1; i < header.length; i++) {
      const value = Number(cells[i]);
      if (cells[i] !== '' && Number.isFinite(value)) {
        row[i].sum += value;
        row[i].count += 1;
      }
    }
  }
  const series = new Map(header.slice(1).map((name) => [name, new Map()]));
  for (const [year, row] of totals) {
    header.forEach((name, i) => {
      if (i > 0 && row[i].count === 12) series.get(name).set(year, row[i].sum / 12);
    });
  }
  return series;
}

function merge(a, b) {
  const merged = new Map();
  for (const [name, years] of a) merged.set(name, new Map([...years, ...(b.get(name) ?? [])]));
  return merged;
}

function baselineMean(years) {
  let sum = 0;
  let count = 0;
  for (const [year, value] of years) {
    if (year >= BASELINE_FIRST && year <= BASELINE_LAST) {
      sum += value;
      count += 1;
    }
  }
  return count > 0 ? sum / count : NaN;
}

function slopeThroughOrigin(global, local) {
  let numerator = 0;
  let denominator = 0;
  for (const [year, g] of global) {
    const l = local.get(year);
    if (l === undefined) continue;
    numerator += g * l;
    denominator += g * g;
  }
  return denominator > 0 ? numerator / denominator : NaN;
}

function anomalies(years, relative) {
  const base = baselineMean(years);
  const out = new Map();
  for (const [year, value] of years) {
    out.set(year, relative ? (100 * (value - base)) / base : value - base);
  }
  return out;
}

function percentile(sorted, p) {
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function summarize(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    median: percentile(sorted, 0.5),
    low: percentile(sorted, 0.25),
    high: percentile(sorted, 0.75),
    positiveFraction: sorted.filter((v) => v > 0).length / sorted.length,
  };
}

function rewind(f) {
  if (geoArea(f) <= 2 * Math.PI) return f;
  const flip = (rings) => rings.map((ring) => [...ring].reverse());
  const coordinates =
    f.geometry.type === 'Polygon' ? flip(f.geometry.coordinates) : f.geometry.coordinates.map(flip);
  return { ...f, geometry: { ...f.geometry, coordinates } };
}

function lonSpan([[west], [east]]) {
  return east >= west ? east - west : east + 360 - west;
}

function inBounds(bounds, [lon, lat]) {
  const [[west, south], [, north]] = bounds;
  if (lat < south || lat > north) return false;
  const offset = (((lon - west) % 360) + 360) % 360;
  return offset <= lonSpan(bounds);
}

function* samplePoints(f) {
  const bounds = geoBounds(f);
  const [[west, south], [, north]] = bounds;
  const span = lonSpan(bounds);
  const step = Math.min(1, Math.max(0.1, Math.sqrt((span * (north - south)) / 400)));
  for (let lat = south + step / 2; lat < north; lat += step) {
    for (let x = west + step / 2; x < west + span; x += step) {
      yield [x > 180 ? x - 360 : x, lat];
    }
  }
}

function plainName(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '');
}

function readableRegionName(name) {
  return name
    .replace(
      /\b([NSEWC])\./g,
      (_, letter) => ({ N: 'North ', S: 'South ', E: 'East ', W: 'West ', C: 'Central ' })[letter],
    )
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const geojson = JSON.parse(
    await cachedText(
      `${RAW}/reference-regions/IPCC-WGI-reference-regions-v4.geojson`,
      `${CACHE}/reference-regions-v4.geojson`,
    ),
  );
  const landRegions = geojson.features
    .filter((f) => f.properties.Type !== 'Ocean')
    .map(rewind)
    .map((f) => ({
      id: f.properties.Acronym,
      name: readableRegionName(f.properties.Name),
      shape: f,
      bounds: geoBounds(f),
    }));

  const [tasFiles, prFiles] = await Promise.all([listModelFiles('tas'), listModelFiles('pr')]);
  const models = [...new Set([...tasFiles.keys()].map((key) => key.split(' ')[0]))].filter(
    (model) =>
      ['tas', 'pr'].every((v) =>
        ['historical', 'ssp585'].every((e) =>
          (v === 'tas' ? tasFiles : prFiles).has(`${model} ${e}`),
        ),
      ),
  );
  console.log(`Using ${models.length} climate models`);

  const load = async (variable, model) => {
    const files = variable === 'tas' ? tasFiles : prFiles;
    const read = (experiment) => {
      const name = files.get(`${model} ${experiment}`);
      const folder = `datasets-aggregated-regionally/data/CMIP6/CMIP6_${variable}_landsea`;
      return cachedText(`${RAW}/${folder}/${name}`, `${CACHE}/${variable}/${name}`).then(
        annualMeans,
      );
    };
    return merge(await read('historical'), await read('ssp585'));
  };

  const warmingSlopes = new Map(landRegions.map((r) => [r.id, []]));
  const rainfallSlopes = new Map(landRegions.map((r) => [r.id, []]));
  for (const model of models) {
    const [tas, pr] = await Promise.all([load('tas', model), load('pr', model)]);
    const globalWarming = anomalies(tas.get('world'), false);
    for (const region of landRegions) {
      if (!tas.has(region.id) || !pr.has(region.id)) continue;
      warmingSlopes
        .get(region.id)
        .push(slopeThroughOrigin(globalWarming, anomalies(tas.get(region.id), false)));
      rainfallSlopes
        .get(region.id)
        .push(slopeThroughOrigin(globalWarming, anomalies(pr.get(region.id), true)));
    }
    process.stdout.write('.');
  }
  console.log('');

  const round = (value, digits) => Number(value.toFixed(digits));
  const regions = landRegions.map((r) => {
    const warming = summarize(warmingSlopes.get(r.id));
    const rainfall = summarize(rainfallSlopes.get(r.id));
    return {
      id: r.id,
      name: r.name,
      warmingPerDegree: [round(warming.median, 3), round(warming.low, 3), round(warming.high, 3)],
      rainfallPercentPerDegree: [
        round(rainfall.median, 2),
        round(rainfall.low, 2),
        round(rainfall.high, 2),
      ],
      modelsWetter: round(rainfall.positiveFraction, 2),
    };
  });

  const topology = JSON.parse(
    await readFile('node_modules/world-atlas/countries-110m.json', 'utf8'),
  );
  const countries = feature(topology, topology.objects.countries).features.map(rewind);
  const countryRegions = {};
  const unmatched = [];
  for (const country of countries) {
    const weights = new Map();
    const add = (point, weight) => {
      const region = landRegions.find(
        (r) => inBounds(r.bounds, point) && geoContains(r.shape, point),
      );
      if (region) weights.set(region.id, (weights.get(region.id) ?? 0) + weight);
    };
    for (const point of samplePoints(country)) {
      if (geoContains(country, point)) add(point, Math.cos((point[1] * Math.PI) / 180));
    }
    if (weights.size === 0) add(geoCentroid(country), 1);
    const name = plainName(country.properties.name);
    const total = [...weights.values()].reduce((a, b) => a + b, 0);
    const kept = [...weights].filter(([, w]) => w / total >= MIN_COUNTRY_WEIGHT);
    const keptTotal = kept.reduce((sum, [, w]) => sum + w, 0);
    if (kept.length === 0) {
      unmatched.push(name);
      continue;
    }
    countryRegions[name] = kept
      .sort((a, b) => b[1] - a[1])
      .map(([id, w]) => [id, round(w / keptTotal, 2)]);
  }
  if (unmatched.length > 0) console.log(`No land region found for: ${unmatched.join(', ')}`);

  const output = [
    '// Generated by scripts/build-regional-climate.mjs from IPCC AR6 Atlas data. Do not edit by hand.',
    `export const REGIONAL_CLIMATE_MODELS: readonly string[] = ${JSON.stringify(models)};`,
    '',
    'export const REGION_DATA = ' + JSON.stringify(regions, null, 2) + ' as const;',
    '',
    'export const COUNTRY_REGIONS: Readonly<Record<string, readonly (readonly [string, number])[]>> = ' +
      JSON.stringify(countryRegions, null, 2) +
      ';',
    '',
  ].join('\n');
  const nonKeyboard = [...output].filter((ch) => ch.charCodeAt(0) > 126);
  if (nonKeyboard.length > 0) throw new Error(`Output has non keyboard characters: ${nonKeyboard}`);
  await writeFile(OUTPUT, output);
  console.log(
    `Wrote ${OUTPUT}: ${regions.length} regions, ${Object.keys(countryRegions).length} countries`,
  );
}

await main();
