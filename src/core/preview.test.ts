import { describe, expect, it } from 'vitest';
import { upgradeCost } from './economy';
import { GAMEPLAY } from './gameplay';
import { previewUpgrade } from './preview';
import { createInitialState } from './state';
import { stateWithLevels } from './test-helpers';

describe('upgrade preview', () => {
  it('shows the full chain: emissions, gas levels, trapped energy and warming', () => {
    const preview = previewUpgrade(createInitialState(), 'coal');
    expect(preview).not.toBeNull();
    if (!preview) return;
    expect(preview.cost).toBe(upgradeCost('coal', 0));
    expect(preview.years).toBe(GAMEPLAY.previewYears.value);
    expect(preview.extraEmissionsPerYear.co2).toBeGreaterThan(0);
    expect(preview.concentrationChange.co2).toBeGreaterThan(0);
    expect(preview.forcingChange).toBeGreaterThan(0);
    expect(preview.warmingChange).toBeGreaterThan(0);
  });

  it('shows methane but no CO2 change for livestock', () => {
    const preview = previewUpgrade(createInitialState(), 'livestock');
    expect(preview?.concentrationChange.ch4).toBeGreaterThan(0);
    expect(preview?.concentrationChange.co2).toBeCloseTo(0, 10);
  });

  it('says whether the upgrade is affordable', () => {
    expect(previewUpgrade({ ...createInitialState(), dollars: 0 }, 'coal')?.affordable).toBe(false);
  });

  it('gives nothing for locked or maxed out factors', () => {
    expect(previewUpgrade(createInitialState(), 'oil')).toBeNull();
    expect(
      previewUpgrade(stateWithLevels({ coal: GAMEPLAY.maxFactorLevel.value }), 'coal'),
    ).toBeNull();
  });

  it('does not change the game', () => {
    const state = createInitialState();
    const copy = structuredClone(state);
    previewUpgrade(state, 'coal');
    expect(state).toEqual(copy);
  });
});
