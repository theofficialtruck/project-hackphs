// Checks the regional climate data against statements in the IPCC AR6 WG1 Summary for
// Policymakers (B.2.1 for warming, C.2 and B.3.1 for rainfall).
import { describe, expect, it } from 'vitest';
import { COUNTRY_REGIONS, REGION_DATA } from './regional-climate.generated';
import {
  REGIONAL_PATTERNS,
  countryClimate,
  countryNames,
  plainCountryName,
  regionClimates,
} from './regions';

const byId = (id: string) => regionClimates(1).find((r) => r.id === id);

describe('regional climate data', () => {
  it('covers the 46 AR6 land regions using many climate models', () => {
    expect(REGION_DATA).toHaveLength(46);
    expect(REGIONAL_PATTERNS.value).toBeGreaterThanOrEqual(20);
  });

  it('has a model range around every middle value', () => {
    for (const r of REGION_DATA) {
      const [median, low, high] = r.warmingPerDegree;
      expect(low).toBeLessThanOrEqual(median);
      expect(median).toBeLessThanOrEqual(high);
      expect(r.modelsWetter).toBeGreaterThanOrEqual(0);
      expect(r.modelsWetter).toBeLessThanOrEqual(1);
    }
  });

  it('warms the Arctic more than twice as fast as the globe (AR6 SPM B.2.1)', () => {
    expect(byId('RAR')?.warming).toBeGreaterThan(2);
  });

  it('warms land regions faster than the global average (AR6 SPM B.2.1)', () => {
    const land = regionClimates(1).filter((r) => r.id !== 'EAN' && r.id !== 'WAN');
    const average = land.reduce((sum, r) => sum + r.warming, 0) / land.length;
    expect(average).toBeGreaterThan(1);
  });

  it('makes polar, northern European and northern North American regions wetter (AR6 SPM C.2)', () => {
    for (const id of ['RAR', 'GIC', 'NEU', 'NEN', 'NWN', 'EAN', 'WAN']) {
      expect(byId(id)?.rainfallTrend).toBe('wetter');
    }
  });

  it('dries at least some subtropical regions (AR6 SPM B.3.1)', () => {
    expect(byId('MED')?.rainfallTrend).toBe('drier');
  });

  it('shows no change when there is no global warming', () => {
    for (const r of regionClimates(0)) {
      expect(r.warming).toBeCloseTo(0, 10);
      expect(r.rainfallChangePercent).toBeCloseTo(0, 10);
    }
  });

  it('scales in a straight line with global warming', () => {
    const one = regionClimates(1);
    const two = regionClimates(2);
    one.forEach((r, i) => expect(two[i]?.warming).toBeCloseTo(2 * r.warming, 10));
  });
});

describe('countries', () => {
  it('only point to known regions, with shares adding up to about 1', () => {
    const ids = new Set<string>(REGION_DATA.map((r) => r.id));
    for (const shares of Object.values(COUNTRY_REGIONS)) {
      for (const [id] of shares) expect(ids.has(id)).toBe(true);
      const total = shares.reduce((sum, [, share]) => sum + share, 0);
      expect(total).toBeGreaterThan(0.97);
      expect(total).toBeLessThan(1.03);
    }
    expect(countryNames().length).toBeGreaterThan(150);
  });

  it('use their single region directly when inside one region', () => {
    const regions = regionClimates(2);
    const uk = countryClimate('United Kingdom', regions);
    const northEurope = regions.find((r) => r.id === 'NEU');
    expect(uk?.warming).toBeCloseTo(northEurope?.warming ?? NaN, 10);
    expect(uk?.regions).toEqual([{ id: 'NEU', name: 'North Europe', share: 1 }]);
  });

  it('blend several regions for large countries', () => {
    const regions = regionClimates(2);
    const usa = countryClimate('United States of America', regions);
    expect(usa?.regions.length).toBeGreaterThan(1);
    const values = usa?.regions.map(
      (part) => regions.find((r) => r.id === part.id)?.warming ?? NaN,
    );
    expect(usa?.warming).toBeGreaterThanOrEqual(Math.min(...(values ?? [])));
    expect(usa?.warming).toBeLessThanOrEqual(Math.max(...(values ?? [])));
  });

  it('returns nothing for a country without data', () => {
    expect(countryClimate('Atlantis', regionClimates(1))).toBeUndefined();
  });

  it('matches names with accents to their plain keyboard spelling', () => {
    const accented = `C${String.fromCharCode(0xf4)}te d'Ivoire`;
    expect(plainCountryName(accented)).toBe("Cote d'Ivoire");
    expect(countryClimate(accented, regionClimates(1))).toBeDefined();
  });
});
