// Project rule: only characters that can be typed on a normal keyboard, in code and in
// anything shown to players. This test fails if a file contains anything else.
import { describe, expect, it } from 'vitest';
import { FACTORS, describeRequirement } from '../src/core/factors';
import { GAMEPLAY } from '../src/core/gameplay';
import { REGIONAL_PATTERNS, countryNames, regionClimates } from '../src/core/regions';
import { SCIENCE } from '../src/core/science';

const files = import.meta.glob(['/src/**/*.{ts,css,html}', '/*.html', '/README.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function nonKeyboardCharacters(text: string): string[] {
  return [...text].filter((ch) => {
    const code = ch.charCodeAt(0);
    return code > 126 || (code < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t');
  });
}

describe('keyboard characters only', () => {
  it('finds the project files to check', () => {
    expect(Object.keys(files).length).toBeGreaterThan(10);
  });

  it.each(Object.entries(files))('%s', (_, text) => {
    expect(nonKeyboardCharacters(text)).toEqual([]);
  });
});

describe('text shown to players', () => {
  const playerText = [
    ...Object.values(SCIENCE).flatMap((c) => [c.unit, c.description]),
    ...Object.values(GAMEPLAY).flatMap((c) => [c.unit, c.description]),
    ...FACTORS.flatMap((f) => [f.name, f.description, ...f.requires.map(describeRequirement)]),
    REGIONAL_PATTERNS.unit,
    REGIONAL_PATTERNS.description,
    ...regionClimates(1).map((r) => r.name),
    ...countryNames(),
  ];

  it.each(playerText)('"%s" has no unit notation like m^2', (text) => {
    expect(text).not.toMatch(/\^|\bm2\b|W\/m/);
  });
});
