// Pieces shared by the temporary pages (globe page and numbers page).
import type { Emissions, FactorId, Game, GameEvent, GameView, UpgradePreview } from '../core';

/** Simulated years per real second. */
export const SPEEDS = [0.5, 1, 2, 5];

export function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Page is missing ${selector}`);
  }
  return found;
}

export const fmt = (value: number, digits = 2): string => value.toFixed(digits);

/** Plain words description of yearly emissions, skipping gases that are zero. */
export function describeEmissions(e: Emissions): string {
  const parts: string[] = [];
  if (e.co2 > 0) parts.push(`${fmt(e.co2, 1)} billion tonnes of CO2`);
  if (e.ch4 > 0) parts.push(`${fmt(e.ch4, 1)} million tonnes of methane`);
  if (e.n2o > 0) parts.push(`${fmt(e.n2o, 2)} million tonnes of nitrogen as nitrous oxide`);
  if (e.cfc > 0) parts.push(`${fmt(e.cfc, 0)} thousand tonnes of CFCs`);
  return parts.length > 0 ? `${parts.join(', ')} per year` : 'nothing yet';
}

export function describePreview(p: UpgradePreview, name: string): string {
  const gases: string[] = [];
  if (p.concentrationChange.co2 > 0.05)
    gases.push(`CO2 +${fmt(p.concentrationChange.co2, 1)} parts per million`);
  if (p.concentrationChange.ch4 > 0.5)
    gases.push(`methane +${fmt(p.concentrationChange.ch4, 0)} parts per billion`);
  if (p.concentrationChange.n2o > 0.05)
    gases.push(`nitrous oxide +${fmt(p.concentrationChange.n2o, 1)} parts per billion`);
  if (p.concentrationChange.cfc > 0.0005)
    gases.push(`CFCs +${fmt(p.concentrationChange.cfc * 1000, 0)} parts per trillion`);
  const lines = [
    `${name}: next level costs ${Math.round(p.cost)} dollars${p.affordable ? '' : ' (not enough money yet)'}`,
    `1. Releases an extra ${describeEmissions(p.extraEmissionsPerYear)}`,
    `2. After ${p.years} years: ${gases.join(', ')}`,
    `3. Extra energy trapped: +${fmt(p.forcingChange, 3)} watts per square meter`,
    `4. Extra warming: +${fmt(p.warmingChange, 3)} degrees C`,
  ];
  if (p.ozoneLossChange > 0) {
    lines.push(`Separately, the ozone layer gets ${fmt(p.ozoneLossChange, 2)}% thinner`);
  }
  return lines.join('\n');
}

/** Short plain text for an event, for a news list. */
export function describeEvent(event: GameEvent, view: GameView): string {
  const name = (id: FactorId) => view.factors.find((f) => f.id === id)?.name ?? id;
  switch (event.type) {
    case 'factorUpgraded':
      return `${name(event.factor)} raised to level ${event.level}`;
    case 'factorDowngraded':
      return `${name(event.factor)} lowered to level ${event.level}`;
    case 'factorUnlocked':
      return `${name(event.factor)} is now available`;
    case 'milestoneReached': {
      const milestone = view.milestones.find((m) => m.warming === event.warming);
      return `+${event.warming} degrees C: ${milestone?.text ?? ''}`;
    }
    case 'objectiveCompleted': {
      const objective = view.objectives.find((o) => o.id === event.objective);
      return `Goal done (+${event.reward} dollars): ${objective?.text ?? ''}. ${objective?.lesson ?? ''}`;
    }
    case 'gameEnded':
      return `Game over: Earth reached +${view.endingWarming} degrees C`;
    case 'cardShown': {
      const card = view.cards.find((c) => c.id === event.card);
      return `${card?.title ?? ''}: ${card?.text ?? ''} (${card?.source ?? ''})`;
    }
    case 'gameReset':
      return 'New game started';
  }
}

/**
 * Runs the game clock on every animation frame. `yearsPerSecond` returns 0 while paused.
 * Long gaps (for example a hidden tab) are capped so the game does not jump ahead.
 */
export function startClock(
  game: Game,
  yearsPerSecond: () => number,
  onEvents: (events: readonly GameEvent[]) => void,
): void {
  let lastFrame = performance.now();
  function frame(now: number): void {
    const seconds = Math.min((now - lastFrame) / 1000, 0.25);
    lastFrame = now;
    const speed = yearsPerSecond();
    if (speed > 0) {
      const events = game.advance(seconds * speed);
      if (events.length > 0) onEvents(events);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * Builds one row per factor with - and + buttons. The rows are created once; the returned
 * function only updates their text, so buttons keep working while the game is running.
 */
export function createFactorList(
  container: HTMLElement,
  game: Game,
  onEvents: (events: readonly GameEvent[]) => void,
  onPreview: (text: string) => void = () => {},
): (view: GameView) => void {
  container.innerHTML = game
    .getView()
    .factors.map(
      (f) => `
      <div class="factor" data-id="${f.id}">
        <div class="factor-head">
          <button data-action="down" data-id="${f.id}" title="Lower">-</button>
          <button data-action="up" data-id="${f.id}" title="Raise">+</button>
          <strong>${f.name}</strong> <span class="factor-level"></span>
        </div>
        <div class="factor-detail"></div>
      </div>`,
    )
    .join('');

  container.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button?.dataset.id) return;
    const factor = button.dataset.id as FactorId;
    const type = button.dataset.action === 'up' ? 'upgradeFactor' : 'downgradeFactor';
    const result = game.dispatch({ type, factor });
    if (result.ok) onEvents(result.events);
    else if (result.error.code === 'NOT_ENOUGH_DOLLARS') onPreview('Not enough dollars yet.');
  });

  container.addEventListener('mouseover', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action="up"]');
    if (!button?.dataset.id) return;
    const factor = button.dataset.id as FactorId;
    const preview = game.previewUpgrade(factor);
    const name = game.getView().factors.find((f) => f.id === factor)?.name ?? factor;
    if (preview) onPreview(describePreview(preview, name));
  });

  return (view) => {
    for (const f of view.factors) {
      const row = container.querySelector<HTMLElement>(`.factor[data-id="${f.id}"]`);
      if (!row) continue;
      const level = row.querySelector<HTMLElement>('.factor-level');
      const detail = row.querySelector<HTMLElement>('.factor-detail');
      const down = row.querySelector<HTMLButtonElement>('[data-action="down"]');
      const up = row.querySelector<HTMLButtonElement>('[data-action="up"]');
      if (!level || !detail || !down || !up) continue;

      row.classList.toggle('locked', !f.unlocked);
      down.disabled = !f.unlocked || f.level === 0;
      up.disabled = !f.unlocked || f.upgradeCost === null || view.ended;
      const price =
        f.upgradeCost === null ? 'max level' : `next ${Math.round(f.upgradeCost)} dollars`;
      level.textContent = f.unlocked ? `level ${f.level} of ${f.maxLevel}, ${price}` : 'locked';
      detail.textContent = f.unlocked
        ? `Releases ${describeEmissions(f.emissions)}.${f.presentDayLevel === null ? ' Not used in the real world today.' : ` Level ${f.presentDayLevel} is the real world today.`}`
        : `Needs: ${f.requirements.map((r) => `${r.text}${r.met ? ' (done)' : ''}`).join(', ')}`;
    }
  };
}
