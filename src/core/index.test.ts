import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from './index';

describe('engine entry point', () => {
  it('exports a semantic version string', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
