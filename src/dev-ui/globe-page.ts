// Temporary globe page: shows the game on a 3D globe so it can be played and tested.
// The final UI (built by the UI developer) replaces this page.
import Globe from 'globe.gl';
import type { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countriesUrl from 'world-atlas/countries-110m.json?url';
import { createGame, type GameEvent, type GameView } from '../core';
import { SPEEDS, createFactorList, describeEvent, element, fmt, startClock } from './shared';
import './globe-page.css';

type CountryTopology = Topology<{ countries: GeometryCollection<{ name: string }> }>;

/** Display choice only: colour of the land for a given global warming in degrees C. */
const COLOR_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0, [46, 125, 91]],
  [1.5, [224, 195, 65]],
  [3, [224, 123, 57]],
  [4, [192, 57, 43]],
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

/** Country names without accents, so all text uses normal keyboard characters. */
function plainName(name: string): string {
  // NFD splits letters like "o with a hat" into "o" plus an accent mark; \p{M} removes the marks.
  return name.normalize('NFD').replace(/\p{M}/gu, '');
}

const game = createGame();
let playing = false;
let selectedCountry: string | null = null;
let hovered: object | null = null;
let shownColor = '';

// ------------------------------------------------------------------- globe
const globe = new Globe(element('#globe'))
  .backgroundColor('#000010')
  .showAtmosphere(true)
  .atmosphereAltitude(0.15)
  .polygonSideColor(() => 'rgba(0, 0, 0, 0.3)')
  .polygonStrokeColor(() => '#10233b')
  .polygonAltitude(0.01)
  .polygonsTransitionDuration(0)
  .polygonLabel((d) => plainName((d as { properties: { name: string } }).properties.name))
  .onPolygonHover((d) => {
    hovered = d;
    globe.polygonAltitude((p) => (p === hovered ? 0.03 : 0.01));
  })
  .onPolygonClick((d) => {
    selectedCountry = plainName((d as { properties: { name: string } }).properties.name);
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

// ------------------------------------------------------------------- panels
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
element('#reset').addEventListener('click', () => {
  const result = game.dispatch({ type: 'reset' });
  if (result.ok) addNews(result.events);
});

const updateFactors = createFactorList(element('#factors'), game, addNews);

function renderCountry(view: GameView): void {
  const panel = element('#country');
  panel.hidden = selectedCountry === null;
  if (selectedCountry === null) return;
  element('#country-name').textContent = selectedCountry;
  element('#country-text').textContent =
    `Global warming so far: +${fmt(view.surfaceWarming)} degrees C. ` +
    'For now every country shows the global average. How this country is affected ' +
    'is added in the next update.';
}

function render(view: GameView): void {
  element('#status').textContent =
    `Year ${fmt(view.elapsedYears, 0)} | Global warming +${fmt(view.surfaceWarming)} degrees C | ` +
    `CO2 ${fmt(view.concentrations.co2, 0)} parts per million`;
  updateFactors(view);
  renderCountry(view);

  // Only recolour when the colour visibly changes (recolouring every month is wasteful).
  const color = warmingColor(Math.round(view.surfaceWarming * 20) / 20);
  if (color !== shownColor) {
    shownColor = color;
    globe.polygonCapColor(() => color);
  }
}

game.subscribe(render);
render(game.getView());
startClock(game, () => (playing ? Number(speedSelect.value) : 0), addNews);
