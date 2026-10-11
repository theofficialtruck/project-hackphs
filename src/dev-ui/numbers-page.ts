import { createGame, type GameEvent, type GameView } from '../core';
import { SPEEDS, createFactorList, describeEvent, element, fmt, startClock } from './shared';

const game = createGame();
let playing = false;
const speedSelect = element<HTMLSelectElement>('#speed');
speedSelect.innerHTML = SPEEDS.map(
  (speed) => `<option value="${speed}">${speed} years per second</option>`,
).join('');

const news: string[] = [];
function addEvents(events: readonly GameEvent[]): void {
  const view = game.getView();
  for (const event of events)
    news.unshift(`Year ${fmt(view.elapsedYears, 0)}: ${describeEvent(event, view)}`);
  element('#news').textContent = news.slice(0, 10).join('\n');
}

const preview = element<HTMLPreElement>('#preview');
const updateFactors = createFactorList(element('#factors'), game, addEvents, (text) => {
  preview.textContent = text;
});

function render(view: GameView): void {
  element('#status').textContent =
    `Year ${fmt(view.elapsedYears, 0)} | Global warming +${fmt(view.surfaceWarming)} degrees C`;
  element('#money').textContent = `${Math.floor(view.dollars)} dollars`;
  element('#income').textContent =
    view.dollars >= view.savingsCap
      ? `Savings full at ${Math.floor(view.savingsCap)} dollars. Upgrade to raise the limit`
      : `+${Math.floor(view.incomePerYear)} dollars per year`;
  element('#ozone').textContent =
    `Ozone layer (blocks UV sunlight): ${fmt(view.ozone.lossPercent, 2)}% thinner; ` +
    `real world since 2010: about ${fmt(view.ozone.realWorldLossPercent, 1)}%. ` +
    `CFCs: ${fmt(view.concentrations.cfc * 1000, 1)} parts per trillion.`;
  element('#cards').replaceChildren(
    ...view.cards
      .filter((card) => card.shown)
      .map((card) => {
        const item = document.createElement('article');
        if (card.id === 'ozone-not-warming') item.classList.add('myth-card');
        const title = document.createElement('h3');
        title.textContent = card.title;
        const body = document.createElement('p');
        body.textContent = card.text;
        const source = document.createElement('small');
        source.textContent = card.source;
        item.append(title, body, source);
        return item;
      }),
  );
  updateFactors(view);
  element<HTMLButtonElement>('#step').disabled = view.ended;
  element<HTMLButtonElement>('#play').disabled = view.ended;
}

element<HTMLButtonElement>('#play').addEventListener('click', () => {
  playing = !playing;
  element('#play').textContent = playing ? 'Pause' : 'Play';
});
element('#step').addEventListener('click', () => addEvents(game.advance(1)));
element('#reset').addEventListener('click', () => {
  const result = game.dispatch({ type: 'reset' });
  if (result.ok) {
    news.length = 0;
    addEvents(result.events);
    playing = false;
    element('#play').textContent = 'Play';
  }
});

game.subscribe(render);
render(game.getView());
startClock(game, () => (playing ? Number(speedSelect.value) : 0), addEvents);
