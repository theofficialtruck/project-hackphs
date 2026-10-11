// Temporary globe page: each country is coloured by its own warming and can be clicked for
// details. The final UI (built by the UI developer) replaces this page.
import Globe from 'globe.gl';
import type { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countriesUrl from 'world-atlas/countries-110m.json?url';
import {
  REGIONAL_PATTERNS,
  countryClimate,
  createGame,
  plainCountryName,
  type CountryClimate,
  type GameEvent,
  type GameView,
} from '../core';
import { SPEEDS, createFactorList, describeEvent, element, fmt, startClock } from './shared';
import './globe-page.css';

type CountryTopology = Topology<{ countries: GeometryCollection<{ name: string }> }>;
type CountryShape = { properties: { name: string } };

const COLOR_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0, [46, 125, 91]],
  [1.5, [224, 195, 65]],
  [3, [224, 123, 57]],
  [4.5, [192, 57, 43]],
  [6, [110, 20, 30]],
];

function warmingColor(warming: number): string {
  const t = Math.max(0, warming);
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [w0, c0] = COLOR_STOPS[i - 1]!;
    const [w1, c1] = COLOR_STOPS[i]!;
    if (t <= w1 || i === COLOR_STOPS.length - 1) {
      const k = Math.min(1, (t - w0) / (w1 - w0));
      const mix = c0.map((c, j) => Math.round(c + (c1[j]! - c) * k));
      return `rgb(${mix.join(', ')})`;
    }
  }
  return 'rgb(46, 125, 91)';
}

const nameOf = (d: object) => plainCountryName((d as CountryShape).properties.name);

const game = createGame();
let playing = false;
let selectedCountry: string | null = null;
let hovered: object | null = null;
let coloredAtWarming = NaN;

const globe = new Globe(element('#globe'))
  .backgroundColor('#000010')
  .showAtmosphere(true)
  .atmosphereAltitude(0.15)
  .polygonSideColor(() => 'rgba(0, 0, 0, 0.3)')
  .polygonStrokeColor(() => '#10233b')
  .polygonAltitude(0.01)
  .polygonsTransitionDuration(0)
  .polygonLabel(nameOf)
  .onPolygonHover((d) => {
    hovered = d;
    globe.polygonAltitude((p) => (p === hovered ? 0.03 : 0.01));
  })
  .onPolygonClick((d) => {
    selectedCountry = nameOf(d);
    renderCountry(game.getView());
  });
(globe.globeMaterial() as MeshPhongMaterial).color.set('#0b2545');
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.35;
window.addEventListener('resize', () => globe.width(innerWidth).height(innerHeight));

fetch(countriesUrl)
  .then((response) => response.json() as Promise<CountryTopology>)
  .then((topology) => {
    globe.polygonsData(feature(topology, topology.objects.countries).features);
  })
  .catch((error: unknown) => console.error('Could not load country shapes', error));

const playButton = element<HTMLButtonElement>('#play');
const speedSelect = element<HTMLSelectElement>('#speed');
speedSelect.innerHTML = SPEEDS.map(
  (s) => `<option value="${s}">${s} years per second</option>`,
).join('');
const newsBox = element<HTMLPreElement>('#news');
const news: string[] = [];

function addNews(events: readonly GameEvent[]): void {
  const view = game.getView();
  for (const event of events) {
    news.unshift(`Year ${fmt(view.elapsedYears, 0)}: ${describeEvent(event, view)}`);
  }
  newsBox.textContent = news.slice(0, 5).join('\n');
}

playButton.addEventListener('click', () => {
  playing = !playing;
  playButton.textContent = playing ? 'Pause' : 'Play';
});
element('#step').addEventListener('click', () => addNews(game.advance(1)));
function reset(): void {
  const result = game.dispatch({ type: 'reset' });
  if (result.ok) addNews(result.events);
}
element('#reset').addEventListener('click', reset);
element('#debrief-reset').addEventListener('click', reset);

