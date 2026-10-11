// Saving a game as text (JSON) and loading it back, with a version number and checks so a broken
// or old save is rejected instead of breaking the game.
import { FACTOR_IDS } from './factors';
import { GAMEPLAY } from './gameplay';
import type { GameState } from './state';

export const SAVE_VERSION = 2;

export type LoadResult =
  { readonly ok: true; readonly state: GameState } | { readonly ok: false; readonly error: string };

export function saveGame(state: GameState): string {
  return JSON.stringify({ version: SAVE_VERSION, state });
}

type Data = Record<string, unknown>;

const isObject = (v: unknown): v is Data =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function problems(state: unknown): string[] {
  if (!isObject(state)) return ['state is missing'];
  const errors: string[] = [];
  const need = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };

  need(Number.isInteger(state.tick) && (state.tick as number) >= 0, 'tick');
  need(isNumber(state.dollars), 'dollars');

  const factors = state.factors;
  need(isObject(factors), 'factors');
  if (isObject(factors)) {
    for (const id of FACTOR_IDS) {
      const f = factors[id];
      const ok =
        isObject(f) &&
        Number.isInteger(f.level) &&
        (f.level as number) >= 0 &&
        (f.level as number) <= GAMEPLAY.maxFactorLevel.value &&
        typeof f.unlocked === 'boolean';
      need(ok, `factors.${id}`);
    }
  }

  const gases = state.gases;
  need(
    isObject(gases) &&
      isObject(gases.co2Parts) &&
      ['permanent', 'slow', 'medium', 'fast'].every((k) => isNumber((gases.co2Parts as Data)[k])) &&
      isNumber(gases.ch4Excess) &&
      isNumber(gases.n2oExcess) &&
      isNumber(gases.cfcExcess),
    'gases',
  );

  const climate = state.climate;
  need(
    isObject(climate) && isNumber(climate.surfaceWarming) && isNumber(climate.deepOceanWarming),
    'climate',
  );

  need(
    Array.isArray(state.history) &&
      state.history.every(
        (p) =>
          isObject(p) &&
          ['year', 'surfaceWarming', 'co2', 'ch4', 'n2o', 'forcing'].every((k) => isNumber(p[k])),
      ),
    'history',
  );

  const progress = state.progress;
  need(
    isObject(progress) &&
      Array.isArray(progress.milestonesReached) &&
      progress.milestonesReached.every(isNumber) &&
      Array.isArray(progress.objectivesCompleted) &&
      progress.objectivesCompleted.every((o) => typeof o === 'string') &&
      Array.isArray(progress.cardsShown) &&
      progress.cardsShown.every((c) => typeof c === 'string') &&
      isNumber(progress.cumulativeCo2) &&
      (progress.endedAtYear === null || isNumber(progress.endedAtYear)),
    'progress',
  );

  return errors;
}

export function loadGame(text: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The save is not valid JSON.' };
  }
  if (!isObject(data)) return { ok: false, error: 'The save is not a saved game.' };
  if (data.version !== SAVE_VERSION) {
    return {
      ok: false,
      error: `This save is version ${String(data.version)}, expected ${SAVE_VERSION}.`,
    };
  }
  const errors = problems(data.state);
  if (errors.length > 0) {
    return { ok: false, error: `The save has missing or invalid parts: ${errors.join(', ')}.` };
  }
  return { ok: true, state: data.state as GameState };
}
