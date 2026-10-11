import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { GAMEPLAY } from './gameplay';
import { MILESTONES, OBJECTIVES, applyProgression, createDebrief } from './progression';
import { createInitialState, type GameState } from './state';
import { advanceTicks } from './simulation';
import { selectView } from './view';

function withWarming(warming: number, state: GameState = createInitialState()): GameState {
  return { ...state, climate: { surfaceWarming: warming, deepOceanWarming: 0 } };
}

describe('milestones', () => {
  it('are in increasing order, below the ending warming, and sourced', () => {
    const levels = MILESTONES.map((m) => m.warming);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(levels.at(-1)).toBeLessThan(GAMEPLAY.endingWarming.value);
    for (const m of MILESTONES) expect(m.source).toMatch(/IPCC AR6|Sherwood and Huber/);
  });

  it('fire once each, in order, as warming rises', () => {
    let state = createInitialState();
    const fired: number[] = [];
    for (const warming of [0.4, 0.6, 1.2, 1.2, 1.6]) {
      const result = applyProgression(withWarming(warming, state));
      state = result.state;
      for (const e of result.events) if (e.type === 'milestoneReached') fired.push(e.warming);
    }
    expect(fired).toEqual([0.5, 1, 1.5]);
  });
});

describe('objectives', () => {
  it('pay their reward once when completed', () => {
    const state = {
      ...createInitialState(),
      gases: {
        ...createInitialState().gases,
        co2Parts: { permanent: 80, slow: 0, medium: 0, fast: 0 },
      },
    };
    const result = applyProgression(state);
    const reward = OBJECTIVES.find((o) => o.id === 'co2-350')?.reward ?? 0;
    expect(result.events).toContainEqual({
      type: 'objectiveCompleted',
      objective: 'co2-350',
      reward,
    });
    expect(result.state.dollars).toBe(state.dollars + reward);
    expect(applyProgression(result.state).events).toEqual([]);
  });

  it('only count methane falling after it first passed 2000 parts per billion', () => {
    const low = createInitialState();
    expect(applyProgression(low).state.progress.objectivesCompleted).not.toContain('methane-falls');
    const afterPeak = {
      ...low,
      progress: { ...low.progress, objectivesCompleted: ['methane-2000'] },
    };
    expect(applyProgression(afterPeak).state.progress.objectivesCompleted).toContain(
      'methane-falls',
    );
  });
});

describe('ending', () => {
  const ended = applyProgression(withWarming(GAMEPLAY.endingWarming.value)).state;

  it('ends the game at the ending warming', () => {
    expect(ended.progress.endedAtYear).toBe(0);
    expect(selectView(ended).ended).toBe(true);
  });

  it('stops time and blocks upgrades after the end', () => {
    expect(advanceTicks(ended, 24).state).toBe(ended);
    const result = applyAction(
      { ...ended, dollars: 1e6 },
      { type: 'upgradeFactor', factor: 'coal' },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'GAME_OVER' } });
    expect(applyAction(ended, { type: 'reset' }).ok).toBe(true);
  });

  it('gives a debrief with sourced real world facts', () => {
    expect(createDebrief(createInitialState())).toBeNull();
    const debrief = createDebrief(ended);
    expect(debrief?.finalWarming).toBe(GAMEPLAY.endingWarming.value);
    expect(debrief?.realWorld.length).toBeGreaterThan(0);
    for (const fact of debrief?.realWorld ?? []) expect(fact.source).toContain('IPCC AR6');
  });
});