const previewBox = element<HTMLPreElement>('#preview');
const updateFactors = createFactorList(element('#factors'), game, addNews, (text) => {
  previewBox.textContent = text;
});

function renderGoals(view: GameView): void {
  element('#milestones').innerHTML = view.milestones
    .map((m) => `<div class="${m.reached ? 'done' : ''}">+${m.warming} degrees C: ${m.title}</div>`)
    .join('');
  element('#objectives').innerHTML = view.objectives
    .map((o) => `<div class="${o.done ? 'done' : ''}">${o.text} (+${o.reward} dollars)</div>`)
    .join('');
}

function renderDebrief(view: GameView): void {
  const panel = element('#debrief');
  panel.hidden = view.debrief === null;
  if (!view.debrief) return;
  const d = view.debrief;
  element('#debrief-text').textContent = [
    `In this game it took ${fmt(d.yearsPlayed, 0)} years to reach +${fmt(d.finalWarming)} degrees C.`,
    `CO2 reached ${fmt(d.finalCo2, 0)} parts per million after ${fmt(d.totalCo2Emitted, 0)} billion tonnes of CO2 were released.`,
    '',
    'What science says about the real world:',
    ...d.realWorld.map((f) => `- ${f.text} (${f.source})`),
    '',
    'Where this game is simpler than reality:',
    ...d.gameSimplifications.map((s) => `- ${s}`),
  ].join('\n');
}

function describeRainfall(c: CountryClimate): string {
  const amount = `${fmt(Math.abs(c.rainfallChangePercent), 1)}%`;
  switch (c.rainfallTrend) {
    case 'wetter':
      return `${amount} more rain (most climate models agree)`;
    case 'drier':
      return `${amount} less rain (most climate models agree)`;
    case 'uncertain':
      return 'climate models disagree on whether it gets wetter or drier';
  }
}

function countryLines(view: GameView, name: string): string[] {
  const climate = countryClimate(name, view.regions);
  const global = `Global average: +${fmt(view.surfaceWarming)} degrees C`;
  if (!climate) {
    return ['No regional climate data for this place, so it shows the global average.', global];
  }
  const regions = climate.regions
    .map((r) => (climate.regions.length > 1 ? `${r.name} (${Math.round(r.share * 100)}%)` : r.name))
    .join(', ');
  return [
    `Warming here: +${fmt(climate.warming)} degrees C`,
    `Middle half of climate models: +${fmt(climate.warmingLow)} to +${fmt(climate.warmingHigh)}`,
    global,
    `Rainfall: ${describeRainfall(climate)}`,
    `Climate region: ${regions}`,
    `Source: IPCC AR6 Atlas, ${REGIONAL_PATTERNS.value} climate models`,
  ];
}

function renderCountry(view: GameView): void {
  const panel = element('#country');
  panel.hidden = selectedCountry === null;
  if (selectedCountry === null) return;
  element('#country-name').textContent = selectedCountry;
  element('#country-text').textContent = countryLines(view, selectedCountry).join('\n');
}

function recolor(view: GameView): void {
  const bucket = Math.round(view.surfaceWarming * 20) / 20;
  if (bucket === coloredAtWarming) return;
  coloredAtWarming = bucket;
  globe.polygonCapColor((d) => {
    const climate = countryClimate(nameOf(d), view.regions);
    return warmingColor(climate ? climate.warming : view.surfaceWarming);
  });
}

function render(view: GameView): void {
  element('#status').textContent =
    `Year ${fmt(view.elapsedYears, 0)} | Global warming +${fmt(view.surfaceWarming)} degrees C | ` +
    `CO2 ${fmt(view.concentrations.co2, 0)} parts per million`;
  element('#money').textContent =
    `${Math.floor(view.dollars)} dollars (earning ${Math.round(view.incomePerYear)} per year)`;
  updateFactors(view);
  renderCountry(view);
  renderGoals(view);
  renderDebrief(view);
  recolor(view);
}

game.subscribe(render);
render(game.getView());
startClock(game, () => (playing ? Number(speedSelect.value) : 0), addNews);
