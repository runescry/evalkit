import { describe, expect, it } from 'vitest';
import { TIER_MODELS } from '@/lib/ai';

/**
 * Slice 01 integration policy: fast-tier Gateway fallbacks include strong model.
 * Live 429 failover is validated in staging; CI asserts routing configuration.
 */
describe('ai gateway fallback configuration', () => {
  it('fast tier lists gemini then sonnet in gateway.models fallbacks', () => {
    const { fallbacks } = TIER_MODELS.fast;
    expect(fallbacks.indexOf('google/gemini-2.5-flash')).toBeLessThan(
      fallbacks.indexOf('anthropic/claude-sonnet-4-6'),
    );
  });
});
