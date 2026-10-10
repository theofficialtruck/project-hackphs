// Temporary development UI. Only exists to exercise the engine; the real UI is built
// separately on top of the same engine interface.
import { ENGINE_VERSION, createGame, type GameView } from '../core';

/** Simulated years per real second. */
const SPEEDS = [1, 5, 20];

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`dev.html is missing ${selector}`);
  }
  return found;
}

element('#app').innerHTML = `
  <h1>Dev UI</h1>
  <p>Engine version: <code>${ENGINE_VERSION}</code></p>
  <p>
    <button id="play">Play</button>
    <button id="step">Step 1 year</button>
    <label>Speed
      <select id="speed">${SPEEDS.map((s) => `<option value="${s}">${s} yr/s</option>`).join('')}</select>
    </label>
    <button id="reset">Reset</button>
  </p>
  <form id="emissions">
    <label>CO2 (Gt/yr) <input name="co2" type="number" min="0" step="any" value="0" /></label>
    <label>CH4 (Tg/yr) <input name="ch4" type="number" min="0" step="any" value="0" /></label>
    <label>N2O (Tg N/yr) <input name="n2o" type="number" min="0" step="any" value="0" /></label>
    <button type="submit">Set emissions</button>
    <span id="emissions-error"></span>
  </form>
  <pre id="readout"></pre>
`;

const game = createGame();
const playButton = element<HTMLButtonElement>('#play');
const speedSelect = element<HTMLSelectElement>('#speed');
const emissionsForm = element<HTMLFormElement>('#emissions');
const emissionsError = element<HTMLSpanElement>('#emissions-error');
const readout = element<HTMLPreElement>('#readout');

let playing = false;

playButton.addEventListener('click', () => {
  playing = !playing;
  playButton.textContent = playing ? 'Pause' : 'Play';
});

element('#step').addEventListener('click', () => game.advance(1));

element('#reset').addEventListener('click', () => {
  game.dispatch({ type: 'reset' });
  emissionsForm.reset();
  emissionsError.textContent = '';
});

emissionsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(emissionsForm);
  const result = game.dispatch({
    type: 'setEmissions',
    emissions: {
      co2: Number(data.get('co2')),
      ch4: Number(data.get('ch4')),
      n2o: Number(data.get('n2o')),
    },
  });
  emissionsError.textContent = result.ok ? '' : `Error: ${result.error.code}`;
});

const fmt = (value: number, digits = 2): string => value.toFixed(digits);

function render(view: GameView): void {
  const { concentrations: c, forcing: f, radiation: r, feedbacks: fb } = view;
  const recent = view.history
    .slice(-5)
    .map((p) => `  year ${p.year}: ${fmt(p.surfaceWarming)} °C, CO2 ${fmt(p.co2, 1)} ppm`);

  readout.textContent = [
    `Year ${fmt(view.elapsedYears, 1)}`,
    '',
    `Surface warming       ${fmt(view.surfaceWarming)} °C`,
    `Deep ocean warming    ${fmt(view.deepOceanWarming)} °C`,
    `Equilibrium warming   ${fmt(view.equilibriumWarming)} °C (if gas levels stayed as now)`,
    `Energy imbalance      ${fmt(view.energyImbalance)} W/m^2`,
    '',
    `Concentrations   CO2 ${fmt(c.co2, 1)} ppm   CH4 ${fmt(c.ch4, 0)} ppb   N2O ${fmt(c.n2o, 1)} ppb`,
    `Forcing (W/m^2)  CO2 ${fmt(f.co2)}   CH4 ${fmt(f.ch4)}   N2O ${fmt(f.n2o)}   total ${fmt(f.total)}`,
    '',
    'Radiation budget (W/m^2)',
    `  incoming sunlight   ${fmt(r.incomingSolar, 1)}`,
    `  reflected           ${fmt(r.reflectedSolar, 1)}`,
    `  absorbed            ${fmt(r.absorbedSolar, 1)}`,
    `  surface infrared    ${fmt(r.surfaceInfrared, 1)}`,
    `  outgoing infrared   ${fmt(r.outgoingInfrared, 1)}`,
    `  greenhouse effect   ${fmt(r.greenhouseEffect, 1)}`,
    '',
    'Feedbacks (W/m^2)',
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

let lastFrame = performance.now();
function frame(now: number): void {
  // Ignore long gaps (for example a hidden tab) so the game does not jump ahead.
  const seconds = Math.min((now - lastFrame) / 1000, 0.25);
  lastFrame = now;
  if (playing) {
    game.advance(seconds * Number(speedSelect.value));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
