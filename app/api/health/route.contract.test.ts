import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { pingTierMock } = vi.hoisted(() => ({
  pingTierMock: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  pingTier: pingTierMock,
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    pingTierMock.mockReset();
  });

  it('returns 200 when both tiers are healthy', async () => {
    pingTierMock.mockImplementation(async (tier: 'fast' | 'strong') => ({
      tier,
      ok: true,
      latencyMs: 120,
      modelId: tier === 'fast' ? 'anthropic/claude-haiku-4-5' : 'anthropic/claude-sonnet-4-6',
      inputTokens: 5,
      outputTokens: 2,
      totalCost: 0.0001,
      generationId: `gen-${tier}`,
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthy).toBe(true);
    expect(body.tiers).toHaveLength(2);
    expect(body.tiers[0]).toMatchObject({ tier: 'fast', ok: true, latencyMs: 120 });
    expect(body.tiers[1]).toMatchObject({ tier: 'strong', ok: true });
    expect(typeof body.checkedAt).toBe('number');
  });

  it('returns 503 when any tier fails', async () => {
    pingTierMock.mockImplementation(async (tier: 'fast' | 'strong') => ({
      tier,
      ok: tier === 'fast',
      latencyMs: tier === 'fast' ? 90 : 0,
      modelId: tier === 'fast' ? 'anthropic/claude-haiku-4-5' : null,
      inputTokens: null,
      outputTokens: null,
      totalCost: null,
      generationId: null,
      error: tier === 'strong' ? 'Gateway error' : undefined,
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.healthy).toBe(false);
    expect(body.tiers[1].error).toBe('Gateway error');
  });
});
