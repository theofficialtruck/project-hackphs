// Temporary numbers page. Only exists to check the engine; the real UI is built
// separately on top of the same engine interface.
import { ENGINE_VERSION, createGame, type GameEvent, type GameView } from '../core';
import {
  SPEEDS,
  createFactorList,
  describeEmissions,
  describeEvent,
  element,
  fmt,
  startClock,
} from './shared';

element('#app').innerHTML = `
  <h1>Ozone Inc. - numbers page</h1>
  <p>Engine version: <code>${ENGINE_VERSION}</code>. <a href="/">Back to the globe</a></p>
  <p>
    <button id="play">Play</button>
    <button id="step">Step 1 year</button>
    <label>Speed
      <select id="speed">${SPEEDS.map((s) => `<option value="${s}">${s} years per second</option>`).join('')}</select>
    </label>
    <button id="reset">Reset</button>
  </p>
  <div id="factors"></div>
  <pre id="preview">Hover over a + button to preview an upgrade.</pre>
  <pre id="news"></pre>
  <pre id="readout"></pre>
`;

const game = createGame();
const playButton = element<HTMLButtonElement>('#play');
const speedSelect = element<HTMLSelectElement>('#speed');
const readout = element<HTMLPreElement>('#readout');
const newsBox = element<HTMLPreElement>('#news');
const news: string[] = [];

let playing = false;

function addNews(events: readonly GameEvent[]): void {
  const view = game.getView();
  for (const event of events) {
    news.unshift(`Year ${fmt(view.elapsedYears, 0)}: ${describeEvent(event, view)}`);
  }
  newsBox.textContent = news.slice(0, 6).join('\n');
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

const previewBox = element<HTMLPreElement>('#preview');
const updateFactors = createFactorList(element('#factors'), game, addNews, (text) => {
  previewBox.textContent = text;
});

function render(view: GameView): void {
  const { concentrations: c, forcing: f, radiation: r, feedbacks: fb } = view;
  const recent = view.history
    .slice(-5)
    .map(
      (p) => `  year ${p.year}: ${fmt(p.surfaceWarming)} C, CO2 ${fmt(p.co2, 1)} parts per million`,
    );

  updateFactors(view);
  readout.textContent = [
    `Year ${fmt(view.elapsedYears, 1)}${view.ended ? '  (game over)' : ''}`,
    `Money: ${Math.floor(view.dollars)} dollars, earning ${Math.round(view.incomePerYear)} per year`,
    `Milestones reached: ${
      view.milestones
        .filter((m) => m.reached)
        .map((m) => `+${m.warming}`)
        .join(', ') || 'none'
    }`,
    `Side goals done: ${
      view.objectives
        .filter((o) => o.done)
        .map((o) => o.id)
        .join(', ') || 'none'
    }`,
    `Emissions: ${describeEmissions(view.emissions)}`,
    '',
    `Surface warming       ${fmt(view.surfaceWarming)} C`,
    `Deep ocean warming    ${fmt(view.deepOceanWarming)} C`,
    `Equilibrium warming   ${fmt(view.equilibriumWarming)} C (if gas levels stayed as now)`,
    `Energy imbalance      ${fmt(view.energyImbalance)} watts per square meter`,
    '',
    `CO2      ${fmt(c.co2, 1)} parts per million`,
    `Methane  ${fmt(c.ch4, 0)} parts per billion`,
    `Nitrous oxide ${fmt(c.n2o, 1)} parts per billion`,
    '',
    'Extra energy trapped (watts per square meter)',
    `  CO2 ${fmt(f.co2)}   methane ${fmt(f.ch4)}   nitrous oxide ${fmt(f.n2o)}   total ${fmt(f.total)}`,
    '',
    'Energy flows (watts per square meter)',
    `  incoming sunlight   ${fmt(r.incomingSolar, 1)}`,
    `  reflected           ${fmt(r.reflectedSolar, 1)}`,
    `  absorbed            ${fmt(r.absorbedSolar, 1)}`,
    `  surface infrared    ${fmt(r.surfaceInfrared, 1)}`,
    `  outgoing infrared   ${fmt(r.outgoingInfrared, 1)}`,
    `  greenhouse effect   ${fmt(r.greenhouseEffect, 1)}`,
    '',
    'Feedbacks (watts per square meter)',
    `  Planck              ${fmt(fb.planck)}`,
    `  water vapour + lapse rate ${fmt(fb.waterVapourLapseRate)}`,
    `  surface albedo      ${fmt(fb.surfaceAlbedo)}`,
    `  clouds              ${fmt(fb.clouds)}`,
    `  biogeophysical      ${fmt(fb.biogeophysical)}`,
    '',
    'Recent years',
    ...recent,
  ].join('\n');
}

game.subscribe(render);
render(game.getView());
startClock(game, () => (playing ? Number(speedSelect.value) : 0), addNews);
