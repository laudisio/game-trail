import { describe, expect, it } from 'vitest';
import { ADS_EVERY, isAdTurn } from './ads';

describe('interstitial cadence', () => {
  it('fires after every third finished match', () => {
    const turns = Array.from({ length: 10 }, (_, i) => i + 1).filter(isAdTurn);
    expect(ADS_EVERY).toBe(3);
    expect(turns).toEqual([3, 6, 9]);
    expect(isAdTurn(0)).toBe(false);
  });
});
