// Temporary development UI. Only exists to exercise the engine; the real UI
// is built separately on top of the same engine interface.
import { ENGINE_VERSION } from '../core';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('dev.html is missing the #app element');
}

app.innerHTML = `
  <h1>Dev UI</h1>
  <p>Engine version: <code>${ENGINE_VERSION}</code></p>
  <p>The simulation readout and controls are added later.</p>
`;
