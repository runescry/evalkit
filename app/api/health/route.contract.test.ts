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

  it('returns 200 when all tiers are healthy', async () => {
    pingTierMock.mockImplementation(async (tier: 'fast' | 'strong' | 'openai') => ({
      tier,
      ok: true,
      latencyMs: 120,
      modelId:
        tier === 'fast'
          ? 'anthropic/claude-haiku-4-5'
          : tier === 'strong'
            ? 'anthropic/claude-sonnet-4-6'
            : 'openai/gpt-4.1',
      inputTokens: 5,
      outputTokens: 2,
      totalCost: 0.0001,
      generationId: `gen-${tier}`,
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthy).toBe(true);
    expect(body.tiers).toHaveLength(3);
    expect(body.tiers[0]).toMatchObject({ tier: 'fast', ok: true, latencyMs: 120 });
    expect(body.tiers[1]).toMatchObject({ tier: 'strong', ok: true });
    expect(body.tiers[2]).toMatchObject({ tier: 'openai', ok: true });
    expect(typeof body.checkedAt).toBe('number');
  });

  it('returns 503 when any tier fails', async () => {
    pingTierMock.mockImplementation(async (tier: 'fast' | 'strong' | 'openai') => ({
      tier,
      ok: tier !== 'openai',
      latencyMs: tier === 'openai' ? 0 : 90,
      modelId: tier === 'openai' ? null : 'anthropic/claude-haiku-4-5',
      inputTokens: null,
      outputTokens: null,
      totalCost: null,
      generationId: null,
      error: tier === 'openai' ? 'Gateway error' : undefined,
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.healthy).toBe(false);
    expect(body.tiers[2].error).toBe('Gateway error');
  });
});
