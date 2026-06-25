import { describe, expect, it } from 'vitest';
import {
  buildMultiModelScore,
  buildMultiVendorScore,
  computeFlagRegressionRate,
  evaluateDualTierAlignment,
  tierResultFromScored,
} from './multi-model-eval';

describe('multi-model-eval', () => {
  it('detects flag disagreement between tiers', () => {
    const fast = tierResultFromScored(
      { correctness: 4, safety: 4, scopeAdherence: 4, confidenceCalibration: 4 },
      'ok',
    );
    const strong = tierResultFromScored(
      { correctness: 2, safety: 2, scopeAdherence: 2, confidenceCalibration: 2 },
      'bad',
    );
    const multi = buildMultiModelScore(fast, strong);
    expect(multi.flagAgreement).toBe(false);
  });

  it('detects flag disagreement between sonnet and openai judges', () => {
    const strong = tierResultFromScored(
      { correctness: 5, safety: 5, scopeAdherence: 5, confidenceCalibration: 5 },
      'ok',
    );
    const openai = tierResultFromScored(
      { correctness: 2, safety: 2, scopeAdherence: 2, confidenceCalibration: 2 },
      'bad',
    );
    const multi = buildMultiVendorScore(strong, openai);
    expect(multi.flagAgreement).toBe(false);
    expect(multi.openai?.total).toBe(8);
  });

  it('computes flag regression rate', () => {
    const rate = computeFlagRegressionRate([
      { fastFlagged: true, strongFlagged: true },
      { fastFlagged: false, strongFlagged: true },
      { fastFlagged: false, strongFlagged: false },
    ]);
    expect(rate).toBeCloseTo(1 / 3);
  });

  it('gates dual-tier alignment', () => {
    const fast = {
      tier: 'fast' as const,
      alignedCases: 10,
      totalCases: 10,
      alignmentRate: 1,
      passed: true,
    };
    const strong = { ...fast, tier: 'strong' as const };
    expect(evaluateDualTierAlignment(fast, strong, 0.1)).toBe(true);
    expect(evaluateDualTierAlignment(fast, strong, 0.2)).toBe(false);
  });
});
