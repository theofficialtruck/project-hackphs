// Numbers page: shows every value the engine calculates, for checking the simulation.
import {
  ENGINE_VERSION,
  SCENARIOS,
  createGame,
  type GameEvent,
  type GameView,
  type ScenarioId,
} from '../core';
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
    <select id="scenario">
      <option value="">Jump to...</option>
      ${SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
    </select>
  </p>
  <p>
    <button id="save">Save</button>
    <button id="load">Load</button>
    <span id="save-message"></span><br />
    <textarea id="save-text" rows="3" cols="80" placeholder="Saved game text"></textarea>
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

const scenarioSelect = element<HTMLSelectElement>('#scenario');
scenarioSelect.addEventListener('change', () => {
  if (scenarioSelect.value) game.loadScenario(scenarioSelect.value as ScenarioId);
  scenarioSelect.value = '';
});

const saveText = element<HTMLTextAreaElement>('#save-text');
const saveMessage = element<HTMLSpanElement>('#save-message');
element('#save').addEventListener('click', () => {
  saveText.value = game.save();
  saveMessage.textContent = 'Saved below.';
});
element('#load').addEventListener('click', () => {
  const result = game.load(saveText.value);
  saveMessage.textContent = result.ok ? 'Loaded.' : result.error;
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
    `Money: ${Math.floor(view.dollars)} dollars, earning ${Math.round(view.incomePerYear)} per year, savings limit ${Math.round(view.savingsCap)}`,
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
    `CFCs     ${fmt(c.cfc * 1000, 0)} parts per trillion`,
    '',
    'Extra energy trapped (watts per square meter)',
    `  CO2 ${fmt(f.co2)}   methane ${fmt(f.ch4)}   nitrous oxide ${fmt(f.n2o)}   CFCs ${fmt(f.cfc)}   total ${fmt(f.total)}`,
    '',
    `Ozone layer: ${fmt(view.ozone.lossPercent, 2)}% thinner (real world today about ${view.ozone.realWorldLossPercent}%)`,
    `Science cards seen: ${
      view.cards
        .filter((card) => card.shown)
        .map((card) => card.id)
        .join(', ') || 'none'
    }`,
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